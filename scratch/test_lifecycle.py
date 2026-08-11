import sys
sys.path.append("d:/mockai/backend")
import json
import numpy as np
from app import app, db

def test_student_lifecycle():
    client = app.test_client()

    # Generate synthetic 128-D descriptor
    mock_descriptor = np.random.randn(128).astype(float).tolist()

    test_student = {
        "teacherEmail": "prof_smith@kongu.edu",
        "name": "Arun Kumar",
        "email": "arun.kumar@kongu.edu",
        "rollNo": "21CS042",
        "role": "Student",
        "password": "SecurePassword123",
        "assignedRounds": ["coding", "aptitude"],
        "faceDescriptor": mock_descriptor,
        "idCardPhoto": "data:image/jpeg;base64,samplephoto"
    }

    # Clean up if exists
    db.students.delete_many({"email": "arun.kumar@kongu.edu"})

    print("--- 1. Creating Student with Face Descriptor ---")
    create_res = client.post("/api/students", json=test_student)
    print("Create Status:", create_res.status_code)
    created = create_res.get_json()
    print("Created Student ID:", created.get("_id"), "hasFaceRegistered:", created.get("hasFaceRegistered"))

    print("\n--- 2. Fetching Students for Teacher ---")
    get_res = client.get("/api/students?teacherEmail=prof_smith@kongu.edu")
    print("GET Status:", get_res.status_code, "Count:", len(get_res.get_json()))
    for s in get_res.get_json():
        print(f"Student: {s.get('name')}, Roll: {s.get('rollNo')}, hasFaceRegistered: {s.get('hasFaceRegistered')}")

    print("\n--- 3. Candidate Login with Face Embedding Retrieval ---")
    login_res = client.post("/api/candidate/login", json={
        "email": "arun.kumar@kongu.edu",
        "password": "SecurePassword123"
    })
    print("Login Status:", login_res.status_code)
    logged_in = login_res.get_json()
    student_obj = logged_in.get("student", {})
    print("Student Name:", student_obj.get("name"))
    print("Has Face Registered:", student_obj.get("hasFaceRegistered"))
    print("Descriptor Length:", len(student_obj.get("faceDescriptor", [])))

    # Clean up test user
    db.students.delete_many({"email": "arun.kumar@kongu.edu"})
    print("\nTest completed & cleaned up successfully.")

if __name__ == "__main__":
    test_student_lifecycle()
