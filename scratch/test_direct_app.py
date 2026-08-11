import sys
sys.path.append("d:/mockai/backend")
import json
import numpy as np
from app import app, db

def test_flask_app():
    client = app.test_client()

    print("--- 1. Testing GET /api/students with teacherEmail ---")
    res = client.get("/api/students?teacherEmail=test_teacher@example.com")
    print(f"GET /api/students -> Status: {res.status_code}, Body: {res.get_json()}")

    print("\n--- 2. Testing /api/verify-face Endpoint ---")
    ref_desc = np.random.randn(128).astype(float).tolist()
    live_desc_same = (np.array(ref_desc) + np.random.normal(0, 0.02, 128)).tolist()
    live_desc_diff = np.random.randn(128).astype(float).tolist()

    res_same = client.post("/api/verify-face", json={
        "referenceDescriptor": ref_desc,
        "liveDescriptor": live_desc_same,
        "threshold": 0.55
    })
    print(f"Same person -> Status: {res_same.status_code}, Body: {res_same.get_json()}")

    res_diff = client.post("/api/verify-face", json={
        "referenceDescriptor": ref_desc,
        "liveDescriptor": live_desc_diff,
        "threshold": 0.55
    })
    print(f"Different person -> Status: {res_diff.status_code}, Body: {res_diff.get_json()}")

if __name__ == "__main__":
    test_flask_app()
