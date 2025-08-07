from flask import Flask, jsonify, request
from flask_cors import CORS
from pymongo import MongoClient
from bson import ObjectId
from datetime import datetime
import bcrypt
import re
from pytz import timezone
import json
import pandas as pd
import io

app = Flask(__name__)
# Allow CORS for local development (React app on localhost:5173)
CORS(app, resources={r"/api/*": {"origins": "http://localhost:5173"}})

# --- Database Connection ---
mongo_uri = "mongodb://localhost:27017/"
client = MongoClient(mongo_uri)
db = client['hrDashboard']  # The database name

# --- Helper Functions ---
def is_valid_email(email):
    """Validates email format."""
    email_regex = r'^[a-zA-Z0-9._%+-]+@[a-zA-Z0-9.-]+\.[a-zA-Z]{2,}$'
    return re.match(email_regex, email)

def parse_rounds(rounds_str):
    """Parse rounds from string to array format."""
    if isinstance(rounds_str, list):
        return rounds_str
    if isinstance(rounds_str, str):
        if ',' in rounds_str:
            return [r.strip().lower() for r in rounds_str.split(',')]
        else:
            return [rounds_str.strip().lower()]
    return ['coding']  # Default

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
        user = {"email": email, "hashedPassword": hashed_password, "createdAt": datetime.utcnow(), "role": "hr"}
        db.users.insert_one(user)
        
        user_response = {"email": user["email"], "createdAt": user["createdAt"]}
        return jsonify({"message": "User registered successfully", "user": user_response}), 201
    except Exception as e:
        app.logger.error(f"Signup error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/teacher/signup', methods=['POST'])
def teacher_signup():
    """Registers a new teacher user."""
    try:
        data = request.get_json()
        name = data.get("name")
        email = data.get("email")
        password = data.get("password")

        if not name or not email or not password:
            return jsonify({"error": "Name, email, and password are required"}), 400
        if not is_valid_email(email):
            return jsonify({"error": "Invalid email format"}), 400
        if len(password) < 6:
            return jsonify({"error": "Password must be at least 6 characters long"}), 400
        if db.users.find_one({"email": email}):
            return jsonify({"error": "Email already registered"}), 409

        hashed_password = bcrypt.hashpw(password.encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
        user = {"name": name, "email": email, "hashedPassword": hashed_password, "createdAt": datetime.utcnow(), "role": "teacher"}
        db.users.insert_one(user)
        
        user_response = {"name": user["name"], "email": user["email"], "createdAt": user["createdAt"]}
        return jsonify({"message": "Teacher registered successfully", "user": user_response}), 201
    except Exception as e:
        app.logger.error(f"Teacher signup error: {e}")
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

        user = db.users.find_one({"email": email, "role": "hr"})
        if not user or not bcrypt.checkpw(password.encode('utf-8'), user['hashedPassword'].encode('utf-8')):
            return jsonify({"error": "Invalid email or password"}), 401
        
        user_response = {"name": user.get("name", ""), "email": user["email"], "id": str(user["_id"])}
        return jsonify({"message": "Login successful", "user": user_response}), 200
    except Exception as e:
        app.logger.error(f"Login error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/teacher/login', methods=['POST'])
def teacher_login():
    """Logs in a teacher user."""
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        user = db.users.find_one({"email": email, "role": "teacher"})
        if not user or not bcrypt.checkpw(password.encode('utf-8'), user['hashedPassword'].encode('utf-8')):
            return jsonify({"error": "Invalid email or password"}), 401
        
        user_response = {"name": user["name"], "email": user["email"], "id": str(user["_id"])}
        return jsonify({"message": "Login successful", "user": user_response}), 200
    except Exception as e:
        app.logger.error(f"Teacher login error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/candidate/login', methods=['POST'])
def candidate_login():
    """Logs in a candidate (student) user."""
    try:
        data = request.get_json()
        email = data.get("email")
        password = data.get("password")

        if not email or not password:
            return jsonify({"error": "Email and password are required"}), 400

        student = db.students.find_one({"email": email})
        if not student or not bcrypt.checkpw(password.encode('utf-8'), student['password'].encode('utf-8')):
            return jsonify({"error": "Invalid credentials"}), 401

        student_response = {
            "id": str(student["_id"]),
            "name": student["name"],
            "email": student["email"],
            "rollNo": student["rollNo"],
            "status": student["status"],
            "assignedRounds": student.get("assignedRounds", ["coding"])
        }
        token = "dummy-token"

        return jsonify({
            "message": "Login successful",
            "student": student_response,
            "token": token
        }), 200
    except Exception as e:
        app.logger.error(f"Candidate login error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- Roles/Interviews Endpoints (Scoped to HR/Teacher User) ---

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
            role['_id'] = str(role['_id'])
            roles_list.append(role)
        return jsonify(roles_list), 200
    except Exception as e:
        app.logger.error(f"Get roles error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/interviews', methods=['POST'])
def create_interview():
    """Creates a new interview and associates it with the logged-in teacher user."""
    try:
        data = request.get_json()
        teacher_email = data.get("teacherEmail")
        
        if not teacher_email:
            return jsonify({"error": "teacherEmail is required to create an interview"}), 400

        required_fields = ["title", "description", "date", "maxStudents", "seatsAvailable", "package", "rounds"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing one of required fields: {required_fields}"}), 400

        interview = {
            "teacherEmail": teacher_email,
            "title": data.get("title"),
            "description": data.get("description"),
            "date": data.get("date"),
            "duration": data.get("duration", "60"),
            "maxStudents": int(data.get("maxStudents")),
            "seatsAvailable": int(data.get("seatsAvailable")),
            "package": data.get("package"),
            "rounds": data.get("rounds", ["coding"]),
            "studentsCount": 0,
            "status": "Draft",
            "createdAt": datetime.utcnow()
        }
        result = db.interviews.insert_one(interview)
        interview['_id'] = str(result.inserted_id)
        return jsonify(interview), 201
    except Exception as e:
        app.logger.error(f"Create interview error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

# --- Students Endpoints (Scoped to HR/Teacher User) ---

@app.route('/api/students', methods=['GET'])
def get_students():
    """Gets all students added by a specific HR or teacher user."""
    user_email = request.args.get('hrEmail') or request.args.get('teacherEmail')
    if not user_email:
        return jsonify({"error": "hrEmail or teacherEmail query parameter is required"}), 400
        
    try:
        students_cursor = db.students.find({"hrEmail": user_email} if 'hrEmail' in request.args else {"teacherEmail": user_email}, {'password': 0})
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
    """Creates a new student and associates them with the logged-in HR or teacher user."""
    try:
        data = request.get_json()
        user_email = data.get("hrEmail") or data.get("teacherEmail")

        if not user_email:
            return jsonify({"error": "hrEmail or teacherEmail is required to add a student"}), 400
        
        required_fields = ["name", "email", "password"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing one of required fields: {required_fields}"}), 400
        
        if db.students.find_one({"email": data.get("email")}):
            return jsonify({"error": "A student with this email already exists"}), 409

        hashed_password = bcrypt.hashpw(data.get("password").encode('utf-8'), bcrypt.gensalt()).decode('utf-8')

        # Handle assigned rounds - ensure it's an array
        assigned_rounds = data.get("assignedRounds", ["coding"])
        if isinstance(assigned_rounds, str):
            assigned_rounds = parse_rounds(assigned_rounds)
        
        # Convert round numbers to proper format for backward compatibility
        processed_rounds = []
        for round_item in assigned_rounds:
            if isinstance(round_item, int):
                if round_item == 1:
                    processed_rounds.append("coding")
                elif round_item == 2:
                    processed_rounds.append("aptitude")
                elif round_item == 3:
                    processed_rounds.append("interview")
            else:
                processed_rounds.append(str(round_item).lower())
        
        student = {
            "hrEmail": user_email if "hrEmail" in data else None,
            "teacherEmail": user_email if "teacherEmail" in data else None,
            "name": data.get("name"),
            "email": data.get("email"),
            "rollNo": data.get("rollNo", f"ROLL_{datetime.utcnow().timestamp()}"),
            "role": data.get("role", "Student"),
            "password": hashed_password,
            "status": "Eligible",
            "createdAt": datetime.utcnow(),
            "assignedRounds": processed_rounds
        }
        result = db.students.insert_one(student)
        student['_id'] = str(result.inserted_id)
        del student['password']  # Never send the password hash back in the response
        return jsonify(student), 201
    except Exception as e:
        app.logger.error(f"Create student error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

@app.route('/api/assign-students-excel', methods=['POST'])
def assign_students_excel():
    """Assigns students from an Excel file to an interview and sends emails."""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file part in the request"}), 400
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        if not file.filename.endswith(('.xlsx', '.xls')):
            return jsonify({"error": "Invalid file format. Please upload an Excel file (.xlsx or .xls)"}), 400

        teacher_email = request.form.get('teacherEmail')
        if not teacher_email:
            return jsonify({"error": "teacherEmail is required"}), 400

        # Read Excel file
        df = pd.read_excel(io.BytesIO(file.read()), engine='openpyxl')
        required_columns = ['name', 'email']
        if not all(col in df.columns for col in required_columns):
            return jsonify({"error": f"Excel file must contain columns: {required_columns}"}), 400

        new_students = []
        for index, row in df.iterrows():
            email = str(row['email']).strip()
            if is_valid_email(email) and not db.students.find_one({"email": email}):
                # Generate a random password
                password = bcrypt.hashpw(str(datetime.utcnow().timestamp()).encode('utf-8'), bcrypt.gensalt()).decode('utf-8')
                
                # Handle rounds from Excel
                rounds_from_excel = row.get('rounds', 'coding')
                if pd.isna(rounds_from_excel):
                    assigned_rounds = ['coding']
                else:
                    assigned_rounds = parse_rounds(str(rounds_from_excel))
                
                student = {
                    "teacherEmail": teacher_email,
                    "name": str(row.get('name', f"Student_{index}")),
                    "email": email,
                    "rollNo": row.get('rollNo', f"ROLL_{index}"),
                    "role": row.get('role', "Student"),
                    "password": password,
                    "status": "Eligible",
                    "createdAt": datetime.utcnow(),
                    "assignedRounds": assigned_rounds
                }
                result = db.students.insert_one(student)
                student['_id'] = str(result.inserted_id)
                del student['password']
                new_students.append(student)

        return jsonify({"message": "Students assigned successfully", "students": new_students}), 201
    except Exception as e:
        app.logger.error(f"Assign students from Excel error: {e}")
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

# --- Results Endpoints ---

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

        required_fields = ["id", "name", "email", "rollNo", "role", "status"]
        if not candidate_data or not all(field in candidate_data for field in required_fields):
            return jsonify({"error": "Missing required candidate data fields: id, name, email, rollNo, role, status"}), 400
        if score is None or percentage is None or total_questions is None or round_number is None:
            return jsonify({"error": "Missing required fields: score, percentage, total_questions, or round"}), 400

        # Check if the round is assigned to the student
        student = db.students.find_one({"_id": ObjectId(candidate_data["id"])})
        if not student:
            return jsonify({"error": "Student not found"}), 404
            
        # Check assignment type and validate round access
        assigned_by_hr = student.get("hrEmail") is not None
        
        if not assigned_by_hr:  # Only restrict teacher-assigned students
            assigned_rounds = student.get("assignedRounds", ["coding"])
            
            # Convert round number to round name for checking
            round_name_map = {1: "coding", 2: "aptitude", 3: "interview"}
            round_name = round_name_map.get(round_number, str(round_number))
            
            if round_name not in assigned_rounds and round_number not in assigned_rounds:
                return jsonify({"error": f"Round {round_number} ({round_name}) is not assigned to this student"}), 403

        quiz_result = {
            "candidate_id": candidate_data["id"],
            "name": candidate_data["name"],
            "email": candidate_data["email"],
            "rollNo": candidate_data["rollNo"],
            "role": candidate_data["role"],
            "status": candidate_data["status"],
            "score": int(score),
            "percentage": float(percentage),
            "total_questions": int(total_questions),
            "round": int(round_number),
            "assignedBy": "hr" if assigned_by_hr else "teacher",
            "submittedAt": datetime.utcnow()
        }

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
        totalscore = data.get("totalScore")

        required_fields = ["id", "name", "email", "rollNo", "role", "status"]
        if not candidate_data or not all(field in candidate_data for field in required_fields):
            return jsonify({"error": f"Missing required fields: {required_fields}"}), 400
        if score is None or totalscore is None:
            return jsonify({"error": "Missing required fields: score or totalScore"}), 400

        # Check if round 2 (aptitude) is assigned to the student
        student = db.students.find_one({"_id": ObjectId(candidate_data["id"])})
        if not student:
            return jsonify({"error": "Student not found"}), 404
            
        # Check assignment type and validate round access
        assigned_by_hr = student.get("hrEmail") is not None
        
        if not assigned_by_hr:  # Only restrict teacher-assigned students
            assigned_rounds = student.get("assignedRounds", ["coding"])
            if "aptitude" not in assigned_rounds and 2 not in assigned_rounds:
                return jsonify({"error": "Round 2 (aptitude) is not assigned to this student"}), 403

        round2_result = {
            "candidate_id": candidate_data["id"],
            "name": candidate_data["name"],
            "email": candidate_data["email"],
            "rollNo": candidate_data["rollNo"],
            "role": candidate_data["role"],
            "round": 2,
            "score": int(score),
            "totalScore": int(totalscore),
            "assignedBy": "hr" if assigned_by_hr else "teacher",
            "submittedAt": datetime.utcnow()
        }

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
        candidate_id = data.get("candidateId")
        candidate_name = data.get("candidateName")
        candidate_email = data.get("candidateEmail")
        candidate_roll = data.get("candidateRoll")
        candidate_rollno = data.get("CandidateRollno")
        submission_date = data.get("submissionDate")
        score = data.get("score")
        total_score = data.get("totalScore")

        required_fields = ["candidateId", "candidateName", "candidateEmail", "candidateRoll", "CandidateRollno", "submissionDate", "score", "totalScore"]
        if not all(field in data for field in required_fields):
            return jsonify({"error": f"Missing required fields: {required_fields}"}), 400

        # Check if round 3 (interview) is assigned to the student
        student = db.students.find_one({"_id": ObjectId(candidate_id)})
        if not student:
            return jsonify({"error": "Student not found"}), 404
            
        # Check assignment type and validate round access  
        assigned_by_hr = student.get("hrEmail") is not None
        
        if not assigned_by_hr:  # Only restrict teacher-assigned students
            assigned_rounds = student.get("assignedRounds", ["coding"])
            if "interview" not in assigned_rounds and 3 not in assigned_rounds:
                return jsonify({"error": "Round 3 (interview) is not assigned to this student"}), 403

        round3_result = {
            "candidateId": candidate_id,
            "candidateName": candidate_name,
            "candidateEmail": candidate_email,
            "candidateRoll": candidate_roll,
            "CandidateRollno": candidate_rollno,
            "submissionDate": submission_date,
            "round": 3,
            "score": int(score),
            "totalScore": int(total_score),
            "assignedBy": "hr" if assigned_by_hr else "teacher",
            "submittedAt": datetime.utcnow()
        }

        result = db.quiz_results.insert_one(round3_result)
        round3_result['_id'] = str(result.inserted_id)

        return jsonify({
            "message": "Round 3 results stored successfully",
            "round3_result": round3_result
        }), 201
    except Exception as e:
        app.logger.error(f"Submit round 3 results error: {e}")
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
        results_cursor = db.quiz_results.find({
            "$or": [
                {"role": role_title},
                {"candidateRoll": role_title}
            ]
        })

        aggregated_results = {}
        for result in results_cursor:
            email = result.get('email') or result.get('candidateEmail')
            roll_no = result.get('rollNo') or result.get('CandidateRollno')
            name = result.get('name') or result.get('candidateName')

            if not email:
                continue

            if email not in aggregated_results:
                aggregated_results[email] = {
                    "name": name,
                    "email": email,
                    "rollNo": roll_no,
                    "round1_score": None,
                    "round2_score": None,
                    "round3_score": None,
                    "total_score": 0,
                    "max_round": 0,
                    "submissions": []
                }
            
            round_num = result.get('round')
            score = result.get('score', 0)
            
            if round_num == 1:
                aggregated_results[email]['round1_score'] = score
            elif round_num == 2:
                aggregated_results[email]['round2_score'] = score
            elif round_num == 3:
                aggregated_results[email]['round3_score'] = score
            
            if round_num and round_num > aggregated_results[email]['max_round']:
                aggregated_results[email]['max_round'] = round_num
            
            submission_date = result.get('submittedAt') or result.get('submissionDate')
            if submission_date:
                aggregated_results[email]['submissions'].append(submission_date)

        final_results = []
        for email, data in aggregated_results.items():
            data['total_score'] = sum(filter(None, [data['round1_score'], data['round2_score'], data['round3_score']]))
            data['lastSubmittedAt'] = max(data['submissions']) if data['submissions'] else None
            del data['submissions']
            final_results.append(data)
            
        final_results.sort(key=lambda x: x['total_score'], reverse=True)

        return jsonify(final_results), 200

    except Exception as e:
        app.logger.error(f"Get aggregated test results error: {e}")
        return jsonify({"error": "An internal server error occurred"}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=5000, debug=True)