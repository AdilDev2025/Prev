from typing import List, Dict
import numpy as np
import hashlib
import uuid
from datetime import datetime, timezone

# Attempt to import qdrant_client; allow module to load even if qdrant is absent
try:
    from qdrant_client import QdrantClient
    from qdrant_client.models import Distance, VectorParams, PointStruct
    _HAS_QDRANT = True
except ImportError:
    _HAS_QDRANT = False

class FaceVectorDB:
    def __init__(self, url: str = "http://localhost:6333"):
        if not _HAS_QDRANT:
            raise RuntimeError("qdrant-client is not installed")
        self.url = url
        self.client = QdrantClient(url=url, timeout=5)
        self.collection_name = "faces"
        self._collection_ready = False
        self._ensure_collection()

    def _ensure_collection(self):
        """Create collection if it doesn't exist"""
        if self._collection_ready:
            return
        try:
            collections = self.client.get_collections().collections
            names = [c.name for c in collections]
            if self.collection_name not in names:
                self.client.create_collection(
                    collection_name=self.collection_name,
                    vectors_config=VectorParams(size=128, distance=Distance.COSINE)
                )
                print(f"✅ Created '{self.collection_name}' collection")
            self._collection_ready = True
        except Exception as e:
            msg = str(e).lower()
            # If collection already exists that's fine
            if "already exists" in msg or "409" in msg or "conflict" in msg:
                self._collection_ready = True
                return
            print(f"⚠️  Could not ensure collection: {e}")
            raise

    def store_face_embedding(self, user_id: str, embedding: np.ndarray, user_name: str = None, metadata: Dict = None):
        """Store face embedding in vector database"""
        self._ensure_collection()
        payload = {
            "user_id": user_id,
            "user_name": user_name or user_id,
            "embedding_type": "face",
            "created_at": datetime.now(timezone.utc).isoformat(),
            **(metadata or {})
        }

        point = PointStruct(
            id=self._generate_id(user_id),
            vector=embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding),
            payload=payload
        )

        self.client.upsert(
            collection_name=self.collection_name,
            points=[point]
        )

    def find_similar_faces(self, embedding: np.ndarray, limit: int = 5) -> List[Dict]:
        """Find similar faces using vector similarity"""
        self._ensure_collection()
        query_vec = embedding.tolist() if hasattr(embedding, 'tolist') else list(embedding)

        # qdrant-client API differs by version.
        # Newer clients use `query_points`; older clients used `search`.
        try:
            if hasattr(self.client, "query_points"):
                resp = self.client.query_points(
                    collection_name=self.collection_name,
                    query=query_vec,
                    limit=limit,
                    with_payload=True,
                )
                results = resp.points
            else:
                results = self.client.search(
                    collection_name=self.collection_name,
                    query_vector=query_vec,
                    limit=limit
                )
        except Exception as e:
            print(f"⚠️  Qdrant search failed: {e}")
            return []

        matches = []
        for result in results:
            confidence = float(result.score)
            if confidence > 0.6:  # Lower threshold for more matches
                matches.append({
                    "user_id": result.payload.get("user_id"),
                    "user_name": result.payload.get("user_name", result.payload.get("user_id")),
                    "confidence": confidence,
                    "metadata": result.payload
                })

        return matches

    def _generate_id(self, user_id: str) -> str:
        """Generate a deterministic UUID for a user's face embedding"""
        hex_digest = hashlib.md5(f"{user_id}_face".encode()).hexdigest()
        return str(uuid.UUID(hex_digest))

    def enroll_user_faces(self, user_id: str, face_images: List[np.ndarray], user_name: str = None):
        """Enroll user with multiple face images"""
        try:
            from .face_recognition import recognition_engine
        except ImportError:
            from face_recognition import recognition_engine

        embeddings = []
        for image in face_images:
            try:
                # Extract embedding directly (not through recognition)
                embedding = recognition_engine.extract_face_embedding(image)
                embeddings.append(embedding)
            except ValueError:
                continue  # Skip images that don't contain valid faces

        if embeddings:
            # Average multiple embeddings for better representation
            avg_embedding = np.mean(embeddings, axis=0)
            self.store_face_embedding(user_id, avg_embedding, user_name=user_name or user_id, metadata={
                "enrollment_date": datetime.now(timezone.utc).strftime("%Y-%m-%d"),
                "num_samples": len(embeddings)
            })
            return True
        return False

    def get_all_known_faces(self) -> Dict[str, np.ndarray]:
        """Get all stored face embeddings for recognition"""
        try:
            # This is a simplified version - in production you'd want to paginate
            response = self.client.scroll(
                collection_name=self.collection_name,
                limit=1000  # Adjust based on your needs
            )

            known_faces = {}
            for point in response[0]:  # response[0] contains the points
                user_id = point.payload["user_id"]
                embedding = np.array(point.vector)
                known_faces[user_id] = embedding

            return known_faces
        except Exception as e:
            print(f"Error loading known faces: {e}")
            return {}

# ---------------------------------------------------------------------------
# Module-level singleton – lazy so Qdrant doesn't have to be up at import time
# ---------------------------------------------------------------------------
_vector_db_instance: "FaceVectorDB | None" = None
_vector_db_error: str = ""

def _get_vector_db() -> "FaceVectorDB | None":
    global _vector_db_instance, _vector_db_error
    if _vector_db_instance is not None:
        return _vector_db_instance
    try:
        _vector_db_instance = FaceVectorDB()
        _vector_db_error = ""
        print("✅ Vector database connected successfully")
        return _vector_db_instance
    except Exception as e:
        _vector_db_error = str(e)
        print(f"⚠️  Vector database not available: {e}")
        return None

# Eagerly try once at import time (non-fatal)
vector_db = _get_vector_db()
