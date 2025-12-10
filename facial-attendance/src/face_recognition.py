import cv2
import numpy as np
import face_recognition
from typing import List, Dict, Tuple, Optional

# Handle imports for both package and direct execution
try:
    from .data_augmentation import augmenter
except ImportError:
    # Fallback for direct execution
    import sys
    import os
    sys.path.insert(0, os.path.dirname(__file__))
    from data_augmentation import augmenter

# Optional vector_db import - only import if qdrant_client is available
try:
    import qdrant_client
    # Now try to import vector_db
    try:
        from .vector_db import vector_db
        VECTOR_DB_AVAILABLE = True
    except ImportError:
        VECTOR_DB_AVAILABLE = False
        vector_db = None
except ImportError:
    VECTOR_DB_AVAILABLE = False
    vector_db = None
    print("⚠️  qdrant-client not available - running in limited mode")

class FacialRecognition:
    def __init__(self):
        self.known_faces = []
        self.known_names = []
        self.tolerance = 0.6
        self.use_vector_db = VECTOR_DB_AVAILABLE  # Only use if available

    def extract_face_embedding(self, image: np.ndarray) -> np.ndarray:
        """Extract face embedding from image for enrollment"""
        try:
            # Enhance image quality
            enhanced_image = augmenter.enhance_image_quality(image)

            # Convert to RGB
            rgb_image = cv2.cvtColor(enhanced_image, cv2.COLOR_BGR2RGB)

            # Find faces
            face_locations = face_recognition.face_locations(rgb_image)

            if not face_locations:
                raise ValueError("No faces detected in image")

            # Get face encodings
            face_encodings = face_recognition.face_encodings(rgb_image, face_locations)

            if not face_encodings:
                raise ValueError("Could not encode face")

            return face_encodings[0]  # Return embedding for first face

        except Exception as e:
            raise ValueError(f"Failed to extract face embedding: {str(e)}")

    def load_known_faces(self, faces_data: Dict[str, List]):
        """Load known faces from database/training data"""
        # TODO: Implement database loading
        pass

    def recognize_face(self, image: np.ndarray) -> Dict:
        """Recognize face in image with augmentation"""
        try:
            # Enhance image quality
            enhanced_image = augmenter.enhance_image_quality(image)

            # Convert to RGB
            rgb_image = cv2.cvtColor(enhanced_image, cv2.COLOR_BGR2RGB)

            # Find faces
            face_locations = face_recognition.face_locations(rgb_image)

            if not face_locations:
                return {"recognized": False, "message": "No faces detected"}

            # Get the first face
            face_location = face_locations[0]
            top, right, bottom, left = face_location

            # Extract face
            face_image = rgb_image[top:bottom, left:right]

            # Generate augmented versions of the full image
            augmented_images = augmenter.augment_face(enhanced_image)

            # Try recognition on original and augmented images
            for img in [enhanced_image] + augmented_images:
                rgb_img = cv2.cvtColor(img, cv2.COLOR_BGR2RGB)
                face_locs = face_recognition.face_locations(rgb_img)

                if face_locs:
                    face_encodings = face_recognition.face_encodings(rgb_img, face_locs)
                    if face_encodings:
                        face_encoding = face_encodings[0]  # Use first face found
                        break  # Found encoding, exit augmentation loop

            if 'face_encoding' not in locals():
                return {"recognized": False, "message": "Could not encode face"}

            # Use vector database for recognition (if available)
            if self.use_vector_db and VECTOR_DB_AVAILABLE:
                try:
                    matches = vector_db.find_similar_faces(face_encoding)
                    if matches:
                        best_match = matches[0]
                        return {
                            "recognized": True,
                            "user_id": best_match["user_id"],
                            "user_name": best_match["user_name"],
                            "confidence": best_match["confidence"],
                            "face_location": face_location,
                            "method": "vector_db"
                        }
                except Exception as e:
                    print(f"Vector DB error: {e}. Falling back to local recognition.")
                    self.use_vector_db = False
            else:
                # Fallback to local recognition
                if self.known_faces:
                    matches = face_recognition.compare_faces(
                        self.known_faces,
                        face_encoding,
                        tolerance=self.tolerance
                    )

                    if True in matches:
                        face_distances = face_recognition.face_distance(
                            self.known_faces,
                            face_encoding
                        )

                        best_match_index = np.argmin(face_distances)
                        confidence = 1 - face_distances[best_match_index]

                        if confidence > 0.7:
                            return {
                                "recognized": True,
                                "user_id": self.known_names[best_match_index],
                                "confidence": float(confidence),
                                "face_location": face_location,
                                "method": "local"
                            }

            return {"recognized": False, "message": "Face not recognized"}

        except Exception as e:
             return {"recognized": False, "error": str(e)}

# Global instance
recognition_engine = FacialRecognition()
