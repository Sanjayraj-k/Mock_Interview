from flask import Flask, request, jsonify
from flask_cors import CORS
import cv2
import numpy as np
import base64
import time
import winsound  # Note: This is Windows-specific
import logging
import sys

# --- Setup ---
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "http://localhost:5173"}}) # Ensure this matches your React app's port

logger.info("Starting Flask proctoring server...")
logger.info(f"Python version: {sys.version}")
logger.info(f"OpenCV version: {cv2.__version__}")

# --- Load Haar Cascade models ---
try:
    face_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_frontalface_default.xml')
    eye_cascade = cv2.CascadeClassifier(cv2.data.haarcascades + 'haarcascade_eye.xml')
    if face_cascade.empty() or eye_cascade.empty():
        raise IOError("Failed to load one or more Haar Cascade models")
    logger.info("Haar Cascade models loaded successfully.")
except Exception as e:
    logger.error(f"CRITICAL: Could not load Haar models. Exiting. Error: {e}")
    sys.exit(1)

# --- Global State & Configuration ---
# This dictionary will hold the state for the current exam session.
exam_state = {}

# Configuration constants
ALERT_THRESHOLD_SECONDS = 2.0  # Time looking away before a warning
ALERT_COOLDOWN_SECONDS = 5.0   # Wait this long between alerts
LONG_BLINK_SECONDS = 1.5       # A blink longer than this is flagged
MAX_WARNINGS = 3

def reset_exam_state():
    """Resets all tracking variables for a new session."""
    global exam_state
    exam_state = {
        "is_looking_away": False,
        "away_start_time": 0,
        "is_eyes_closed": False,
        "eyes_closed_start_time": 0,
        "warnings": 0,
        "long_blink_count": 0,
        "last_alert_time": 0,
        "violation_detected": False
    }
    logger.info("Exam state has been reset.")

def play_alert():
    """Plays a system beep sound as a warning."""
    try:
        # A simple beep. Frequency: 1000 Hz, Duration: 300 ms
        winsound.Beep(1000, 300)
        logger.warning("ALERT: Warning sound played due to proctoring event.")
    except Exception as e:
        # This will fail on non-Windows systems.
        logger.error(f"Could not play alert sound (winsound is Windows-only): {e}")

def detect_gaze_direction(eye_frame):
    """
    Analyzes an eye frame to determine gaze direction.
    Returns 'center', 'left', or 'right'.
    This is a simplified implementation.
    """
    try:
        height, width = eye_frame.shape[:2]
        # Convert to grayscale if it's not already
        if len(eye_frame.shape) > 2:
            eye_frame = cv2.cvtColor(eye_frame, cv2.COLOR_BGR2GRAY)

        # Use adaptive thresholding for better pupil detection in various lighting
        threshold_eye = cv2.adaptiveThreshold(eye_frame, 255, cv2.ADAPTIVE_THRESH_MEAN_C, cv2.THRESH_BINARY_INV, 11, 2)
        
        # Find contours to locate the pupil
        contours, _ = cv2.findContours(threshold_eye, cv2.RETR_TREE, cv2.CHAIN_APPROX_SIMPLE)
        contours = sorted(contours, key=cv2.contourArea, reverse=True)

        if contours:
            contour = contours[0]
            M = cv2.moments(contour)
            if M['m00'] != 0:
                cx = int(M['m10'] / M['m00'])
                # Gaze is determined by the pupil's horizontal position
                relative_x = cx / width
                if 0.35 < relative_x < 0.65:
                    return "Center"
                elif relative_x <= 0.35:
                    return "Left"
                else:
                    return "Right"
        return "Unknown" # Return unknown if no pupil is clearly identified
    except Exception as e:
        logger.error(f"Error in detect_gaze_direction: {e}")
        return "Error"

def process_image(image_data):
    """Main image processing and proctoring logic."""
    global exam_state
    current_time = time.time()
    
    # --- Default values for the response ---
    face_detected = False
    is_looking_at_screen = False
    are_eyes_closed = False
    look_direction = "Unknown"
    blink_duration = 0

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
            # We only care about the largest face
            (x, y, w, h) = sorted(faces, key=lambda f: f[2]*f[3], reverse=True)[0]
            roi_gray = gray[y:y + h, x:x + w]
            
            # Detect eyes within the face region
            eyes = eye_cascade.detectMultiScale(roi_gray, scaleFactor=1.1, minNeighbors=5)

            if len(eyes) >= 1: # Eyes are open
                are_eyes_closed = False
                # If eyes were previously closed, check duration and reset state
                if exam_state["is_eyes_closed"]:
                    closure_duration = current_time - exam_state["eyes_closed_start_time"]
                    if closure_duration > LONG_BLINK_SECONDS:
                        exam_state["long_blink_count"] += 1
                        logger.info(f"Long blink detected. Duration: {closure_duration:.2f}s")
                    exam_state["is_eyes_closed"] = False

                # Determine gaze direction from the first detected eye
                (ex, ey, ew, eh) = eyes[0]
                eye_frame = roi_gray[ey:ey + eh, ex:ex + ew]
                look_direction = detect_gaze_direction(eye_frame)

                if look_direction == "Center":
                    # GOOD STATE: User is looking at the screen
                    is_looking_at_screen = True
                    exam_state["is_looking_away"] = False
                else:
                    # BAD STATE: User is looking away (left/right)
                    is_looking_at_screen = False
                    if not exam_state["is_looking_away"]:
                        exam_state["is_looking_away"] = True
                        exam_state["away_start_time"] = current_time
            else:
                # BAD STATE: Eyes are closed or not detected
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
            # BAD STATE: No face detected
            look_direction = "No Face Detected"
            if not exam_state["is_looking_away"]:
                exam_state["is_looking_away"] = True
                exam_state["away_start_time"] = current_time

        # --- Consolidated Warning Logic ---
        # Check if the user has been in a "bad state" for too long
        if exam_state["is_looking_away"]:
            away_duration = current_time - exam_state["away_start_time"]
            if away_duration > ALERT_THRESHOLD_SECONDS:
                # Check if enough time has passed since the last alert
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

    # --- Prepare response data ---
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
    logger.debug(f"Proctor data: {proctor_data}")
    return proctor_data

# --- API Endpoints ---
@app.route('/start-exam', methods=['POST'])
def start_exam():
    reset_exam_state()
    return jsonify({"status": "Exam started and state reset"}), 200

@app.route('/process-frame', methods=['POST'])
def process_frame():
    try:
        # The frontend might send 'data:image/jpeg;base64,....'
        # We need to strip the header if it exists.
        image_b64 = request.json['image']
        if ',' in image_b64:
            image_b64 = image_b64.split(',')[1]

        proctor_data = process_image(image_b64)
        return jsonify(proctor_data), 200
    except Exception as e:
        logger.error(f"Error in /process-frame endpoint: {e}")
        return jsonify({"error": "Failed to process frame on server"}), 500

@app.route('/end-exam', methods=['POST'])
def end_exam():
    data = request.json
    logger.info("Exam session ended by client.")
    logger.info(f"Final exam data received: {data}")
    logger.info(f"Final proctoring summary: {exam_state}")
    # You can save the final `exam_state` and `data` to a database here.
    reset_exam_state() # Clean up for the next user
    return jsonify({"status": "Exam ended and results received"}), 200

if __name__ == '__main__':
    reset_exam_state() # Initialize state on startup
    # use_reloader=False is important for avoiding issues with global state in debug mode
    app.run(host='0.0.0.0', port=4000, debug=True, use_reloader=False)