from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from datetime import datetime
import uuid
import bcrypt
import re

app = Flask(__name__)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})  # Restrict CORS to frontend origin

# MongoDB connection
mongo_uri = "mongodb://localhost:27017/hrDashboard"  # Local MongoDB
# mongo_uri = "mongodb+srv://<username>:<password>@cluster0.mongodb.net/hrDashboard?retryWrites=true&w=majority"  # MongoDB Atlas
client = MongoClient(mongo_uri)
db = client['hrDashboard']  # Database name

# Validate email format
def is_valid_email(email):
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_regex, email)

# API Endpoints

# User Signup
@app.route('/api/signup', methods=['POST'])
def signup():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400

        # Check if email already exists
        if db.users.find_one({"email": email}):
            return jsonify({"error": "Email already registered"}), 409

        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        user = {
            "id": str(uuid.uuid4()),
            "email": email,
            "hashedPassword": hashed_password,
            "createdAt": datetime.utcnow()
        }
        db.users.insert_one(user)
        del user['_id']  # Remove MongoDB _id
        del user['hashedPassword']  # Remove sensitive data from response
        return jsonify({"message": "User registered successfully", "user": user}), 201
    except Exception as e:
        return jsonify({"error": f"Failed to register user: {str(e)}"}), 500

# User Login
@app.route('/api/login', methods=['POST'])
def login():
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Find user by email
        user = db.users.find_one({"email": email}, {'_id': 0})
        if not user:
            return jsonify({"error": "Invalid email or password"}), 401

        # Verify password
        if not bcrypt.checkpw(password.encode('utf-8'), user['hashedPassword'].encode('utf-8')):
            return jsonify({"error": "Invalid email or password"}), 401

        del user['hashedPassword']  # Remove sensitive data from response
        return jsonify({"message": "Login successful", "user": user}), 200
    except Exception as e:
        return jsonify({"error": f"Failed to login: {str(e)}"}), 500

# Get all roles
@app.route('/api/roles', methods=['GET'])
def get_roles():
    try:
        roles = list(db.roles.find({}, {'_id': 0}))  # Exclude MongoDB's _id field
        return jsonify(roles), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch roles: {str(e)}"}), 500

# Create a new role
@app.route('/api/roles', methods=['POST'])
def create_role():
    try:
        data = request.get_json()
        title = data.get("title")
        description = data.get("description")
        date = data.get("date")
        max_students = data.get("maxStudents")
        seats_available = data.get("seatsAvailable")

        if not title or not description or not date or not max_students or not seats_available:
            return jsonify({"error": "Required fields: title, description, date, maxStudents, seatsAvailable"}), 400

        try:
            max_students = int(max_students)
            seats_available = int(seats_available)
            if max_students < 1 or seats_available < 0 or seats_available > max_students:
                return jsonify({"error": "Invalid maxStudents or seatsAvailable values"}), 400
        except ValueError:
            return jsonify({"error": "maxStudents and seatsAvailable must be numbers"}), 400

        role = {
            "id": str(uuid.uuid4()),
            "title": title,
            "description": description,
            "date": date,
            "duration": data.get("duration", "60"),
            "maxStudents": max_students,
            "seatsAvailable": seats_available,
            "package": data.get("package", ""),
            "studentsCount": 0,
            "status": "Draft",
            "createdAt": datetime.utcnow()
        }
        db.roles.insert_one(role)
        del role['_id']  # Remove MongoDB _id for frontend compatibility
        return jsonify(role), 201
    except Exception as e:
        return jsonify({"error": f"Failed to create role: {str(e)}"}), 500

# Get all students
@app.route('/api/students', methods=['GET'])
def get_students():
    try:
        students = list(db.students.find({}, {'_id': 0, 'password': 0}))  # Exclude _id and password
        return jsonify(students), 200
    except Exception as e:
        return jsonify({"error": f"Failed to fetch students: {str(e)}"}), 500

# Create a new student
@app.route('/api/students', methods=['POST'])
def create_student():
    try:
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        roll_no = data.get("rollNo")
        role = data.get("role")
        password = data.get("password")

        if not name or not email or not roll_no or not role or not password:
            return jsonify({"error": "Required fields: name, email, rollNo, role, password"}), 400

        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400

        if db.students.find_one({"email": email}):
            return jsonify({"error": "Student email already registered"}), 409

        # Hash the password
        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        student = {
            "id": str(uuid.uuid4()),
            "name": name,
            "email": email,
            "rollNo": roll_no,
            "role": role,
            "password": hashed_password,
            "status": "Eligible",
            "createdAt": datetime.utcnow()
        }
        db.students.insert_one(student)
        del student['_id']  # Remove MongoDB _id
        del student['password']  # Remove password from response
        return jsonify(student), 201
    except Exception as e:
        return jsonify({"error": f"Failed to create student: {str(e)}"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)