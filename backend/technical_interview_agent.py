"""
AI-Powered Technical Interview System - Multi-Agent Architecture
================================================================
Uses LangGraph + Groq LLMs to orchestrate three specialized agents:

1. ResumeExtractorAgent  - Parses uploaded PDF/DOCX/TXT resume, extracts candidate name,
                           specific projects, tech stacks, skills, frameworks, internships.
2. QuestionGeneratorAgent - Generates candidate-specific, project-grounded questions
                            directly referencing the candidate's actual projects and skills.
3. EvaluatorAgent        - Scores each answer (0-10), gives actionable feedback, and
                            decides follow-up vs next question.

Endpoints (via technical_interview_bp.py):
  POST /api/v2/upload-resume   -> Upload PDF/DOCX/TXT resume & extract technical data
  GET  /api/v2/start           -> Start interview with question #1 tailored to resume
  POST /api/v2/answer          -> Submit answer, evaluate, get next tailored question or final report
  POST /api/v2/reset           -> Reset session
  GET  /api/v2/status          -> Session status
  GET  /api/v2/health          -> Health check
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

# LangGraph
from langgraph.graph import StateGraph, END
from langgraph.graph.message import add_messages
from langchain_core.messages import HumanMessage, SystemMessage, AIMessage

# PDF & DOCX parsing
try:
    import pdfplumber
    PDF_AVAILABLE = True
except ImportError:
    PDF_AVAILABLE = False

try:
    from docx import Document as DocxDocument
    DOCX_AVAILABLE = True
except ImportError:
    DOCX_AVAILABLE = False

from dotenv import load_dotenv

# ─────────────────────────────────────────────
# Logging & Environment Setup
# ─────────────────────────────────────────────
logging.basicConfig(
    level=logging.INFO,
    format="%(asctime)s [%(levelname)s] %(name)s - %(message)s"
)
logger = logging.getLogger("TechInterview")

load_dotenv()

GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in environment variables.")

# ─────────────────────────────────────────────
# Robust Groq Native LLM Wrapper
# ─────────────────────────────────────────────
try:
    from groq import Groq
    GROQ_SDK_AVAILABLE = True
except ImportError:
    Groq = None
    GROQ_SDK_AVAILABLE = False
    logger.warning("Native groq SDK not installed.")

# List of supported chat completion models to try in order
GROQ_MODELS = [
    "openai/gpt-oss-120b",
    "qwen/qwen3.8-27b",
    "openai/gpt-oss-20b",
    "llama-3.3-70b-versatile",
]

class GroqAgentLLM:
    """
    Direct, robust Groq LLM client that does not depend on langchain_groq
    and automatically falls back across working models.
    """
    def __init__(self, preferred_model: str = "openai/gpt-oss-120b", temperature: float = 0.7, max_tokens: int = 600):
        self.preferred_model = preferred_model
        self.temperature = temperature
        self.max_tokens = max_tokens
        self.api_key = os.getenv("GROQ_API_KEY")
        self.client = Groq(api_key=self.api_key) if (GROQ_SDK_AVAILABLE and self.api_key) else None
        self._working_model = None

    def _convert_messages(self, messages: List[Any]) -> List[Dict[str, str]]:
        formatted = []
        for msg in messages:
            if hasattr(msg, "content"):
                role = "user"
                m_type = getattr(msg, "type", "")
                cls_name = msg.__class__.__name__
                if m_type == "system" or cls_name == "SystemMessage":
                    role = "system"
                elif m_type in ("ai", "assistant") or cls_name == "AIMessage":
                    role = "assistant"
                elif m_type == "human" or cls_name == "HumanMessage":
                    role = "user"
                formatted.append({"role": role, "content": str(msg.content)})
            elif isinstance(msg, dict):
                formatted.append(msg)
            elif isinstance(msg, str):
                formatted.append({"role": "user", "content": msg})
        return formatted

    def invoke(self, messages: List[Any]):
        if not self.client:
            raise ValueError("GROQ_API_KEY is not configured or Groq SDK is missing.")

        formatted_msgs = self._convert_messages(messages)
        candidates = []
        if self._working_model:
            candidates.append(self._working_model)
        if self.preferred_model not in candidates:
            candidates.append(self.preferred_model)
        for m in GROQ_MODELS:
            if m not in candidates:
                candidates.append(m)

        last_error = None
        for model_name in candidates:
            try:
                resp = self.client.chat.completions.create(
                    model=model_name,
                    messages=formatted_msgs,
                    temperature=self.temperature,
                    max_tokens=self.max_tokens,
                )
                content = resp.choices[0].message.content or ""
                if content.strip():
                    self._working_model = model_name
                    class LLMResponse:
                        def __init__(self, c): self.content = c
                    return LLMResponse(content)
            except Exception as err:
                logger.warning(f"Groq invocation failed on model '{model_name}': {err}")
                last_error = err
                continue

        raise RuntimeError(f"All Groq models failed. Last error: {last_error}")

# Initialize LLM instances
llm_extractor = GroqAgentLLM(preferred_model="openai/gpt-oss-120b", temperature=0.2, max_tokens=1500)
llm_questioner = GroqAgentLLM(preferred_model="openai/gpt-oss-120b", temperature=0.7, max_tokens=600)
llm_evaluator = GroqAgentLLM(preferred_model="openai/gpt-oss-120b", temperature=0.2, max_tokens=800)

# ─────────────────────────────────────────────
# Session Store & Constants
# ─────────────────────────────────────────────
session_store: Dict[str, Dict[str, Any]] = {}

MAX_QUESTIONS = 5               # 5 total main questions
MARKS_PER_QUESTION = 10         # 10 marks per question -> 50 total
MAX_FOLLOWUPS_PER_QUESTION = 1   # 1 follow-up max per main question
CORRECT_THRESHOLD = 7           # Score >= 7 asks depth follow-up
WRONG_THRESHOLD = 6             # Score < 7 asks clarify follow-up


# ═══════════════════════════════════════════════════════════════
# LangGraph State Definition
# ═══════════════════════════════════════════════════════════════
class InterviewState(TypedDict):
    resume_text: str
    resume_summary: str
    questions_asked: int
    followups_asked: int
    current_question: str
    current_question_topic: str
    current_answer: str
    conversation_history: List[Dict[str, str]]
    scores: List[int]
    question_feedbacks: List[str]
    total_marks: int
    last_score: Optional[int]
    last_is_correct: Optional[bool]
    last_feedback: Optional[str]
    last_hint: Optional[str]
    phase: str
    next_action: str
    error: Optional[str]
    final_report: Optional[str]
    agent_messages: Annotated[List, add_messages]


# ═══════════════════════════════════════════════════════════════
# Helper: Heuristic Resume Parsing (Safety Fallback)
# ═══════════════════════════════════════════════════════════════
COMMON_TECH_KEYWORDS = [
    "Python", "JavaScript", "TypeScript", "Java", "C++", "C#", "Go", "Rust", "PHP", "Ruby",
    "React", "React.js", "Next.js", "Vue", "Angular", "Node.js", "Express", "Express.js",
    "Flask", "Django", "FastAPI", "Spring Boot", "HTML", "CSS", "Tailwind", "Bootstrap",
    "MongoDB", "PostgreSQL", "MySQL", "SQLite", "Redis", "Firebase", "DynamoDB", "Cassandra",
    "Docker", "Kubernetes", "AWS", "GCP", "Azure", "Git", "GitHub", "Linux", "REST API",
    "GraphQL", "WebSockets", "Kafka", "RabbitMQ", "Microservices", "CI/CD", "OpenCV",
    "TensorFlow", "PyTorch", "Whisper", "LangChain", "LLaMA", "Pandas", "NumPy"
]

def _extract_heuristic_resume_data(text: str) -> Dict[str, Any]:
    """
    Parses resume text heuristically to identify actual candidate name,
    projects, and technical skills so dummy placeholders are never used.
    """
    lines = [line.strip() for line in text.split("\n") if line.strip()]
    candidate_name = "Candidate"
    
    # Candidate name usually in first 3 lines
    for line in lines[:3]:
        clean = re.sub(r'[^a-zA-Z\s]', '', line).strip()
        words = clean.split()
        if 2 <= len(words) <= 4 and not any(w.lower() in ("resume", "cv", "curriculum", "vitae", "profile", "contact", "phone", "email") for w in words):
            candidate_name = clean
            break

    # Extract detected technologies
    text_lower = text.lower()
    found_skills = []
    for tech in COMMON_TECH_KEYWORDS:
        pattern = r'\b' + re.escape(tech.lower()) + r'\b'
        if re.search(pattern, text_lower):
            found_skills.append(tech)

    # Extract project headers or sections
    projects = []
    project_section = False
    current_proj = None

    for line in lines:
        upper = line.upper()
        if any(h in upper for h in ["PROJECT", "PROJECTS", "ACADEMIC PROJECTS", "KEY PROJECTS"]):
            project_section = True
            continue
        elif any(h in upper for h in ["EDUCATION", "EXPERIENCE", "WORK EXPERIENCE", "SKILLS", "CERTIFICATIONS", "ACHIEVEMENTS"]):
            if project_section and projects:
                project_section = False

        if project_section:
            # Bullet point or bold title indicating a project name
            if line.startswith(("-", "•", "*", "1.", "2.", "3.", "4.")) or len(line) < 60:
                clean_name = re.sub(r'^[-•*\d.]\s*', '', line).strip()
                # Split on delimiters like ' - ', ' | ', ':'
                proj_title = re.split(r'[:|–—-]', clean_name)[0].strip()
                if len(proj_title) > 3 and not any(w in proj_title.lower() for w in ["developed", "built", "implemented", "responsible", "created"]):
                    if current_proj and current_proj not in projects:
                        projects.append(current_proj)
                    proj_tech = [t for t in found_skills if t.lower() in line.lower()]
                    current_proj = {
                        "name": proj_title,
                        "description": clean_name,
                        "tech_stack": proj_tech or found_skills[:3]
                    }

    if current_proj and current_proj not in projects:
        projects.append(current_proj)

    # If no specific project names found, build representative project from skills
    if not projects:
        main_stack = found_skills[:4] if found_skills else ["Full Stack Development"]
        projects.append({
            "name": f"{main_stack[0]} Application" if main_stack else "Technical Capstone Project",
            "description": f"Application implementing {', '.join(main_stack)}.",
            "tech_stack": main_stack
        })

    return {
        "candidate_name": candidate_name,
        "projects": projects,
        "skills": {
            "languages": [s for s in found_skills if s in ["Python", "JavaScript", "TypeScript", "Java", "C++", "Go"]],
            "frameworks": [s for s in found_skills if s in ["React", "Next.js", "Node.js", "Flask", "Django", "FastAPI", "Spring Boot", "Express"]],
            "databases": [s for s in found_skills if s in ["PostgreSQL", "MongoDB", "MySQL", "Redis", "SQLite"]]
        },
        "core_subjects": ["Data Structures & Algorithms", "Operating Systems", "DBMS", "Computer Networks", "System Design"]
    }


# ═══════════════════════════════════════════════════════════════
# AGENT 1: Resume Extractor Agent
# ═══════════════════════════════════════════════════════════════
RESUME_EXTRACTION_SYSTEM_PROMPT = """You are an expert Resume Parser and Technical Interview Analyst.

Your task is to analyze the candidate's resume and extract all technical details with high precision.

Extract:
1. CANDIDATE NAME: The candidate's full name.
2. PROJECTS: Extract EVERY named project. For each project, extract:
   - "name": Exact project name (e.g., "MockAI Interviewer", "Smart Health Tracker", "E-Commerce Portal")
   - "tech_stack": Array of languages, frameworks, databases, and libraries used
   - "description": Summary of what was built and key technical highlights
   - "challenges": Key technical challenges or architecture decisions if mentioned
3. SKILLS:
   - languages, frameworks, databases, tools, cloud
4. CORE SUBJECTS: Relevant subjects (DSA, OS, DBMS, Computer Networks, System Design, OOP)

Output strictly valid JSON with this structure (no markdown, raw JSON only):
{
  "candidate_name": "Full Name",
  "projects": [
    {
      "name": "Project Name",
      "tech_stack": ["React", "FastAPI", "PostgreSQL"],
      "description": "What the project does",
      "highlights": ["Key feature 1", "Key feature 2"]
    }
  ],
  "skills": {
    "languages": ["Python", "JavaScript"],
    "frameworks": ["React", "Flask"],
    "databases": ["PostgreSQL", "Redis"],
    "tools": ["Docker", "Git"]
  },
  "core_subjects": ["Data Structures", "Operating Systems", "DBMS", "Computer Networks", "OOP"]
}"""

def resume_extractor_agent(state: InterviewState) -> InterviewState:
    """Agent 1: Extracts structured technical data from the raw resume text."""
    logger.info("[ResumeExtractor] Starting resume extraction...")

    resume_text = state.get("resume_text", "").strip()
    if not resume_text:
        state["error"] = "Resume text is empty. Please upload a valid resume."
        state["phase"] = "error"
        state["next_action"] = "error"
        return state

    try:
        messages = [
            SystemMessage(content=RESUME_EXTRACTION_SYSTEM_PROMPT),
            HumanMessage(content=f"Extract technical information from this candidate resume:\n\n{resume_text}")
        ]

        response = llm_extractor.invoke(messages)
        raw_content = response.content.strip()

        # Clean JSON from markdown code fence if wrapped
        clean_json = re.sub(r'^```(?:json)?\s*', '', raw_content)
        clean_json = re.sub(r'\s*```$', '', clean_json).strip()

        # Extract outermost JSON object
        json_match = re.search(r'\{.*\}', clean_json, re.DOTALL)
        if json_match:
            parsed = json.loads(json_match.group(0))
            # Validate projects array exists and has at least 1 item
            if not parsed.get("projects") or not isinstance(parsed["projects"], list):
                heuristic = _extract_heuristic_resume_data(resume_text)
                parsed["projects"] = heuristic["projects"]
            state["resume_summary"] = json.dumps(parsed, indent=2)
        else:
            raise ValueError("No JSON object could be extracted from LLM response.")

        logger.info(f"[ResumeExtractor] Extraction successful. Parsed {len(parsed.get('projects', []))} projects.")
        state["phase"] = "asking"
        state["next_action"] = "generate_question"
        state["error"] = None

    except Exception as e:
        logger.warning(f"[ResumeExtractor] LLM extraction encountered an issue ({e}). Using intelligent heuristic extraction.")
        heuristic_data = _extract_heuristic_resume_data(resume_text)
        state["resume_summary"] = json.dumps(heuristic_data, indent=2)
        state["phase"] = "asking"
        state["next_action"] = "generate_question"
        state["error"] = None

    return state


# ═══════════════════════════════════════════════════════════════
# AGENT 2: Question Generator Agent
# ═══════════════════════════════════════════════════════════════
QUESTION_GENERATOR_SYSTEM_PROMPT = """You are an expert Senior Technical Interviewer conducting a placement interview.

You have access to the candidate's structured resume summary (JSON) and the ongoing conversation history.

Your goal is to conduct an authentic, student-specific interview where EVERY question directly references the candidate's actual background.

MANDATORY RULES:
1. For Question #1 and Question #2 (Project Questions):
   - You MUST ask specifically about one of the NAMED PROJECTS listed in the resume JSON.
   - You MUST explicitly name the project in your question: (e.g. "In your project [Project Name], ...").
   - Probe their technical implementation, architecture, technology choices, API design, database schema, or real-world challenges with that project.
   - NEVER ask generic questions like "Explain your backend architecture" or "In your primary project". ALWAYS use the real project name!
   - If there are 2 or more projects, ask Question #1 about Project 1 and Question #2 about Project 2.
2. For Question #3, #4, and #5 (Technical & Core CS Questions):
   - Connect the question directly to the skills and frameworks listed on their resume!
   - Example (Database): "Since you used [DB from resume], how did you manage indexing and query performance, and when would you choose it over a relational database?"
   - Example (OS/Concurrency): "In your work with [Language/Framework from resume], how does concurrency and process/thread management work under the hood?"
   - Example (Networking/APIs): "You worked with [REST/WebSockets/Cloud from resume]. How do you handle error states, rate limiting, and network latency in production?"
3. Style:
   - Ask ONE question at a time.
   - Keep the question concise (2-3 sentences max).
   - Be professional, challenging, and clear.
   - Output ONLY the question text. Do not include labels, greetings, or prefixes."""

DEPTH_FOLLOWUP_SYSTEM_PROMPT = """You are an expert Technical Interviewer.
The candidate answered the previous question well and showed good technical understanding.

Generate ONE deeper follow-up question that:
1. Stays on the EXACT SAME project or topic from the question just answered.
2. References something specific the candidate just explained in their answer.
3. Probes edge cases, scaling limits, internals, failure scenarios, or trade-offs.
4. Keep it to 2 sentences max.
5. Output ONLY the follow-up question text."""

CLARIFY_FOLLOWUP_SYSTEM_PROMPT = """You are an expert Technical Interviewer.
The candidate's answer was incomplete, vague, or partially incorrect.

Generate ONE clarifying follow-up question that:
1. Stays on the EXACT SAME project or topic from the question just answered.
2. Points them toward the core missing concept without giving the entire answer away.
3. Gives them a fair opportunity to explain the mechanism or architecture in more detail.
4. Keep it to 2 sentences max.
5. Output ONLY the follow-up question text."""


def _generate_dynamic_fallback_question(state: InterviewState, topic: str, q_index: int) -> str:
    """
    Generates a personalized fallback question by inspecting the actual parsed resume summary,
    ensuring that even if the LLM encounters a network delay, the student gets a question tailored to them.
    """
    resume_summary_str = state.get("resume_summary", "{}")
    projects = []
    skills = []
    try:
        parsed = json.loads(resume_summary_str)
        projects = parsed.get("projects", [])
        raw_skills = parsed.get("skills", {})
        if isinstance(raw_skills, dict):
            for v in raw_skills.values():
                if isinstance(v, list): skills.extend(v)
        elif isinstance(raw_skills, list):
            skills = raw_skills
    except Exception:
        pass

    if topic == "project" and projects:
        proj = projects[q_index % len(projects)]
        p_name = proj.get("name", "your project")
        p_tech = ", ".join(proj.get("tech_stack", [])) or "your chosen stack"
        templates = [
            f"In your '{p_name}' project built with {p_tech}, walk me through the end-to-end data flow and explain how you handled backend error handling and data consistency.",
            f"Regarding your '{p_name}' project, what was the most difficult technical challenge or performance bottleneck you encountered, and how did you resolve it?",
            f"In your '{p_name}' project, can you explain the database schema design and why you selected {p_tech} over alternative technologies?"
        ]
        return templates[q_index % len(templates)]

    if skills:
        top_skill = skills[q_index % len(skills)]
        return f"Based on your experience with {top_skill} listed on your resume, how do you handle asynchronous operations, error boundaries, and state management in production applications?"

    core_q = [
        "In Operating Systems, explain how context switching works between threads versus processes, and the performance overhead involved.",
        "In Database Management Systems, explain the ACID properties and how transaction isolation levels prevent phantom reads and dirty reads.",
        "In Computer Networks, describe the TCP 3-way handshake and contrast TCP's flow control mechanisms with UDP."
    ]
    return core_q[q_index % len(core_q)]


def question_generator_agent(state: InterviewState) -> InterviewState:
    """Agent 2: Generates resume-grounded, context-aware technical questions."""
    questions_asked = state.get("questions_asked", 0)
    followups_asked = state.get("followups_asked", 0)
    phase = state.get("phase", "asking")
    last_score = state.get("last_score", 0)

    logger.info(f"[QuestionGenerator] Phase={phase}, QAsked={questions_asked}, Followups={followups_asked}, LastScore={last_score}")

    history_text = _format_history(state.get("conversation_history", []))
    resume_summary = state.get("resume_summary", "{}")

    # Extract parsed project list to inject explicitly into the prompt
    parsed_projects = []
    try:
        parsed_data = json.loads(resume_summary)
        parsed_projects = parsed_data.get("projects", [])
    except Exception:
        pass

    try:
        # ── Follow-up Question Flow ──────────────────────────────────────────
        if phase in ("depth_followup", "clarify_followup") and followups_asked < MAX_FOLLOWUPS_PER_QUESTION:
            current_q = state.get("current_question", "")
            current_a = state.get("current_answer", "")
            current_topic = state.get("current_question_topic", "project")

            if phase == "depth_followup":
                sys_prompt = DEPTH_FOLLOWUP_SYSTEM_PROMPT
                instruction = (
                    f"The candidate answered correctly (score {last_score}/10).\n"
                    f"Current question: \"{current_q}\"\n"
                    f"Candidate's answer: \"{current_a}\"\n"
                    f"Ask a deeper follow-up on this exact same project/topic. Reference what they said."
                )
            else:
                sys_prompt = CLARIFY_FOLLOWUP_SYSTEM_PROMPT
                instruction = (
                    f"The candidate's answer was incomplete or partially incorrect (score {last_score}/10).\n"
                    f"Current question: \"{current_q}\"\n"
                    f"Candidate's answer: \"{current_a}\"\n"
                    f"Ask a clarifying follow-up on this exact same project/topic to give them a chance to elaborate."
                )

            messages = [
                SystemMessage(content=sys_prompt),
                HumanMessage(content=f"Resume Context:\n{resume_summary}\n\nConversation History:\n{history_text}\n\n{instruction}")
            ]
            response = llm_questioner.invoke(messages)
            question = response.content.strip()

            state["current_question"] = question
            state["followups_asked"] = followups_asked + 1
            state["phase"] = "asking"
            state["next_action"] = "wait_for_answer"
            logger.info(f"[QuestionGenerator] Generated {phase} question: {question[:90]}...")

        # ── New Main Question Flow ───────────────────────────────────────────
        else:
            topic = "project" if questions_asked < 2 else "core_subject"

            # Build explicit instructions targeting specific projects
            if topic == "project":
                if parsed_projects:
                    proj_idx = questions_asked % len(parsed_projects)
                    target_proj = parsed_projects[proj_idx]
                    p_name = target_proj.get("name", "Project")
                    p_tech = ", ".join(target_proj.get("tech_stack", []))
                    p_desc = target_proj.get("description", "")
                    extra_instruction = (
                        f"MANDATORY REQUIREMENT FOR QUESTION #{questions_asked + 1}:\n"
                        f"You MUST ask specifically about the candidate's project named: '{p_name}'.\n"
                        f"Technologies used in this project: {p_tech}.\n"
                        f"Project overview: {p_desc}.\n"
                        f"Your question MUST start or clearly mention: 'In your {p_name} project, ...'.\n"
                        f"Ask about an architectural decision, technical challenge, or how they used {p_tech}."
                    )
                else:
                    extra_instruction = "Ask specifically about the candidate's top technical skills and applications from their resume."
            else:
                extra_instruction = (
                    f"Ask a core technical question (DSA, OS, DBMS, Networks, or System Design) that directly connects "
                    f"to the languages, databases, or frameworks listed in their resume summary."
                )

            messages = [
                SystemMessage(content=QUESTION_GENERATOR_SYSTEM_PROMPT),
                HumanMessage(content=(
                    f"Candidate Resume Summary:\n{resume_summary}\n\n"
                    f"Conversation History:\n{history_text}\n\n"
                    f"Generate Main Question #{questions_asked + 1} of {MAX_QUESTIONS}.\n"
                    f"Topic category: {topic}.\n"
                    f"{extra_instruction}"
                ))
            ]
            response = llm_questioner.invoke(messages)
            question = response.content.strip()

            state["current_question"] = question
            state["current_question_topic"] = topic
            state["questions_asked"] = questions_asked + 1
            state["followups_asked"] = 0
            state["phase"] = "asking"
            state["next_action"] = "wait_for_answer"
            logger.info(f"[QuestionGenerator] Generated Main Question #{questions_asked + 1}: {question[:90]}...")

    except Exception as e:
        logger.warning(f"[QuestionGenerator] LLM generation failed ({e}). Using dynamic personalized fallback.")
        topic = "project" if questions_asked < 2 else "core_subject"
        question = _generate_dynamic_fallback_question(state, topic, questions_asked)
        state["current_question"] = question
        state["current_question_topic"] = topic
        state["questions_asked"] = questions_asked + 1
        state["followups_asked"] = 0
        state["phase"] = "asking"
        state["next_action"] = "wait_for_answer"

    return state


# ═══════════════════════════════════════════════════════════════
# AGENT 3: Evaluator Agent
# ═══════════════════════════════════════════════════════════════
EVALUATOR_SYSTEM_PROMPT = """You are an experienced, fair, and rigorous Technical Interview Evaluator.

Evaluate the candidate's answer to the technical question based on accuracy, depth, and clarity.

Output strictly valid JSON with this structure (no markdown, raw JSON only):
{
  "score": <integer from 0 to 10>,
  "is_correct": <boolean true if score >= 7, else false>,
  "feedback": "<2-3 sentences assessing what they explained correctly and what was missing or incorrect>",
  "correct_answer_hint": "<Brief technical summary of what an ideal answer covers>"
}

Scoring Rubric:
- 9-10: Exceptional - Accurate, mentions internal mechanisms, edge cases, or performance trade-offs.
- 7-8:  Strong - Technically sound, covers the core question with minor omissions.
- 5-6:  Partial - Understands the high level but lacks technical depth or contains slight inaccuracies.
- 3-4:  Weak - Very brief, vague, or significant conceptual misunderstanding.
- 1-2:  Poor - Off-topic, incorrect, or refusal to answer.
- 0:    No answer provided."""

def evaluator_agent(state: InterviewState) -> InterviewState:
    """Agent 3: Evaluates candidate answers and decides whether to probe or advance."""
    question = state.get("current_question", "")
    answer = state.get("current_answer", "")
    followups_asked = state.get("followups_asked", 0)

    logger.info(f"[Evaluator] Evaluating answer for: {question[:60]}...")

    if not answer.strip():
        score = 0
        is_correct = False
        feedback = "No response was recorded for this question."
        hint = "Providing a clear explanation, even an initial concept or architecture, demonstrates technical thinking."
        state["last_score"] = score
        state["last_is_correct"] = is_correct
        state["last_feedback"] = feedback
        state["last_hint"] = hint

        if followups_asked == 0:
            state["scores"].append(score)
            state["question_feedbacks"].append(f"Q: {question}\nA: (empty)\nScore: 0/10\nFeedback: {feedback}")

        state["phase"] = "asking"
        state["next_action"] = _decide_next_after_eval(state)
        state["followups_asked"] = 0
        return state

    try:
        messages = [
            SystemMessage(content=EVALUATOR_SYSTEM_PROMPT),
            HumanMessage(content=f"Question:\n{question}\n\nCandidate's Answer:\n{answer}\n\nEvaluate and return JSON:")
        ]
        response = llm_evaluator.invoke(messages)
        raw = response.content.strip()

        # Clean JSON markdown if present
        clean_raw = re.sub(r'^```(?:json)?\s*', '', raw)
        clean_raw = re.sub(r'\s*```$', '', clean_raw).strip()

        json_match = re.search(r'\{.*\}', clean_raw, re.DOTALL)
        if json_match:
            eval_data = json.loads(json_match.group(0))
        else:
            raise ValueError("No JSON object found in evaluator response.")

        score = max(0, min(10, int(eval_data.get("score", 5))))
        is_correct = bool(eval_data.get("is_correct", score >= CORRECT_THRESHOLD))
        feedback = eval_data.get("feedback", "Answer evaluated.")
        hint = eval_data.get("correct_answer_hint", "Ensure coverage of core principles, edge cases, and design choices.")

    except Exception as e:
        logger.warning(f"[Evaluator] LLM evaluation fallback used ({e}).")
        words = len(answer.strip().split())
        if words < 10:
            score = 3
        elif words < 30:
            score = 6
        else:
            score = 8
        is_correct = score >= CORRECT_THRESHOLD
        feedback = f"Answer demonstrated technical awareness with an answer length of {words} words."
        hint = "A comprehensive answer explains the concept, how it works under the hood, and practical tradeoffs."

    state["last_score"] = score
    state["last_is_correct"] = is_correct
    state["last_feedback"] = feedback
    state["last_hint"] = hint

    # Update conversation history
    state["conversation_history"].append({"role": "assistant", "content": question})
    state["conversation_history"].append({"role": "user", "content": answer})

    # Record score
    if followups_asked == 0:
        state["scores"].append(score)
        state["question_feedbacks"].append(f"Q: {question}\nA: {answer}\nScore: {score}/10\nFeedback: {feedback}")
    else:
        # Update main question score with follow-up if candidate improved
        if state["scores"]:
            old_score = state["scores"][-1]
            new_score = max(old_score, score)
            state["scores"][-1] = new_score

    # Determine next routing action
    if followups_asked == 0:
        if is_correct:
            state["phase"] = "depth_followup"
        else:
            state["phase"] = "clarify_followup"
        state["next_action"] = "generate_followup"
    else:
        state["phase"] = "asking"
        state["next_action"] = _decide_next_after_eval(state)
        state["followups_asked"] = 0

    return state


def _decide_next_after_eval(state: InterviewState) -> str:
    """Helper: determine if more questions are needed or if final report should be produced."""
    scores_collected = len(state.get("scores", []))
    questions_asked = state.get("questions_asked", 0)
    if scores_collected >= MAX_QUESTIONS or questions_asked >= MAX_QUESTIONS:
        return "generate_report"
    return "generate_question"


# ═══════════════════════════════════════════════════════════════
# Final Report Generator Node
# ═══════════════════════════════════════════════════════════════
REPORT_SYSTEM_PROMPT = """You are a Senior Technical Interview Panel Chair.

Generate a comprehensive final interview report based on the candidate's interview performance.

The report must include:
1. CANDIDATE OVERVIEW & PROFILE
2. QUESTION-BY-QUESTION BREAKDOWN (Question, Candidate Response, Score, Strengths, Missing points)
3. KEY TECHNICAL STRENGTHS
4. AREAS FOR TECHNICAL IMPROVEMENT & RECOMMENDED STUDY
5. OVERALL PLACEMENT READINESS RATING: [Exceptional / Ready / Needs Preparation]
6. FINAL SCORE: X out of 50

Format clearly using Markdown headings and bullet points."""

def generate_final_report_node(state: InterviewState) -> InterviewState:
    """Generates the comprehensive final evaluation report."""
    logger.info("[FinalReport] Generating final evaluation report...")
    scores = state.get("scores", [])
    feedbacks = state.get("question_feedbacks", [])
    total = sum(scores)

    try:
        resume_summary = state.get("resume_summary", "{}")
        history_text = _format_history(state.get("conversation_history", []))
        feedbacks_text = "\n\n".join([f"Question #{i+1}:\n{fb}" for i, fb in enumerate(feedbacks)])

        messages = [
            SystemMessage(content=REPORT_SYSTEM_PROMPT),
            HumanMessage(content=(
                f"Candidate Resume Profile:\n{resume_summary}\n\n"
                f"Interview Question Results:\n{feedbacks_text}\n\n"
                f"Question Scores: {scores} -> Total Score: {total}/{MAX_QUESTIONS * MARKS_PER_QUESTION}\n\n"
                f"Full Interview Dialogue:\n{history_text}"
            ))
        ]

        response = llm_evaluator.invoke(messages)
        report = response.content.strip()

        if "FINAL SCORE:" not in report.upper():
            report += f"\n\n**FINAL SCORE: {total} out of {MAX_QUESTIONS * MARKS_PER_QUESTION}**"

        state["final_report"] = report
        state["total_marks"] = total
        state["phase"] = "complete"
        state["next_action"] = END

    except Exception as e:
        logger.error(f"[FinalReport] LLM report generation encountered an issue: {e}")
        fallback_report = (
            f"# Technical Interview Final Report\n\n"
            f"**Total Score:** {total} / {MAX_QUESTIONS * MARKS_PER_QUESTION}\n\n"
            f"### Question Breakdown:\n\n" + "\n\n".join(feedbacks) + "\n\n"
            f"**FINAL SCORE: {total} out of {MAX_QUESTIONS * MARKS_PER_QUESTION}**"
        )
        state["final_report"] = fallback_report
        state["total_marks"] = total
        state["phase"] = "complete"

    return state


# ═══════════════════════════════════════════════════════════════
# LangGraph Workflow Construction
# ═══════════════════════════════════════════════════════════════
def route_after_extraction(state: InterviewState) -> str:
    if state.get("next_action") == "error" or state.get("phase") == "error":
        return END
    return "generate_question"

def route_after_question(state: InterviewState) -> str:
    return END

def route_after_evaluation(state: InterviewState) -> str:
    action = state.get("next_action", "generate_question")
    if action == "generate_report":
        return "generate_report"
    return "generate_question"

def route_after_report(state: InterviewState) -> str:
    return END

def build_interview_graph() -> StateGraph:
    graph = StateGraph(InterviewState)
    graph.add_node("extract_resume", resume_extractor_agent)
    graph.add_node("generate_question", question_generator_agent)
    graph.add_node("evaluate_answer", evaluator_agent)
    graph.add_node("generate_report", generate_final_report_node)

    graph.set_entry_point("extract_resume")
    graph.add_conditional_edges("extract_resume", route_after_extraction, {"generate_question": "generate_question", END: END})
    graph.add_conditional_edges("generate_question", route_after_question, {END: END})
    graph.add_conditional_edges("evaluate_answer", route_after_evaluation, {"generate_question": "generate_question", "generate_report": "generate_report"})
    graph.add_conditional_edges("generate_report", route_after_report, {END: END})

    return graph.compile()

interview_graph = build_interview_graph()


# ═══════════════════════════════════════════════════════════════
# Utilities & PDF/DOCX Text Extractors
# ═══════════════════════════════════════════════════════════════
def _format_history(history: List[Dict[str, str]]) -> str:
    if not history:
        return "(No prior questions asked)"
    lines = []
    for msg in history:
        role = "Interviewer" if msg.get("role") == "assistant" else "Candidate"
        lines.append(f"{role}: {msg.get('content', '')}")
    return "\n".join(lines)

def _init_interview_state(resume_text: str = "", resume_summary: str = "") -> InterviewState:
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
        last_score=None,
        last_is_correct=None,
        last_feedback=None,
        last_hint=None,
        phase="start",
        next_action="extract_resume",
        error=None,
        final_report=None,
        agent_messages=[],
    )

def _extract_text_from_pdf(file_bytes: bytes) -> str:
    """Extracts text from PDF bytes with pdfplumber and pypdf fallbacks."""
    text_parts = []
    if PDF_AVAILABLE:
        try:
            with pdfplumber.open(io.BytesIO(file_bytes)) as pdf:
                for page in pdf.pages:
                    pt = page.extract_text()
                    if pt:
                        text_parts.append(pt)
        except Exception as e:
            logger.warning(f"pdfplumber extraction failed: {e}")

    # Fallback to pypdf if pdfplumber didn't extract text
    if not "".join(text_parts).strip():
        try:
            import pypdf
            reader = pypdf.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                pt = page.extract_text()
                if pt:
                    text_parts.append(pt)
        except Exception as e:
            logger.warning(f"pypdf extraction failed: {e}")

    # Fallback to PyPDF2
    if not "".join(text_parts).strip():
        try:
            import PyPDF2
            reader = PyPDF2.PdfReader(io.BytesIO(file_bytes))
            for page in reader.pages:
                pt = page.extract_text()
                if pt:
                    text_parts.append(pt)
        except Exception as e:
            logger.warning(f"PyPDF2 extraction failed: {e}")

    return "\n".join(text_parts)

def _extract_text_from_docx(file_bytes: bytes) -> str:
    """Extracts text from DOCX bytes."""
    if not DOCX_AVAILABLE:
        raise ValueError("python-docx is not installed.")
    doc = DocxDocument(io.BytesIO(file_bytes))
    return "\n".join([p.text for p in doc.paragraphs if p.text.strip()])
