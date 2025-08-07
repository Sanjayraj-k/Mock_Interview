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
from langchain.schema import HumanMessage, AIMessage
from dotenv import load_dotenv
from collections import defaultdict
from typing import Dict, List, Any, Optional, TypedDict
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
import json

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
CORS(app, resources={
    r"/api/*": {
        "origins": [
            "https://mock-interview-flax.vercel.app",
            "http://localhost:5173"
        ],
        "supports_credentials": True
    }
})

logger.info("Starting structured interview Flask server with LangGraph...")

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in .env file")
    raise ValueError("GROQ_API_KEY not found. Please set it in your .env file.")

# Initialize Groq LLM
try:
    llm = ChatGroq(model_name="llama3-70b-8192", groq_api_key=GROQ_API_KEY, temperature=0.7, max_tokens=300)
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

# === LANGGRAPH STATE DEFINITION ===
class InterviewState(TypedDict):
    session_id: str
    current_stage: str
    question_count: int
    total_questions: int
    conversation_history: List[Dict[str, str]]
    candidate_profile: Dict[str, Any]
    stage_progress: Dict[str, int]
    responses_quality: Dict[str, str]
    current_question: str
    last_response: str
    interview_complete: bool
    evaluation_ready: bool
    follow_up_needed: bool
    clarification_count: int

# === INTERVIEW STAGES AND TEMPLATES ===
INTERVIEW_STAGES = {
    "introduction": {"max_questions": 2, "required": True},
    "background": {"max_questions": 3, "required": True},
    "technical_experience": {"max_questions": 4, "required": True},
    "project_deep_dive": {"max_questions": 3, "required": True},
    "problem_solving": {"max_questions": 2, "required": True},
    "behavioral": {"max_questions": 2, "required": True},
    "closing": {"max_questions": 1, "required": True}
}

# Structured prompts for each stage
STAGE_PROMPTS = {
    "introduction": PromptTemplate(
        input_variables=["conversation_history", "question_number"],
        template="""You are conducting a professional technical interview. This is the introduction stage (Question {question_number}/2).

Conversation so far: {conversation_history}

Ask a warm, professional introduction question to understand the candidate's background. Examples:
- "Could you start by telling me about yourself and your journey in technology?"
- "What drew you to pursue a career in software development/your field?"

Keep it conversational and welcoming. 2-3 lines maximum."""
    ),
    
    "background": PromptTemplate(
        input_variables=["conversation_history", "question_number", "candidate_profile"],
        template="""You are conducting a technical interview. This is the background exploration stage (Question {question_number}/3).

Conversation so far: {conversation_history}
Candidate profile extracted: {candidate_profile}

Based on their previous responses, ask a follow-up question about their educational background, early career experiences, or career transitions. Be specific and reference what they've mentioned. Examples:
- "You mentioned studying [field]. How did that prepare you for your current role?"
- "I see you transitioned from [previous role] to tech. What motivated that change?"

2-3 lines maximum."""
    ),
    
    "technical_experience": PromptTemplate(
        input_variables=["conversation_history", "question_number", "candidate_profile"],
        template="""You are conducting a technical interview. This is the technical experience deep dive (Question {question_number}/4).

Conversation so far: {conversation_history}
Candidate profile: {candidate_profile}

Ask detailed questions about their technical skills, technologies they've worked with, or specific technical challenges they've faced. Reference their background. Examples:
- "You mentioned working with [technology]. Can you describe a challenging problem you solved using it?"
- "What's the most complex technical project you've worked on and what was your role?"
- "How do you stay updated with new technologies in your field?"

Be specific and technical. 2-3 lines maximum."""
    ),
    
    "project_deep_dive": PromptTemplate(
        input_variables=["conversation_history", "question_number", "candidate_profile"],
        template="""You are conducting a technical interview. This is the project deep dive stage (Question {question_number}/3).

Conversation so far: {conversation_history}
Candidate profile: {candidate_profile}

Focus on a specific project they've mentioned or ask them to choose their most significant project. Dig deep into:
- Architecture and design decisions
- Challenges faced and solutions implemented
- Technologies used and why
- Team collaboration and their specific contributions
- Results and impact

Reference specific projects or technologies they've mentioned. 2-3 lines maximum."""
    ),
    
    "problem_solving": PromptTemplate(
        input_variables=["conversation_history", "question_number", "candidate_profile"],
        template="""You are conducting a technical interview. This is the problem-solving assessment (Question {question_number}/2).

Conversation so far: {conversation_history}
Candidate profile: {candidate_profile}

Present a technical problem-solving scenario or ask about their approach to debugging/troubleshooting. Examples:
- "Walk me through how you would debug a performance issue in [relevant technology]"
- "Describe a time when you had to optimize code/system performance"
- "How do you approach learning a new technology quickly?"

Make it relevant to their experience level and background. 2-3 lines maximum."""
    ),
    
    "behavioral": PromptTemplate(
        input_variables=["conversation_history", "question_number", "candidate_profile"],
        template="""You are conducting a technical interview. This is the behavioral assessment (Question {question_number}/2).

Conversation so far: {conversation_history}
Candidate profile: {candidate_profile}

Ask behavioral questions about teamwork, leadership, conflict resolution, or growth mindset. Use STAR method prompting. Examples:
- "Tell me about a time you had to work with a difficult team member"
- "Describe a situation where you had to learn something completely new under tight deadlines"
- "Give me an example of when you disagreed with a technical decision and how you handled it"

2-3 lines maximum."""
    ),
    
    "closing": PromptTemplate(
        input_variables=["conversation_history", "candidate_profile"],
        template="""You are conducting a technical interview. This is the closing stage.

Conversation so far: {conversation_history}
Candidate profile: {candidate_profile}

Ask a thoughtful closing question that allows them to showcase anything important they haven't mentioned yet. Examples:
- "Is there anything important about your experience or skills that we haven't covered?"
- "What questions do you have about the role or our team?"
- "What excites you most about this type of work?"

Keep it open-ended and positive. 2-3 lines maximum."""
    )
}

# Evaluation prompt
EVALUATION_PROMPT = PromptTemplate(
    input_variables=["conversation_history", "candidate_profile"],
    template="""You are evaluating a candidate's performance in a structured technical interview.

Complete conversation: {conversation_history}
Candidate profile: {candidate_profile}

Provide a comprehensive evaluation covering:

1. **OVERALL PERFORMANCE SUMMARY**
   Brief overview of the candidate's performance across all stages.

2. **TECHNICAL COMPETENCY** (Score: X/15)
   - Technical knowledge and skills demonstrated
   - Problem-solving approach and methodology
   - Understanding of technologies and concepts

3. **COMMUNICATION SKILLS** (Score: X/10)
   - Clarity and structure of responses
   - Ability to explain technical concepts
   - Professional communication style

4. **EXPERIENCE & BACKGROUND** (Score: X/10)
   - Relevance and depth of experience
   - Career progression and growth
   - Project contributions and impact

5. **BEHAVIORAL COMPETENCIES** (Score: X/10)
   - Teamwork and collaboration examples
   - Problem-solving mindset
   - Learning agility and adaptability

6. **STRENGTHS**
   Key areas where the candidate excelled

7. **AREAS FOR IMPROVEMENT**
   Specific areas that need development

8. **FINAL RECOMMENDATION**
   Clear recommendation with reasoning

**TOTAL SCORE: [Sum]/45**

Provide specific examples from their responses to support your evaluation."""
)

# === LANGGRAPH NODES ===
def analyze_response_node(state: InterviewState) -> InterviewState:
    """Analyze the candidate's response and update their profile"""
    try:
        if not state["last_response"].strip():
            state["follow_up_needed"] = True
            return state
            
        response = state["last_response"].lower()
        
        # Extract information and update candidate profile
        profile = state["candidate_profile"]
        
        # Extract technical skills
        tech_keywords = ["python", "java", "javascript", "react", "node", "aws", "docker", "kubernetes", "sql", "mongodb"]
        found_tech = [tech for tech in tech_keywords if tech in response]
        if found_tech:
            profile.setdefault("technologies", []).extend(found_tech)
            profile["technologies"] = list(set(profile["technologies"]))  # Remove duplicates
        
        # Extract experience level
        if any(word in response for word in ["senior", "lead", "architect", "manager"]):
            profile["experience_level"] = "senior"
        elif any(word in response for word in ["junior", "entry", "intern", "graduate"]):
            profile["experience_level"] = "junior"
        elif any(word in response for word in ["mid", "intermediate", "2 years", "3 years"]):
            profile["experience_level"] = "mid"
            
        # Extract company/project information
        if "worked at" in response or "company" in response:
            profile["has_work_experience"] = True
        if "project" in response or "built" in response or "developed" in response:
            profile["has_projects"] = True
            
        # Assess response quality
        word_count = len(state["last_response"].split())
        if word_count < 10:
            state["responses_quality"][state["current_stage"]] = "brief"
            state["follow_up_needed"] = True
        elif word_count < 30:
            state["responses_quality"][state["current_stage"]] = "adequate"
        else:
            state["responses_quality"][state["current_stage"]] = "detailed"
            
        state["candidate_profile"] = profile
        logger.info(f"Updated candidate profile: {profile}")
        
    except Exception as e:
        logger.error(f"Error in analyze_response_node: {e}")
        
    return state

def generate_question_node(state: InterviewState) -> InterviewState:
    """Generate the next question based on current stage and context"""
    try:
        current_stage = state["current_stage"]
        question_number = state["stage_progress"].get(current_stage, 0) + 1
        
        if current_stage in STAGE_PROMPTS:
            prompt = STAGE_PROMPTS[current_stage]
            
            # Prepare conversation history as string
            history_str = "\n".join([
                f"Q: {entry['question']}\nA: {entry['response']}" 
                for entry in state["conversation_history"]
            ])
            
            # Generate question
            if current_stage == "closing":
                question = llm.invoke(prompt.format(
                    conversation_history=history_str,
                    candidate_profile=json.dumps(state["candidate_profile"], indent=2)
                )).content
            else:
                question = llm.invoke(prompt.format(
                    conversation_history=history_str,
                    question_number=question_number,
                    candidate_profile=json.dumps(state["candidate_profile"], indent=2)
                )).content
            
            # Clean the question
            question = re.sub(r'\*\*|\*(?!\s*out\s*of)|\#|_', '', question).strip()
            
            state["current_question"] = question
            logger.info(f"Generated {current_stage} question {question_number}: {question}")
            
    except Exception as e:
        logger.error(f"Error generating question: {e}")
        state["current_question"] = "Could you tell me more about your experience?"
        
    return state

def check_stage_completion_node(state: InterviewState) -> InterviewState:
    """Check if current stage is complete and determine next stage"""
    try:
        current_stage = state["current_stage"]
        current_progress = state["stage_progress"].get(current_stage, 0)
        max_questions = INTERVIEW_STAGES[current_stage]["max_questions"]
        
        # Check if we need a follow-up or clarification
        if state["follow_up_needed"] and state["clarification_count"] < 2:
            state["follow_up_needed"] = False
            state["clarification_count"] += 1
            # Generate clarification question
            state["current_question"] = f"Could you elaborate more on that? I'd like to understand your experience better."
            return state
        
        # Reset clarification count when moving forward
        state["clarification_count"] = 0
        
        # Update stage progress
        state["stage_progress"][current_stage] = current_progress + 1
        state["question_count"] += 1
        
        # Check if current stage is complete
        if state["stage_progress"][current_stage] >= max_questions:
            # Move to next stage
            stages = list(INTERVIEW_STAGES.keys())
            current_index = stages.index(current_stage)
            
            if current_index < len(stages) - 1:
                next_stage = stages[current_index + 1]
                state["current_stage"] = next_stage
                logger.info(f"Moving from {current_stage} to {next_stage}")
            else:
                # Interview complete
                state["interview_complete"] = True
                state["evaluation_ready"] = True
                logger.info("Interview completed, ready for evaluation")
                
    except Exception as e:
        logger.error(f"Error in check_stage_completion_node: {e}")
        
    return state

def generate_evaluation_node(state: InterviewState) -> InterviewState:
    """Generate final evaluation of the interview"""
    try:
        # Prepare conversation history
        history_str = "\n".join([
            f"Stage: {entry.get('stage', 'Unknown')}\nQ: {entry['question']}\nA: {entry['response']}\n"
            for entry in state["conversation_history"]
        ])
        
        # Generate evaluation
        evaluation = llm.invoke(EVALUATION_PROMPT.format(
            conversation_history=history_str,
            candidate_profile=json.dumps(state["candidate_profile"], indent=2)
        )).content
        
        # Clean evaluation
        evaluation = re.sub(r'\*\*|\*(?!\s*out\s*of)|\#|_', '', evaluation).strip()
        
        state["evaluation"] = evaluation
        logger.info("Evaluation generated successfully")
        
    except Exception as e:
        logger.error(f"Error generating evaluation: {e}")
        state["evaluation"] = f"Error generating evaluation: {str(e)}"
        
    return state

# Conditional functions for routing
def should_continue_interview(state: InterviewState) -> str:
    """Determine if interview should continue or end"""
    if state["interview_complete"]:
        return "generate_evaluation"
    return "generate_question"

def should_analyze_response(state: InterviewState) -> str:
    """Determine if we should analyze response or generate evaluation"""
    if state["evaluation_ready"]:
        return "generate_evaluation"
    return "analyze_response"

# === BUILD LANGGRAPH ===
def create_interview_graph():
    """Create and configure the interview state graph"""
    workflow = StateGraph(InterviewState)
    
    # Add nodes
    workflow.add_node("analyze_response", analyze_response_node)
    workflow.add_node("generate_question", generate_question_node)
    workflow.add_node("check_stage_completion", check_stage_completion_node)
    workflow.add_node("generate_evaluation", generate_evaluation_node)
    
    # Add edges
    workflow.set_entry_point("generate_question")
    workflow.add_edge("generate_question", END)
    workflow.add_edge("analyze_response", "check_stage_completion")
    workflow.add_conditional_edges(
        "check_stage_completion",
        should_continue_interview,
        {
            "generate_question": "generate_question",
            "generate_evaluation": "generate_evaluation"
        }
    )
    workflow.add_edge("generate_evaluation", END)
    
    # Compile graph
    memory = MemorySaver()
    return workflow.compile(checkpointer=memory)

# Initialize the graph
interview_graph = create_interview_graph()

# Global state storage
interview_states = {}

def get_interview_state(session_id: str) -> InterviewState:
    """Get or create interview state for session"""
    if session_id not in interview_states:
        interview_states[session_id] = InterviewState(
            session_id=session_id,
            current_stage="introduction",
            question_count=0,
            total_questions=sum(stage["max_questions"] for stage in INTERVIEW_STAGES.values()),
            conversation_history=[],
            candidate_profile={},
            stage_progress={},
            responses_quality={},
            current_question="",
            last_response="",
            interview_complete=False,
            evaluation_ready=False,
            follow_up_needed=False,
            clarification_count=0
        )
    return interview_states[session_id]

# === PROCTORING SECTION (Unchanged) ===
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
        print("\a")

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
        session_id = session.get('session_id', str(uuid4()))
        session['session_id'] = session_id
        
        # Reset states
        reset_exam_state()
        
        # Get or create interview state
        state = get_interview_state(session_id)
        
        # Generate first question using LangGraph
        config = {"configurable": {"thread_id": session_id}}
        result = interview_graph.invoke(state, config=config)
        
        # Update stored state
        interview_states[session_id] = result
        
        logger.info(f"Interview started for session {session_id}")
        return jsonify({
            "question": result["current_question"],
            "stage": result["current_stage"],
            "question_number": result["question_count"] + 1,
            "total_questions": result["total_questions"],
            "progress": (result["question_count"] / result["total_questions"]) * 100
        })
        
    except Exception as e:
        logger.error(f"Error in /api/start: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/submit', methods=['POST'])
def submit_answer():
    try:
        session_id = session.get('session_id')
        if not session_id:
            return jsonify({"error": "No active session"}), 400
            
        user_answer = request.json.get('answer', '').strip()
        if not user_answer:
            return jsonify({"error": "Answer cannot be empty"}), 400
            
        # Get current interview state
        state = interview_states.get(session_id)
        if not state:
            return jsonify({"error": "Interview session not found"}), 400
            
        # Add response to conversation history
        state["conversation_history"].append({
            "stage": state["current_stage"],
            "question": state["current_question"],
            "response": user_answer
        })
        state["last_response"] = user_answer
        
        # Process through LangGraph
        config = {"configurable": {"thread_id": session_id}}
        
        # First analyze the response
        state = interview_graph.get_graph().get_node("analyze_response").runnable.invoke(state)
        
        # Then check stage completion and potentially generate next question
        state = interview_graph.get_graph().get_node("check_stage_completion").runnable.invoke(state)
        
        # Update stored state
        interview_states[session_id] = state
        
        # Check if interview is complete
        if state["interview_complete"]:
            # Generate evaluation
            state = interview_graph.get_graph().get_node("generate_evaluation").runnable.invoke(state)
            interview_states[session_id] = state
            
            return jsonify({
                "status": "evaluation",
                "evaluation": state["evaluation"],
                "candidate_profile": state["candidate_profile"]
            })
        else:
            # Generate next question
            state = interview_graph.get_graph().get_node("generate_question").runnable.invoke(state)
            interview_states[session_id] = state
            
            return jsonify({
                "question": state["current_question"],
                "stage": state["current_stage"],
                "question_number": state["question_count"] + 1,
                "total_questions": state["total_questions"],
                "progress": (state["question_count"] / state["total_questions"]) * 100,
                "stage_info": f"{state['current_stage'].replace('_', ' ').title()} ({state['stage_progress'].get(state['current_stage'], 0) + 1}/{INTERVIEW_STAGES[state['current_stage']]['max_questions']})"
            })
            
    except Exception as e:
        logger.error(f"Error in /api/submit: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/finish', methods=['POST'])
def finish_interview():
    try:
        session_id = session.get('session_id')
        if not session_id:
            return jsonify({"error": "No active session"}), 400
            
        # Get current interview state
        state = interview_states.get(session_id)
        if not state:
            return jsonify({"error": "Interview session not found"}), 400
            
        # Save final answer if provided
        user_answer = request.json.get('answer', '').strip()
        if user_answer:
            state["conversation_history"].append({
                "stage": state["current_stage"],
                "question": state["current_question"],
                "response": user_answer
            })
            state["last_response"] = user_answer
            
        # Mark interview as complete and generate evaluation
        state["interview_complete"] = True
        state["evaluation_ready"] = True
        
        # Generate evaluation
        state = interview_graph.get_graph().get_node("generate_evaluation").runnable.invoke(state)
        interview_states[session_id] = state
        
        logger.info(f"Interview finished early for session {session_id}")
        return jsonify({
            "status": "evaluation",
            "evaluation": state["evaluation"],
            "candidate_profile": state["candidate_profile"]
        })
        
    except Exception as e:
        logger.error(f"Error in /api/finish: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500

@app.route('/api/interview-status', methods=['GET'])
def get_interview_status():
    """Get current interview status and progress"""
    try:
        session_id = session.get('session_id')
        if not session_id:
            return jsonify({"error": "No active session"}), 400
            
        state = interview_states.get(session_id)
        if not state:
            return jsonify({"error": "Interview session not found"}), 400
            
        return jsonify({
            "session_id": session_id,
            "current_stage": state["current_stage"],
            "stage_display": state["current_stage"].replace('_', ' ').title(),
            "question_count": state["question_count"],
            "total_questions": state["total_questions"],
            "progress_percentage": (state["question_count"] / state["total_questions"]) * 100,
            "stage_progress": state["stage_progress"],
            "candidate_profile": state["candidate_profile"],
            "interview_complete": state["interview_complete"]
        })
        
    except Exception as e:
        logger.error(f"Error in /api/interview-status: {str(e)}")
        return jsonify({"error": str(e)}), 500

# Proctoring routes (unchanged)
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
        if session_id:
            if session_id in exam_states:
                logger.info(f"Proctoring summary: {exam_states[session_id]}")
                del exam_states[session_id]
            if session_id in interview_states:
                logger.info(f"Interview summary: {interview_states[session_id]['candidate_profile']}")
                del interview_states[session_id]
        session.clear()
        logger.info("Exam ended and session cleared")
        return jsonify({"status": "Exam ended"}), 200
    except Exception as e:
        logger.error(f"Error in /api/end-exam: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    return jsonify({
        "status": "healthy",
        "groq_connected": bool(GROQ_API_KEY),
        "opencv_loaded": bool(face_cascade and eye_cascade),
        "active_sessions": len(interview_states),
        "langgraph_initialized": bool(interview_graph)
    }), 200

@app.route('/api/reset-session', methods=['POST'])
def reset_session():
    try:
        session_id = session.get('session_id')
        if session_id:
            if session_id in interview_states:
                del interview_states[session_id]
            if session_id in exam_states:
                del exam_states[session_id]
        session.clear()
        logger.info("Session reset successfully")
        return jsonify({"status": "Session reset successfully"}), 200
    except Exception as e:
        logger.error(f"Error in /api/reset-session: {str(e)}")
        return jsonify({"error": str(e)}), 500

@app.route('/api/get-stages', methods=['GET'])
def get_interview_stages():
    """Get information about interview stages"""
    return jsonify({
        "stages": {
            stage: {
                "name": stage.replace('_', ' ').title(),
                "max_questions": info["max_questions"],
                "description": get_stage_description(stage)
            }
            for stage, info in INTERVIEW_STAGES.items()
        }
    })

def get_stage_description(stage: str) -> str:
    """Get description for each interview stage"""
    descriptions = {
        "introduction": "Warm introduction and background overview",
        "background": "Educational and career background exploration",
        "technical_experience": "Deep dive into technical skills and experience",
        "project_deep_dive": "Detailed discussion of significant projects",
        "problem_solving": "Technical problem-solving and debugging scenarios",
        "behavioral": "Behavioral questions about teamwork and challenges",
        "closing": "Final thoughts and candidate questions"
    }
    return descriptions.get(stage, "Interview stage")

# Debug routes for development
@app.route('/api/debug/state', methods=['GET'])
def debug_get_state():
    """Debug endpoint to view current interview state"""
    if not app.debug:
        return jsonify({"error": "Debug mode not enabled"}), 403
        
    session_id = session.get('session_id')
    if not session_id:
        return jsonify({"error": "No active session"}), 400
        
    state = interview_states.get(session_id, {})
    return jsonify({
        "session_id": session_id,
        "state": state,
        "conversation_history": state.get("conversation_history", []),
        "candidate_profile": state.get("candidate_profile", {})
    })

@app.route('/api/debug/graph', methods=['GET'])
def debug_graph_info():
    """Debug endpoint to view graph structure"""
    if not app.debug:
        return jsonify({"error": "Debug mode not enabled"}), 403
        
    try:
        # Get graph information
        graph_info = {
            "nodes": list(interview_graph.get_graph().nodes.keys()),
            "edges": [
                {"from": edge[0], "to": edge[1]} 
                for edge in interview_graph.get_graph().edges
            ],
            "entry_point": "generate_question"
        }
        return jsonify(graph_info)
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == "__main__":
    try:
        logger.info("Flask server starting on port 8000...")
        logger.info(f"Interview stages configured: {list(INTERVIEW_STAGES.keys())}")
        logger.info(f"Total questions per interview: {sum(stage['max_questions'] for stage in INTERVIEW_STAGES.values())}")
        app.run(debug=True, port=8000, use_reloader=False)
    except KeyboardInterrupt:
        logger.info("Server stopped by user")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)