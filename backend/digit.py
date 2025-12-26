# =========================
# DIGIT DATASET GENERATOR
# =========================

import os
import cv2
import numpy as np
import random

# ---------- CONFIG ----------
BASE_PATH = "numbers_generated"
IMG_SIZE = 96
IMAGES_PER_CLASS = 100

DIGITS = {
    "zero": "0",
    "one": "1",
    "two": "2",
    "three": "3",
    "four": "4",
    "five": "5",
    "six": "6",
    "seven": "7",
    "eight": "8",
    "nine": "9"
}

FONTS = [
    cv2.FONT_HERSHEY_SIMPLEX,
    cv2.FONT_HERSHEY_DUPLEX,
    cv2.FONT_HERSHEY_COMPLEX,
    cv2.FONT_HERSHEY_TRIPLEX
]

# ---------- CREATE FOLDERS ----------
os.makedirs(BASE_PATH, exist_ok=True)
for folder in DIGITS.keys():
    os.makedirs(os.path.join(BASE_PATH, folder), exist_ok=True)

# ---------- IMAGE GENERATOR ----------
def generate_digit_image(digit):
    # White background
    img = np.ones((IMG_SIZE, IMG_SIZE), dtype=np.uint8) * 255

    font = random.choice(FONTS)
    font_scale = random.uniform(2.2, 3.2)
    thickness = random.randint(4, 7)

    text_size = cv2.getTextSize(digit, font, font_scale, thickness)[0]

    # Center digit
    x = (IMG_SIZE - text_size[0]) // 2
    y = (IMG_SIZE + text_size[1]) // 2

    cv2.putText(
        img, digit, (x, y),
        font, font_scale, (0,),
        thickness, cv2.LINE_AA
    )

    # Light Gaussian noise
    noise = np.random.normal(0, 6, (IMG_SIZE, IMG_SIZE))
    img = img + noise
    img = np.clip(img, 0, 255).astype(np.uint8)

    return img

# ---------- GENERATE DATASET ----------
for name, digit in DIGITS.items():
    print(f"Generating {IMAGES_PER_CLASS} images for '{name}'")

    for i in range(IMAGES_PER_CLASS):
        img = generate_digit_image(digit)
        save_path = os.path.join(BASE_PATH, name, f"{digit}_{i}.png")
        cv2.imwrite(save_path, img)

print("\n✅ Dataset generation completed successfully!")
