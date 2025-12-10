from qdrant_client import QdrantClient
from qdrant_client.models import Distance, VectorParams, PointStruct
import numpy as np
import json
from typing import List, Dict, Optional

class FaceVectorDB:
    def __init__(self, url: str = "http://localhost:6333"):
        self.client = QdrantClient(url=url)
        self.collection_name = "faces"
        self._ensure_collection()

    def _ensure_collection(self):
        """Create collection if it doesn't exist"""
        try:
            self.client.get_collection(self.collection_name)
        except Exception:
            self.client.create_collection(
                collection_name=self.collection_name,
                vectors_config=VectorParams(size=128, distance=Distance.COSINE)
            )

    def store_face_embedding(self, user_id: str, embedding: np.ndarray, user_name: str = None, metadata: Dict = None):
        """Store face embedding in vector database"""
        payload = {
            "user_id": user_id,
            "user_name": user_name or user_id,  # Use user_name if provided, otherwise user_id
            "embedding_type": "face",
            "created_at": "2024-12-04T10:00:00Z",
            **(metadata or {})
        }

        point = PointStruct(
            id=self._generate_id(user_id),
            vector=embedding.tolist(),
            payload=payload
        )

        self.client.upsert(
            collection_name=self.collection_name,
            points=[point]
        )

    def find_similar_faces(self, embedding: np.ndarray, limit: int = 5) -> List[Dict]:
        """Find similar faces using vector similarity"""
        results = self.client.search(
            collection_name=self.collection_name,
            query_vector=embedding.tolist(),
            limit=limit
        )

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
        """Generate unique ID for face embedding"""
        import hashlib
        return hashlib.md5(f"{user_id}_face".encode()).hexdigest()

    def enroll_user_faces(self, user_id: str, face_images: List[np.ndarray], user_name: str = None):
        """Enroll user with multiple face images"""
        from .face_recognition import recognition_engine

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
                "enrollment_date": "2024-12-04",
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

# Global instance - only create if qdrant is available
try:
    vector_db = FaceVectorDB()
except Exception as e:
    print(f"⚠️  Vector database not available: {e}")
    print("   Install qdrant-client and start Qdrant server for full functionality")
    vector_db = None
