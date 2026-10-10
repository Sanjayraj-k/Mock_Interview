import os
import logging
import re
from uuid import uuid4
from flask import Blueprint, request, jsonify, session

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

try:
    from langchain_groq import ChatGroq
except Exception as import_err:
    ChatGroq = None
    logger.warning(f"Could not import ChatGroq in hrround.py: {import_err}")

from langchain_core.prompts import PromptTemplate
from langchain_classic.chains import LLMChain
from langchain_classic.memory import ConversationBufferMemory
from dotenv import load_dotenv

# Blueprint for HR Behavioral Interview
hrround_bp = Blueprint('hrround', __name__, url_prefix='/hrround')

logger.info("Starting HR Behavioral Interview agent...")

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

GROQ_MODEL = "openai/gpt-oss-120b"

# Initialize Groq LLM
llm = None
eval_llm = None

def get_llm():
    """LLM for asking interview questions (short responses)"""
    global llm
    if llm is None and ChatGroq:
        api_key = os.getenv("GROQ_API_KEY") or GROQ_API_KEY
        if api_key:
            try:
                llm = ChatGroq(model_name=GROQ_MODEL, groq_api_key=api_key, temperature=0.7, max_tokens=350)
                logger.info(f"HR Round: Groq LLM initialized successfully with {GROQ_MODEL}")
            except Exception as e:
                logger.warning(f"Error initializing Groq LLM for HR Round: {str(e)}")
    return llm

def get_eval_llm():
    """LLM with high max_tokens (2000) for complete behavioral evaluation & scoring"""
    global eval_llm
    if eval_llm is None and ChatGroq:
        api_key = os.getenv("GROQ_API_KEY") or GROQ_API_KEY
        if api_key:
            try:
                eval_llm = ChatGroq(model_name=GROQ_MODEL, groq_api_key=api_key, temperature=0.3, max_tokens=2000)
                logger.info(f"HR Round: Evaluation LLM initialized successfully with 2000 max_tokens")
            except Exception as e:
                logger.warning(f"Error initializing Evaluation LLM: {str(e)}")
    return eval_llm or get_llm()

# === HR BEHAVIORAL QUESTION PROMPTS ===
hr_memory_store = {}

# Q1: Career motivation & role alignment
hr_intro_prompt = PromptTemplate(
    input_variables=["history"],
    template="""You are an experienced HR interviewer conducting a behavioral interview round. 
Based on the conversation history: {history}

Ask the candidate to briefly introduce themselves and explain their career motivation. 
Ask them why they are interested in this role and how it aligns with their long-term career goals.
Keep the question to 2-3 lines. Be warm and professional."""
)

# Q2: Conflict resolution under team pressure
hr_conflict_prompt = PromptTemplate(
    input_variables=["history"],
    template="""You are an experienced HR interviewer. Based on the conversation history: {history}

Ask a behavioral question about conflict resolution under team pressure. 
Reference something specific from the candidate's previous answer if relevant.
Example topics: disagreements with team members, handling criticism, resolving misunderstandings during tight deadlines.
Keep it to 2-3 lines. Use the STAR method framing (Situation, Task, Action, Result)."""
)

# Q3: Cross-functional collaboration
hr_collaboration_prompt = PromptTemplate(
    input_variables=["history"],
    template="""You are an experienced HR interviewer. Based on the conversation history: {history}

Ask a behavioral question about cross-functional collaboration experience.
Reference something specific from the candidate's previous answers if relevant.
Example topics: working with people from different departments, coordinating across teams, bridging communication gaps.
Keep it to 2-3 lines."""
)

# Q4: Leadership initiative in ambiguous situations
hr_leadership_prompt = PromptTemplate(
    input_variables=["history"],
    template="""You are an experienced HR interviewer. Based on the conversation history: {history}

Ask a behavioral question about leadership initiative in ambiguous or uncertain situations.
Reference something specific from the candidate's previous answers if relevant.
Example topics: taking charge without being asked, making decisions with incomplete information, motivating team members during uncertainty.
Keep it to 2-3 lines."""
)

# Q5: Adaptability to organizational change
hr_adaptability_prompt = PromptTemplate(
    input_variables=["history"],
    template="""You are an experienced HR interviewer. Based on the conversation history: {history}

Ask a behavioral question about adaptability to organizational or process changes.
Reference something specific from the candidate's previous answers if relevant.
Example topics: adjusting to new tools or workflows, handling sudden requirement changes, learning new technologies quickly under pressure.
Keep it to 2-3 lines."""
)

# Q6: Situational judgment & decision-making
hr_situational_prompt = PromptTemplate(
    input_variables=["history"],
    template="""You are an experienced HR interviewer. Based on the conversation history: {history}

Ask a situational judgment question that tests the candidate's decision-making and ethical reasoning.
Reference something specific from the candidate's previous answers if relevant.
Example topics: prioritizing competing deadlines, handling a teammate not pulling their weight, dealing with an ethical dilemma at work.
Keep it to 2-3 lines."""
)

# HR Evaluation prompt
hr_evaluation_prompt = PromptTemplate(
    input_variables=["history"],
    template="""Based on the HR behavioral interview history:
{history}

Evaluate the candidate's behavioral competencies comprehensively. Provide:

1. EVALUATION SUMMARY: Overall impression of the candidate's behavioral fit
2. STRENGTHS: List specific behavioral strengths observed (e.g., communication, teamwork, leadership)
3. AREAS FOR IMPROVEMENT: Specific areas where the candidate could improve
4. WEAKNESSES: Clear behavioral weaknesses identified
5. FINAL MARK: Assign a numerical score out of 50 (e.g., "35 out of 50" or "42/50") based strictly on the quality and completeness of answers provided.
6. JUSTIFICATION: Explain the reasoning behind the score

Evaluate based on these competencies:
- Communication clarity and confidence
- Conflict resolution ability
- Team collaboration skills
- Leadership potential
- Adaptability and learning agility
- Decision-making and judgment

IMPORTANT: The final mark MUST be clearly stated as "FINAL MARK: X out of 50" where X is the numerical score between 0 and 50.

Format your response exactly as:
EVALUATION SUMMARY
[Brief summary here]

STRENGTHS:
[List strengths here]

AREAS FOR IMPROVEMENT:
[List areas for improvement here]

WEAKNESSES: 
[List weaknesses here]

FINAL MARK: [Score] out of 50

JUSTIFICATION:
[Detailed justification here]"""
)


def get_hr_session_id():
    """Identify HR session using candidateId/email or fallback to Flask session."""
    cid = None
    if request.is_json and request.json:
        cid = request.json.get('candidateId') or request.json.get('candidateEmail') or request.json.get('email')
    if not cid:
        cid = request.args.get('candidateId') or request.args.get('candidateEmail') or request.args.get('email')
    if cid:
        return f"hr_{cid}"
    
    session_id = session.get('hr_session_id')
    if not session_id:
        session_id = str(uuid4())
        session['hr_session_id'] = session_id
    return session_id


def get_hr_session_data():
    """Gets or initializes the session dictionary tracking Q&A pairs and question index."""
    session_id = get_hr_session_id()
    if session_id not in hr_memory_store:
        hr_memory_store[session_id] = {
            "qa_pairs": [],          # list of {"question": ..., "answer": ...}
            "current_question": "",
            "question_count": 0
        }
    return hr_memory_store[session_id]


def extract_and_format_mark(evaluation_text):
    """Extract mark from evaluation text using regex cascade"""
    patterns = [
        r'FINAL MARK[:\s*]*\**(\d+)\**\s*out of\s*50',
        r'FINAL MARK[:\s*]*\**(\d+)\**\s*/\s*50',
        r'Final Mark[:\s*]*\**(\d+)\**\s*out of\s*50',
        r'Final Mark[:\s*]*\**(\d+)\**\s*/\s*50',
        r'mark[:\s*]*\**(\d+)\**\s*out of\s*50',
        r'score[:\s*]*\**(\d+)\**\s*out of\s*50',
        r'\**(\d+)\**\s*out of\s*50',
        r'\**(\d+)\**\s*/\s*50',
    ]
    for pattern in patterns:
        match = re.search(pattern, evaluation_text, re.IGNORECASE)
        if match:
            score = int(match.group(1))
            if 0 <= score <= 50:
                return score
    return None


def analyze_hr_performance(evaluation_text, answered_count=6):
    """Dynamically assign score based on answered question count and sentiment (never static 28)."""
    if answered_count <= 0:
        return 0

    text_lower = evaluation_text.lower()
    positive_words = ['excellent', 'exceptional', 'strong', 'proficient', 'impressive', 'demonstrates', 'clear', 'confident', 'well', 'effective']
    negative_words = ['weak', 'unclear', 'incomplete', 'missing', 'poor', 'limited', 'lacks', 'needs improvement', 'superficial']
    pos = sum(1 for w in positive_words if w in text_lower)
    neg = sum(1 for w in negative_words if w in text_lower)

    max_possible = min(50, int((answered_count / 6.0) * 50))
    if pos > neg * 2:
        ratio = 0.85
    elif pos > neg:
        ratio = 0.70
    elif pos == neg and pos > 0:
        ratio = 0.50
    else:
        ratio = 0.35

    return max(0, min(50, int(max_possible * ratio)))


def format_hr_evaluation(evaluation_text, answered_count=6):
    """Ensure evaluation contains properly formatted mark"""
    score = extract_and_format_mark(evaluation_text)
    if score is not None:
        formatted_mark = f"FINAL MARK: {score} out of 50"
        patterns_to_replace = [
            r'FINAL MARK[:\s]*\d+[/\s]*(?:out of\s*)?50',
            r'Final Mark[:\s]*\d+[/\s]*(?:out of\s*)?50',
        ]
        for pattern in patterns_to_replace:
            evaluation_text = re.sub(pattern, formatted_mark, evaluation_text, flags=re.IGNORECASE)
        if not re.search(r'FINAL MARK:', evaluation_text, re.IGNORECASE):
            if 'JUSTIFICATION:' in evaluation_text.upper():
                evaluation_text = evaluation_text.replace('JUSTIFICATION:', f'{formatted_mark}\n\nJUSTIFICATION:')
            else:
                evaluation_text += f'\n\n{formatted_mark}'
    else:
        default_score = analyze_hr_performance(evaluation_text, answered_count=answered_count)
        formatted_mark = f"FINAL MARK: {default_score} out of 50"
        evaluation_text += f'\n\n{formatted_mark}'
    return evaluation_text


def clean_response(response):
    """Clean response while preserving important formatting like marks"""
    cleaned = re.sub(r'\*\*|\*(?!\s*out\s*of)|\#', '', response)
    cleaned = re.sub(r'_(?!.*out.*of)', '', cleaned)
    return cleaned.strip()


def _generate_hr_evaluation_from_data(session_data):
    """Generate HR behavioral evaluation with guaranteed dynamic mark display"""
    qa_pairs = session_data.get("qa_pairs", [])
    valid_answers = [qa for qa in qa_pairs if qa.get("answer", "").strip()]

    # Case 1: Candidate did NOT attend or gave zero answers -> SCORE MUST BE 0!
    if not valid_answers:
        logger.info("Candidate did not provide any substantive answers. Assigning 0 out of 50.")
        return {
            "evaluation": (
                "EVALUATION SUMMARY:\n"
                "The candidate did not attend or provide answers to the HR interview questions.\n\n"
                "AREAS FOR IMPROVEMENT:\n"
                "- Participation in the interview session is required.\n\n"
                "FINAL MARK: 0 out of 50\n\n"
                "JUSTIFICATION:\n"
                "No responses were submitted for evaluation. Mark awarded is 0 out of 50."
            ),
            "status": "evaluation"
        }

    try:
        active_llm = get_eval_llm()
        if not active_llm:
            raise ValueError("Groq LLM is not initialized. Please verify GROQ_API_KEY.")

        # Build clean chronological Q&A transcript
        transcript_parts = []
        for idx, qa in enumerate(valid_answers, 1):
            transcript_parts.append(f"Question {idx}: {qa.get('question', '')}\nCandidate Answer: {qa.get('answer', '')}")
        history_text = "\n\n".join(transcript_parts)

        evaluation_chain = LLMChain(llm=active_llm, prompt=hr_evaluation_prompt)
        evaluation = evaluation_chain.run(history=history_text)
        cleaned_evaluation = clean_response(evaluation)
        formatted_evaluation = format_hr_evaluation(cleaned_evaluation, answered_count=len(valid_answers))

        # Cleanup session data
        session_id = get_hr_session_id()
        if session_id in hr_memory_store:
            del hr_memory_store[session_id]
            logger.info(f"HR memory cleared for session {session_id}")
        
        logger.info(f"HR evaluation generated successfully based on {len(valid_answers)} answered questions")
        return {"evaluation": formatted_evaluation, "status": "evaluation"}
    except Exception as e:
        logger.error(f"Error generating HR evaluation: {str(e)}")
        fallback_score = analyze_hr_performance("", answered_count=len(valid_answers))
        return {
            "evaluation": (
                f"Candidate completed {len(valid_answers)} of 6 interview questions.\n\n"
                f"FINAL MARK: {fallback_score} out of 50\n\n"
                f"JUSTIFICATION:\nEvaluation computed based on {len(valid_answers)} submitted responses."
            ),
            "status": "evaluation"
        }


# === API ROUTES ===

@hrround_bp.route('/api/start', methods=['GET'])
def start_hr_interview():
    try:
        active_llm = get_llm()
        if not active_llm:
            return jsonify({"error": "Groq LLM is not initialized. Check GROQ_API_KEY."}), 500
        
        session_id = get_hr_session_id()
        # Fresh session on start
        hr_memory_store[session_id] = {
            "qa_pairs": [],
            "current_question": "",
            "question_count": 0
        }
        session_data = hr_memory_store[session_id]

        question = LLMChain(llm=active_llm, prompt=hr_intro_prompt).run(history="Interview starting.")
        clean_q = clean_response(question)
        session_data["current_question"] = clean_q
        session_data["question_count"] = 1
        
        logger.info(f"HR interview started for session {session_id} with intro question")
        return jsonify({"question": clean_q, "status": "hr_intro", "question_number": 1})
    except Exception as e:
        logger.error(f"Error in HR /api/start: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@hrround_bp.route('/api/submit', methods=['POST'])
def submit_hr_answer():
    try:
        user_answer = request.json.get('answer', '')
        if not user_answer.strip():
            logger.warning("Empty HR answer received")
            return jsonify({"error": "Answer cannot be empty"}), 400

        session_data = get_hr_session_data()
        current_q = session_data.get("current_question", "Behavioral Question")
        session_data["qa_pairs"].append({"question": current_q, "answer": user_answer.strip()})
        
        question_count = session_data["question_count"]

        # Question flow: 6 behavioral questions
        prompt_map = {
            1: (hr_conflict_prompt, "hr_conflict"),
            2: (hr_collaboration_prompt, "hr_collaboration"),
            3: (hr_leadership_prompt, "hr_leadership"),
            4: (hr_adaptability_prompt, "hr_adaptability"),
            5: (hr_situational_prompt, "hr_situational"),
        }

        if question_count in prompt_map:
            prompt, status = prompt_map[question_count]
            active_llm = get_llm()
            if not active_llm:
                return jsonify({"error": "Groq LLM is not initialized. Check GROQ_API_KEY."}), 500
            
            # Format brief history for context
            brief_history = "\n".join([f"Q: {qa['question']}\nA: {qa['answer']}" for qa in session_data["qa_pairs"]])
            question = LLMChain(llm=active_llm, prompt=prompt).run(history=brief_history)
            clean_q = clean_response(question)

            session_data["question_count"] += 1
            session_data["current_question"] = clean_q
            logger.debug(f"Generated HR question {session_data['question_count']}: {clean_q}")
            return jsonify({"question": clean_q, "status": status, "question_number": session_data["question_count"]})
        else:
            # After 6 questions, generate evaluation
            logger.info("All 6 questions answered. Generating HR behavioral evaluation")
            return jsonify(_generate_hr_evaluation_from_data(session_data))

    except Exception as e:
        logger.error(f"Error in HR /api/submit: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@hrround_bp.route('/api/finish', methods=['POST'])
def finish_hr_interview():
    try:
        logger.info("User requested to finish HR interview early")
        session_data = get_hr_session_data()
        user_answer = request.json.get('answer', '').strip() if (request.is_json and request.json) else ''
        if user_answer and session_data.get("current_question"):
            session_data["qa_pairs"].append({
                "question": session_data["current_question"],
                "answer": user_answer
            })
            logger.debug("Saved final HR answer before early evaluation")
        return jsonify(_generate_hr_evaluation_from_data(session_data))
    except Exception as e:
        logger.error(f"Error in HR /api/finish: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@hrround_bp.route('/api/reset-session', methods=['POST'])
def reset_hr_session():
    """Reset current HR session data"""
    try:
        session_id = get_hr_session_id()
        if session_id in hr_memory_store:
            del hr_memory_store[session_id]
        logger.info(f"HR session {session_id} reset successfully")
        return jsonify({"status": "HR session reset successfully"}), 200
    except Exception as e:
        logger.error(f"Error in HR /api/reset-session: {str(e)}")
        return jsonify({"error": str(e)}), 500


@hrround_bp.route('/api/health', methods=['GET'])
def hr_health_check():
    """Health check endpoint for HR round"""
    active_llm = get_llm()
    return jsonify({
        "status": "healthy",
        "agent": "HR Behavioral Interview",
        "model": GROQ_MODEL,
        "groq_connected": bool(GROQ_API_KEY or os.getenv("GROQ_API_KEY")),
        "llm_ready": active_llm is not None,
        "active_sessions": len(hr_memory_store)
    }), 200
