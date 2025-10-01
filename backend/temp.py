from groq import Groq
import os
import base64

# Initialize client
client = Groq(api_key="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")

# Function to encode local image to base64
def encode_image(image_path):
    with open(image_path, "rb") as img_file:
        return base64.b64encode(img_file.read()).decode("utf-8")

# Encode your local image
base64_image = encode_image(r"S:\mock\backend\istockphoto-1143533761-612x612.jpg")

# Send request with base64 image
completion = client.chat.completions.create(
    model="meta-llama/llama-4-scout-17b-16e-instruct",
    messages=[
        {
            "role": "user",
            "content": [
                {"type": "text", "text": "What's in this image?"},
                {
                    "type": "image_url",
                    "image_url": {"url": f"data:image/jpeg;base64,{base64_image}"}
                }
            ]
        }
    ],
    temperature=1,
    max_completion_tokens=1024,
    top_p=1,
    stream=False
)

print(completion.choices[0].message.content)
