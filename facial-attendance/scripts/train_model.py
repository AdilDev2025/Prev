#!/usr/bin/env python3
"""
Training script for facial recognition model.
Place training images in data/training_data/{user_name}/ directory
"""

import os
import cv2
import sys
import numpy as np
from pathlib import Path

# Add src directory to path
sys.path.append(str(Path(__file__).parent.parent))

from src.face_recognition import FacialRecognition

# Optional vector_db importz
try:
    from src.vector_db import vector_db
    VECTOR_DB_AVAILABLE = True
except ImportError:
    VECTOR_DB_AVAILABLE = False
    vector_db = None

def train_on_dataset():
    """Train model on collected face data"""
    training_dir = Path("data/training_data")

    if not training_dir.exists():
        print("❌ Training data directory not found!")
        print("Create directory structure: data/training_data/{user_name}/")
        print("Add face images for each user.")
        return

    recognition = FacialRecognition()
    trained_users = []

    print("🤖 Starting facial recognition training...")
    print("=" * 50)

    for user_folder in sorted(training_dir.iterdir()):
        if not user_folder.is_dir():
            continue

        user_name = user_folder.name
        print(f"📸 Training on user: {user_name}")

        face_images = []
        image_count = 0

        for image_file in user_folder.iterdir():
            if image_file.suffix.lower() in ['.jpg', '.jpeg', '.png']:
                image_path = str(image_file)
                image = cv2.imread(image_path)

                if image is not None:
                    face_images.append(image)
                    image_count += 1
                    print(f"  ✓ Loaded {image_file.name}")
                else:
                    print(f"  ❌ Failed to load {image_file.name}")

        # Process face images
        if face_images:
            print(f"  🚀 Processing {image_count} face images...")

            if vector_db is not None:
                # Full enrollment with vector database
                success = vector_db.enroll_user_faces(user_name, face_images, user_name=user_name)
                if success:
                    trained_users.append(user_name)
                    print(f"  ✅ Successfully enrolled {user_name}")
                else:
                    print(f"  ❌ Failed to enroll {user_name} - no valid faces found")
            else:
                # Basic face processing without database
                recognition = FacialRecognition()
                embeddings_processed = 0

                for image in face_images:
                    try:
                        embedding = recognition.extract_face_embedding(image)
                        embeddings_processed += 1
                        print(f"    ✓ Extracted embedding ({embedding.shape})")
                    except ValueError as e:
                        print(f"    ⚠️  Failed to process image: {e}")

                if embeddings_processed > 0:
                    trained_users.append(user_name)
                    print(f"  ✅ Successfully processed {embeddings_processed} embeddings for {user_name}")
                    print("    📝 Note: Install qdrant-client to store embeddings permanently")
                else:
                    print(f"  ❌ Failed to process any faces for {user_name}")
        else:
            print(f"  ⚠️  No valid images found for {user_name}")

        print()

    print("=" * 50)
    print("📊 Training Summary:")
    print(f"  Total users processed: {len(trained_users)}")
    print(f"  Processed users: {', '.join(trained_users[:5])}{'...' if len(trained_users) > 5 else ''}" if trained_users else "None")

    if vector_db is not None:
        print("  🗄️  Storage: Vector database (permanent)")
        print("  🔍 Recognition: Vector similarity search")
    else:
        print("  💾 Storage: Temporary (face processing only)")
        print("  ⚠️  Recognition: Limited without vector database")
        print("  💡 Install qdrant-client and start Qdrant server for permanent storage")

    if trained_users:
        print("\n🎉 Face processing completed successfully!")
        if VECTOR_DB_AVAILABLE:
            print("You can now test recognition with the API endpoints.")
        else:
            print("Install qdrant-client to enable permanent storage and recognition.")
    else:
        print("\n❌ No users were successfully processed.")
        print("Make sure you have clear face images in the training directories.")

if __name__ == "__main__":
    train_on_dataset()
