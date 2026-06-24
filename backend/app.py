from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import bcrypt
import re
from pytz import timezone
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
    """Logs in a candidate (student) user."""
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
        student_response = {
            "id": str(student["_id"]),
            "name": student["name"],
            "email": student["email"],
            "role": student["role"],
            "rollNo": student["rollNo"],
            "status": student["status"]
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
    """Gets all students added by a specific HR user."""
    hr_email = request.args.get('hrEmail')
    if not hr_email:
        return jsonify({"error": "hrEmail query parameter is required"}), 400
        
    try:
        # Find students, excluding the sensitive password field from the result
        students_cursor = db.students.find({"hrEmail": hr_email}, {'password': 0})
        students_list = []
        for student in students_cursor:
            student['_id'] = str(student['_id'])
            students_list.append(student)
        return jsonify(students_list), 200
    except Exception as e:
        app.logger.error(f"Get students error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/students', methods=['POST'])
def create_student():
    """Creates a new student and associates them with the logged-in HR user."""
    try:
        data = request.get_json()
        hr_email = data.get("hrEmail")

        if not hr_email:
            return jsonify({"error": "hrEmail is required to add a student"}), 400
        
        required_fields = ["name", "email", "rollNo", "role", "password"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing one of required fields: {required_fields}"}), 400
        
        if db.students.find_one({"email": data.get("email")}):
            return jsonify({"error": "A student with this email already exists"}), 409

        hashed_password = bcrypt.hashpw(data.get("password").encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        student = {
            "hrEmail": hr_email,
            "name": data.get("name"),
            "email": data.get("email"),
            "rollNo": data.get("rollNo"),
            "role": data.get("role"),
            "password": hashed_password,
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


if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)