import requests

HF_TOKEN = "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"
API_URL = "https://api-inference.huggingface.co/models/microsoft/trocr-large-printed"

def ocr_from_hf(image_path):
    with open(image_path, "rb") as f:
        image_bytes = f.read()

    headers = {
        "Authorization": f"Bearer {HF_TOKEN}",
        "Content-Type": "image/png"
    }

    response = requests.post(
        API_URL,
        headers=headers,
        data=image_bytes,
        params={"wait_for_model": "true"}
    )

    try:
        result = response.json()
    except Exception:
        print("RESPONSE TEXT:", response.text)
        raise

    return result[0]["generated_text"]

print(ocr_from_hf(r"C:\Users\HP\Downloads\numbers\zero\0_53.png"))
