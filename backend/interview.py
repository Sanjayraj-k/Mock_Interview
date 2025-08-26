from flask import Flask, request, jsonify
from flask_cors import CORS
import os
import uuid
import json
from datetime import datetime
from typing import Dict, List, Any, TypedDict
from langchain_groq import ChatGroq
from langchain.prompts import PromptTemplate
from langchain.schema import HumanMessage, SystemMessage
from langgraph.graph import StateGraph, END
import logging

# Configure logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

app = Flask(__name__)
CORS(app)  # Enable CORS for all routes

# In-memory storage for interview sessions (use Redis/Database in production)
interview_sessions = {}

class InterviewState(TypedDict):
    resume_text: str
    extracted_content: Dict[str, Any]
    current_question_number: int
    questions: List[str]
    answers: List[str]
    evaluations: List[Dict[str, Any]]
    final_score: float
    conversation_history: List[Dict[str, str]]
    session_id: str
    created_at: str
    status: str  # 'active', 'completed', 'error'

class ResumeInterviewSystem:
    def __init__(self, groq_api_key: str):
        try:
            self.llm = ChatGroq(
                groq_api_key=groq_api_key,
                model_name="llama3-70b-8192",
                temperature=0.3
            )
            self.workflow = StateGraph(InterviewState)
            self._setup_workflow()
            logger.info("ResumeInterviewSystem initialized successfully")
        except Exception as e:
            logger.error(f"Failed to initialize ResumeInterviewSystem: {e}")
            raise
    
    def _setup_workflow(self):
        """Set up the LangGraph workflow"""
        self.workflow.add_node("extract_resume", self.extract_resume_content)
        self.workflow.add_node("generate_question", self.generate_question)
        self.workflow.add_node("evaluate_response", self.evaluate_response)
        self.workflow.add_node("finalize_score", self.calculate_final_score)
        
        self.workflow.set_entry_point("extract_resume")
        
        self.workflow.add_edge("extract_resume", "generate_question")
        self.workflow.add_conditional_edges(
            "generate_question",
            self.should_continue_questions,
            {
                "continue": "evaluate_response",
                "finish": "finalize_score"
            }
        )
        self.workflow.add_edge("evaluate_response", "generate_question")
        self.workflow.add_edge("finalize_score", END)
        
        self.app = self.workflow.compile()
        graph=self()
    
    def extract_resume_content(self, state: InterviewState) -> InterviewState:
        """Agent 1: Extract resume content"""
        extraction_prompt = PromptTemplate(
            input_variables=["resume_text"],
            template="""
            Extract the following information from the resume:
            
            Resume: {resume_text}
            
            Please extract and structure the following information in JSON format:
            {{
                "projects": ["list of projects with brief descriptions"],
                "skills": ["list of technical and soft skills"],
                "experience": ["list of work experiences with company, role, duration"],
                "achievements": ["list of notable achievements and accomplishments"],
                "education": ["educational background"],
                "summary": "brief professional summary"
            }}
            
            Return only the JSON object, no additional text.
            """
        )
        
        try:
            response = self.llm.invoke([
                HumanMessage(content=extraction_prompt.format(resume_text=state["resume_text"]))
            ])
            
            extracted_content = json.loads(response.content)
            state["extracted_content"] = extracted_content
            state["current_question_number"] = 0
            state["questions"] = []
            state["answers"] = []
            state["evaluations"] = []
            state["conversation_history"] = []
            state["status"] = "active"
            
            logger.info(f"Resume extraction completed for session {state.get('session_id')}")
            return state
            
        except Exception as e:
            logger.error(f"Error in resume extraction: {e}")
            state["extracted_content"] = {
                "projects": ["Unable to extract projects"],
                "skills": ["Unable to extract skills"],
                "experience": ["Unable to extract experience"],
                "achievements": ["Unable to extract achievements"],
                "education": ["Unable to extract education"],
                "summary": "Unable to extract summary"
            }
            state["status"] = "error"
            return state
    
    def generate_question(self, state: InterviewState) -> InterviewState:
        """Agent 2: Generate interview questions"""
        current_q_num = state["current_question_number"]
        
        try:
            if current_q_num == 0:
                question = "Please introduce yourself and tell me about your background."
            else:
                question_prompt = PromptTemplate(
                    input_variables=["extracted_content", "previous_qa", "question_number"],
                    template="""
                    Based on the extracted resume content and previous interview responses, generate the next interview question.
                    
                    Resume Content: {extracted_content}
                    
                    Previous Q&A: {previous_qa}
                    
                    Current Question Number: {question_number}
                    
                    Generate a relevant, insightful question that:
                    1. Explores the candidate's experience, skills, or projects
                    2. Builds upon previous responses if applicable
                    3. Is appropriate for question #{question_number} of 5
                    4. Tests technical knowledge, problem-solving, or behavioral aspects
                    
                    Return only the question, no additional text.
                    """
                )
                
                previous_qa = ""
                for i, (q, a) in enumerate(zip(state["questions"], state["answers"])):
                    previous_qa += f"Q{i+1}: {q}\nA{i+1}: {a}\n\n"
                
                response = self.llm.invoke([
                    HumanMessage(content=question_prompt.format(
                        extracted_content=json.dumps(state["extracted_content"], indent=2),
                        previous_qa=previous_qa,
                        question_number=current_q_num + 1
                    ))
                ])
                
                question = response.content.strip()
            
            state["questions"].append(question)
            logger.info(f"Generated question {current_q_num + 1} for session {state.get('session_id')}")
            return state
            
        except Exception as e:
            logger.error(f"Error generating question: {e}")
            state["questions"].append("Could you tell me more about your experience?")
            return state
    
    def evaluate_response(self, state: InterviewState) -> InterviewState:
        """Agent 3: Evaluate user responses"""
        current_idx = len(state["answers"]) - 1
        current_question = state["questions"][current_idx]
        current_answer = state["answers"][current_idx]
        
        evaluation_prompt = PromptTemplate(
            input_variables=["question", "answer", "extracted_content", "question_number"],
            template="""
            Evaluate the candidate's response to the interview question.
            
            Question: {question}
            Answer: {answer}
            Question Number: {question_number}
            Resume Content: {extracted_content}
            
            Provide evaluation in the following JSON format:
            {{
                "score": 0.0-10.0,
                "strengths": ["list of strengths in the response"],
                "weaknesses": ["list of areas for improvement"],
                "relevance": 0.0-10.0,
                "clarity": 0.0-10.0,
                "technical_accuracy": 0.0-10.0,
                "overall_feedback": "detailed feedback paragraph"
            }}
            
            Return only the JSON object, no additional text.
            """
        )
        
        try:
            response = self.llm.invoke([
                HumanMessage(content=evaluation_prompt.format(
                    question=current_question,
                    answer=current_answer,
                    extracted_content=json.dumps(state["extracted_content"], indent=2),
                    question_number=current_idx + 1
                ))
            ])
            
            evaluation = json.loads(response.content)
            state["evaluations"].append(evaluation)
            logger.info(f"Evaluated response {current_idx + 1} for session {state.get('session_id')}")
            
        except Exception as e:
            logger.error(f"Error in evaluation: {e}")
            state["evaluations"].append({
                "score": 5.0,
                "strengths": ["Response provided"],
                "weaknesses": ["Could not properly evaluate"],
                "relevance": 5.0,
                "clarity": 5.0,
                "technical_accuracy": 5.0,
                "overall_feedback": "Unable to evaluate response due to processing error."
            })
        
        state["current_question_number"] += 1
        return state
    
    def should_continue_questions(self, state: InterviewState) -> str:
        """Decide whether to continue with more questions or finish"""
        if state["current_question_number"] >= 5:
            return "finish"
        return "continue"
    
    def calculate_final_score(self, state: InterviewState) -> InterviewState:
        """Calculate final interview score"""
        if not state["evaluations"]:
            state["final_score"] = 0.0
            state["status"] = "completed"
            return state
        
        total_score = 0
        total_weight = 0
        
        for i, evaluation in enumerate(state["evaluations"]):
            weight = i + 1
            total_score += evaluation["score"] * weight
            total_weight += weight
        
        state["final_score"] = round(total_score / total_weight, 2) if total_weight > 0 else 0.0
        state["status"] = "completed"
        logger.info(f"Interview completed for session {state.get('session_id')} with final score: {state['final_score']}")
        return state

# Initialize the interview system
GROQ_API_KEY = os.getenv('GROQ_API_KEY')
if not GROQ_API_KEY:
    logger.warning("GROQ_API_KEY not found in environment variables")

try:
    interview_system = ResumeInterviewSystem(GROQ_API_KEY) if GROQ_API_KEY else None
except Exception as e:
    logger.error(f"Failed to initialize interview system: {e}")
    interview_system = None

# API Routes

@app.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        "status": "healthy",
        "timestamp": datetime.now().isoformat(),
        "groq_configured": bool(GROQ_API_KEY),
        "system_ready": bool(interview_system)
    })

@app.route('/interview/start', methods=['POST'])
def start_interview():
    """Start a new interview session"""
    try:
        if not interview_system:
            return jsonify({"error": "Interview system not initialized. Check GROQ_API_KEY."}), 500
        
        data = request.get_json()
        if not data or 'resume_text' not in data:
            return jsonify({"error": "resume_text is required"}), 400
        
        resume_text = data['resume_text'].strip()
        if not resume_text:
            return jsonify({"error": "resume_text cannot be empty"}), 400
        
        # Generate unique session ID
        session_id = str(uuid.uuid4())
        
        # Create initial state
        initial_state = {
            "resume_text": resume_text,
            "extracted_content": {},
            "current_question_number": 0,
            "questions": [],
            "answers": [],
            "evaluations": [],
            "final_score": 0.0,
            "conversation_history": [],
            "session_id": session_id,
            "created_at": datetime.now().isoformat(),
            "status": "initializing"
        }
        
        # Run the workflow to extract resume and generate first question
        result = interview_system.app.invoke(initial_state)
        
        # Store session
        interview_sessions[session_id] = result
        
        # Return session info and first question
        response_data = {
            "session_id": session_id,
            "status": result["status"],
            "extracted_content": result["extracted_content"],
            "current_question": result["questions"][0] if result["questions"] else None,
            "question_number": 1,
            "total_questions": 5
        }
        
        logger.info(f"Started interview session {session_id}")
        return jsonify(response_data), 201
        
    except Exception as e:
        logger.error(f"Error starting interview: {e}")
        return jsonify({"error": "Failed to start interview", "details": str(e)}), 500

@app.route('/interview/<session_id>/answer', methods=['POST'])
def submit_answer(session_id):
    """Submit an answer to the current question"""
    try:
        if session_id not in interview_sessions:
            return jsonify({"error": "Session not found"}), 404
        
        data = request.get_json()
        if not data or 'answer' not in data:
            return jsonify({"error": "answer is required"}), 400
        
        answer = data['answer'].strip()
        if not answer:
            return jsonify({"error": "answer cannot be empty"}), 400
        
        # Get current session state
        current_state = interview_sessions[session_id]
        
        if current_state["status"] == "completed":
            return jsonify({"error": "Interview already completed"}), 400
        
        # Add the user's answer
        current_state["answers"].append(answer)
        
        # Continue the workflow
        result = interview_system.app.invoke(current_state)
        
        # Update session
        interview_sessions[session_id] = result
        
        # Prepare response
        current_question_num = len(result["questions"])
        latest_evaluation = result["evaluations"][-1] if result["evaluations"] else None
        
        response_data = {
            "session_id": session_id,
            "status": result["status"],
            "question_number": current_question_num,
            "total_questions": 5,
            "evaluation": latest_evaluation,
            "next_question": result["questions"][-1] if len(result["questions"]) > len(result["answers"]) else None,
            "final_score": result["final_score"] if result["status"] == "completed" else None,
            "interview_completed": result["status"] == "completed"
        }
        
        logger.info(f"Processed answer for session {session_id}, question {current_question_num}")
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error processing answer for session {session_id}: {e}")
        return jsonify({"error": "Failed to process answer", "details": str(e)}), 500

@app.route('/interview/<session_id>/status', methods=['GET'])
def get_interview_status(session_id):
    """Get current interview status"""
    try:
        if session_id not in interview_sessions:
            return jsonify({"error": "Session not found"}), 404
        
        session = interview_sessions[session_id]
        
        response_data = {
            "session_id": session_id,
            "status": session["status"],
            "created_at": session["created_at"],
            "current_question_number": len(session["questions"]),
            "total_questions": 5,
            "answers_given": len(session["answers"]),
            "current_question": session["questions"][-1] if session["questions"] else None,
            "final_score": session["final_score"] if session["status"] == "completed" else None,
            "extracted_content": session["extracted_content"]
        }
        
        return jsonify(response_data), 200
        
    except Exception as e:
        logger.error(f"Error getting status for session {session_id}: {e}")
        return jsonify({"error": "Failed to get status", "details": str(e)}), 500

@app.route('/interview/<session_id>/summary', methods=['GET'])
def get_interview_summary(session_id):
    """Get complete interview summary"""
    try:
        if session_id not in interview_sessions:
            return jsonify({"error": "Session not found"}), 404
        
        session = interview_sessions[session_id]
        
        # Build Q&A pairs with evaluations
        qa_pairs = []
        for i, (question, answer) in enumerate(zip(session["questions"], session["answers"])):
            evaluation = session["evaluations"][i] if i < len(session["evaluations"]) else None
            qa_pairs.append({
                "question_number": i + 1,
                "question": question,
                "answer": answer,
                "evaluation": evaluation
            })
        
        summary = {
            "session_id": session_id,
            "status": session["status"],
            "created_at": session["created_at"],
            "extracted_resume_content": session["extracted_content"],
            "questions_and_answers": qa_pairs,
            "final_score": session["final_score"],
            "total_questions_asked": len(session["questions"]),
            "total_answers_given": len(session["answers"])
        }
        
        return jsonify(summary), 200
        
    except Exception as e:
        logger.error(f"Error getting summary for session {session_id}: {e}")
        return jsonify({"error": "Failed to get summary", "details": str(e)}), 500

@app.route('/interview/<session_id>', methods=['DELETE'])
def delete_interview_session(session_id):
    """Delete an interview session"""
    try:
        if session_id not in interview_sessions:
            return jsonify({"error": "Session not found"}), 404
        
        del interview_sessions[session_id]
        logger.info(f"Deleted interview session {session_id}")
        
        return jsonify({"message": "Session deleted successfully"}), 200
        
    except Exception as e:
        logger.error(f"Error deleting session {session_id}: {e}")
        return jsonify({"error": "Failed to delete session", "details": str(e)}), 500

@app.route('/interview/sessions', methods=['GET'])
def list_interview_sessions():
    """List all interview sessions"""
    try:
        sessions_list = []
        for session_id, session in interview_sessions.items():
            sessions_list.append({
                "session_id": session_id,
                "status": session["status"],
                "created_at": session["created_at"],
                "questions_asked": len(session["questions"]),
                "answers_given": len(session["answers"]),
                "final_score": session["final_score"] if session["status"] == "completed" else None
            })
        
        return jsonify({
            "sessions": sessions_list,
            "total_sessions": len(sessions_list)
        }), 200
        
    except Exception as e:
        logger.error(f"Error listing sessions: {e}")
        return jsonify({"error": "Failed to list sessions", "details": str(e)}), 500

@app.errorhandler(404)
def not_found(error):
    return jsonify({"error": "Not found"}), 404

@app.errorhandler(500)
def internal_error(error):
    return jsonify({"error": "Internal server error"}), 500

if __name__ == '__main__':
    # Set environment variables if not already set
    if not os.getenv('GROQ_API_KEY'):
        print("Warning: GROQ_API_KEY environment variable not set")
        print("Please set it using: export GROQ_API_KEY='your_api_key_here'")
    
    app.run(debug=True, host='0.0.0.0', port=5001)  # Changed port to 5001