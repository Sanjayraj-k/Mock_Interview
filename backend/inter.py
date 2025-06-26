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
logger.info(f"Python version: {sys.version}")

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in .env file")
    raise ValueError("GROQ_API_KEY not found. Please set it in your .env file.")

# Initialize Groq LLM for question generation
try:
    llm = ChatGroq(
        model_name="llama3-70b-8192",
        groq_api_key=GROQ_API_KEY,
        temperature=0.7,
        max_tokens=2048
    )
    logger.info("Groq LLM initialized successfully")
except Exception as e:
    logger.error(f"Error initializing Groq LLM: {str(e)}")
    raise

# Load OpenCV Haar Cascade models for proctoring
try:
    logger.info(f"OpenCV version: {cv2.__version__}")
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    if face_cascade.empty() or eye_cascade.empty():
        raise IOError("Failed to load one or more Haar Cascade models")
    logger.info("Haar Cascade models loaded successfully.")
except Exception as e:
    logger.error(f"CRITICAL: Could not load Haar models. Proctoring will be disabled. Error: {e}")
    face_cascade = None
    eye_cascade = None

# ===============================
# QUESTION GENERATION SECTION
# ===============================

# In-memory store for conversation history
memory_store = {}

# Define prompts for question generation
intro_prompt = PromptTemplate(
    input_variables=["history", "question_number"],
    template="""You are an AI interviewer evaluating a candidate. Based on the conversation history: {history}
    For question 1, ask: 'Please introduce yourself and briefly describe your role in the project.'
    For question 2, ask a specific question about the candidate's skills relevant to their role or project, using the history if available (e.g., 'What specific skills did you leverage in your role as [role mentioned]?').
    This is question {question_number} out of 2 self-introduction questions.
    """
)

initial_project_prompt = PromptTemplate(
    input_variables=["history"],
    template="""Based on the conversation history: {history}
    Ask the candidate: 'Please explain your project in detail, including its purpose and your contributions.'
    """
)

followup_project_prompt = PromptTemplate(
    input_variables=["history", "question_number"],
    template="""Based on the conversation history: {history}
    Ask a specific follow-up question about how the candidate handled a particular topic, challenge, or error related to their project. Focus on their problem-solving approach, technical decisions, or error resolution strategies. Ensure the question is relevant to their previous answers about the project.
    This is project-related question {question_number} out of 3 follow-up questions.
    Examples:
    - 'What challenges did you face while implementing [specific project aspect], and how did you address them?'
    - 'Can you describe a specific error or bug you encountered in [project component] and how you resolved it?'
    - 'How did you handle [specific topic/technology] in your project to ensure its success?'
    """
)

evaluation_prompt = PromptTemplate(
    input_variables=["history"],
    template="""Based on the entire conversation history: {history}
    Evaluate the candidate's responses. Provide a brief summary of their strengths and weaknesses.
    Assign a final mark out of 60, justifying the score based on their answers' clarity, depth, and relevance.
    Format the output as:
    Evaluation Summary
    Strengths: ...
    Weaknesses: ...
    Final Mark: .../60
    Justification: ...
    """
)

# Memory management for questions
def get_memory():
    session_id = session.get('session_id', str(uuid4()))
    session['session_id'] = session_id
    if session_id not in memory_store:
        memory_store[session_id] = ConversationBufferMemory()
        logger.debug(f"Created new memory for session_id: {session_id}")
    return memory_store[session_id]

def clean_response(response):
    return re.sub(r'\*\*|\*|_|\#', '', response).strip()

# ===============================
# PROCTORING SECTION
# ===============================

# Global proctoring state
exam_states = {}

# Proctoring configuration constants
ALERT_THRESHOLD_SECONDS = 2.0  # Time looking away before a warning
ALERT_COOLDOWN_SECONDS = 5.0   # Wait this long between alerts
LONG_BLINK_SECONDS = 1.5       # A blink longer than this is flagged
MAX_WARNINGS = 3

def get_exam_state():
    """Get or create exam state for current session"""
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
        logger.info(f"Created new exam state for session: {session_id}")
    
    return exam_states[session_id]

def reset_exam_state():
    """Resets all tracking variables for current session."""
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
        logger.info(f"Exam state reset for session: {session_id}")

def play_alert():
    """Plays a system beep sound as a warning."""
    if WINSOUND_AVAILABLE:
        try:
            winsound.Beep(1000, 300)
            logger.warning("ALERT: Warning sound played due to proctoring event.")
        except Exception as e:
            logger.error(f"Could not play alert sound: {e}")
    else:
        logger.warning("ALERT: Would play warning sound (winsound not available)")

def detect_gaze_direction(eye_frame):
    """
    Analyzes an eye frame to determine gaze direction.
    Returns 'Center', 'Left', 'Right', or 'Unknown'.
    """
    try:
        height, width = eye_frame.shape[:2]
        if len(eye_frame.shape) > 2:
            eye_frame = cv2.cvtColor(eye_frame, cv2.COLOR_BGR2GRAY)

        threshold_eye = cv2.adaptiveThreshold(eye_frame, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        contours, _ = cv2.findContours(threshold_eye, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)

        if contours:
            contour = contours[0]
            M = cv2.moments(contour)
            if M['m00'] != 0:
                cx = int(M['m10'] / M['m00'])
                relative_x = cx / width
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
    """Main image processing and proctoring logic."""
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
    
    exam_state = get_exam_state()
    current_time = time.time()
    
    # Default values for the response
    face_detected = False
    is_looking_at_screen = False
    are_eyes_closed = False
    look_direction = "Unknown"

    try:
        # Decode image from base64 string
        img_bytes = base64.b64decode(image_data)
        np_arr = np.frombuffer(img_bytes, np.uint8)
        frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None:
            raise ValueError("Failed to decode image from buffer.")

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, scaleFactor=1.1, minNeighbors=5, minSize=(30, 30))
        
        face_detected = len(faces) > 0

        if face_detected:
            # Process the largest face
            (x, y, w, h) = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
            roi_gray = gray[y:y + h, x:x + w]
            
            # Detect eyes within the face region
            eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=5)

            if len(eyes) >= 1:  # Eyes are open
                are_eyes_closed = False
                # Check for long blink
                if exam_state["is_eyes_closed"]:
                    closure_duration = current_time - exam_state["eyes_closed_start_time"]
                    if closure_duration > LONG_BLINK_SECONDS:
                        exam_state["long_blink_count"] += 1
                        logger.info(f"Long blink detected. Duration: {closure_duration:.2f}s")
                    exam_state["is_eyes_closed"] = False

                # Determine gaze direction
                (ex, ey, ew, eh) = eyes[0]
                eye_frame = roi_gray[ey:ey + eh, ex:ex + ew]
                look_direction = detect_gaze_direction(eye_frame)

                if look_direction == "Center":
                    is_looking_at_screen = True
                    exam_state["is_looking_away"] = False
                else:
                    is_looking_at_screen = False
                    if not exam_state["is_looking_away"]:
                        exam_state["is_looking_away"] = True
                        exam_state["away_start_time"] = current_time
            else:
                # Eyes are closed or not detected
                are_eyes_closed = True
                is_looking_at_screen = False
                look_direction = "Eyes Closed"
                if not exam_state["is_eyes_closed"]:
                    exam_state["is_eyes_closed"] = True
                    exam_state["eyes_closed_start_time"] = current_time
                if not exam_state["is_looking_away"]:
                    exam_state["is_looking_away"] = True
                    exam_state["away_start_time"] = current_time
        else:
            # No face detected
            look_direction = "No Face Detected"
            if not exam_state["is_looking_away"]:
                exam_state["is_looking_away"] = True
                exam_state["away_start_time"] = current_time

        # Warning logic
        if exam_state["is_looking_away"]:
            away_duration = current_time - exam_state["away_start_time"]
            if away_duration > ALERT_THRESHOLD_SECONDS:
                if current_time - exam_state["last_alert_time"] > ALERT_COOLDOWN_SECONDS:
                    exam_state["warnings"] += 1
                    play_alert()
                    exam_state["last_alert_time"] = current_time
                    logger.warning(f"Warning #{exam_state['warnings']} issued. Reason: {look_direction}. Duration: {away_duration:.2f}s")

        # Check for final violation
        if exam_state["warnings"] >= MAX_WARNINGS:
            exam_state["violation_detected"] = True

    except Exception as e:
        logger.error(f"Error in process_image: {e}", exc_info=True)
        look_direction = "Processing Error"

    # Prepare response data
    proctor_data = {
        "face_detected": face_detected,
        "looking_at_screen": is_looking_at_screen,
        "warnings": exam_state.get("warnings", 0),
        "max_warnings": MAX_WARNINGS,
        "violation_detected": exam_state.get("violation_detected", False),
        "look_direction": look_direction,
        "eyes_closed": are_eyes_closed,
        "long_blink_count": exam_state.get("long_blink_count", 0),
    }
    
    return proctor_data

# ===============================
# API ROUTES
# ===============================

# Question Generation Routes
@app.route('/api/start', methods=['GET'])
def start_interview():
    """Start the interview and proctoring session"""
    try:
        logger.info("Starting interview and proctoring session")
        
        # Initialize interview state
        memory = get_memory()
        session['question_count'] = 0
        session['intro_questions_asked'] = 0
        
        # Initialize proctoring state
        reset_exam_state()
        
        # Generate first question
        history = memory.buffer_as_str
        intro_chain = LLMChain(llm=llm, prompt=intro_prompt)
        question = intro_chain.run(history=history, question_number=1)
        memory.save_context({"input": question}, {"output": ""})
        session['intro_questions_asked'] = 1
        
        logger.info("Interview and proctoring session started successfully")
        return jsonify({
            "question": clean_response(question), 
            "status": "intro", 
            "question_number": 1,
            "proctoring_active": True
        })
    except Exception as e:
        logger.error(f"Error in /api/start: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/submit', methods=['POST'])
def submit_answer():
    """Submit answer and get next question"""
    try:
        logger.info("Processing answer submission")
        data = request.json
        user_answer = data.get('answer', '')
        if not user_answer.strip():
            logger.warning("Empty answer received")
            return jsonify({"error": "Answer cannot be empty"}), 400

        memory = get_memory()
        question_count = session.get('question_count', 0)
        intro_questions_asked = session.get('intro_questions_asked', 0)
        history = memory.buffer_as_str

        # Extract last question
        last_question = ""
        if history:
            assistant_parts = history.split('Assistant:')
            if len(assistant_parts) >= 2:
                last_assistant = assistant_parts[-2]
                human_parts = last_assistant.split('Human:')
                if human_parts:
                    last_question = human_parts[0].strip()

        # Update memory with the latest answer
        memory.save_context({"input": last_question}, {"output": user_answer})
        question_count += 1
        session['question_count'] = question_count

        if intro_questions_asked < 2:
            # Second intro question
            intro_questions_asked += 1
            session['intro_questions_asked'] = intro_questions_asked
            intro_chain = LLMChain(llm=llm, prompt=intro_prompt)
            question = intro_chain.run(history=memory.buffer_as_str, question_number=2)
            memory.save_context({"input": question}, {"output": ""})
            return jsonify({
                "question": clean_response(question),
                "status": "intro",
                "question_number": question_count
            })

        elif question_count == 3:
            # Initial project question
            project_chain = LLMChain(llm=llm, prompt=initial_project_prompt)
            question = project_chain.run(history=memory.buffer_as_str)
            memory.save_context({"input": question}, {"output": ""})
            return jsonify({
                "question": clean_response(question),
                "status": "project",
                "question_number": question_count
            })

        elif question_count <= 6:
            # Follow-up project questions
            followup_question_number = question_count - 3
            followup_chain = LLMChain(llm=llm, prompt=followup_project_prompt)
            question = followup_chain.run(history=memory.buffer_as_str, question_number=followup_question_number)
            memory.save_context({"input": question}, {"output": ""})
            return jsonify({
                "question": clean_response(question),
                "status": "project",
                "question_number": question_count
            })

        else:
            # Generate evaluation
            evaluation_chain = LLMChain(llm=llm, prompt=evaluation_prompt)
            evaluation = evaluation_chain.run(history=memory.buffer_as_str)
            
            # Clean up session
            session_id = session.get('session_id')
            if session_id in memory_store:
                del memory_store[session_id]
            if session_id in exam_states:
                del exam_states[session_id]
            
            return jsonify({
                "evaluation": clean_response(evaluation),
                "status": "evaluation"
            })

    except Exception as e:
        logger.error(f"Error in /api/submit: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

# Proctoring Routes
@app.route('/api/process-frame', methods=['POST'])
def process_frame():
    """Process video frame for proctoring"""
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
    """End the exam session"""
    try:
        data = request.json
        session_id = session.get('session_id')
        
        logger.info("Exam session ended by client.")
        logger.info(f"Final exam data received: {data}")
        
        if session_id:
            if session_id in exam_states:
                logger.info(f"Final proctoring summary: {exam_states[session_id]}")
                del exam_states[session_id]
            if session_id in memory_store:
                del memory_store[session_id]
        
        session.clear()
        return jsonify({"status": "Exam ended and results received"}), 200
    except Exception as e:
        logger.error(f"Error in /api/end-exam: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Health check route
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "services": {
            "llm": bool(llm),
            "opencv": bool(face_cascade and eye_cascade),
            "winsound": WINSOUND_AVAILABLE
        }
    }), 200

# Utility function for parsing scores
def parse_score(evaluation):
    match = re.search(r'Final Mark:\s*(\d+)/60', evaluation)
    return int(match.group(1)) if match else None

if __name__ == "__main__":
    logger.info("Starting combined exam server on port 5000")
    app.run(debug=True, port=5000, use_reloader=False)