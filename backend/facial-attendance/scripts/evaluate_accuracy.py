
import os
import face_recognition
from qdrant_client import QdrantClient
from qdrant_client.models import Distance
from pathlib import Path
import time

client = QdrantClient(url="http://localhost:6333")

TEST_PATH = Path("data/training_data")

# Full evaluation mode (no limits)
MAX_PEOPLE = None  # Process all people
MAX_IMAGES_PER_PERSON = 10  # Process max 10 images per person

correct = 0
total = 0
processed_images = 0
start_time = time.time()

# Get all person directories and sort them
all_people = sorted(os.listdir(TEST_PATH))
if MAX_PEOPLE:
    all_people = all_people[:MAX_PEOPLE]

print(f"Starting evaluation on {len(all_people)} people (max {MAX_IMAGES_PER_PERSON} images each)")

for i, person in enumerate(all_people, 1):
    person_folder = os.path.join(TEST_PATH, person)

    # Skip files, only process directories (person folders)
    if not os.path.isdir(person_folder):
        continue

    # Get image files for this person
    image_files = [f for f in os.listdir(person_folder)
                   if f.lower().endswith(('.jpg', '.jpeg', '.png'))]

    if MAX_IMAGES_PER_PERSON:
        image_files = image_files[:MAX_IMAGES_PER_PERSON]

    for file in image_files:
        img_path = os.path.join(person_folder, file)

        # Load test face
        image = face_recognition.load_image_file(img_path)
        encodings = face_recognition.face_encodings(image)

        if not encodings:
            continue

        query = encodings[0]

        # Search Qdrant
        results = client.query_points(
            collection_name="faces",
            query=query,
            limit=1
        )

        if not results.points:
            continue  # No results found

        predicted = results.points[0].payload.get("user_name") or results.points[0].payload.get("user_id")

        total += 1
        processed_images += 1
        if predicted == person:
            correct += 1

    # Progress update every 100 people
    if i % 100 == 0:
        elapsed = time.time() - start_time
        rate = processed_images / elapsed if elapsed > 0 else 0
        print(f"Processed {i}/{len(all_people)} people, {processed_images} images, {rate:.1f} img/sec")

accuracy = correct / total * 100 if total > 0 else 0
elapsed_time = time.time() - start_time

print(f"\nEvaluation completed!")
print(f"Accuracy: {accuracy:.2f}% | ({correct}/{total}) correct")
print(f"Processed: {len(all_people)} people, {processed_images} images")
print(f"Time taken: {elapsed_time:.1f} seconds ({processed_images/elapsed_time:.1f} images/second)")

print(f"\nFull evaluation completed on {len(all_people)} people from the training dataset.")