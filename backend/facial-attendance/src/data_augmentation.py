import cv2
import numpy as np
from typing import List

# Try to import albumentations; fall back to no-op augmentation if unavailable
try:
    import albumentations as A
    _HAS_ALBUMENTATIONS = True
except ImportError:
    _HAS_ALBUMENTATIONS = False

class RealTimeAugmentation:
    def __init__(self):
        if _HAS_ALBUMENTATIONS:
            # Build pipeline safely – skip transforms that may not exist in the
            # installed version of albumentations.
            transforms = [
                A.Rotate(limit=15, p=0.3),
                A.GaussianBlur(blur_limit=3, p=0.2),
                A.RandomBrightnessContrast(p=0.3),
            ]
            # GaussNoise / RandomShadow may have different API across versions
            try:
                transforms.append(A.GaussNoise(p=0.2))
            except Exception:
                pass
            try:
                transforms.append(A.RandomShadow(p=0.2))
            except Exception:
                pass
            self.augmentation_pipeline = A.Compose(transforms)
        else:
            self.augmentation_pipeline = None

    def augment_face(self, full_image: np.ndarray) -> List[np.ndarray]:
        """Generate augmented versions of full image for better face recognition"""
        if self.augmentation_pipeline is None:
            return []  # No augmentation available

        augmented_images = []
        try:
            for _ in range(3):
                augmented = self.augmentation_pipeline(image=full_image)
                augmented_images.append(augmented['image'])
        except Exception as e:
            print(f"⚠️  Augmentation failed (non-fatal): {e}")

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
