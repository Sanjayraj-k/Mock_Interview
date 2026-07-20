"""
AI-Powered Technical Interview System - Multi-Agent Architecture
================================================================
Uses LangGraph + LangChain to orchestrate three specialized agents:

1. ResumeExtractorAgent  - Parses uploaded PDF/DOCX resume, extracts projects,
                           skills, frameworks, internships, certifications.
2. QuestionGeneratorAgent - Generates context-aware technical questions from
                            resume data + core CS subjects. Decides follow-up
                            vs. new question based on evaluator feedback.
3. EvaluatorAgent        - Scores each answer (0-10), decides if a follow-up
                           is warranted or a new topic should begin.

Flow (LangGraph StateGraph):
  upload_resume → extract_resume → decide_next_question → ask_question
        ↑______________ask_follow_up_____|___evaluate_answer__↓
                                   (loop until 5 questions answered)
                                         ↓
                                  generate_final_report

API Endpoints (Flask):
  POST /api/v2/upload-resume   → Upload PDF/DOCX resume
  GET  /api/v2/start           → Start interview (uses extracted resume)
  POST /api/v2/answer          → Submit answer, get next question or report
  POST /api/v2/reset           → Reset session
  GET  /api/v2/status          → Session status
  GET  /api/v2/health          → Health check
"""

import os
import io
import re
import json
import logging
import sys
from uuid import uuid4
from typing import TypedDict, Annotated, Optional, List, Dict, Any

# Flask
from flask import Flask, request, jsonify, session
from flask_cors import CORS

# LangChain / LangGraph
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages

# PDF / DOCX parsing
try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False
    logging.warning("pdfplumber not installed. PDF parsing disabled. Run: pip install pdfplumber")

try:
    from docx import Document as DocxDocument
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False
    logging.warning("python-docx not installed. DOCX parsing disabled. Run: pip install python-docx")

from dotenv import load_dotenv

# ─────────────────────────────────────────────
# Logging & App Setup
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("TechInterview")

load_dotenv()

app = Flask(__name__)
app.secret_key = os.getenv("FLASK_SECRET_KEY", str(uuid4()))
CORS(app, supports_credentials=True, origins=["http://localhost:5173", "http://localhost:3000"])

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in .env")
    raise ValueError("GROQ_API_KEY missing from .env")

# ─────────────────────────────────────────────
# LLM Initialization
# ─────────────────────────────────────────────
# Separate LLM instances to allow different configs per agent
llm_extractor = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    groq_api_key=GROQ_API_KEY,
    temperature=0.2,
    max_tokens=1500,
)

llm_questioner = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    groq_api_key=GROQ_API_KEY,
    temperature=0.7,
    max_tokens=400,
)

llm_evaluator = ChatGroq(
    model_name="llama-3.3-70b-versatile",
    groq_api_key=GROQ_API_KEY,
    temperature=0.1,
    max_tokens=600,
)

logger.info("All LLM instances initialized successfully.")

# ─────────────────────────────────────────────
# Session Store (in-memory)
# ─────────────────────────────────────────────
session_store: Dict[str, Dict[str, Any]] = {}

MAX_QUESTIONS = 5          # Total questions per interview
MARKS_PER_QUESTION = 10    # Max marks per question → total = 50
FOLLOWUP_THRESHOLD = 5     # Score below this triggers a follow-up question


# ═══════════════════════════════════════════════════════════════
# LangGraph State Definition
# ═══════════════════════════════════════════════════════════════
class InterviewState(TypedDict):
    # Resume data
    resume_text: str
    resume_summary: str          # Structured summary from extractor agent

    # Interview flow
    questions_asked: int          # Total main questions asked
    followups_asked: int          # Follow-ups for current question
    current_question: str
    current_question_topic: str   # "project" | "core_subject"
    current_answer: str
    conversation_history: List[Dict[str, str]]  # [{role, content}, ...]

    # Scoring
    scores: List[int]             # Score per main question (0-10)
    question_feedbacks: List[str] # Detailed feedback per question
    total_marks: int

    # Control
    phase: str                    # "start"|"asking"|"evaluating"|"followup"|"complete"
    next_action: str              # Routing key for graph
    error: Optional[str]
    final_report: Optional[str]

    # Agent messages (for internal chain-of-thought)
    agent_messages: Annotated[List, add_messages]


# ═══════════════════════════════════════════════════════════════
# AGENT 1: Resume Extractor Agent
# ═══════════════════════════════════════════════════════════════
RESUME_EXTRACTION_SYSTEM_PROMPT = """You are an expert Resume Parser and Technical Analyst.

Your task is to extract and structure technical information from a resume.

Analyze the resume and extract:
1. PROJECTS: Name, description, tech stack, your role, key achievements
2. SKILLS: Programming languages, frameworks, databases, tools, cloud platforms
3. CORE SUBJECTS: Infer relevant CS subjects (DSA, OS, DBMS, CN, OOP, etc.)
4. INTERNSHIPS: Company, role, tech used, duration
5. CERTIFICATIONS: Name, issuer, relevance

Output a structured JSON like this (no markdown, raw JSON only):
{
  "projects": [
    {
      "name": "Project Name",
      "description": "Brief description",
      "tech_stack": ["React", "Node.js", "MongoDB"],
      "role": "Full Stack Developer",
      "highlights": ["REST API", "Authentication", "Deployment"]
    }
  ],
  "skills": {
    "languages": ["Python", "JavaScript"],
    "frameworks": ["React", "FastAPI"],
    "databases": ["PostgreSQL", "Redis"],
    "tools": ["Docker", "Git"],
    "cloud": ["AWS", "GCP"]
  },
  "core_subjects": ["Data Structures", "Algorithms", "Operating Systems", "DBMS", "Computer Networks", "OOP"],
  "internships": [
    {
      "company": "Company Name",
      "role": "SDE Intern",
      "tech": ["Python", "Django"],
      "duration": "3 months"
    }
  ],
  "certifications": ["AWS Certified Cloud Practitioner"],
  "candidate_name": "Name if found else Unknown"
}"""

def resume_extractor_agent(state: InterviewState) -> InterviewState:
    """
    Agent 1: Parses the raw resume text and extracts structured technical data.
    Populates state['resume_summary'] with a JSON string.
    """
    logger.info("[ResumeExtractor] Starting resume extraction...")
    
    if not state.get("resume_text", "").strip():
        state["error"] = "Resume text is empty. Please upload a valid resume."
        state["phase"] = "error"
        state["next_action"] = "error"
        return state
    
    try:
        messages = [
            SystemMessage(content=RESUME_EXTRACTION_SYSTEM_PROMPT),
            HumanMessage(content=f"Extract technical information from this resume:\n\n{state['resume_text']}")
        ]
        
        response = llm_extractor.invoke(messages)
        raw_content = response.content.strip()
        
        # Try to parse JSON - extract JSON block if wrapped in text
        json_match = re.search(r'\{.*\}', raw_content, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            # Validate it's proper JSON
            parsed = json.loads(json_str)
            state["resume_summary"] = json.dumps(parsed, indent=2)
        else:
            # Fallback: store raw content
            state["resume_summary"] = raw_content
        
        logger.info(f"[ResumeExtractor] Extraction successful. Summary length: {len(state['resume_summary'])}")
        state["phase"] = "asking"
        state["next_action"] = "generate_question"
        state["error"] = None
        
    except json.JSONDecodeError as e:
        logger.warning(f"[ResumeExtractor] JSON parse error: {e}. Using raw content.")
        state["resume_summary"] = raw_content
        state["phase"] = "asking"
        state["next_action"] = "generate_question"
    except Exception as e:
        logger.error(f"[ResumeExtractor] Error: {e}", exc_info=True)
        state["error"] = f"Resume extraction failed: {str(e)}"
        state["phase"] = "error"
        state["next_action"] = "error"
    
    return state


# ═══════════════════════════════════════════════════════════════
# AGENT 2: Question Generator Agent
# ═══════════════════════════════════════════════════════════════
QUESTION_GENERATOR_SYSTEM_PROMPT = """You are an expert Technical Interviewer conducting a placement interview.

You have access to the candidate's resume summary (JSON) and the conversation history.

Your job is to ask ONE concise, relevant technical question at a time.

Rules:
- For questions 1-2: Ask about a specific PROJECT from the resume (implementation details, challenges, tech choices, architecture)
- For questions 3-5: Ask about CORE CS SUBJECTS based on their skills (DSA, OS, DBMS, CN, OOP, Software Engineering)
- Questions must be specific, not generic
- Keep question to 2-3 sentences max
- Vary topics - don't repeat the same concept
- Make questions progressively more challenging

Examples of good questions:
- "In your [Project Name] project, how did you handle database transactions to ensure data consistency?"
- "You used Redis in your project. Can you explain the difference between Redis ZSET and HSET, and when you'd choose one over the other?"
- "Explain how a B+ Tree differs from a B-Tree and why databases prefer B+ Trees for indexing."

Output ONLY the question text. No preamble, no labels."""

FOLLOWUP_GENERATOR_SYSTEM_PROMPT = """You are an expert Technical Interviewer.

The candidate gave an incomplete or partially incorrect answer. Generate ONE targeted follow-up question that:
1. Probes deeper into what they got right
2. Gently clarifies what they got wrong
3. Helps them demonstrate more knowledge

Keep the follow-up to 2 sentences max. Be encouraging but probing.
Output ONLY the follow-up question text."""

def question_generator_agent(state: InterviewState) -> InterviewState:
    """
    Agent 2: Generates the next technical question based on resume + conversation history.
    Decides whether to ask a new main question or a follow-up.
    """
    questions_asked = state.get("questions_asked", 0)
    followups_asked = state.get("followups_asked", 0)
    phase = state.get("phase", "asking")
    
    logger.info(f"[QuestionGenerator] Phase={phase}, QAsked={questions_asked}, Followups={followups_asked}")
    
    # Build conversation context
    history_text = _format_history(state.get("conversation_history", []))
    resume_summary = state.get("resume_summary", "{}")
    
    try:
        if phase == "followup" and followups_asked < 1:
            # Generate a follow-up question (max 1 follow-up per main question)
            messages = [
                SystemMessage(content=FOLLOWUP_GENERATOR_SYSTEM_PROMPT),
                HumanMessage(content=(
                    f"Resume Summary:\n{resume_summary}\n\n"
                    f"Conversation History:\n{history_text}\n\n"
                    f"The candidate's last answer was incomplete. Generate a follow-up question."
                ))
            ]
            response = llm_questioner.invoke(messages)
            question = response.content.strip()
            
            state["current_question"] = question
            state["followups_asked"] = followups_asked + 1
            state["phase"] = "asking"
            state["next_action"] = "wait_for_answer"
            
            logger.info(f"[QuestionGenerator] Follow-up question generated: {question[:80]}...")
            
        else:
            # Generate a new main question
            topic = "project" if questions_asked < 2 else "core_subject"
            
            messages = [
                SystemMessage(content=QUESTION_GENERATOR_SYSTEM_PROMPT),
                HumanMessage(content=(
                    f"Resume Summary:\n{resume_summary}\n\n"
                    f"Conversation History:\n{history_text}\n\n"
                    f"Generate question #{questions_asked + 1} of {MAX_QUESTIONS}. "
                    f"Topic type: {topic}. "
                    f"Questions already asked: {questions_asked}. "
                    f"Do NOT repeat topics from history."
                ))
            ]
            response = llm_questioner.invoke(messages)
            question = response.content.strip()
            
            state["current_question"] = question
            state["current_question_topic"] = topic
            state["questions_asked"] = questions_asked + 1
            state["followups_asked"] = 0  # Reset follow-up counter for new question
            state["phase"] = "asking"
            state["next_action"] = "wait_for_answer"
            
            logger.info(f"[QuestionGenerator] Main question #{questions_asked + 1} generated: {question[:80]}...")
    
    except Exception as e:
        logger.error(f"[QuestionGenerator] Error: {e}", exc_info=True)
        state["error"] = f"Question generation failed: {str(e)}"
        state["next_action"] = "error"
    
    return state


# ═══════════════════════════════════════════════════════════════
# AGENT 3: Evaluator Agent
# ═══════════════════════════════════════════════════════════════
EVALUATOR_SYSTEM_PROMPT = """You are a strict but fair Technical Interview Evaluator.

Evaluate the candidate's answer to the given technical question.

Output a JSON object with these exact fields (no markdown, raw JSON):
{
  "score": <integer 0-10>,
  "is_correct": <boolean>,
  "needs_followup": <boolean>,
  "feedback": "<2-3 sentence evaluation>",
  "correct_answer_hint": "<brief hint about the correct/complete answer>",
  "topics_covered": ["<topic1>", "<topic2>"]
}

Scoring rubric:
- 9-10: Excellent, comprehensive, technically accurate, includes edge cases
- 7-8:  Good, mostly accurate, minor gaps
- 5-6:  Partial understanding, key concept grasped but incomplete
- 3-4:  Basic awareness, significant gaps
- 1-2:  Minimal knowledge, mostly incorrect
- 0:    No answer or completely wrong

needs_followup = true if score < 6 and a follow-up would help the candidate demonstrate more knowledge.
is_correct = true if score >= 6."""

def evaluator_agent(state: InterviewState) -> InterviewState:
    """
    Agent 3: Evaluates the candidate's answer, assigns a score (0-10),
    and decides whether a follow-up question is needed.
    """
    question = state.get("current_question", "")
    answer = state.get("current_answer", "")
    
    logger.info(f"[Evaluator] Evaluating answer for: {question[:60]}...")
    
    if not answer.strip():
        # No answer provided
        state["scores"].append(0)
        state["question_feedbacks"].append("No answer provided.")
        state["next_action"] = _decide_next_after_eval(state)
        return state
    
    try:
        messages = [
            SystemMessage(content=EVALUATOR_SYSTEM_PROMPT),
            HumanMessage(content=(
                f"Question: {question}\n\n"
                f"Candidate's Answer: {answer}\n\n"
                f"Evaluate this answer strictly and return JSON."
            ))
        ]
        
        response = llm_evaluator.invoke(messages)
        raw = response.content.strip()
        
        # Extract JSON
        json_match = re.search(r'\{.*\}', raw, re.DOTALL)
        if json_match:
            eval_data = json.loads(json_match.group(0))
        else:
            raise ValueError("No JSON found in evaluator response")
        
        score = max(0, min(10, int(eval_data.get("score", 5))))
        needs_followup = eval_data.get("needs_followup", False)
        feedback = eval_data.get("feedback", "")
        followups_asked = state.get("followups_asked", 0)
        
        logger.info(f"[Evaluator] Score: {score}/10, NeedsFollowup: {needs_followup}")
        
        # Save to conversation history
        state["conversation_history"].append({
            "role": "assistant",
            "content": question
        })
        state["conversation_history"].append({
            "role": "user", 
            "content": answer
        })
        
        # Only save score for main questions (not follow-ups)
        if followups_asked == 0:
            state["scores"].append(score)
            state["question_feedbacks"].append(
                f"Q: {question}\nA: {answer}\nScore: {score}/10\nFeedback: {feedback}"
            )
        else:
            # Follow-up: update last score if improvement
            if state["scores"]:
                old_score = state["scores"][-1]
                new_score = max(old_score, score)  # Take the best
                state["scores"][-1] = new_score
                logger.info(f"[Evaluator] Follow-up improved score: {old_score} → {new_score}")
        
        # Decide next action
        if needs_followup and followups_asked < 1:
            state["phase"] = "followup"
            state["next_action"] = "generate_followup"
        else:
            state["next_action"] = _decide_next_after_eval(state)
            state["followups_asked"] = 0
        
    except (json.JSONDecodeError, ValueError) as e:
        logger.warning(f"[Evaluator] JSON parse error: {e}. Assigning default score.")
        state["scores"].append(5)
        state["question_feedbacks"].append(f"Q: {question}\nA: {answer}\nScore: 5/10 (default)")
        state["next_action"] = _decide_next_after_eval(state)
    except Exception as e:
        logger.error(f"[Evaluator] Error: {e}", exc_info=True)
        state["scores"].append(0)
        state["question_feedbacks"].append(f"Evaluation error: {str(e)}")
        state["next_action"] = _decide_next_after_eval(state)
    
    return state


def _decide_next_after_eval(state: InterviewState) -> str:
    """Helper: determine if we generate next question or produce final report."""
    # Count only main question scores (questions_asked is incremented per main question)
    scores_collected = len(state.get("scores", []))
    questions_asked = state.get("questions_asked", 0)
    
    logger.info(f"[Router] scores_collected={scores_collected}, questions_asked={questions_asked}")
    
    if scores_collected >= MAX_QUESTIONS or questions_asked >= MAX_QUESTIONS:
        return "generate_report"
    return "generate_question"


# ═══════════════════════════════════════════════════════════════
# Final Report Generator Node
# ═══════════════════════════════════════════════════════════════
REPORT_SYSTEM_PROMPT = """You are a Senior Technical Interview Panel Chair.

Generate a comprehensive final interview report based on all questions, answers, and scores.

The report should include:
1. CANDIDATE OVERVIEW
2. QUESTION-BY-QUESTION BREAKDOWN (score, what they got right, what they missed)
3. TECHNICAL STRENGTHS (specific skills demonstrated)
4. AREAS FOR IMPROVEMENT (be specific, give study resources)
5. OVERALL ASSESSMENT (communication, depth of knowledge, problem-solving approach)
6. PLACEMENT READINESS RATING: [Excellent/Good/Average/Needs Improvement]
7. FINAL SCORE: X out of 50

Be professional, specific, and constructive. Format with clear sections."""

def generate_final_report_node(state: InterviewState) -> InterviewState:
    """Generates the comprehensive final interview report."""
    logger.info("[FinalReport] Generating final report...")
    
    scores = state.get("scores", [])
    feedbacks = state.get("question_feedbacks", [])
    total = sum(scores)
    
    try:
        resume_summary = state.get("resume_summary", "{}")
        history_text = _format_history(state.get("conversation_history", []))
        feedbacks_text = "\n\n".join(
            [f"Question {i+1}: {fb}" for i, fb in enumerate(feedbacks)]
        )
        
        messages = [
            SystemMessage(content=REPORT_SYSTEM_PROMPT),
            HumanMessage(content=(
                f"Resume Summary:\n{resume_summary}\n\n"
                f"Individual Question Results:\n{feedbacks_text}\n\n"
                f"Scores: {scores} → Total: {total}/{MAX_QUESTIONS * MARKS_PER_QUESTION}\n\n"
                f"Full Conversation:\n{history_text}"
            ))
        ]
        
        response = llm_evaluator.invoke(messages)
        report = response.content.strip()
        
        # Ensure FINAL SCORE is present
        if "FINAL SCORE:" not in report.upper():
            report += f"\n\nFINAL SCORE: {total} out of {MAX_QUESTIONS * MARKS_PER_QUESTION}"
        
        state["final_report"] = report
        state["total_marks"] = total
        state["phase"] = "complete"
        state["next_action"] = END
        
        logger.info(f"[FinalReport] Report generated. Total: {total}/{MAX_QUESTIONS * MARKS_PER_QUESTION}")
        
    except Exception as e:
        logger.error(f"[FinalReport] Error: {e}", exc_info=True)
        fallback_report = (
            f"Interview Complete.\n\n"
            f"Scores per question: {scores}\n"
            f"FINAL SCORE: {total} out of {MAX_QUESTIONS * MARKS_PER_QUESTION}\n\n"
            f"Detailed feedback:\n" + "\n\n".join(feedbacks)
        )
        state["final_report"] = fallback_report
        state["total_marks"] = total
        state["phase"] = "complete"
    
    return state


# ═══════════════════════════════════════════════════════════════
# LangGraph Router Functions
# ═══════════════════════════════════════════════════════════════
def route_after_extraction(state: InterviewState) -> str:
    """Routes after resume extraction."""
    if state.get("next_action") == "error" or state.get("phase") == "error":
        return END
    return "generate_question"


def route_after_question(state: InterviewState) -> str:
    """After a question is generated, we wait for an answer (stop the graph)."""
    return END  # Graph stops; API returns question to frontend


def route_after_evaluation(state: InterviewState) -> str:
    """Routes after answer evaluation."""
    action = state.get("next_action", "generate_question")
    if action == "generate_report":
        return "generate_report"
    elif action == "generate_followup" or state.get("phase") == "followup":
        return "generate_question"  # Question generator handles follow-ups
    else:
        return "generate_question"


def route_after_report(state: InterviewState) -> str:
    return END


# ═══════════════════════════════════════════════════════════════
# Build LangGraph Workflow
# ═══════════════════════════════════════════════════════════════
def build_interview_graph() -> StateGraph:
    """Builds and compiles the multi-agent interview workflow graph."""
    
    graph = StateGraph(InterviewState)
    
    # Add nodes (agents)
    graph.add_node("extract_resume", resume_extractor_agent)
    graph.add_node("generate_question", question_generator_agent)
    graph.add_node("evaluate_answer", evaluator_agent)
    graph.add_node("generate_report", generate_final_report_node)
    
    # Set entry point
    graph.set_entry_point("extract_resume")
    
    # Add conditional edges
    graph.add_conditional_edges(
        "extract_resume",
        route_after_extraction,
        {
            "generate_question": "generate_question",
            END: END,
        }
    )
    
    # After question generation: stop (return question to user)
    graph.add_conditional_edges(
        "generate_question",
        route_after_question,
        {END: END}
    )
    
    # After evaluation: route to follow-up, new question, or report
    graph.add_conditional_edges(
        "evaluate_answer",
        route_after_evaluation,
        {
            "generate_question": "generate_question",
            "generate_report": "generate_report",
        }
    )
    
    # After report: done
    graph.add_conditional_edges(
        "generate_report",
        route_after_report,
        {END: END}
    )
    
    compiled = graph.compile()
    logger.info("[Graph] LangGraph interview workflow compiled successfully.")
    return compiled


# Compile the graph at startup
interview_graph = build_interview_graph()


# ═══════════════════════════════════════════════════════════════
# Helper Utilities
# ═══════════════════════════════════════════════════════════════
def _format_history(history: List[Dict[str, str]]) -> str:
    """Formats conversation history for LLM prompts."""
    if not history:
        return "(No conversation yet)"
    lines = []
    for msg in history:
        role = "Interviewer" if msg["role"] == "assistant" else "Candidate"
        lines.append(f"{role}: {msg['content']}")
    return "\n".join(lines)


def _get_session_id() -> str:
    """Gets or creates a session ID."""
    if 'session_id' not in session:
        session['session_id'] = str(uuid4())
    return session['session_id']


def _get_interview_state(session_id: str) -> Optional[InterviewState]:
    """Retrieves interview state from session store."""
    return session_store.get(session_id)


def _save_interview_state(session_id: str, state: InterviewState):
    """Saves interview state to session store."""
    session_store[session_id] = state


def _init_interview_state(resume_text: str = "", resume_summary: str = "") -> InterviewState:
    """Creates a fresh interview state."""
    return InterviewState(
        resume_text=resume_text,
        resume_summary=resume_summary,
        questions_asked=0,
        followups_asked=0,
        current_question="",
        current_question_topic="project",
        current_answer="",
        conversation_history=[],
        scores=[],
        question_feedbacks=[],
        total_marks=0,
        phase="start",
        next_action="extract_resume",
        error=None,
        final_report=None,
        agent_messages=[],
    )


def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extract text from PDF bytes using pdfplumber."""
    if not PDF_AVAILABLE:
        raise ValueError("pdfplumber not installed. Run: pip install pdfplumber")
    text_parts = []
    with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
        for page in pdf.pages:
            page_text = page.extract_text()
            if page_text:
                text_parts.append(page_text)
    return "\n".join(text_parts)


def _extract_text_from_docx(file_bytes: bytes) -> str:
    """Extract text from DOCX bytes using python-docx."""
    if not DOCX_AVAILABLE:
        raise ValueError("python-docx not installed. Run: pip install python-docx")
    doc = DocxDocument(io.BytesIO(file_bytes))
    return "\n".join([para.text for para in doc.paragraphs if para.text.strip()])


# ═══════════════════════════════════════════════════════════════
# Flask API Routes
# ═══════════════════════════════════════════════════════════════

@app.route("/api/v2/upload-resume", methods=["POST"])
def upload_resume():
    """
    POST /api/v2/upload-resume
    Supports 3 upload methods:
      1. multipart/form-data  -> key='resume', Type=File
      2. JSON body            -> {"resume_base64": "<base64>", "filename": "resume.pdf"}
      3. Raw text body        -> paste resume plain text directly
    """
    try:
        import base64 as b64mod

        file_bytes = None
        filename = ""

        # Method 1: multipart/form-data
        if request.files and "resume" in request.files:
            file = request.files["resume"]
            filename = (file.filename or "resume.pdf").lower()
            file_bytes = file.read()
            logger.info(f"[upload] multipart file='{filename}' size={len(file_bytes)} bytes")

        # Method 2: JSON body with base64 content
        elif request.content_type and "application/json" in request.content_type:
            data = request.get_json(silent=True) or {}
            b64 = data.get("resume_base64") or data.get("file")
            filename = (data.get("filename") or "resume.pdf").lower()
            if b64:
                file_bytes = b64mod.b64decode(b64)
                logger.info(f"[upload] base64 JSON file='{filename}' size={len(file_bytes)} bytes")
            elif data.get("resume_text"):
                # plain text inside JSON
                file_bytes = data["resume_text"].encode("utf-8")
                filename = "resume.txt"
                logger.info(f"[upload] JSON text size={len(file_bytes)} bytes")

        # Method 3: raw text body
        elif request.data:
            file_bytes = request.data
            filename = "resume.txt"
            logger.info(f"[upload] raw body size={len(file_bytes)} bytes")

        # Nothing received
        if not file_bytes:
            return jsonify({
                "error": "No resume content received.",
                "methods": {
                    "1_formdata": "POST form-data, key='resume', Type=File (PDF/DOCX/TXT)",
                    "2_base64":   "POST JSON: {\"resume_base64\": \"<base64string>\", \"filename\": \"resume.pdf\"}",
                    "3_text":     "POST JSON: {\"resume_text\": \"paste full resume text here\"}"
                }
            }), 400

        # Extract text based on file type
        if filename.endswith(".pdf"):
            resume_text = _extract_text_from_pdf(file_bytes)
        elif filename.endswith(".docx") or filename.endswith(".doc"):
            resume_text = _extract_text_from_docx(file_bytes)
        else:
            # TXT or raw body
            resume_text = file_bytes.decode("utf-8", errors="ignore")

        if not resume_text.strip():
            return jsonify({"error": "Could not extract text from resume. Ensure it is not a scanned image."}), 400

        logger.info(f"[upload] extracted {len(resume_text)} chars")

        # Run Resume Extractor Agent
        session_id = _get_session_id()
        state = _init_interview_state(resume_text=resume_text)
        result_state = resume_extractor_agent(state)

        if result_state.get("phase") == "error":
            return jsonify({"error": result_state.get("error", "Extraction failed")}), 500

        _save_interview_state(session_id, result_state)

        candidate_name = "Candidate"
        try:
            summary_data = json.loads(result_state["resume_summary"])
            candidate_name = summary_data.get("candidate_name", "Candidate")
        except Exception:
            pass

        logger.info(f"[Session {session_id}] Resume processed for: {candidate_name}")

        return jsonify({
            "status": "ready",
            "session_id": session_id,
            "candidate_name": candidate_name,
            "message": "Resume processed. Call /api/v2/start to begin your interview.",
            "resume_length": len(resume_text)
        }), 200

    except Exception as e:
        logger.error(f"[upload-resume] Error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/v2/start", methods=["GET"])
def start_interview():
    """
    GET /api/v2/start
    Starts the technical interview. Must call /upload-resume first.
    
    Returns the first question.
    """
    try:
        session_id = _get_session_id()
        state = _get_interview_state(session_id)
        
        if not state:
            return jsonify({
                "error": "No resume found. Please upload your resume first at /api/v2/upload-resume"
            }), 400
        
        if state.get("phase") == "complete":
            return jsonify({
                "error": "Interview already completed. Reset to start again.",
                "final_report": state.get("final_report")
            }), 400
        
        # Reset interview state but keep resume
        state["questions_asked"] = 0
        state["followups_asked"] = 0
        state["current_question"] = ""
        state["current_answer"] = ""
        state["conversation_history"] = []
        state["scores"] = []
        state["question_feedbacks"] = []
        state["total_marks"] = 0
        state["phase"] = "asking"
        state["next_action"] = "generate_question"
        state["error"] = None
        state["final_report"] = None
        
        # Generate first question
        updated_state = question_generator_agent(state)
        _save_interview_state(session_id, updated_state)
        
        return jsonify({
            "status": "interview_started",
            "question": updated_state["current_question"],
            "question_number": updated_state["questions_asked"],
            "total_questions": MAX_QUESTIONS,
            "topic": updated_state["current_question_topic"],
            "marks_per_question": MARKS_PER_QUESTION,
            "total_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
            "is_followup": False
        }), 200
        
    except Exception as e:
        logger.error(f"[start] Error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/v2/answer", methods=["POST"])
def submit_answer():
    """
    POST /api/v2/answer
    Body: { "answer": "candidate's answer text" }
    
    Evaluates the answer and returns either:
    - Next question (with status "question" or "followup")
    - Final report (with status "complete")
    """
    try:
        session_id = _get_session_id()
        state = _get_interview_state(session_id)
        
        if not state:
            return jsonify({
                "error": "No active interview session. Start with /api/v2/upload-resume then /api/v2/start"
            }), 400
        
        if state.get("phase") == "complete":
            return jsonify({
                "status": "complete",
                "final_report": state.get("final_report"),
                "total_marks": state.get("total_marks", 0),
                "max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
                "scores": state.get("scores", [])
            }), 200
        
        data = request.get_json()
        if not data or "answer" not in data:
            return jsonify({"error": "Request body must contain 'answer' field"}), 400
        
        answer = data["answer"].strip()
        if not answer:
            return jsonify({"error": "Answer cannot be empty"}), 400
        
        # Store answer in state
        state["current_answer"] = answer
        
        # Run Evaluator Agent
        state = evaluator_agent(state)
        
        next_action = state.get("next_action", "generate_question")
        
        if next_action == "generate_report":
            # Generate final report
            state = generate_final_report_node(state)
            _save_interview_state(session_id, state)
            
            return jsonify({
                "status": "complete",
                "message": "Interview complete! Here is your final evaluation.",
                "final_report": state["final_report"],
                "total_marks": state["total_marks"],
                "max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
                "scores": state["scores"],
                "questions_asked": state["questions_asked"]
            }), 200
        
        else:
            # Generate next question (new or follow-up)
            state = question_generator_agent(state)
            _save_interview_state(session_id, state)
            
            is_followup = state.get("phase") == "followup" or state.get("followups_asked", 0) > 0
            
            return jsonify({
                "status": "followup" if is_followup else "question",
                "question": state["current_question"],
                "question_number": state["questions_asked"],
                "total_questions": MAX_QUESTIONS,
                "topic": state.get("current_question_topic", ""),
                "scores_so_far": state["scores"],
                "is_followup": is_followup,
                "marks_earned_so_far": sum(state["scores"]),
                "max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION
            }), 200
        
    except Exception as e:
        logger.error(f"[answer] Error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/v2/status", methods=["GET"])
def interview_status():
    """
    GET /api/v2/status
    Returns current session/interview status.
    """
    try:
        session_id = _get_session_id()
        state = _get_interview_state(session_id)
        
        if not state:
            return jsonify({
                "status": "no_session",
                "message": "No active session. Upload resume to begin."
            }), 200
        
        return jsonify({
            "status": state.get("phase", "unknown"),
            "session_id": session_id,
            "questions_asked": state.get("questions_asked", 0),
            "total_questions": MAX_QUESTIONS,
            "scores_so_far": state.get("scores", []),
            "marks_earned": sum(state.get("scores", [])),
            "max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
            "has_resume": bool(state.get("resume_summary")),
            "is_complete": state.get("phase") == "complete",
            "current_question": state.get("current_question", ""),
        }), 200
        
    except Exception as e:
        logger.error(f"[status] Error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/v2/reset", methods=["POST"])
def reset_session():
    """
    POST /api/v2/reset
    Clears the current interview session.
    """
    try:
        session_id = session.get("session_id")
        if session_id and session_id in session_store:
            del session_store[session_id]
            logger.info(f"[Session {session_id}] Reset successful.")
        session.clear()
        return jsonify({"status": "reset", "message": "Session cleared. Upload resume to start again."}), 200
    except Exception as e:
        logger.error(f"[reset] Error: {e}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@app.route("/api/v2/health", methods=["GET"])
def health():
    """GET /api/v2/health - Health check."""
    return jsonify({
        "status": "healthy",
        "service": "Technical Interview Multi-Agent System",
        "version": "2.0.0",
        "agents": ["ResumeExtractor", "QuestionGenerator", "Evaluator"],
        "groq_connected": bool(GROQ_API_KEY),
        "pdf_support": PDF_AVAILABLE,
        "docx_support": DOCX_AVAILABLE,
        "active_sessions": len(session_store),
        "max_questions": MAX_QUESTIONS,
        "marks_per_question": MARKS_PER_QUESTION,
        "total_max_marks": MAX_QUESTIONS * MARKS_PER_QUESTION,
    }), 200


# ═══════════════════════════════════════════════════════════════
# Entry Point
# ═══════════════════════════════════════════════════════════════
if __name__ == "__main__":
    try:
        logger.info("=" * 60)
        logger.info(" Technical Interview Multi-Agent System v2.0")
        logger.info(" Agents: ResumeExtractor | QuestionGenerator | Evaluator")
        logger.info(" Framework: LangGraph + LangChain + Groq LLM")
        logger.info("=" * 60)
        logger.info(f" PDF Support: {PDF_AVAILABLE}")
        logger.info(f" DOCX Support: {DOCX_AVAILABLE}")
        logger.info(f" Max Questions: {MAX_QUESTIONS}")
        logger.info(f" Total Marks: {MAX_QUESTIONS * MARKS_PER_QUESTION}")
        logger.info("=" * 60)
        logger.info(" API Endpoints:")
        logger.info("   POST /api/v2/upload-resume  - Upload resume (PDF/DOCX/TXT)")
        logger.info("   GET  /api/v2/start          - Start interview")
        logger.info("   POST /api/v2/answer         - Submit answer")
        logger.info("   GET  /api/v2/status         - Session status")
        logger.info("   POST /api/v2/reset          - Reset session")
        logger.info("   GET  /api/v2/health         - Health check")
        logger.info("=" * 60)
        
        app.run(debug=True, port=8001, use_reloader=False)
        
    except KeyboardInterrupt:
        logger.info("Server stopped by user.")
    except Exception as e:
        logger.error(f"Server error: {e}")
        sys.exit(1)
