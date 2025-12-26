import os
import numpy as np
from PIL import Image, ImageDraw, ImageFont, ImageFilter
import random

# Folder names for digits
digit_names = ["zero","one","two","three","four","five","six","seven","eight","nine"]

# Create dataset folder
base_path = "numbers"
os.makedirs(base_path, exist_ok=True)

# Available fonts
fonts = [
    "arial.ttf",
    "calibri.ttf",
    "times.ttf"
]

def apply_wave_distortion(img):
    """Apply small sinusoidal distortion for variety."""
    arr = np.array(img)
    rows, cols = arr.shape
    new_arr = np.zeros_like(arr)

    for i in range(rows):
        shift = int(5 * np.sin(i / 20))  # small wave distortion
        new_arr[i] = np.roll(arr[i], shift)

    return Image.fromarray(new_arr)

def generate_digit_image(digit, save_path):
    img = Image.new("L", (256, 256), color=255)
    draw = ImageDraw.Draw(img)

    # Random font + random size
    font_size = random.randint(120, 200)
    font = ImageFont.truetype(random.choice(fonts), font_size)

    # Random position
    x = random.randint(20, 80)
    y = random.randint(10, 60)

    # Random dark shade for text
    text_color = random.randint(0, 60)

    # ---- BOLD OUTLINE effect ---- #
    for dx in [-2, -1, 0, 1, 2]:
        for dy in [-2, -1, 0, 1, 2]:
            draw.text((x + dx, y + dy), str(digit), fill=text_color, font=font)

    # Main text
    draw.text((x, y), str(digit), fill=text_color, font=font)

    # ---- Random rotation (safe) ---- #
    img = img.rotate(random.randint(-35, 35), expand=True, fillcolor=255)

    # ---- Apply wave distortion ---- #
    if random.random() > 0.5:
        img = apply_wave_distortion(img)

    # ---- Random blur ---- #
    if random.random() > 0.6:
        img = img.filter(ImageFilter.GaussianBlur(radius=random.uniform(0.5, 2.0)))

    # ---- Extra background noise ---- #
    arr = np.array(img)
    h, w = arr.shape  # actual size after rotation
    noise = np.random.randint(0, 25, (h, w))
    mask = np.random.rand(h, w) < 0.03
    arr[mask] = noise[mask]

    img = Image.fromarray(arr)

    # Final resize
    img = img.resize((256, 256))

    img.save(save_path)

# Generate dataset
for digit in range(10):
    folder_name = digit_names[digit]  # Use names like "zero", "one", ...
    digit_dir = os.path.join(base_path, folder_name)
    os.makedirs(digit_dir, exist_ok=True)

    for i in range(100):
        save_path = os.path.join(digit_dir, f"{digit}_{i}.png")
        generate_digit_image(digit, save_path)

base_path
