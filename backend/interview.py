import os
import logging
import sys
import time
import re
from uuid import uuid4
import base64
import numpy as np
import cv2
from flask import Blueprint, request, jsonify, session
# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from langchain_groq import ChatGroq
except Exception as import_err:
    ChatGroq = None
    logger.warning(f"Could not import ChatGroq in interview.py: {import_err}")
from langchain_core.prompts import PromptTemplate
from langchain_classic.chains import LLMChain
from langchain_classic.memory import ConversationBufferMemory
from dotenv import load_dotenv

# Windows-specific audio (optional)
try:
    import winsound
    WINSOUND_AVAILABLE = True
except ImportError:
    WINSOUND_AVAILABLE = False
    logging.warning("winsound not available (non-Windows system).")

# Blueprint for Interview & Proctoring
interview_bp = Blueprint('interview', __name__, url_prefix='/interview')

logger.info("Starting combined proctoring and interview Flask server...")

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in .env file")

# Initialize Groq LLM
llm = None
if ChatGroq and GROQ_API_KEY:
    try:
        llm = ChatGroq(model_name="openai/gpt-oss-120b", groq_api_key=GROQ_API_KEY, temperature=0.7, max_tokens=200)
        logger.info("Groq LLM initialized successfully")
    except Exception as e:
        logger.error(f"Error initializing Groq LLM: {str(e)}", exc_info=True)

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

import threading

# Load Object / Gadget Detection Model (SSDLite MobileNetV3)
gadget_model = None
gadget_categories = []

try:
    import torch
    import torchvision
    from torchvision.models.detection import ssdlite320_mobilenet_v3_large, SSDLite320_MobileNet_V3_Large_Weights

    weights = SSDLite320_MobileNet_V3_Large_Weights.DEFAULT
    gadget_categories = weights.meta.get("categories", [])
    gadget_model = ssdlite320_mobilenet_v3_large(weights=weights).eval()
    logger.info("SSDLite MobileNetV3 gadget detector loaded successfully.")
except Exception as e:
    logger.warning(f"Could not load SSDLite gadget detector: {e}")
    gadget_model = None

PROHIBITED_CLASSES = {
    "cell phone": "Mobile Phone",
    "remote": "Remote Device",
    "book": "Book / Notes Material"
}

def detect_gadgets(frame):
    """Detects unauthorized gadgets (phones, remotes, books) in frame."""
    if gadget_model is None or frame is None or frame.size == 0:
        return False, "", 0.0

    try:
        rgb = cv2.cvtColor(frame, cv2.COLOR_BGR2RGB)
        resized = cv2.resize(rgb, (320, 320))
        tensor = torch.from_numpy(resized).permute(2, 0, 1).unsqueeze(0).float() / 255.0

        with torch.no_grad():
            preds = gadget_model(tensor)[0]

        labels = preds["labels"].tolist()
        scores = preds["scores"].tolist()

        for label, score in zip(labels, scores):
            if score >= 0.40 and label < len(gadget_categories):
                cat_name = gadget_categories[label]
                if cat_name in PROHIBITED_CLASSES:
                    return True, PROHIBITED_CLASSES[cat_name], round(score, 2)
    except Exception as e:
        logger.error(f"Error in detect_gadgets: {e}")

    return False, "", 0.0

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

# Enhanced evaluation prompt with explicit mark format requirement
evaluation_prompt = PromptTemplate(
    input_variables=["history"],
    template="""Based on the interview history: {history}, 

Evaluate the candidate's responses comprehensively. Provide:

1. EVALUATION SUMMARY
2. STRENGTHS: List specific strengths observed
3. WEAKNESSES: List areas for improvement  
4. FINAL MARK: Assign a numerical score out of 50 (e.g., "35 out of 50" or "42/50")
5. JUSTIFICATION: Explain the reasoning behind the score

IMPORTANT: The final mark MUST be clearly stated as "X out of 50" or "X/50" format where X is the numerical score.

Format your response exactly as:
EVALUATION SUMMARY
[Brief summary here]

STRENGTHS:
[List strengths here]

WEAKNESSES: 
[List weaknesses here]

FINAL MARK: [Score] out of 50

JUSTIFICATION:
[Detailed justification here]"""
)

def get_memory():
    session_id = session.get('session_id', str(uuid4()))
    session['session_id'] = session_id
    if session_id not in memory_store:
        memory_store[session_id] = ConversationBufferMemory()
        logger.debug(f"Created new memory for session_id: {session_id}")
    return memory_store[session_id]

def extract_and_format_mark(evaluation_text):
    """
    Extract mark from evaluation text and ensure proper formatting
    """
    # Patterns to match various mark formats
    patterns = [
        r'FINAL MARK[:\s]*(\d+)\s*out of\s*50',  # "FINAL MARK: 45 out of 50"
        r'FINAL MARK[:\s]*(\d+)/50',              # "FINAL MARK: 45/50"  
        r'Final Mark[:\s]*(\d+)\s*out of\s*50',  # "Final Mark: 45 out of 50"
        r'Final Mark[:\s]*(\d+)/50',              # "Final Mark: 45/50"
        r'mark[:\s]*(\d+)\s*out of\s*50',        # "mark: 45 out of 50"
        r'mark[:\s]*(\d+)/50',                    # "mark: 45/50"
        r'score[:\s]*(\d+)\s*out of\s*50',       # "score: 45 out of 50"
        r'score[:\s]*(\d+)/50',                   # "score: 45/50"
        r'(\d+)\s*out of\s*50',                  # "45 out of 50"
        r'(\d+)/50',                             # "45/50"
    ]
    
    for pattern in patterns:
        match = re.search(pattern, evaluation_text, re.IGNORECASE)
        if match:
            score = int(match.group(1))
            # Ensure score is within valid range
            if 0 <= score <= 50:
                return score
    
    return None

def analyze_performance_for_score(evaluation_text):
    """
    Analyze evaluation text to assign a reasonable default score
    """
    text_lower = evaluation_text.lower()
    
    # Positive indicators
    positive_words = ['excellent', 'good', 'strong', 'clear', 'demonstrates', 'understanding', 'well']
    negative_words = ['poor', 'weak', 'lacks', 'insufficient', 'unclear', 'limited', 'needs improvement']
    
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    
    # Basic scoring logic
    if positive_count > negative_count * 2:
        return 42  # Good performance
    elif positive_count > negative_count:
        return 35  # Average performance  
    else:
        return 28  # Below average performance

def format_evaluation_with_mark(evaluation_text):
    """
    Ensure evaluation contains properly formatted mark
    """
    score = extract_and_format_mark(evaluation_text)
    
    if score is not None:
        # Replace any existing mark format with standardized format
        formatted_mark = f"FINAL MARK: {score} out of 50"
        
        # Replace existing mark patterns
        patterns_to_replace = [
            r'FINAL MARK[:\s]*\d+[/\s]*(?:out of\s*)?50',
            r'Final Mark[:\s]*\d+[/\s]*(?:out of\s*)?50',
            r'mark[:\s]*\d+[/\s]*(?:out of\s*)?50',
            r'score[:\s]*\d+[/\s]*(?:out of\s*)?50'
        ]
        
        for pattern in patterns_to_replace:
            evaluation_text = re.sub(pattern, formatted_mark, evaluation_text, flags=re.IGNORECASE)
        
        # If no existing pattern found, add the mark
        if not re.search(r'FINAL MARK:', evaluation_text, re.IGNORECASE):
            # Insert mark before justification if present
            if 'JUSTIFICATION:' in evaluation_text.upper():
                evaluation_text = evaluation_text.replace('JUSTIFICATION:', f'{formatted_mark}\n\nJUSTIFICATION:')
            else:
                evaluation_text += f'\n\n{formatted_mark}'
    else:
        # If no score found, add a default one based on content analysis
        default_score = analyze_performance_for_score(evaluation_text)
        formatted_mark = f"FINAL MARK: {default_score} out of 50"
        evaluation_text += f'\n\n{formatted_mark}'
    
    return evaluation_text

def clean_response(response):
    """
    Clean response while preserving important formatting like marks
    """
    # Remove markdown formatting but preserve structure
    cleaned = re.sub(r'\*\*|\*(?!\s*out\s*of)|\#', '', response)
    
    # Preserve "out of" phrases which might contain marks
    cleaned = re.sub(r'_(?!.*out.*of)', '', cleaned)
    
    return cleaned.strip()

def _generate_evaluation_and_cleanup(memory):
    """
    Generate evaluation with guaranteed mark display
    """
    history = memory.buffer_as_str
    if not history.strip():
        return {"evaluation": "No answers provided. No evaluation possible.\n\nFINAL MARK: 0 out of 50", "status": "evaluation"}
    
    try:
        evaluation_chain = LLMChain(llm=llm, prompt=evaluation_prompt)
        evaluation = evaluation_chain.run(history=history)
        
        # Clean and format the evaluation
        cleaned_evaluation = clean_response(evaluation)
        formatted_evaluation = format_evaluation_with_mark(cleaned_evaluation)
        
        # Cleanup session data
        session_id = session.get('session_id')
        if session_id:
            if session_id in memory_store:
                del memory_store[session_id]
                logger.info(f"Memory cleared for session {session_id}")
            if session_id in exam_states:
                del exam_states[session_id]
                logger.info(f"Exam state cleared for session {session_id}")
        session.clear()
        
        logger.info("Evaluation generated successfully with mark")
        return {"evaluation": formatted_evaluation, "status": "evaluation"}
        
    except Exception as e:
        logger.error(f"Error generating evaluation: {str(e)}")
        return {"evaluation": f"Error generating evaluation: {str(e)}\n\nFINAL MARK: 0 out of 50", "status": "evaluation"}

# === PROCTORING SECTION ===
exam_states = {}
ALERT_THRESHOLD_SECONDS, ALERT_COOLDOWN_SECONDS, LONG_BLINK_SECONDS, MAX_WARNINGS = 2.0, 4.0, 1.5, 3

def get_exam_state(session_id=None):
    if not session_id:
        try:
            session_id = request.headers.get("X-Session-ID") or session.get('session_id')
        except Exception:
            session_id = None
    if not session_id:
        session_id = "default_exam_session"

    if session_id not in exam_states:
        exam_states[session_id] = {
            "is_looking_away": False,
            "away_start_time": 0,
            "is_eyes_closed": False,
            "eyes_closed_start_time": 0,
            "warnings": 0,
            "long_blink_count": 0,
            "last_alert_time": 0,
            "violation_detected": False,
            "last_violation_reason": "",
            "last_gadget_check_time": 0,
            "last_gadget_detected": False,
            "last_gadget_name": ""
        }
    return exam_states[session_id]

def reset_exam_state(session_id=None):
    state = get_exam_state(session_id)
    state.update({
        "is_looking_away": False,
        "away_start_time": 0,
        "is_eyes_closed": False,
        "eyes_closed_start_time": 0,
        "warnings": 0,
        "long_blink_count": 0,
        "last_alert_time": 0,
        "violation_detected": False,
        "last_violation_reason": "",
        "last_gadget_check_time": 0,
        "last_gadget_detected": False,
        "last_gadget_name": ""
    })
    logger.info(f"Exam state reset for session {session_id}")

def play_alert():
    """Plays warning alert sound asynchronously so Flask thread is never blocked."""
    def _beep():
        try:
            if WINSOUND_AVAILABLE:
                winsound.Beep(1200, 250)
            else:
                print("\a")
        except Exception:
            pass
    threading.Thread(target=_beep, daemon=True).start()

def detect_gaze_direction(eye_frame):
    try:
        if eye_frame is None or eye_frame.size == 0:
            return "Center"
        height, width = eye_frame.shape[:2]
        if height == 0 or width == 0:
            return "Center"
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
        return "Center"
    except Exception as e:
        logger.error(f"Error in detect_gaze_direction: {e}")
        return "Center"

def process_image(image_data, session_id=None):
    if not face_cascade or not eye_cascade:
        return {
            "face_detected": False,
            "face_count": 0,
            "multiple_faces_detected": False,
            "gadget_detected": False,
            "gadget_name": "",
            "looking_at_screen": False,
            "warnings": 0,
            "max_warnings": MAX_WARNINGS,
            "violation_detected": False,
            "look_direction": "Proctoring Disabled",
            "eyes_closed": False,
            "long_blink_count": 0,
            "status_message": "OpenCV models not loaded",
            "error": "OpenCV models not loaded"
        }

    exam_state = get_exam_state(session_id)
    current_time = time.time()

    face_detected = False
    face_count = 0
    multiple_faces_detected = False
    is_looking_at_screen = False
    are_eyes_closed = False
    look_direction = "Unknown"
    gadget_detected = False
    gadget_name = ""
    status_message = "Monitoring"
    current_violation_reason = ""

    try:
        # Decode frame safely (supports numpy array or base64 data URL)
        if isinstance(image_data, np.ndarray):
            frame = image_data
        else:
            if ',' in image_data:
                image_data = image_data.split(',')[1]
            raw_bytes = base64.b64decode(image_data)
            np_arr = np.frombuffer(raw_bytes, np.uint8)
            frame = cv2.imdecode(np_arr, cv2.IMREAD_COLOR)

        if frame is None or frame.size == 0:
            raise ValueError("Failed to decode image frame")

        gray = cv2.cvtColor(frame, cv2.COLOR_BGR2GRAY)
        faces = face_cascade.detectMultiScale(gray, 1.1, 4, minSize=(40, 40))
        face_count = len(faces)

        # ── 1. CLASSIFY EXACTLY 1 PERSON ATTENDING TEST ──────────────
        if face_count == 0:
            face_detected = False
            multiple_faces_detected = False
            look_direction = "No Person Detected"
            status_message = "No Person Detected - Stay in Front of Camera"
            current_violation_reason = "No candidate face visible in frame"
            if not exam_state["is_looking_away"]:
                exam_state.update({"is_looking_away": True, "away_start_time": current_time})

        elif face_count > 1:
            # Multiple people in camera view! Strictly prohibited
            face_detected = True
            multiple_faces_detected = True
            look_direction = f"Multiple People ({face_count})"
            status_message = f"Warning: Multiple People Detected ({face_count}) - Only 1 Person Allowed"
            current_violation_reason = f"Multiple people detected ({face_count} faces) in camera"

            if (current_time - exam_state["last_alert_time"]) > ALERT_COOLDOWN_SECONDS:
                exam_state["warnings"] += 1
                play_alert()
                exam_state["last_alert_time"] = current_time
                exam_state["last_violation_reason"] = current_violation_reason
                logger.warning(f"Warning #{exam_state['warnings']} issued: Multiple people ({face_count})")

        else:
            # Exactly 1 person! Candidate verified
            face_detected = True
            multiple_faces_detected = False
            status_message = "1 Person (Verified)"

            x, y, w, h = faces[0]
            roi_gray = gray[y:y+h, x:x+w]
            eyes = eye_cascade.detectMultiScale(roi_gray, 1.1, 4, minSize=(15, 15))

            if len(eyes) >= 1:
                are_eyes_closed = False
                if exam_state["is_eyes_closed"] and (current_time - exam_state["eyes_closed_start_time"]) > LONG_BLINK_SECONDS:
                    exam_state["long_blink_count"] += 1
                exam_state["is_eyes_closed"] = False

                eye_x, eye_y, eye_w, eye_h = eyes[0]
                look_direction = detect_gaze_direction(roi_gray[eye_y:eye_y+eye_h, eye_x:eye_x+eye_w])

                if look_direction == "Center":
                    is_looking_at_screen = True
                    exam_state["is_looking_away"] = False
                    status_message = "1 Person Verified (Focused on Screen)"
                else:
                    is_looking_at_screen = False
                    if not exam_state["is_looking_away"]:
                        exam_state.update({"is_looking_away": True, "away_start_time": current_time})
                    status_message = f"Looking {look_direction}"
            else:
                are_eyes_closed = True
                is_looking_at_screen = False
                look_direction = "Eyes Closed"
                status_message = "Eyes Closed"
                if not exam_state["is_eyes_closed"]:
                    exam_state.update({"is_eyes_closed": True, "eyes_closed_start_time": current_time})
                if not exam_state["is_looking_away"]:
                    exam_state.update({"is_looking_away": True, "away_start_time": current_time})

        # ── 2. GADGET & ELECTRONIC DEVICE DETECTION ────────────────────
        if gadget_model is not None:
            has_gadget, detected_gadget_name, conf = detect_gadgets(frame)
            if has_gadget:
                gadget_detected = True
                gadget_name = detected_gadget_name
                look_direction = f"Gadget Detected: {gadget_name}"
                status_message = f"Warning: {gadget_name} Detected!"
                current_violation_reason = f"Unauthorized device detected: {gadget_name}"

                if (current_time - exam_state["last_alert_time"]) > ALERT_COOLDOWN_SECONDS:
                    exam_state["warnings"] += 1
                    play_alert()
                    exam_state["last_alert_time"] = current_time
                    exam_state["last_violation_reason"] = current_violation_reason
                    logger.warning(f"Warning #{exam_state['warnings']} issued: Gadget detected ({gadget_name})")

        # ── 3. LOOKING AWAY FOR EXTENDED DURATION ──────────────────────
        if exam_state["is_looking_away"] and not multiple_faces_detected and not gadget_detected:
            if (current_time - exam_state["away_start_time"]) > ALERT_THRESHOLD_SECONDS:
                if (current_time - exam_state["last_alert_time"]) > ALERT_COOLDOWN_SECONDS:
                    exam_state["warnings"] += 1
                    play_alert()
                    exam_state["last_alert_time"] = current_time
                    current_violation_reason = f"Candidate looking away ({look_direction})"
                    exam_state["last_violation_reason"] = current_violation_reason
                    logger.warning(f"Warning #{exam_state['warnings']} issued: Looking away ({look_direction})")

        # ── 4. MAX WARNINGS REACHED -> VIOLATION ──────────────────────
        if exam_state["warnings"] >= MAX_WARNINGS:
            exam_state["violation_detected"] = True
            if not exam_state.get("last_violation_reason"):
                exam_state["last_violation_reason"] = current_violation_reason or "Exceeded max warnings (3/3)"

    except Exception as e:
        logger.error(f"Error in process_image: {e}", exc_info=True)
        look_direction = "Processing Error"
        status_message = "Frame processing error"

    return {
        "face_detected": face_detected,
        "face_count": face_count,
        "multiple_faces_detected": multiple_faces_detected,
        "gadget_detected": gadget_detected,
        "gadget_name": gadget_name,
        "looking_at_screen": is_looking_at_screen,
        "warnings": exam_state.get("warnings", 0),
        "max_warnings": MAX_WARNINGS,
        "violation_detected": exam_state.get("violation_detected", False),
        "violation_reason": exam_state.get("last_violation_reason", current_violation_reason),
        "look_direction": look_direction,
        "eyes_closed": are_eyes_closed,
        "long_blink_count": exam_state.get("long_blink_count", 0),
        "status_message": status_message
    }

# === API ROUTES ===
@interview_bp.route('/api/start', methods=['GET'])
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

@interview_bp.route('/api/submit', methods=['POST'])
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

@interview_bp.route('/api/finish', methods=['POST'])
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

@interview_bp.route('/api/process-frame', methods=['POST'])
def process_frame():
    try:
        data = request.get_json(silent=True) or {}
        image_b64 = data.get('image', '')
        if not image_b64:
            return jsonify({"error": "No image data provided"}), 400
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]
        sid = request.headers.get("X-Session-ID") or data.get("session_id")
        proctor_data = process_image(image_b64, session_id=sid)
        return jsonify(proctor_data), 200
    except Exception as e:
        logger.error(f"Error in /api/process-frame endpoint: {e}", exc_info=True)
        return jsonify({"error": "Failed to process frame on server"}), 500

@interview_bp.route('/api/end-exam', methods=['POST'])
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

@interview_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "groq_connected": bool(GROQ_API_KEY),
        "opencv_loaded": bool(face_cascade and eye_cascade),
        "active_sessions": len(memory_store)
    }), 200

@interview_bp.route('/api/reset-session', methods=['POST'])
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

# Test function to verify mark extraction (for debugging)
def test_mark_extraction():
    """
    Test function to verify mark extraction works correctly
    """
    test_cases = [
        "FINAL MARK: 45 out of 50",
        "Final Mark: 38/50", 
        "The candidate scored 42 out of 50",
        "Overall mark 35/50",
        "Evaluation shows good performance with a score of 40 out of 50",
        "Strengths: Good knowledge\nWeaknesses: Some gaps\nJustification: Overall decent performance"  # No mark case
    ]
    
    print("Testing mark extraction:")
    for test in test_cases:
        score = extract_and_format_mark(test)
        formatted = format_evaluation_with_mark(test)
        print(f"Original: '{test[:50]}...'")
        print(f"Extracted Score: {score}")
        print(f"Formatted: {formatted}")
        print("-" * 50)

# Note: This module is registered as a Blueprint by the main app