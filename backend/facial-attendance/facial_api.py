#!/usr/bin/env python3
"""
Facial Recognition API Script
Called by Node.js server for facial operations
"""

import sys
import json
import cv2
import hashlib
from pathlib import Path

# Add current directory to path for imports
sys.path.append(str(Path(__file__).parent))

try:
    from src.face_recognition import FacialRecognition
    from src.vector_db import FaceVectorDB, _get_vector_db
except ImportError as e:
    print(f"❌ Failed to import facial recognition modules: {e}", file=sys.stderr)
    sys.exit(1)

def main():
    if len(sys.argv) < 2:
        print(json.dumps({
            "status": "error",
            "message": "No operation specified"
        }))
        sys.exit(1)

    operation = sys.argv[1]

    try:
        if operation == "enroll":
            # Enrollment: python facial_api.py enroll user_id user_name image_path
            if len(sys.argv) < 5:
                print(json.dumps({
                    "status": "error",
                    "message": "Enrollment requires: user_id, user_name, image_path"
                }))
                sys.exit(1)

            user_id = sys.argv[2]
            user_name = sys.argv[3]
            image_path = sys.argv[4]

            result = enroll_face(user_id, user_name, image_path)
            print(json.dumps(result))

        elif operation == "recognize":
            # Recognition: python facial_api.py recognize image_path
            if len(sys.argv) < 3:
                print(json.dumps({
                    "status": "error",
                    "message": "Recognition requires: image_path"
                }))
                sys.exit(1)

            image_path = sys.argv[2]

            result = recognize_face(image_path)
            print(json.dumps(result))

        else:
            print(json.dumps({
                "status": "error",
                "message": f"Unknown operation: {operation}"
            }))
            sys.exit(1)

    except Exception as e:
        print(json.dumps({
            "status": "error",
            "message": f"Operation failed: {str(e)}"
        }))
        sys.exit(1)

def enroll_face(user_id, user_name, image_path):
    """Enroll a face for recognition"""
    try:
        # Initialize facial recognition
        recognition = FacialRecognition()

        # Load and process image
        image = cv2.imread(image_path)
        if image is None:
            return {
                "status": "error",
                "message": "Failed to load image"
            }

        # Extract face embedding
        embedding = recognition.extract_face_embedding(image)
        if embedding is None:
            return {
                "status": "error",
                "message": "No face detected in image"
            }

        try:
            vector_db = _get_vector_db()
            if vector_db is None:
                return {
                    "status": "error",
                    "message": "Vector database not available. Ensure Qdrant is running on port 6333."
                }
            success = vector_db.enroll_user_faces(user_id, [image], user_name)

            if success:
                qdrant_id = vector_db._generate_id(user_id)
                return {
                    "status": "success",
                    "message": f"Face enrolled successfully for {user_name}",
                    "user_id": user_id,
                    "user_name": user_name,
                    "qdrant_id": qdrant_id,
                    "embedding_dim": int(embedding.shape[0]) if hasattr(embedding, 'shape') else len(embedding)
                }
            else:
                return {
                    "status": "error",
                    "message": "Failed to store face in database"
                }

        except Exception as db_error:
            return {
                "status": "error",
                "message": f"Database error: {str(db_error)}"
            }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Face enrollment failed: {str(e)}"
        }

def recognize_face(image_path):
    """Recognize a face in an image"""
    try:
        # Initialize facial recognition
        recognition = FacialRecognition()

        # Load and process image
        image = cv2.imread(image_path)
        if image is None:
            return {
                "status": "error",
                "message": "Failed to load image"
            }

        # Recognize face
        result = recognition.recognize_face(image)

        if result.get("recognized"):
            return {
                "status": "success",
                "user_id": result["user_id"],
                "user_name": result.get("user_name", result["user_id"]),
                "confidence": result["confidence"],
                "message": f"Recognized {result.get('user_name', result['user_id'])}"
            }
        else:
            return {
                "status": "failed",
                "message": result.get("message", "Face not recognized"),
                "confidence": 0.0
            }

    except Exception as e:
        return {
            "status": "error",
            "message": f"Face recognition failed: {str(e)}"
        }

if __name__ == "__main__":
    main()
