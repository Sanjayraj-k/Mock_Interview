from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import bcrypt
import re
from pytz import timezone
import numpy as np
import json

app = Flask(__name__)
# This allows your React app at localhost:5173 to communicate with your Flask server
import os
from dotenv import load_dotenv
load_dotenv()
from flask_cors import CORS
from pymongo import MongoClient
from aiassistant import aiassistant_bp
from ats import ats_bp
from interview import interview_bp
from facetrack import facetrack_bp
from quiz import quiz_bp
from questionbank import questionbank_bp, init_questionbank, initialize_database
from companyscrap_bp import companyscrap_bp
from Domainforum import domainforum_bp, init_domainforum
from practicequiz_bp import practicequiz_bp
from hrround import hrround_bp
from technical_interview_bp import tech_interview_bp

# --- CORS & Session setup ---
app.secret_key = os.environ.get("FLASK_SECRET_KEY", "dev-secret-key")
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}, supports_credentials=True)

# --- Register Blueprints ---
app.register_blueprint(aiassistant_bp)
app.register_blueprint(ats_bp)
app.register_blueprint(interview_bp)
app.register_blueprint(facetrack_bp)
app.register_blueprint(quiz_bp)
app.register_blueprint(questionbank_bp)
app.register_blueprint(companyscrap_bp)
app.register_blueprint(domainforum_bp)
app.register_blueprint(practicequiz_bp)
app.register_blueprint(hrround_bp)
app.register_blueprint(tech_interview_bp)

# Initialize services that require app context
with app.app_context():
    init_questionbank(app)
    init_domainforum(app)
    try:
        initialize_database()
    except Exception:
        pass

# --- Database connection ---
mongo_uri = os.environ.get("MONGO_URI", "mongodb://localhost:27017/")
db_name = os.environ.get("DB_NAME", "hrDashboard")

client = MongoClient(mongo_uri)
db = client[db_name]


# --- Helper Functions ---
def is_valid_email(email):
    """Validates email format."""
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_regex, email)

# --- Authentication Endpoints ---

@app.route('/api/signup', methods=['POST'])
def signup():
    """Registers a new HR user."""
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
        if db.users.find_one({"email": email}):
            return jsonify({"error": "Email already registered"}), 409

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = {"email": email, "hashedPassword": hashed_password, "createdAt": datetime.utcnow()}
        db.users.insert_one(user)
        
        user_response = {"email": user["email"], "createdAt": user["createdAt"]}
        return jsonify({"message": "User registered successfully", "user": user_response}), 201
    except Exception as e:
        app.logger.error(f"Signup error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/login', methods=['POST'])
def login():
    """Logs in an HR user."""
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user = db.users.find_one({"email": email})
        if not user or not bcrypt.checkpw(password.encode('utf-8'), user['hashedPassword'].encode('utf-8')):
            return jsonify({"error": "Invalid email or password"}), 401
        
        user_response = {"email": user["email"], "id": str(user["_id"])}
        return jsonify({"message": "Login successful", "user": user_response}), 200
    except Exception as e:
        app.logger.error(f"Login error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- Candidate Login Endpoint ---
@app.route('/api/candidate/login', methods=['POST'])
def candidate_login():
    """Logs in a candidate (student) user and returns stored biometric face embeddings."""
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        # Find student in the database using email only
        student = db.students.find_one({"email": email})
        if not student or not bcrypt.checkpw(password.encode('utf-8'), student['password'].encode('utf-8')):
            return jsonify({"error": "Invalid credentials"}), 401

        # Prepare response (exclude password)
        face_desc = student.get("faceDescriptor", [])
        student_response = {
            "id": str(student["_id"]),
            "name": student.get("name", ""),
            "email": student.get("email", ""),
            "role": student.get("role", ""),
            "rollNo": student.get("rollNo", ""),
            "status": student.get("status", "Eligible"),
            "assignedRounds": student.get("assignedRounds", ["coding"]),
            "faceDescriptor": face_desc,
            "hasFaceRegistered": bool(isinstance(face_desc, list) and len(face_desc) > 0),
            "idCardPhoto": student.get("idCardPhoto", "")
        }
        # Simulate a token (replace with JWT in production)
        token = "dummy-token"

        return jsonify({
            "message": "Login successful",
            "student": student_response,
            "token": token
        }), 200
    except Exception as e:
        app.logger.error(f"Candidate login error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- Roles Endpoints (Scoped to HR User) ---

@app.route('/api/roles', methods=['GET'])
def get_roles():
    """Gets all roles created by a specific HR user."""
    hr_email = request.args.get('hrEmail')
    if not hr_email:
        return jsonify({"error": "hrEmail query parameter is required"}), 400
    
    try:
        roles_cursor = db.roles.find({"hrEmail": hr_email})
        roles_list = []
        for role in roles_cursor:
            role['_id'] = str(role['_id'])  # Convert ObjectId for JSON compatibility
            roles_list.append(role)
        return jsonify(roles_list), 200
    except Exception as e:
        app.logger.error(f"Get roles error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/roles', methods=['POST'])
def create_role():
    """Creates a new role and associates it with the logged-in HR user."""
    try:
        data = request.get_json()
        hr_email = data.get("hrEmail")
        
        if not hr_email:
            return jsonify({"error": "hrEmail is required to create a role"}), 400

        # Basic validation for required fields
        required_fields = ["title", "description", "date", "maxStudents", "seatsAvailable", "package"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing one of required fields: {required_fields}"}), 400

        role = {
            "hrEmail": hr_email,
            "title": data.get("title"),
            "description": data.get("description"),
            "date": data.get("date"),
            "duration": data.get("duration", "60"),
            "maxStudents": int(data.get("maxStudents")),
            "seatsAvailable": int(data.get("seatsAvailable")),
            "package": data.get("package"),
            "assignedStudents": data.get("assignedStudents", []),
            "assignedGroups": data.get("assignedGroups", []),
            "studentsCount": 0,
            "status": "Draft",
            "createdAt": datetime.utcnow()
        }
        result = db.roles.insert_one(role)
        role['_id'] = str(result.inserted_id)
        return jsonify(role), 201
    except Exception as e:
        app.logger.error(f"Create role error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- Students Endpoints (Scoped to HR User) ---

@app.route('/api/students', methods=['GET'])
def get_students():
    """Gets all students added by a specific HR user or Teacher."""
    teacher_email = request.args.get('hrEmail') or request.args.get('teacherEmail')
    if not teacher_email:
        return jsonify({"error": "hrEmail or teacherEmail query parameter is required"}), 400
        
    try:
        # Find students, excluding the sensitive password field from the result
        students_cursor = db.students.find(
            {"$or": [{"hrEmail": teacher_email}, {"teacherEmail": teacher_email}]},
            {'password': 0}
        )
        students_list = []
        for student in students_cursor:
            student['_id'] = str(student['_id'])
            face_desc = student.get('faceDescriptor', [])
            student['hasFaceRegistered'] = bool(isinstance(face_desc, list) and len(face_desc) > 0)
            students_list.append(student)
        return jsonify(students_list), 200
    except Exception as e:
        app.logger.error(f"Get students error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/students', methods=['POST'])
def create_student():
    """Creates a new student with optional ID card biometric face embedding."""
    try:
        data = request.get_json()
        teacher_email = data.get("hrEmail") or data.get("teacherEmail")

        if not teacher_email:
            return jsonify({"error": "hrEmail or teacherEmail is required to add a student"}), 400
        
        required_fields = ["name", "email", "rollNo", "role", "password"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing one of required fields: {required_fields}"}), 400
        
        if db.students.find_one({"email": data.get("email")}):
            return jsonify({"error": "A student with this email already exists"}), 409

        hashed_password = bcrypt.hashpw(data.get("password").encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        face_descriptor = data.get("faceDescriptor", [])
        if isinstance(face_descriptor, list):
            try:
                face_descriptor = [float(x) for x in face_descriptor]
            except Exception:
                face_descriptor = []

        assigned_rounds = data.get("assignedRounds", ["coding"])
        if isinstance(assigned_rounds, str):
            assigned_rounds = [assigned_rounds]

        # Handle optional group assignments (students can belong to multiple groups)
        group_ids = data.get("groupIds", [])
        group_names = []
        for gid in group_ids:
            grp = db.student_groups.find_one({"_id": ObjectId(gid)})
            if grp:
                group_names.append(grp["name"])

        student = {
            "hrEmail": teacher_email,
            "teacherEmail": teacher_email,
            "name": data.get("name"),
            "email": data.get("email"),
            "rollNo": data.get("rollNo"),
            "role": data.get("role"),
            "password": hashed_password,
            "assignedRounds": assigned_rounds,
            "faceDescriptor": face_descriptor,
            "idCardPhoto": data.get("idCardPhoto", ""),
            "hasFaceRegistered": bool(len(face_descriptor) > 0),
            "groupIds": group_ids,
            "groupNames": group_names,
            "status": "Eligible",
            "createdAt": datetime.utcnow()
        }
        result = db.students.insert_one(student)
        student['_id'] = str(result.inserted_id)
        del student['password']  # Never send the password hash back in the response
        return jsonify(student), 201
    except Exception as e:
        app.logger.error(f"Create student error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/students/<student_id>/face-descriptor', methods=['POST'])
def update_student_face_descriptor(student_id):
    """Updates the biometric face embedding descriptor for an existing student."""
    try:
        data = request.get_json()
        face_descriptor = data.get("faceDescriptor", [])
        id_card_photo = data.get("idCardPhoto", "")

        if not face_descriptor or not isinstance(face_descriptor, list):
            return jsonify({"error": "Valid faceDescriptor array is required"}), 400

        face_descriptor = [float(x) for x in face_descriptor]

        update_fields = {
            "faceDescriptor": face_descriptor,
            "hasFaceRegistered": True,
            "updatedAt": datetime.utcnow()
        }
        if id_card_photo:
            update_fields["idCardPhoto"] = id_card_photo

        result = db.students.update_one(
            {"_id": ObjectId(student_id)},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            return jsonify({"error": "Student not found"}), 404

        return jsonify({"message": "Face embedding updated successfully", "hasFaceRegistered": True}), 200
    except Exception as e:
        app.logger.error(f"Update face descriptor error: {e}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/verify-face', methods=['POST'])
def verify_face_embeddings():
    """Compares two face embedding vectors (stored vs live) using Euclidean distance and Cosine similarity."""
    try:
        data = request.get_json()
        ref_descriptor = data.get("referenceDescriptor")
        live_descriptor = data.get("liveDescriptor")
        threshold = float(data.get("threshold", 0.55))

        if not ref_descriptor or not live_descriptor:
            return jsonify({"error": "Both referenceDescriptor and liveDescriptor are required"}), 400

        ref_vec = np.array(ref_descriptor, dtype=np.float32)
        live_vec = np.array(live_descriptor, dtype=np.float32)

        # Euclidean distance
        euclidean_distance = float(np.linalg.norm(ref_vec - live_vec))
        
        # Cosine similarity
        dot_product = float(np.dot(ref_vec, live_vec))
        norm_ref = float(np.linalg.norm(ref_vec))
        norm_live = float(np.linalg.norm(live_vec))
        cosine_similarity = float(dot_product / (norm_ref * norm_live)) if (norm_ref > 0 and norm_live > 0) else 0.0

        is_match = euclidean_distance < threshold
        confidence = max(0.0, min(100.0, (1.0 - (euclidean_distance / 1.0)) * 100))

        return jsonify({
            "isMatch": is_match,
            "euclideanDistance": euclidean_distance,
            "cosineSimilarity": cosine_similarity,
            "threshold": threshold,
            "confidence": confidence
        }), 200
    except Exception as e:
        app.logger.error(f"Verify face error: {e}")
        return jsonify({"error": str(e)}), 500
    
@app.route('/api/get-random-questions', methods=['GET'])
def get_random_questions():
    """Fetches a random set of questions from the aptitude collection."""
    try:
        total_questions = db.aptitude.count_documents({})
        if total_questions == 0:
            return jsonify({"error": "No questions available in the aptitude collection"}), 404

        num_questions = min(request.args.get('count', default=5, type=int), total_questions)
        pipeline = [{"$sample": {"size": num_questions}}]
        questions = list(db.aptitude.aggregate(pipeline))

        for question in questions:
            question['_id'] = str(question['_id'])

        return jsonify(questions), 200
    except Exception as e:
        app.logger.error(f"Get random questions error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- New Results Endpoint ---
@app.route('/api/submit-results', methods=['POST'])
def submit_results():
    """Stores quiz results for a candidate, including user details, score, percentage, and round."""
    try:
        data = request.get_json()
        candidate_data = data.get("candidate")
        score = data.get("score")
        percentage = data.get("percentage")
        total_questions = data.get("total_questions")
        round_number = data.get("round")

        # Validate required fields
        required_fields = ["id", "email", "rollNo", "role", "status"]
        if not candidate_data or not all(field in candidate_data for field in required_fields):
            return jsonify({"error": "Missing required candidate data fields: id, email, rollNo, role, status"}), 400
        if score is None or percentage is None or total_questions is None or round_number is None:
            return jsonify({"error": "Missing required fields: score, percentage, total_questions, or round"}), 400

        # Prepare quiz result document
        quiz_result = {
            "candidate_id": candidate_data["id"],
            "email": candidate_data["email"],
            "rollNo": candidate_data["rollNo"],
            "role": candidate_data["role"],
            "status": candidate_data["status"],
            "score": int(score),
            "percentage": float(percentage),
            "total_questions": int(total_questions),
            "round": int(round_number),
            "submittedAt": datetime.utcnow()
        }

        # Insert into quiz_results collection
        result = db.quiz_results.insert_one(quiz_result)
        quiz_result['_id'] = str(result.inserted_id)

        return jsonify({
            "message": "Quiz results stored successfully",
            "quiz_result": quiz_result
        }), 201
    except Exception as e:
        app.logger.error(f"Submit results error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500
@app.route('/api/round2/results', methods=['POST'])
def submit_round2_results():
    """Stores round 2 results for a candidate."""
    try:
        data = request.get_json()
        candidate_data = data.get("candidate")
        score = data.get("score")
        candidateId =data.get("candidateId")
        candidateName =data.get("candidateName")
        candidateEmail=data.get("candidateEmail")
        candidateRoll=data.get("candidateRoll")
        CandidateRollno=data.get("CandidateRollno")
        submissionDate= data.get("submissionDate")
        score = data.get("score")
        totalscore = data.get("totalScore")

        # Validate required fields
        

        # Prepare round 2 result document
        round2_result = {
            "candidateId": candidateId,
           
            "candidateEmail": candidateEmail,
            "candidateRoll": candidateRoll,
            "CandidateRollno": CandidateRollno,
            "submissionDate": submissionDate,
            "round": 2,
            "score": totalscore,
            "submittedAt": datetime.utcnow()
        }

        # Insert into round2_results collection
        result = db.quiz_results.insert_one(round2_result)
        round2_result['_id'] = str(result.inserted_id)

        return jsonify({
            "message": "Round 2 results stored successfully",
            "round2_result": round2_result
        }), 201
    except Exception as e:
        app.logger.error(f"Submit round 2 results error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500
@app.route('/api/round3/results', methods=['POST'])
def submit_round3_results():
    """Stores round 3 results for a candidate."""
    try:
        data = request.get_json()
        candidateId = data.get("candidateId")
        candidateEmail = data.get("candidateEmail")
        candidateRoll = data.get("candidateRoll")
        CandidateRollno = data.get("CandidateRollno")
        submissionDate = data.get("submissionDate")
        score = data.get("score")
        totalScore = data.get("totalScore")

        # Validate required fields
        required_fields = ["candidateId", "candidateEmail", "candidateRoll", "CandidateRollno", "submissionDate", "score", "totalScore"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing required fields: {required_fields}"}), 400

        # Prepare round 3 result document
        round3_result = {
            "candidateId": candidateId,
            "candidateEmail": candidateEmail,
            "candidateRoll": candidateRoll,
            "CandidateRollno": CandidateRollno,
            "submissionDate": submissionDate,
            "round": 3,
            "score": int(score),
            "totalScore": int(totalScore),
            "submittedAt": datetime.utcnow()
        }

        # Insert into quiz_results collection
        result = db.quiz_results.insert_one(round3_result)
        round3_result['_id'] = str(result.inserted_id)

        return jsonify({
            "message": "Round 3 results stored successfully",
            "round3_result": round3_result
        }), 201
    except Exception as e:
        app.logger.error(f"Submit round 3 results error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/round4/results', methods=['POST'])
def submit_round4_results():
    """Stores round 4 (HR behavioral) results for a candidate."""
    try:
        data = request.get_json()
        candidateId = data.get("candidateId")
        candidateEmail = data.get("candidateEmail")
        candidateRoll = data.get("candidateRoll")
        CandidateRollno = data.get("CandidateRollno")
        submissionDate = data.get("submissionDate")
        score = data.get("score")
        totalScore = data.get("totalScore")

        # Validate required fields
        required_fields = ["candidateId", "candidateEmail", "candidateRoll", "CandidateRollno", "submissionDate", "score", "totalScore"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing required fields: {required_fields}"}), 400

        # Prepare round 4 result document
        round4_result = {
            "candidateId": candidateId,
            "candidateEmail": candidateEmail,
            "candidateRoll": candidateRoll,
            "CandidateRollno": CandidateRollno,
            "submissionDate": submissionDate,
            "round": 4,
            "score": int(score),
            "totalScore": int(totalScore),
            "submittedAt": datetime.utcnow()
        }

        # Insert into quiz_results collection
        result = db.quiz_results.insert_one(round4_result)
        round4_result['_id'] = str(result.inserted_id)

        return jsonify({
            "message": "Round 4 (HR) results stored successfully",
            "round4_result": round4_result
        }), 201
    except Exception as e:
        app.logger.error(f"Submit round 4 results error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/test-results', methods=['GET'])
def get_test_results():
    """
    Fetches and aggregates all test results for a specific role, grouping by student.
    """
    role_title = request.args.get('role')

    if not role_title:
        return jsonify({"error": "role query parameter is required"}), 400

    try:
        # Step 1: Query the quiz_results collection by role title.
        results_cursor = db.quiz_results.find({
            "$or": [
                {"role": role_title},
                {"candidateRoll": role_title}
            ]
        })

        # Step 2: Aggregate results by student email.
        aggregated_results = {}
        for result in results_cursor:
            # Normalize email and roll number
            email = result.get('email') or result.get('candidateEmail')
            roll_no = result.get('rollNo') or result.get('CandidateRollno')

            if not email:
                continue # Skip records without an email

            # If student is not yet in our dictionary, add them.
            if email not in aggregated_results:
                aggregated_results[email] = {
                    "email": email,
                    "rollNo": roll_no,
                    "round1_score": None,
                    "round2_score": None,
                    "round3_score": None,
                    "round4_score": None,
                    "total_score": 0,
                    "max_round": 0,
                    "submissions": []
                }
            
            # Update scores for the specific round
            round_num = result.get('round')
            score = result.get('score', 0)
            
            if round_num == 1:
                aggregated_results[email]['round1_score'] = score
            elif round_num == 2:
                aggregated_results[email]['round2_score'] = score
            elif round_num == 3:
                aggregated_results[email]['round3_score'] = score
            elif round_num == 4:
                aggregated_results[email]['round4_score'] = score
            
            # Keep track of the highest round completed and submissions
            if round_num and round_num > aggregated_results[email]['max_round']:
                aggregated_results[email]['max_round'] = round_num
            
            # Add submission date for finding the latest one if needed
            submission_date = result.get('submittedAt') or result.get('submissionDate')
            if submission_date:
                aggregated_results[email]['submissions'].append(submission_date)

        # Step 3: Calculate total scores and finalize the list.
        final_results = []
        for email, data in aggregated_results.items():
            # Calculate total score
            data['total_score'] = sum(filter(None, [data['round1_score'], data['round2_score'], data['round3_score'], data['round4_score']]))
            # Find the last submission time
            data['lastSubmittedAt'] = max(data['submissions']) if data['submissions'] else None
            del data['submissions'] # Clean up temporary field
            final_results.append(data)
            
        # Sort by total score descending
        final_results.sort(key=lambda x: x['total_score'], reverse=True)

        return jsonify(final_results), 200

    except Exception as e:
        app.logger.error(f"Get aggregated test results error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


# ================================================================================================
# Student Groups Endpoints
# ================================================================================================

@app.route('/api/student-groups', methods=['GET'])
def get_student_groups():
    """Gets all student groups created by a specific HR user."""
    hr_email = request.args.get('hrEmail')
    if not hr_email:
        return jsonify({"error": "hrEmail query parameter is required"}), 400
    
    try:
        groups_cursor = db.student_groups.find({"hrEmail": hr_email})
        groups_list = []
        for group in groups_cursor:
            group['_id'] = str(group['_id'])
            # Count students in this group
            student_count = db.students.count_documents({
                "$or": [{"hrEmail": hr_email}, {"teacherEmail": hr_email}],
                "groupIds": str(group['_id'])
            })
            group['studentCount'] = student_count
            groups_list.append(group)
        return jsonify(groups_list), 200
    except Exception as e:
        app.logger.error(f"Get student groups error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/student-groups', methods=['POST'])
def create_student_group():
    """Creates a new student group for the HR user."""
    try:
        data = request.get_json()
        hr_email = data.get("hrEmail")
        name = data.get("name")
        color = data.get("color", "#3B82F6")  # Default blue

        if not hr_email or not name:
            return jsonify({"error": "hrEmail and name are required"}), 400

        # Check for duplicate group name for this HR
        existing = db.student_groups.find_one({"hrEmail": hr_email, "name": name})
        if existing:
            return jsonify({"error": f"Group '{name}' already exists"}), 409

        group = {
            "hrEmail": hr_email,
            "name": name,
            "color": color,
            "createdAt": datetime.utcnow()
        }
        result = db.student_groups.insert_one(group)
        group['_id'] = str(result.inserted_id)
        group['studentCount'] = 0
        return jsonify(group), 201
    except Exception as e:
        app.logger.error(f"Create student group error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/student-groups/<group_id>', methods=['PUT'])
def update_student_group(group_id):
    """Updates a student group's name or color."""
    try:
        data = request.get_json()
        update_fields = {}
        if "name" in data:
            update_fields["name"] = data["name"]
        if "color" in data:
            update_fields["color"] = data["color"]

        if not update_fields:
            return jsonify({"error": "No fields to update"}), 400

        update_fields["updatedAt"] = datetime.utcnow()

        result = db.student_groups.update_one(
            {"_id": ObjectId(group_id)},
            {"$set": update_fields}
        )

        if result.matched_count == 0:
            return jsonify({"error": "Group not found"}), 404

        # If name was updated, also update the groupNames array in all students that have this group
        if "name" in data:
            old_group = db.student_groups.find_one({"_id": ObjectId(group_id)})
            if old_group:
                db.students.update_many(
                    {"groupIds": group_id},
                    {"$set": {f"groupNames.$[elem]": data["name"]}},
                )
                # Simpler approach: rebuild groupNames for affected students
                affected_students = db.students.find({"groupIds": group_id})
                for student in affected_students:
                    group_ids = student.get("groupIds", [])
                    new_names = []
                    for gid in group_ids:
                        g = db.student_groups.find_one({"_id": ObjectId(gid)})
                        if g:
                            new_names.append(g["name"])
                    db.students.update_one(
                        {"_id": student["_id"]},
                        {"$set": {"groupNames": new_names}}
                    )

        updated_group = db.student_groups.find_one({"_id": ObjectId(group_id)})
        updated_group['_id'] = str(updated_group['_id'])
        return jsonify(updated_group), 200
    except Exception as e:
        app.logger.error(f"Update student group error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/student-groups/<group_id>', methods=['DELETE'])
def delete_student_group(group_id):
    """Deletes a student group and removes it from all assigned students."""
    try:
        group = db.student_groups.find_one({"_id": ObjectId(group_id)})
        if not group:
            return jsonify({"error": "Group not found"}), 404

        group_name = group.get("name", "")

        # Remove this group from all students who have it
        db.students.update_many(
            {"groupIds": group_id},
            {
                "$pull": {"groupIds": group_id, "groupNames": group_name}
            }
        )

        # Delete the group
        db.student_groups.delete_one({"_id": ObjectId(group_id)})

        return jsonify({"message": f"Group '{group_name}' deleted successfully"}), 200
    except Exception as e:
        app.logger.error(f"Delete student group error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/students/<student_id>/groups', methods=['PUT'])
def update_student_groups(student_id):
    """Assigns or updates the groups for a specific student. Students can belong to multiple groups."""
    try:
        data = request.get_json()
        group_ids = data.get("groupIds", [])  # Array of group ID strings

        # Validate that all group IDs exist
        group_names = []
        for gid in group_ids:
            group = db.student_groups.find_one({"_id": ObjectId(gid)})
            if not group:
                return jsonify({"error": f"Group with ID {gid} not found"}), 404
            group_names.append(group["name"])

        result = db.students.update_one(
            {"_id": ObjectId(student_id)},
            {"$set": {
                "groupIds": group_ids,
                "groupNames": group_names,
                "updatedAt": datetime.utcnow()
            }}
        )

        if result.matched_count == 0:
            return jsonify({"error": "Student not found"}), 404

        return jsonify({
            "message": "Student groups updated successfully",
            "groupIds": group_ids,
            "groupNames": group_names
        }), 200
    except Exception as e:
        app.logger.error(f"Update student groups error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/students/bulk-group', methods=['PUT'])
def bulk_assign_student_groups():
    """Assigns a group to multiple students at once."""
    try:
        data = request.get_json()
        student_ids = data.get("studentIds", [])
        group_id = data.get("groupId")
        action = data.get("action", "add")  # "add" or "remove"

        if not student_ids or not group_id:
            return jsonify({"error": "studentIds and groupId are required"}), 400

        group = db.student_groups.find_one({"_id": ObjectId(group_id)})
        if not group:
            return jsonify({"error": "Group not found"}), 404

        group_name = group["name"]
        updated_count = 0

        for sid in student_ids:
            try:
                if action == "add":
                    result = db.students.update_one(
                        {"_id": ObjectId(sid)},
                        {
                            "$addToSet": {"groupIds": group_id, "groupNames": group_name},
                            "$set": {"updatedAt": datetime.utcnow()}
                        }
                    )
                elif action == "remove":
                    result = db.students.update_one(
                        {"_id": ObjectId(sid)},
                        {
                            "$pull": {"groupIds": group_id, "groupNames": group_name},
                            "$set": {"updatedAt": datetime.utcnow()}
                        }
                    )
                if result.modified_count > 0:
                    updated_count += 1
            except Exception:
                continue

        return jsonify({
            "message": f"{updated_count} students updated successfully",
            "updatedCount": updated_count
        }), 200
    except Exception as e:
        app.logger.error(f"Bulk assign student groups error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)