import os
import tempfile
from flask import Flask, request, jsonify
from flask_cors import CORS
import fitz
from typing import TypedDict, List, Dict
from langgraph.graph import StateGraph, START, END
from langgraph.checkpoint.memory import MemorySaver
from groq import Groq
import json

app = Flask(__name__)
CORS(app)

# Initialize Groq client
groq_client = Groq(api_key="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")

# Define the state structure
class InterviewState(TypedDict):
    resume_text: str
    current_stage: str
    stage_index: int
    questions: List[Dict]
    candidate_answers: List[Dict]
    follow_ups: List[Dict]
    projects: List[str]
    tech_stack: List[str]
    achievements: List[str]
    current_question_index: int
    conversation_history: List[Dict]
    awaiting_followup: bool

# Memory saver for checkpointing
memory = MemorySaver()
SESSION_STORE: Dict[str, InterviewState] = {}

def extract_text_from_pdf(pdf_path):
    """Extract text from PDF using PyMuPDF (fitz)"""
    doc = fitz.open(pdf_path)
    text = ""
    for page in doc:
        text += page.get_text()
    doc.close()
    return text

def call_groq_model(prompt, temperature=1.0):
    """Call Groq model and return response"""
    response = groq_client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",
        messages=[{"role": "user", "content": prompt}],
        temperature=temperature,
        max_tokens=1024
    )
    return response.choices[0].message.content

def extract_resume_info(state: InterviewState) -> InterviewState:
    """Extract key information from resume"""
    resume_text = state["resume_text"]
    
    prompt = f"""Analyze this resume and extract:
1. List of projects (titles and brief descriptions)
2. Tech stack (languages, frameworks, tools)
3. Achievements and certifications

Resume:
{resume_text}

Return in this exact JSON format:
{{
    "projects": ["project1", "project2"],
    "tech_stack": ["tech1", "tech2"],
    "achievements": ["achievement1", "achievement2"]
}}
"""
    
    response = call_groq_model(prompt, temperature=0.7)
    
    # Parse JSON response
    try:
        data = json.loads(response)
        state["projects"] = data.get("projects", [])
        state["tech_stack"] = data.get("tech_stack", [])
        state["achievements"] = data.get("achievements", [])
    except:
        # Fallback parsing
        state["projects"] = []
        state["tech_stack"] = []
        state["achievements"] = []
        
        current_section = None
        for line in response.split('\n'):
            line = line.strip()
            if 'projects' in line.lower() and '[' in line:
                current_section = 'projects'
            elif 'tech_stack' in line.lower() and '[' in line:
                current_section = 'tech_stack'
            elif 'achievements' in line.lower() and '[' in line:
                current_section = 'achievements'
            elif line.startswith('"') or line.startswith('-'):
                item = line.strip('",-[]').strip()
                if item and current_section:
                    if current_section == 'projects':
                        state["projects"].append(item)
                    elif current_section == 'tech_stack':
                        state["tech_stack"].append(item)
                    elif current_section == 'achievements':
                        state["achievements"].append(item)
    
    state["questions"] = []
    state["candidate_answers"] = []
    state["follow_ups"] = []
    state["current_question_index"] = 0
    state["conversation_history"] = []
    state["awaiting_followup"] = False
    
    return state

def generate_self_intro_question(state: InterviewState) -> InterviewState:
    """Generate self-introduction question"""
    state["current_stage"] = "self_introduction"
    state["stage_index"] = 0
    
    question = {
        "stage": "self_introduction",
        "question": "Please provide a brief self-introduction, highlighting your background, education, and what motivates you in your career.",
        "type": "general",
        "question_id": 0
    }
    
    state["questions"].append(question)
    
    return state

def generate_project_questions(state: InterviewState) -> InterviewState:
    """Generate 5 technical questions based on projects"""
    state["current_stage"] = "projects"
    state["stage_index"] = 1
    
    projects_text = "\n".join(state["projects"]) if state["projects"] else "No specific projects listed"
    
    prompt = f"""Based on these projects from the candidate's resume, generate exactly 5 detailed technical questions that probe deep into their experience, implementation details, challenges faced, and technical decisions.

Projects:
{projects_text}

Generate exactly 5 questions. Each question should be:
- Specific and technical
- Require detailed explanations
- Focus on implementation, architecture, or problem-solving

Return only the questions, one per line, numbered 1-5."""
    
    response = call_groq_model(prompt, temperature=0.8)
    
    lines = response.split('\n')
    question_count = len(state["questions"])
    
    for line in lines:
        line = line.strip()
        if line and (line[0].isdigit() or line.startswith('Q') or line.startswith('-')):
            # Clean the question
            question_text = line.lstrip('0123456789.-)Q: ').strip()
            if question_text and len(question_text) > 10:
                state["questions"].append({
                    "stage": "projects",
                    "question": question_text,
                    "type": "technical",
                    "question_id": question_count
                })
                question_count += 1
                if question_count >= 6:  # 1 intro + 5 project questions
                    break
    
    return state

def generate_core_concepts_questions(state: InterviewState) -> InterviewState:
    """Generate 5 questions from core CS subjects"""
    state["current_stage"] = "core_concepts"
    state["stage_index"] = 2
    
    subjects = ["Computer Organization", "DBMS", "Operating Systems", "Computer Networks"]
    
    prompt = f"""Generate exactly 5 conceptual questions covering these core CS subjects: {', '.join(subjects)}.

Requirements:
- Mix different subjects (at least one from each if possible)
- Each question should test fundamental understanding
- Questions should be clear and specific
- Focus on concepts, not just definitions

Return only the questions, one per line, numbered 1-5."""
    
    response = call_groq_model(prompt, temperature=0.7)
    
    lines = response.split('\n')
    question_count = len(state["questions"])
    
    for line in lines:
        line = line.strip()
        if line and (line[0].isdigit() or line.startswith('Q') or line.startswith('-')):
            question_text = line.lstrip('0123456789.-)Q: ').strip()
            if question_text and len(question_text) > 10:
                state["questions"].append({
                    "stage": "core_concepts",
                    "question": question_text,
                    "type": "conceptual",
                    "question_id": question_count
                })
                question_count += 1
                if question_count >= 11:  # 1 intro + 5 projects + 5 core
                    break
    
    return state

def generate_tech_stack_questions(state: InterviewState) -> InterviewState:
    """Generate 5 questions about tech stack"""
    state["current_stage"] = "tech_stack"
    state["stage_index"] = 3
    
    tech_text = "\n".join(state["tech_stack"]) if state["tech_stack"] else "General programming technologies"
    
    prompt = f"""Based on this tech stack from the candidate's resume, generate exactly 5 technical questions about their knowledge and experience with these technologies.

Tech Stack:
{tech_text}

Generate questions that assess:
- Practical experience and real-world usage
- Best practices and design patterns
- Problem-solving with these technologies
- Performance optimization or advanced features

Return only the questions, one per line, numbered 1-5."""
    
    response = call_groq_model(prompt, temperature=0.8)
    
    lines = response.split('\n')
    question_count = len(state["questions"])
    
    for line in lines:
        line = line.strip()
        if line and (line[0].isdigit() or line.startswith('Q') or line.startswith('-')):
            question_text = line.lstrip('0123456789.-)Q: ').strip()
            if question_text and len(question_text) > 10:
                state["questions"].append({
                    "stage": "tech_stack",
                    "question": question_text,
                    "type": "technical",
                    "question_id": question_count
                })
                question_count += 1
                if question_count >= 16:  # 1+5+5+5
                    break
    
    return state

def generate_achievements_questions(state: InterviewState) -> InterviewState:
    """Generate 3 questions about achievements linking to projects/tech"""
    state["current_stage"] = "achievements"
    state["stage_index"] = 4
    
    achievements_text = "\n".join(state["achievements"]) if state["achievements"] else "General achievements"
    projects_text = "\n".join(state["projects"][:3]) if state["projects"] else "their projects"
    tech_text = "\n".join(state["tech_stack"][:5]) if state["tech_stack"] else "their technical skills"
    
    prompt = f"""Based on these achievements, generate exactly 3 questions that link achievements to projects or technologies.

Achievements:
{achievements_text}

Projects Context:
{projects_text}

Tech Stack Context:
{tech_text}

Generate questions that:
- Connect achievements to specific projects or technologies
- Ask about the impact, metrics, and learning outcomes
- Probe deeper into the accomplishments

Return only the questions, one per line, numbered 1-3."""
    
    response = call_groq_model(prompt, temperature=0.8)
    
    lines = response.split('\n')
    question_count = len(state["questions"])
    
    for line in lines:
        line = line.strip()
        if line and (line[0].isdigit() or line.startswith('Q') or line.startswith('-')):
            question_text = line.lstrip('0123456789.-)Q: ').strip()
            if question_text and len(question_text) > 10:
                state["questions"].append({
                    "stage": "achievements",
                    "question": question_text,
                    "type": "achievement",
                    "question_id": question_count
                })
                question_count += 1
                if question_count >= 19:  # 1+5+5+5+3
                    break
    
    return state

def generate_followup_question(state: InterviewState) -> InterviewState:
    """Generate a follow-up question based on candidate's answer"""
    if not state["candidate_answers"]:
        return state
    
    last_answer = state["candidate_answers"][-1]
    original_question = last_answer["question"]
    answer_text = last_answer["answer"]
    
    prompt = f"""Based on this interview question and the candidate's answer, generate ONE insightful follow-up question that:
- Probes deeper into their answer
- Clarifies technical details or decisions
- Explores edge cases or challenges they might have faced
- Tests their deeper understanding

Original Question: {original_question}

Candidate's Answer: {answer_text}

Generate only ONE follow-up question, no numbering or formatting."""
    
    response = call_groq_model(prompt, temperature=0.9)
    
    # Clean the response
    followup_text = response.strip().lstrip('0123456789.-)Q: ').strip()
    
    followup = {
        "original_question_id": last_answer["question_id"],
        "followup_question": followup_text,
        "stage": state["current_stage"]
    }
    
    state["follow_ups"].append(followup)
    state["awaiting_followup"] = True
    
    return state

# Build the workflow graph using StateGraph
def build_interview_graph():
    # Create StateGraph with state schema
    workflow = StateGraph(InterviewState)
    
    # Add nodes for each stage
    workflow.add_node("extract_info", extract_resume_info)
    workflow.add_node("self_intro", generate_self_intro_question)
    workflow.add_node("projects", generate_project_questions)
    workflow.add_node("core_concepts", generate_core_concepts_questions)
    workflow.add_node("tech_stack", generate_tech_stack_questions)
    workflow.add_node("achievements", generate_achievements_questions)
    
    # Define edges between nodes
    workflow.add_edge(START, "extract_info")
    workflow.add_edge("extract_info", "self_intro")
    workflow.add_edge("self_intro", "projects")
    workflow.add_edge("projects", "core_concepts")
    workflow.add_edge("core_concepts", "tech_stack")
    workflow.add_edge("tech_stack", "achievements")
    workflow.add_edge("achievements", END)
    
    # Compile with memory checkpointer
    return workflow.compile(checkpointer=memory)

# Initialize the graph
interview_graph = build_interview_graph()

# Flask routes
@app.route('/upload_resume', methods=['POST'])
def upload_resume():
    """Upload and process resume"""
    try:
        if 'file' not in request.files:
            return jsonify({"error": "No file provided"}), 400
        
        file = request.files['file']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        # Save temporarily in cross-platform temp directory
        temp_dir = tempfile.gettempdir()
        temp_path = os.path.join(temp_dir, file.filename)
        file.save(temp_path)
        
        # Extract text using PyMuPDF
        resume_text = extract_text_from_pdf(temp_path)
        
        # Clean up temp file
        os.remove(temp_path)
        
        # Initialize state
        initial_state = {
            "resume_text": resume_text,
            "current_stage": "",
            "stage_index": 0,
            "questions": [],
            "candidate_answers": [],
            "follow_ups": [],
            "projects": [],
            "tech_stack": [],
            "achievements": [],
            "current_question_index": 0,
            "conversation_history": [],
            "awaiting_followup": False
        }
        
        # Run the graph
        config = {"configurable": {"thread_id": "interview_session_1"}}
        result = interview_graph.invoke(initial_state, config)
        
        # Persist state explicitly (in case checkpointer retrieval differs)
        try:
            memory.put(config, result)
        except Exception:
            pass
        SESSION_STORE["interview_session_1"] = result
        
        return jsonify({
            "message": "Resume processed successfully",
            "session_id": "interview_session_1",
            "total_questions": len(result["questions"]),
            "extracted_info": {
                "projects": result["projects"],
                "tech_stack": result["tech_stack"],
                "achievements": result["achievements"]
            },
            "first_question": result["questions"][0] if result["questions"] else None
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_question', methods=['GET'])
def get_question():
    """Get current question"""
    try:
        session_id = request.args.get('session_id', 'interview_session_1')
        config = {"configurable": {"thread_id": session_id}}
        
        # Get current state from memory with fallback
        state = memory.get(config)
        if not state:
            state = SESSION_STORE.get(session_id)
        
        if not state or not state.get("questions"):
            return jsonify({"error": "No active session or questions"}), 404
        
        current_idx = state.get("current_question_index", 0)
        
        if current_idx >= len(state["questions"]):
            return jsonify({
                "message": "Interview completed",
                "completed": True,
                "total_answered": len(state["candidate_answers"])
            }), 200
        
        current_question = state["questions"][current_idx]
        
        return jsonify({
            "question": current_question,
            "question_number": current_idx + 1,
            "total_questions": len(state["questions"]),
            "stage": current_question["stage"]
        }), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/submit_answer', methods=['POST'])
def submit_answer():
    """Submit answer and get follow-up question"""
    try:
        data = request.json
        session_id = data.get('session_id', 'interview_session_1')
        answer = data.get('answer')
        
        if not answer:
            return jsonify({"error": "Answer is required"}), 400
        
        config = {"configurable": {"thread_id": session_id}}
        state = memory.get(config)
        if not state:
            state = SESSION_STORE.get(session_id)
        
        if not state:
            return jsonify({"error": "Session not found"}), 404
        
        # Validate questions availability
        questions = state.get("questions") or []
        current_idx = state.get("current_question_index", 0) or 0
        
        if not isinstance(current_idx, int):
            try:
                current_idx = int(current_idx)
            except Exception:
                current_idx = 0
        
        if not questions:
            return jsonify({"error": "No questions available in the session"}), 400
        
        if current_idx >= len(questions):
            return jsonify({
                "message": "Interview completed",
                "completed": True
            }), 200
        
        current_question = questions[current_idx]
        
        # Check if we're answering a follow-up
        if state.get("awaiting_followup"):
            # Store follow-up answer
            state["follow_ups"][-1]["answer"] = answer
            state["awaiting_followup"] = False
            state["current_question_index"] += 1
            memory.put(config, state)
            SESSION_STORE[session_id] = state
            
            # Get next main question
            if state["current_question_index"] < len(state["questions"]):
                next_question = state["questions"][state["current_question_index"]]
                return jsonify({
                    "message": "Follow-up answer recorded",
                    "next_question": next_question,
                    "question_number": state["current_question_index"] + 1,
                    "total_questions": len(state["questions"])
                }), 200
            else:
                return jsonify({
                    "message": "Interview completed",
                    "completed": True
                }), 200
        
        # Store main answer
        answer_record = {
            "question_id": current_question["question_id"],
            "question": current_question["question"],
            "answer": answer,
            "stage": current_question["stage"]
        }
        state["candidate_answers"].append(answer_record)
        
        # Add to conversation history
        state["conversation_history"].append({
            "role": "interviewer",
            "content": current_question["question"]
        })
        state["conversation_history"].append({
            "role": "candidate",
            "content": answer
        })
        
        # Generate follow-up question safely
        try:
            state = generate_followup_question(state)
        except Exception as gen_err:
            return jsonify({"error": f"Failed to generate follow-up: {gen_err}"}), 500
        memory.put(config, state)
        SESSION_STORE[session_id] = state
        
        if state["awaiting_followup"]:
            followup = state["follow_ups"][-1]
            return jsonify({
                "message": "Answer recorded",
                "followup_question": followup["followup_question"],
                "is_followup": True,
                "stage": followup["stage"]
            }), 200
        else:
            return jsonify({"error": "Failed to generate follow-up"}), 500
            
    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/get_summary', methods=['GET'])
def get_summary():
    """Get interview summary"""
    try:
        session_id = request.args.get('session_id', 'interview_session_1')
        config = {"configurable": {"thread_id": session_id}}
        state = memory.get(config)
        if not state:
            state = SESSION_STORE.get(session_id)
        
        if not state:
            return jsonify({"error": "Session not found"}), 404
        
        summary = {
            "total_questions": len(state["questions"]),
            "answered_questions": len(state["candidate_answers"]),
            "followup_questions": len(state["follow_ups"]),
            "stages_completed": state["stage_index"] + 1,
            "conversation_history": state["conversation_history"],
            "extracted_info": {
                "projects": state["projects"],
                "tech_stack": state["tech_stack"],
                "achievements": state["achievements"]
            }
        }
        
        return jsonify(summary), 200
        
    except Exception as e:
        return jsonify({"error": str(e)}), 500

if __name__ == '__main__':
    app.run(host='0.0.0.0', port=8000, debug=True)