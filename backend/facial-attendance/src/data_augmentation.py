import cv2
import numpy as np
import albumentations as A
from typing import List

class RealTimeAugmentation:
    def __init__(self):
        self.augmentation_pipeline = A.Compose([
            A.Rotate(limit=15, p=0.3),
            A.GaussianBlur(blur_limit=3, p=0.2),
            A.GaussNoise(p=0.2),
            A.RandomBrightnessContrast(p=0.3),
            A.RandomShadow(p=0.2),
        ])

    def augment_face(self, full_image: np.ndarray) -> List[np.ndarray]:
        """Generate augmented versions of full image for better face recognition"""
        augmented_images = []

        for _ in range(3):
            augmented = self.augmentation_pipeline(image=full_image)
            augmented_images.append(augmented['image'])

        return augmented_images

    def enhance_image_quality(self, image: np.ndarray) -> np.ndarray:
        """Enhance image quality for better recognition"""
        lab = cv2.cvtColor(image, cv2.COLOR_BGR2LAB)
        clahe = cv2.createCLAHE(clipLimit=3.0, tileGridSize=(8,8))
        lab[:, :, 0] = clahe.apply(lab[:, :, 0])
        enhanced = cv2.cvtColor(lab, cv2.COLOR_LAB2BGR)

        return enhanced

# Global instance
augmenter = RealTimeAugmentation()
