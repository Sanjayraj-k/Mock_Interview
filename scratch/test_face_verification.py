import requests
import json
import numpy as np

BASE_URL = "http://localhost:5000"

def test_api():
    print("1. Testing GET /api/students...")
    try:
        res = requests.get(f"{BASE_URL}/api/students?teacherEmail=test_teacher@example.com")
        print(f"Status: {res.status_code}, Students: {len(res.json()) if res.status_code == 200 else res.text}")
    except Exception as e:
        print(f"Error GET /api/students: {e}")

    print("\n2. Testing /api/verify-face endpoint with synthetic 128-D descriptors...")
    try:
        # Create identical 128-D unit vector
        ref_desc = np.random.randn(128).astype(float).tolist()
        # Similar vector with tiny perturbation
        live_desc_same = (np.array(ref_desc) + np.random.normal(0, 0.02, 128)).tolist()
        # Completely different vector
        live_desc_diff = np.random.randn(128).astype(float).tolist()

        # Test MATCH
        res_same = requests.post(f"{BASE_URL}/api/verify-face", json={
            "referenceDescriptor": ref_desc,
            "liveDescriptor": live_desc_same,
            "threshold": 0.55
        })
        print(f"Same person test -> Status: {res_same.status_code}, Result: {res_same.json()}")

        # Test MISMATCH
        res_diff = requests.post(f"{BASE_URL}/api/verify-face", json={
            "referenceDescriptor": ref_desc,
            "liveDescriptor": live_desc_diff,
            "threshold": 0.55
        })
        print(f"Different person test -> Status: {res_diff.status_code}, Result: {res_diff.json()}")

    except Exception as e:
        print(f"Error /api/verify-face: {e}")

if __name__ == "__main__":
    test_api()
