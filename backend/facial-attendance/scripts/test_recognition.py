#!/usr/bin/env python3
"""
Test script for facial recognition system
"""

import cv2
import sys
from pathlib import Path

# Add src directory to path
sys.path.append(str(Path(__file__).parent.parent))

from src.face_recognition import recognition_engine
from src.vector_db import vector_db

def test_recognition():
    """Test facial recognition with sample images"""
    print("🧪 Testing Facial Recognition System")
    print("=" * 50)

    # Check if vector database has trained faces
    known_faces = vector_db.get_all_known_faces()
    if not known_faces:
        print("❌ No trained faces found in database!")
        print("Run training script first: python scripts/train_model.py")
        return

    print(f"✅ Found {len(known_faces)} trained users: {list(known_faces.keys())}")

    # Test with training images
    training_dir = Path("data/training_data")
    if not training_dir.exists():
        print("❌ No test images found in data/training_data/")
        return

    print("\n🧪 Testing recognition on training images...")

    for user_folder in training_dir.iterdir():
        if not user_folder.is_dir():
            continue

        user_name = user_folder.name
        print(f"\n👤 Testing user: {user_name}")

        # Test first image of each user
        test_images = list(user_folder.glob("*.jpg")) + list(user_folder.glob("*.jpeg")) + list(user_folder.glob("*.png"))

        if not test_images:
            print("  ❌ No test images found")
            continue

        test_image_path = test_images[0]
        print(f"  🖼️  Testing with: {test_image_path.name}")

        # Load and test image
        image = cv2.imread(str(test_image_path))
        if image is None:
            print("  ❌ Failed to load test image")
            continue

        # Test recognition
        result = recognition_engine.recognize_face(image)

        if result.get("recognized"):
            recognized_user = result["user_id"]
            confidence = result["confidence"]
            method = result.get("method", "unknown")

            if recognized_user == user_name:
                print(f"  ✅ Recognized as {recognized_user} (Confidence: {confidence:.2f}) - {method}")
            else:
                print(f"  ⚠️  Recognized as {recognized_user} instead of {user_name} (Confidence: {confidence:.2f}) - {method}")
        else:
            print(f"  ❌ Not recognized - {result.get('message', 'Unknown error')}")

    print("\n" + "=" * 50)
    print("🧪 Test completed!")

if __name__ == "__main__":
    test_recognition()
