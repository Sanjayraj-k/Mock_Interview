import os
import logging
import re
from uuid import uuid4
from flask import Blueprint, request, jsonify, session
from langchain_groq import ChatGroq
from langchain_core.prompts import PromptTemplate
from langchain_classic.chains import LLMChain
from langchain_classic.memory import ConversationBufferMemory
from dotenv import load_dotenv

# Configure logging
logging.basicConfig(level=logging.INFO, format='%(asctime)s - %(levelname)s - %(message)s')
logger = logging.getLogger(__name__)

# Blueprint for HR Behavioral Interview
hrround_bp = Blueprint('hrround', __name__, url_prefix='/hrround')

logger.info("Starting HR Behavioral Interview agent...")

# Load environment variables
load_dotenv()
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
if not GROQ_API_KEY:
    logger.error("GROQ_API_KEY not found in .env file")
    raise ValueError("GROQ_API_KEY not found. Please set it in your .env file.")

# Initialize Groq LLM
try:
    llm = ChatGroq(model_name="llama-3.1-8b-instant", groq_api_key=GROQ_API_KEY, temperature=0.7, max_tokens=250)
    logger.info("HR Round: Groq LLM initialized successfully")
except Exception as e:
    logger.error(f"Error initializing Groq LLM for HR Round: {str(e)}", exc_info=True)
    raise

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
    template="""Based on the HR behavioral interview history: {history}, 

Evaluate the candidate's behavioral competencies comprehensively. Provide:

1. EVALUATION SUMMARY: Overall impression of the candidate's behavioral fit
2. STRENGTHS: List specific behavioral strengths observed (e.g., communication, teamwork, leadership)
3. AREAS FOR IMPROVEMENT: Specific areas where the candidate could improve
4. WEAKNESSES: Clear behavioral weaknesses identified
5. FINAL MARK: Assign a numerical score out of 50 (e.g., "35 out of 50" or "42/50")
6. JUSTIFICATION: Explain the reasoning behind the score

Evaluate based on these competencies:
- Communication clarity and confidence
- Conflict resolution ability
- Team collaboration skills
- Leadership potential
- Adaptability and learning agility
- Decision-making and judgment

IMPORTANT: The final mark MUST be clearly stated as "X out of 50" or "X/50" format where X is the numerical score.

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


def get_hr_memory():
    session_id = session.get('hr_session_id', str(uuid4()))
    session['hr_session_id'] = session_id
    if session_id not in hr_memory_store:
        hr_memory_store[session_id] = ConversationBufferMemory()
        logger.debug(f"Created new HR memory for session_id: {session_id}")
    return hr_memory_store[session_id]


def extract_and_format_mark(evaluation_text):
    """Extract mark from evaluation text using regex cascade"""
    patterns = [
        r'FINAL MARK[:\s]*(\d+)\s*out of\s*50',
        r'FINAL MARK[:\s]*(\d+)/50',
        r'Final Mark[:\s]*(\d+)\s*out of\s*50',
        r'Final Mark[:\s]*(\d+)/50',
        r'mark[:\s]*(\d+)\s*out of\s*50',
        r'mark[:\s]*(\d+)/50',
        r'score[:\s]*(\d+)\s*out of\s*50',
        r'score[:\s]*(\d+)/50',
        r'(\d+)\s*out of\s*50',
        r'(\d+)/50',
    ]
    for pattern in patterns:
        match = re.search(pattern, evaluation_text, re.IGNORECASE)
        if match:
            score = int(match.group(1))
            if 0 <= score <= 50:
                return score
    return None


def analyze_hr_performance(evaluation_text):
    """Analyze evaluation text to assign a reasonable default score for HR round"""
    text_lower = evaluation_text.lower()
    positive_words = ['excellent', 'exceptional', 'strong', 'proficient', 'impressive', 'demonstrates', 'clear', 'confident', 'well']
    negative_words = ['weak', 'unclear', 'incomplete', 'missing', 'poor', 'limited', 'lacks', 'needs improvement']
    positive_count = sum(1 for word in positive_words if word in text_lower)
    negative_count = sum(1 for word in negative_words if word in text_lower)
    if positive_count > negative_count * 2:
        return 42
    elif positive_count > negative_count:
        return 35
    else:
        return 28


def format_hr_evaluation(evaluation_text):
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
        default_score = analyze_hr_performance(evaluation_text)
        formatted_mark = f"FINAL MARK: {default_score} out of 50"
        evaluation_text += f'\n\n{formatted_mark}'
    return evaluation_text


def clean_response(response):
    """Clean response while preserving important formatting like marks"""
    cleaned = re.sub(r'\*\*|\*(?!\s*out\s*of)|\#', '', response)
    cleaned = re.sub(r'_(?!.*out.*of)', '', cleaned)
    return cleaned.strip()


def _generate_hr_evaluation(memory):
    """Generate HR behavioral evaluation with guaranteed mark display"""
    history = memory.buffer_as_str
    if not history.strip():
        return {"evaluation": "No answers provided. No evaluation possible.\n\nFINAL MARK: 0 out of 50", "status": "evaluation"}
    try:
        evaluation_chain = LLMChain(llm=llm, prompt=hr_evaluation_prompt)
        evaluation = evaluation_chain.run(history=history)
        cleaned_evaluation = clean_response(evaluation)
        formatted_evaluation = format_hr_evaluation(cleaned_evaluation)

        # Cleanup session data
        session_id = session.get('hr_session_id')
        if session_id and session_id in hr_memory_store:
            del hr_memory_store[session_id]
            logger.info(f"HR memory cleared for session {session_id}")
        
        logger.info("HR evaluation generated successfully with mark")
        return {"evaluation": formatted_evaluation, "status": "evaluation"}
    except Exception as e:
        logger.error(f"Error generating HR evaluation: {str(e)}")
        return {"evaluation": f"Error generating evaluation: {str(e)}\n\nFINAL MARK: 0 out of 50", "status": "evaluation"}


# === API ROUTES ===

@hrround_bp.route('/api/start', methods=['GET'])
def start_hr_interview():
    try:
        memory = get_hr_memory()
        session['hr_question_count'] = 0
        history = memory.buffer_as_str
        question = LLMChain(llm=llm, prompt=hr_intro_prompt).run(history=history)
        memory.save_context({"input": question}, {"output": ""})
        logger.info("HR interview started with intro question")
        return jsonify({"question": clean_response(question), "status": "hr_intro", "question_number": 1})
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

        memory = get_hr_memory()
        question_count = session.get('hr_question_count', 0)
        history = memory.buffer_as_str
        last_question = history.split('Assistant:')[-2].split('Human:')[0].strip() if 'Assistant:' in history else ""
        memory.save_context({"input": last_question}, {"output": user_answer})
        question_count += 1
        session['hr_question_count'] = question_count

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
            question = LLMChain(llm=llm, prompt=prompt).run(history=memory.buffer_as_str)
            memory.save_context({"input": question}, {"output": ""})
            logger.debug(f"Generated HR question {question_count + 1}: {question}")
            return jsonify({"question": clean_response(question), "status": status, "question_number": question_count + 1})
        else:
            # After 6 questions, generate evaluation
            logger.info("Generating HR behavioral evaluation")
            return jsonify(_generate_hr_evaluation(memory))

    except Exception as e:
        logger.error(f"Error in HR /api/submit: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@hrround_bp.route('/api/finish', methods=['POST'])
def finish_hr_interview():
    try:
        logger.info("User requested to finish HR interview early")
        memory = get_hr_memory()
        user_answer = request.json.get('answer', '')
        if user_answer.strip():
            history = memory.buffer_as_str
            last_question = history.split('Assistant:')[-2].split('Human:')[0].strip() if 'Assistant:' in history else ""
            memory.save_context({"input": last_question}, {"output": user_answer})
            logger.debug("Saved final HR answer before evaluation")
        return jsonify(_generate_hr_evaluation(memory))
    except Exception as e:
        logger.error(f"Error in HR /api/finish: {str(e)}", exc_info=True)
        return jsonify({"error": str(e)}), 500


@hrround_bp.route('/api/reset-session', methods=['POST'])
def reset_hr_session():
    """Reset current HR session data"""
    try:
        session_id = session.get('hr_session_id')
        if session_id and session_id in hr_memory_store:
            del hr_memory_store[session_id]
        logger.info("HR session reset successfully")
        return jsonify({"status": "HR session reset successfully"}), 200
    except Exception as e:
        logger.error(f"Error in HR /api/reset-session: {str(e)}")
        return jsonify({"error": str(e)}), 500


@hrround_bp.route('/api/health', methods=['GET'])
def hr_health_check():
    """Health check endpoint for HR round"""
    return jsonify({
        "status": "healthy",
        "agent": "HR Behavioral Interview",
        "groq_connected": bool(GROQ_API_KEY),
        "active_sessions": len(hr_memory_store)
    }), 200
