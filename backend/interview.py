import os
import re
import json
from flask import Flask, request, jsonify, send_from_directory
from groq import Groq
import PyPDF2
from io import BytesIO
from flask_cors import CORS

app = Flask(__name__)
CORS(app, resources={r"*": {"origins": "http://localhost:5173"}})

# Set Groq API key (replace with your actual key or set as environment variable)
os.environ["GROQ_API_KEY"] = "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"
client = Groq()

# Function to extract text from PDF
def extract_text_from_pdf(file):
    try:
        pdf_reader = PyPDF2.PdfReader(file)
        text = ""
        for page in pdf_reader.pages:
            text += page.extract_text() or ""
        return text
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

# Function to extract skills, projects, achievements, and experience
def extract_resume_details(resume_text):
    extracted_data = {
        "skills": [],
        "projects": [],
        "achievements": [],
        "experience": []
    }

    # Regex patterns for extraction
    skills_pattern = r"Skills:?\s*\n([\s\S]*?)(?:\n\n|\Z)"
    experience_pattern = r"Experience:?\s*\n([\s\S]*?)(?:Projects:|\Z)"
    projects_pattern = r"Projects:?\s*\n([\s\S]*?)(?:Achievements:|\Z)"
    achievements_pattern = r"Achievements:?\s*\n([\s\S]*?)(?:\Z)"

    # Extract skills
    skills_match = re.search(skills_pattern, resume_text, re.MULTILINE | re.IGNORECASE)
    if skills_match:
        skills = [s.strip("- \n") for s in skills_match.group(1).split("\n") if s.strip("- \n")]
        extracted_data["skills"] = skills

    # Extract experience
    experience_match = re.search(experience_pattern, resume_text, re.MULTILINE | re.IGNORECASE)
    if experience_match:
        exp_lines = experience_match.group(1).strip().split("\n")
        current_job = {}
        for line in exp_lines:
            if line.startswith("- "):
                current_job["details"].append(line.strip("- \n"))
            elif line.strip():
                if current_job:
                    extracted_data["experience"].append(current_job)
                current_job = {"role": line.strip(), "details": []}
        if current_job:
            extracted_data["experience"].append(current_job)

    # Extract projects
    projects_match = re.search(projects_pattern, resume_text, re.MULTILINE | re.IGNORECASE)
    if projects_match:
        proj_lines = projects_match.group(1).strip().split("\n")
        current_proj = {}
        for line in proj_lines:
            if line.startswith("- "):
                current_proj["details"].append(line.strip("- \n"))
            elif line.strip():
                if current_proj:
                    extracted_data["projects"].append(current_proj)
                current_proj = {"name": line.strip(), "details": []}
        if current_proj:
            extracted_data["projects"].append(current_proj)

    # Extract achievements
    achievements_match = re.search(achievements_pattern, resume_text, re.MULTILINE | re.IGNORECASE)
    if achievements_match:
        achievements = [a.strip("- \n") for a in achievements_match.group(1).split("\n") if a.strip("- \n")]
        extracted_data["achievements"] = achievements

    return extracted_data

# Function to generate a question
def generate_question(resume_data, question_number):
    prompt = f"""
    You are an AI interviewer. Based on the following resume data, generate a specific, context-aware question (Question {question_number}) to test the candidate's knowledge or experience. Ensure the question is relevant to their skills, projects, achievements, or experience and encourages a detailed response. Return only the question as a string.

    Resume Data:
    {json.dumps(resume_data, indent=2)}
    """
    response = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=100
    )
    return response.choices[0].message.content.strip()

# Function to evaluate response
def evaluate_response(question, response, resume_data):
    prompt = f"""
    You are an AI evaluator. Evaluate the user's response to the following question based on the provided resume data. Assess for accuracy, relevance, and depth. Provide a score out of 10 and a brief explanation (2-3 sentences). Return the result as a JSON object with keys: 'score' and 'explanation'.

    Question: {question}
    User Response: {response}
    Resume Data:
    {json.dumps(resume_data, indent=2)}
    """
    evaluation = client.chat.completions.create(
        model="llama3-70b-8192",
        messages=[{"role": "user", "content": prompt}],
        max_tokens=200
    )
    try:
        return json.loads(evaluation.choices[0].message.content.strip())
    except json.JSONDecodeError:
        return {"score": 0, "explanation": "Error parsing evaluation response."}

# Store session data
sessions = {}

@app.route("/upload_resume", methods=["POST"])
def upload_resume():
    if "resume" not in request.files:
        return jsonify({"error": "No file uploaded"}), 400

    file = request.files["resume"]
    if file.filename == "":
        return jsonify({"error": "No file selected"}), 400

    # Extract text based on file type
    if file.filename.endswith(".pdf"):
        resume_text = extract_text_from_pdf(file)
    else:
        resume_text = file.read().decode("utf-8", errors="ignore")

    if not resume_text:
        return jsonify({"error": "Failed to extract text from resume"}), 400

    # Extract resume details
    resume_data = extract_resume_details(resume_text)
    session_id = str(hash(file.filename + resume_text[:50]))
    sessions[session_id] = {
        "resume_data": resume_data,
        "current_question": 0,
        "scores": [],
        "questions": [],
        "responses": []
    }

    return jsonify({"session_id": session_id, "message": "Resume processed successfully"})

@app.route("/get_question/<session_id>", methods=["GET"])
def get_question(session_id):
    if session_id not in sessions or sessions[session_id]["current_question"] >= 10:
        return jsonify({"error": "Invalid session or interview completed"}), 400

    question_number = sessions[session_id]["current_question"] + 1
    question = generate_question(sessions[session_id]["resume_data"], question_number)
    sessions[session_id]["questions"].append(question)
    sessions[session_id]["current_question"] = question_number

    return jsonify({"question": question, "question_number": question_number})

@app.route("/submit_response/<session_id>", methods=["POST"])
def submit_response(session_id):
    if session_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    data = request.get_json()
    response = data.get("response", "")
    if not response:
        return jsonify({"error": "No response provided"}), 400

    question = sessions[session_id]["questions"][-1]
    resume_data = sessions[session_id]["resume_data"]
    evaluation = evaluate_response(question, response, resume_data)

    sessions[session_id]["scores"].append(evaluation["score"])
    sessions[session_id]["responses"].append({
        "question": question,
        "response": response,
        "score": evaluation["score"],
        "explanation": evaluation["explanation"]
    })

    total_score = sum(sessions[session_id]["scores"])
    is_complete = sessions[session_id]["current_question"] >= 10

    return jsonify({
        "score": evaluation["score"],
        "explanation": evaluation["explanation"],
        "total_score": total_score,
        "is_complete": is_complete
    })

@app.route("/get_results/<session_id>", methods=["GET"])
def get_results(session_id):
    if session_id not in sessions:
        return jsonify({"error": "Invalid session"}), 400

    total_score = sum(sessions[session_id]["scores"])
    performance = "Excellent" if total_score >= 80 else "Good" if total_score >= 60 else "Needs Improvement"

    return jsonify({
        "responses": sessions[session_id]["responses"],
        "total_score": total_score,
        "performance": performance
    })

@app.route("/")
def index():
    return send_from_directory('../frontend/build', 'index.html')

@app.route("/static/<path:path>")
def serve_static(path):
    return send_from_directory('../frontend/build/static', path)

if __name__ == "__main__":
    app.run(debug=True,port=5000)