import os
import logging
import sys
import time
import re
from uuid import uuid4
import base64
import numpy as np
import cv2
from flask import Flask, request, jsonify, session
from flask_cors import CORS
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.chains import LLMChain
from langchain.memory import ConversationBufferMemory
from dotenv import load_dotenv

# Windows-specific audio (optional)
try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False
    logging.warning("winsound not available (non-Windows system).")

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Initialize Flask app
app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", str(uuid4()))
CORS(app, supports_credentials=True, origins=["http://localhost:5173"])  # Adjust for React port

logger.info("Starting combined proctoring and interview Flask server...")

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in .env file")
    raise ValueError("GROQ_API_KEY not found. Please set it in your .env file.")

# Initialize Groq LLM
try:
    llm = ChatGroq(model_name="llama3-70b-8192", groq_api_key=GROQ_API_KEY, temperature=0.7, max_tokens=100)
    logger.info("Groq LLM initialized successfully")
except Exception as e:
    logger.error(f"Error initializing Groq LLM: {str(e)}", exc_info=True)
    raise

# Load OpenCV Haar Cascade models
try:
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    if face_cascade.empty() or eye_cascade.empty():
        raise IOError("Failed to load Haar models")
    logger.info("Haar Cascade models loaded successfully.")
except Exception as e:
    logger.error(f"CRITICAL: Could not load Haar models. Proctoring disabled: {e}")
    face_cascade = None
    eye_cascade = None

# === QUESTION GENERATION & EVALUATION ===
memory_store = {}

# Prompts for concise questions (2-3 lines)
intro_prompt = PromptTemplate(
    input_variables=["history"],
    template="""You are an AI interviewer. Based on the history: {history}, ask: 'Introduce yourself briefly, including your role in a recent project.' (1 question, 2 lines max)"""
)
project_prompt = PromptTemplate(
    input_variables=["history", "question_number"],
    template="""Based on the history: {history}, ask a concise question about the candidate's project (e.g., 'What was the purpose of your project?', 'What challenges did you face?'). This is project question {question_number} out of 2. Keep it 2-3 lines."""
)
core_subject_prompt = PromptTemplate(
    input_variables=["history", "question_number"],
    template="""Based on the history: {history}, ask a concise question on Computer Organization, Operating Systems, or Data Structures (e.g., 'Explain cache memory in CO.', 'What is deadlock in OS?', 'How does a binary search tree work?'). This is core subject question {question_number} out of 3. Keep it 2-3 lines."""
)
evaluation_prompt = PromptTemplate(
    input_variables=["history"],
    template="""Based on the history: {history}, evaluate the candidate's responses. Summarize strengths and weaknesses, assign a mark out of 50, and justify the score. Format:\nEvaluation Summary\nStrengths: ...\nWeaknesses: ...\nFinal Mark: .../50\nJustification: ..."""
)

def get_memory():
    session_id = session.get('session_id', str(uuid4()))
    session['session_id'] = session_id
    if session_id not in memory_store:
        memory_store[session_id] = ConversationBufferMemory()
        logger.debug(f"Created new memory for session_id: {session_id}")
    return memory_store[session_id]

def clean_response(response):
    return re.sub(r'\*\*|\*|_|\#', '', response).strip()

def _generate_evaluation_and_cleanup(memory):
    history = memory.buffer_as_str
    if not history.strip():
        return {"evaluation": "No answers provided. No evaluation possible.", "status": "evaluation"}
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
    session.clear()
    return {"evaluation": clean_response(evaluation), "status": "evaluation"}

# === PROCTORING SECTION ===
exam_states = {}
ALERT_THRESHOLD_SECONDS, ALERT_COOLDOWN_SECONDS, LONG_BLINK_SECONDS, MAX_WARNINGS = 2.0, 5.0, 1.5, 3

def get_exam_state():
    session_id = session.get('session_id', str(uuid4()))
    session['session_id'] = session_id
    if session_id not in exam_states:
        exam_states[session_id] = {
            "is_looking_away": False,
            "away_start_time": 0,
            "is_eyes_closed": False,
            "eyes_closed_start_time": 0,
            "warnings": 0,
            "long_blink_count": 0,
            "last_alert_time": 0,
            "violation_detected": False
        }
    return exam_states[session_id]

def reset_exam_state():
    session_id = session.get('session_id')
    if session_id and session_id in exam_states:
        exam_states[session_id] = {
            "is_looking_away": False,
            "away_start_time": 0,
            "is_eyes_closed": False,
            "eyes_closed_start_time": 0,
            "warnings": 0,
            "long_blink_count": 0,
            "last_alert_time": 0,
            "violation_detected": False
        }
        logger.info("Exam state reset")

def play_alert():
    if WINSOUND_AVAILABLE:
        try:
            winsound.Beep(1000, 300)
        except Exception as e:
            logger.error(f"Could not play alert sound: {e}")
    else:
        print("\a")  # Fallback system beep

def detect_gaze_direction(eye_frame):
    try:
        height, width = eye_frame.shape[:2]
        if len(eye_frame.shape) > 2:
            eye_frame = cv2.cvtColor(eye_frame, cv2.COLOR_BGR2GRAY)
        threshold_eye = cv2.adaptiveThreshold(eye_frame, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        contours, _ = cv2.findContours(threshold_eye, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        if contours:
            M = cv2.moments(sorted(contours, key=cv2.contourArea, reverse=True)[0])
            if M['m00'] != 0:
                relative_x = (int(M['m10'] / M['m00'])) / width
                if 0.35 < relative_x < 0.65:
                    return "Center"
                elif relative_x <= 0.35:
                    return "Left"
                else:
                    return "Right"
        return "Unknown"
    except Exception as e:
        logger.error(f"Error in detect_gaze_direction: {e}")
        return "Error"

def process_image(image_data):
    if not face_cascade or not eye_cascade:
        return {
            "face_detected": False,
            "looking_at_screen": False,
            "warnings": 0,
            "max_warnings": MAX_WARNINGS,
            "violation_detected": False,
            "look_direction": "Proctoring Disabled",
            "eyes_closed": False,
            "long_blink_count": 0,
            "error": "OpenCV models not loaded"
        }
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
                if exam_state["is_eyes_closed"] and (current_time - exam_state["eyes_closed_start_time"]) > LONG_BLINK_SECONDS:
                    exam_state["long_blink_count"] += 1
                    logger.info(f"Long blink detected. Count: {exam_state['long_blink_count']}")
                exam_state["is_eyes_closed"] = False
                look_direction = detect_gaze_direction(roi_gray[eyes[0][1]:eyes[0][1]+eyes[0][3], eyes[0][0]:eyes[0][0]+eyes[0][2]])
                if look_direction == "Center":
                    is_looking_at_screen, exam_state["is_looking_away"] = True, False
                else:
                    is_looking_at_screen = False
                if not exam_state["is_looking_away"]:
                    exam_state.update({"is_looking_away": True, "away_start_time": current_time})
            else:
                are_eyes_closed, is_looking_at_screen, look_direction = True, False, "Eyes Closed"
                if not exam_state["is_eyes_closed"]:
                    exam_state.update({"is_eyes_closed": True, "eyes_closed_start_time": current_time})
                if not exam_state["is_looking_away"]:
                    exam_state.update({"is_looking_away": True, "away_start_time": current_time})
        else:
            look_direction = "No Face Detected"
            if not exam_state["is_looking_away"]:
                exam_state.update({"is_looking_away": True, "away_start_time": current_time})
        if exam_state["is_looking_away"] and (current_time - exam_state["away_start_time"]) > ALERT_THRESHOLD_SECONDS and (current_time - exam_state["last_alert_time"]) > ALERT_COOLDOWN_SECONDS:
            exam_state["warnings"] += 1
            play_alert()
            exam_state["last_alert_time"] = current_time
            logger.warning(f"Warning #{exam_state['warnings']} issued. Reason: {look_direction}")
        if exam_state["warnings"] >= MAX_WARNINGS:
            exam_state["violation_detected"] = True
    except Exception as e:
        logger.error(f"Error in process_image: {e}", exc_info=True)
        look_direction = "Processing Error"
    return {
        "face_detected": face_detected,
        "looking_at_screen": is_looking_at_screen,
        "warnings": exam_state.get("warnings", 0),
        "max_warnings": MAX_WARNINGS,
        "violation_detected": exam_state.get("violation_detected", False),
        "look_direction": look_direction,
        "eyes_closed": are_eyes_closed,
        "long_blink_count": exam_state.get("long_blink_count", 0)
    }

# === API ROUTES ===
@app.route('/api/start', methods=['GET'])
def start_interview():
    try:
        memory = get_memory()
        session['question_count'] = 0
        reset_exam_state()
        history = memory.buffer_as_str
        question = LLMChain(llm=llm, prompt=intro_prompt).run(history=history)
        memory.save_context({"input": question}, {"output": ""})
        logger.info("Interview started with intro question")
        return jsonify({"question": clean_response(question), "status": "intro", "question_number": 1})
    except Exception as e:
        logger.error(f"Error in /api/start: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/submit', methods=['POST'])
def submit_answer():
    try:
        user_answer = request.json.get('answer', '')
        if not user_answer.strip():
            logger.warning("Empty answer received")
            return jsonify({"error": "Answer cannot be empty"}), 400
        memory = get_memory()
        question_count = session.get('question_count', 0)
        history = memory.buffer_as_str
        last_question = history.split('Assistant:')[-2].split('Human:')[0].strip() if 'Assistant:' in history else ""
        memory.save_context({"input": last_question}, {"output": user_answer})
        question_count += 1
        session['question_count'] = question_count
        if question_count == 1:
            prompt, status, args = project_prompt, "project", {"question_number": 1}
        elif question_count == 2:
            prompt, status, args = project_prompt, "project", {"question_number": 2}
        elif question_count <= 5:
            prompt, status, args = core_subject_prompt, "core", {"question_number": question_count - 2}
        else:
            logger.info("Generating final evaluation")
            return jsonify(_generate_evaluation_and_cleanup(memory))
        question = LLMChain(llm=llm, prompt=prompt).run(history=memory.buffer_as_str, **args)
        memory.save_context({"input": question}, {"output": ""})
        logger.debug(f"Generated question {question_count}: {question}")
        return jsonify({"question": clean_response(question), "status": status, "question_number": question_count})
    except Exception as e:
        logger.error(f"Error in /api/submit: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/finish', methods=['POST'])
def finish_interview():
    try:
        logger.info("User requested to finish interview early")
        memory = get_memory()
        user_answer = request.json.get('answer', '')
        if user_answer.strip():
            history = memory.buffer_as_str
            last_question = history.split('Assistant:')[-2].split('Human:')[0].strip() if 'Assistant:' in history else ""
            memory.save_context({"input": last_question}, {"output": user_answer})
            logger.debug("Saved final answer before evaluation")
        return jsonify(_generate_evaluation_and_cleanup(memory))
    except Exception as e:
        logger.error(f"Error in /api/finish: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/process-frame', methods=['POST'])
def process_frame():
    try:
        image_b64 = request.json['image']
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]
        proctor_data = process_image(image_b64)
        return jsonify(proctor_data), 200
    except Exception as e:
        logger.error(f"Error in /api/process-frame endpoint: {e}")
        return jsonify({"error": "Failed to process frame on server"}), 500

@app.route('/api/end-exam', methods=['POST'])
def end_exam():
    try:
        session_id = session.get('session_id')
        if session_id and session_id in exam_states:
            logger.info(f"Proctoring summary: {exam_states[session_id]}")
            del exam_states[session_id]
        if session_id and session_id in memory_store:
            del memory_store[session_id]
        session.clear()
        logger.info("Exam ended and session cleared")
        return jsonify({"status": "Exam ended"}), 200
    except Exception as e:
        logger.error(f"Error in /api/end-exam: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "groq_connected": bool(GROQ_API_KEY),
        "opencv_loaded": bool(face_cascade and eye_cascade),
        "active_sessions": len(memory_store)
    }), 200

@app.route('/api/reset-session', methods=['POST'])
def reset_session():
    """Reset current session data"""
    try:
        session_id = session.get('session_id')
        if session_id:
            if session_id in memory_store:
                del memory_store[session_id]
            if session_id in exam_states:
                del exam_states[session_id]
        session.clear()
        logger.info("Session reset successfully")
        return jsonify({"status": "Session reset successfully"}), 200
    except Exception as e:
        logger.error(f"Error in /api/reset-session: {str(e)}")
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    try:
        logger.info("Flask server starting on port 5000...")
        app.run(debug=True, port=5000, use_reloader=False)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)