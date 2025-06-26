import os
import logging
import sys
import time
import re
from uuid import uuid4
import base64
import numpy as np
import cv2

# Flask imports
from flask import Flask, request, jsonify, session
from flask_cors import CORS

# LangChain imports
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory

# Environment imports
from dotenv import load_dotenv

# Windows-specific audio (optional)
try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False
    logging.warning("winsound not available (non-Windows system). Audio alerts will be disabled.")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", str(uuid4()))
CORS(app, supports_credentials=True, origins=["*"])

logger.info("Starting combined proctoring and interview Flask server...")

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in .env file")
    raise ValueError("GROQ_API_KEY not found. Please set it in your .env file.")

# Initialize Groq LLM
try:
    llm = ChatGroq(model_name="llama3-70b-8192", groq_api_key=GROQ_API_KEY, temperature=0.7, max_tokens=2048)
    logger.info("Groq LLM initialized successfully")
except Exception as e:
    logger.error(f"Error initializing Groq LLM: {str(e)}", exc_info=True)
    raise

# Load OpenCV Haar Cascade models
try:
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    if face_cascade.empty() or eye_cascade.empty(): raise IOError("Failed to load Haar models")
    logger.info("Haar Cascade models loaded successfully.")
except Exception as e:
    logger.error(f"CRITICAL: Could not load Haar models. Proctoring will be disabled. Error: {e}")
    face_cascade = None
    eye_cascade = None

# ===============================
# QUESTION GENERATION & EVALUATION
# ===============================

memory_store = {}

# Prompts (unchanged)
intro_prompt = PromptTemplate(input_variables=["history", "question_number"], template="""You are an AI interviewer evaluating a candidate. Based on the conversation history: {history}. For question 1, ask: 'Please introduce yourself and briefly describe your role in the project.' For question 2, ask a specific question about the candidate's skills relevant to their role or project, using the history if available. This is question {question_number} out of 2 self-introduction questions.""")
initial_project_prompt = PromptTemplate(input_variables=["history"], template="""Based on the conversation history: {history}. Ask the candidate: 'Please explain your project in detail, including its purpose and your contributions.'""")
followup_project_prompt = PromptTemplate(input_variables=["history", "question_number"], template="""Based on the conversation history: {history}. Ask a specific follow-up question about how the candidate handled a particular topic, challenge, or error related to their project. Focus on their problem-solving approach, technical decisions, or error resolution strategies. This is project-related question {question_number} out of 3 follow-up questions.""")
evaluation_prompt = PromptTemplate(input_variables=["history"], template="""Based on the entire conversation history: {history}. Evaluate the candidate's responses. Provide a brief summary of their strengths and weaknesses. Assign a final mark out of 60, justifying the score based on their answers' clarity, depth, and relevance. Format the output as:\nEvaluation Summary\nStrengths: ...\nWeaknesses: ...\nFinal Mark: .../60\nJustification: ...""")

def get_memory():
    session_id = session.get('session_id', str(uuid4()))
    session['session_id'] = session_id
    if session_id not in memory_store:
        memory_store[session_id] = ConversationBufferMemory()
    return memory_store[session_id]

def clean_response(response):
    return re.sub(r'\*\*|\*|_|\#', '', response).strip()

def _generate_evaluation_and_cleanup(memory):
    """Generates evaluation, cleans up session, and returns result."""
    history = memory.buffer_as_str
    if not history.strip():
        return {"evaluation": "Interview finished before any questions were answered. No evaluation possible.", "status": "evaluation"}
    
    evaluation_chain = LLMChain(llm=llm, prompt=evaluation_prompt)
    evaluation = evaluation_chain.run(history=history)

    session_id = session.get('session_id')
    if session_id:
        if session_id in memory_store:
            del memory_store[session_id]
            logger.info(f"Memory cleared for session {session_id}")
        if session_id in exam_states:
            del exam_states[session_id]
            logger.info(f"Exam state cleared for session {session_id}")
    
    return {"evaluation": clean_response(evaluation), "status": "evaluation"}

# ===============================
# PROCTORING SECTION (Unchanged)
# ===============================

exam_states = {}
ALERT_THRESHOLD_SECONDS, ALERT_COOLDOWN_SECONDS, LONG_BLINK_SECONDS, MAX_WARNINGS = 2.0, 5.0, 1.5, 3

def get_exam_state():
    session_id = session.get('session_id', str(uuid4()))
    session['session_id'] = session_id
    if session_id not in exam_states:
        exam_states[session_id] = {"is_looking_away": False, "away_start_time": 0, "is_eyes_closed": False, "eyes_closed_start_time": 0, "warnings": 0, "long_blink_count": 0, "last_alert_time": 0, "violation_detected": False}
    return exam_states[session_id]

def reset_exam_state():
    session_id = session.get('session_id')
    if session_id and session_id in exam_states:
        exam_states[session_id] = {"is_looking_away": False, "away_start_time": 0, "is_eyes_closed": False, "eyes_closed_start_time": 0, "warnings": 0, "long_blink_count": 0, "last_alert_time": 0, "violation_detected": False}

def play_alert():
    if WINSOUND_AVAILABLE:
        try: winsound.Beep(1000, 300)
        except Exception as e: logger.error(f"Could not play alert sound: {e}")

def detect_gaze_direction(eye_frame):
    try:
        height, width = eye_frame.shape[:2]
        if len(eye_frame.shape) > 2: eye_frame = cv2.cvtColor(eye_frame, cv2.COLOR_BGR2GRAY)
        threshold_eye = cv2.adaptiveThreshold(eye_frame, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        contours, _ = cv2.findContours(threshold_eye, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            M = cv2.moments(sorted(contours, key=cv2.contourArea, reverse=True)[0])
            if M['m00'] != 0:
                relative_x = (int(M['m10'] / M['m00'])) / width
                if 0.35 < relative_x < 0.65: return "Center"
                elif relative_x <= 0.35: return "Left"
                else: return "Right"
        return "Unknown"
    except Exception: return "Error"

def process_image(image_data):
    if not face_cascade or not eye_cascade: return {"face_detected": False, "looking_at_screen": False, "warnings": 0, "max_warnings": MAX_WARNINGS, "violation_detected": False, "look_direction": "Proctoring Disabled", "eyes_closed": False, "long_blink_count": 0, "error": "OpenCV models not loaded"}
    exam_state, current_time = get_exam_state(), time.time()
    face_detected, is_looking_at_screen, are_eyes_closed, look_direction = False, False, False, "Unknown"
    try:
        frame = cv2.imdecode(np.frombuffer(base64.b64decode(image_data), np.uint8), cv2.IMREAD_COLOR)
        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 5, minSize=(30, 30))
        face_detected = len(faces) > 0
        if face_detected:
            x, y, w, h = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
            roi_gray = gray[y:y+h, x:x+w]
            eyes = eye_cascade.detectMultiScale(roi_gray, 1.1, 5)
            if len(eyes) >= 1:
                are_eyes_closed = False
                if exam_state["is_eyes_closed"] and (current_time - exam_state["eyes_closed_start_time"]) > LONG_BLINK_SECONDS: exam_state["long_blink_count"] += 1
                exam_state["is_eyes_closed"] = False
                look_direction = detect_gaze_direction(roi_gray[eyes[0][1]:eyes[0][1]+eyes[0][3], eyes[0][0]:eyes[0][0]+eyes[0][2]])
                if look_direction == "Center": is_looking_at_screen, exam_state["is_looking_away"] = True, False
                else: is_looking_at_screen = False;
                if not exam_state["is_looking_away"]: exam_state.update({"is_looking_away": True, "away_start_time": current_time})
            else:
                are_eyes_closed, is_looking_at_screen, look_direction = True, False, "Eyes Closed"
                if not exam_state["is_eyes_closed"]: exam_state.update({"is_eyes_closed": True, "eyes_closed_start_time": current_time})
                if not exam_state["is_looking_away"]: exam_state.update({"is_looking_away": True, "away_start_time": current_time})
        else:
            look_direction = "No Face Detected"
            if not exam_state["is_looking_away"]: exam_state.update({"is_looking_away": True, "away_start_time": current_time})
        if exam_state["is_looking_away"] and (current_time - exam_state["away_start_time"]) > ALERT_THRESHOLD_SECONDS and (current_time - exam_state["last_alert_time"]) > ALERT_COOLDOWN_SECONDS:
            exam_state["warnings"] += 1; play_alert(); exam_state["last_alert_time"] = current_time
        if exam_state["warnings"] >= MAX_WARNINGS: exam_state["violation_detected"] = True
    except Exception as e: logger.error(f"Error in process_image: {e}", exc_info=True); look_direction = "Processing Error"
    return {"face_detected": face_detected, "looking_at_screen": is_looking_at_screen, "warnings": exam_state.get("warnings", 0), "max_warnings": MAX_WARNINGS, "violation_detected": exam_state.get("violation_detected", False), "look_direction": look_direction, "eyes_closed": are_eyes_closed, "long_blink_count": exam_state.get("long_blink_count", 0)}

# ===============================
# API ROUTES
# ===============================

@app.route('/api/start', methods=['GET'])
def start_interview():
    try:
        memory = get_memory()
        session['question_count'], session['intro_questions_asked'] = 0, 0
        reset_exam_state()
        history = memory.buffer_as_str
        question = LLMChain(llm=llm, prompt=intro_prompt).run(history=history, question_number=1)
        memory.save_context({"input": question}, {"output": ""})
        session['intro_questions_asked'] = 1
        return jsonify({"question": clean_response(question), "status": "intro", "question_number": 1})
    except Exception as e:
        logger.error(f"Error in /api/start: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/submit', methods=['POST'])
def submit_answer():
    try:
        user_answer = request.json.get('answer', '')
        if not user_answer.strip(): return jsonify({"error": "Answer cannot be empty"}), 400
        memory = get_memory()
        question_count, intro_questions_asked = session.get('question_count', 0), session.get('intro_questions_asked', 0)
        history = memory.buffer_as_str
        last_question = history.split('Assistant:')[-2].split('Human:')[0].strip() if 'Assistant:' in history else ""
        memory.save_context({"input": last_question}, {"output": user_answer})
        question_count += 1
        session['question_count'] = question_count
        if intro_questions_asked < 2:
            session['intro_questions_asked'] = intro_questions_asked + 1
            prompt, status = intro_prompt, "intro"
            args = {"question_number": 2}
        elif question_count == 3:
            prompt, status, args = initial_project_prompt, "project", {}
        elif question_count <= 6:
            prompt, status = followup_project_prompt, "project"
            args = {"question_number": question_count - 3}
        else:
            result = _generate_evaluation_and_cleanup(memory)
            return jsonify(result)
        question = LLMChain(llm=llm, prompt=prompt).run(history=memory.buffer_as_str, **args)
        memory.save_context({"input": question}, {"output": ""})
        return jsonify({"question": clean_response(question), "status": status, "question_number": question_count})
    except Exception as e:
        logger.error(f"Error in /api/submit: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/finish', methods=['POST'])
def finish_interview():
    """Force-ends the interview and provides an evaluation based on history."""
    try:
        logger.info("User requested to finish interview early.")
        memory = get_memory()
        result = _generate_evaluation_and_cleanup(memory)
        return jsonify(result)
    except Exception as e:
        logger.error(f"Error in /api/finish: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/process-frame', methods=['POST'])
def process_frame():
    try:
        image_b64 = request.json['image']
        proctor_data = process_image(image_b64)
        return jsonify(proctor_data), 200
    except Exception as e:
        logger.error(f"Error in /api/process-frame endpoint: {e}")
        return jsonify({"error": "Failed to process frame on server"}), 500

@app.route('/api/end-exam', methods=['POST'])
def end_exam():
    try:
        session_id = session.get('session_id')
        if session_id and session_id in exam_states: del exam_states[session_id]
        if session_id and session_id in memory_store: del memory_store[session_id]
        session.clear()
        return jsonify({"status": "Exam ended"}), 200
    except Exception as e:
        logger.error(f"Error in /api/end-exam: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    app.run(debug=True, port=5000, use_reloader=False)