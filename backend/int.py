# Requirements: pip install flask langchain langgraph langchain-groq langchain-community pypdf unstructured[pdf]

import os
import json
from typing import TypedDict, Annotated, List
from flask import Flask, request, render_template_string, session, jsonify
from langchain_groq import ChatGroq
from langchain_core.messages import HumanMessage, AIMessage, BaseMessage
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser, JsonOutputParser
from pypdf import PdfReader
from langgraph.graph import StateGraph, END
from langgraph.checkpoint.memory import MemorySaver
from operator import add

# Set your Groq API key
os.environ["GROQ_API_KEY"] = "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"  # Replace with actual key

app = Flask(__name__)
app.secret_key = 'your_secret_key_here'  # Replace with secure key

# Initialize LLM
llm = ChatGroq(model="llama-3.3-70b-versatile", temperature=0.1)

# State definition for multi-agent workflow
class AgentState(TypedDict):
    resume_text: str
    extracts: dict  # {'skills': [...], 'education': [...], etc.}
    questions_asked: Annotated[List[str], add]
    answers: Annotated[List[str], add]
    scores: Annotated[List[float], add]
    total_score: float
    messages: Annotated[List[BaseMessage], add]  # Conversation memory
    current_question: str
    step: str  # 'extract', 'extracted', 'ask_question', 'waiting_for_answer', 'evaluated', 'done'
    user_input: str  # To hold user answer temporarily

# Multi-Agent Nodes

# Agent 1: Extractor Agent
def extractor_agent(state: AgentState) -> AgentState:
    resume_text = state["resume_text"]

    extract_prompt = ChatPromptTemplate.from_template("""
    As the Extractor Agent, extract key sections from the resume:
    - Skills: list of technical and soft skills
    - Education: degrees, institutions, graduation years
    - Projects: project names with brief descriptions
    - Experience: job titles, companies, durations, key responsibilities
    - Achievements: quantifiable accomplishments

    Resume text: {resume_text}

    Respond with valid JSON only.
    """)

    chain = extract_prompt | llm | JsonOutputParser()
    extracts = chain.invoke({"resume_text": resume_text})
    
    return {
        **state,
        "extracts": extracts,
        "step": "extracted",
        "messages": state["messages"] + [AIMessage(content=f"Extraction complete: {json.dumps(extracts)}")]
    }

# Agent 2: Questioner Agent (uses memory for in-depth questions)
def questioner_agent(state: AgentState) -> AgentState:
    num_asked = len(state["questions_asked"])
    if num_asked >= 10:
        return {**state, "step": "done"}

    # Use conversation history for context
    question_prompt = ChatPromptTemplate.from_template("""
    You are the Questioner Agent. Generate in-depth, follow-up questions based on resume extracts and previous Q&A.
    Probe deeper into skills, education, projects, experience, achievements. Make questions behavioral or technical.
    Use history to avoid repetition and build on prior answers.

    Extracts: {extracts}
    History: {history}
    Previous questions: {questions_asked}

    Generate question {num}/10.
    """)

    # Summarize history
    history_summary = "\n".join([f"Q: {q}\nA: {a}" for q, a in zip(state["questions_asked"], state["answers"])])

    chain = question_prompt | llm | StrOutputParser()
    question = chain.invoke({
        "extracts": json.dumps(state["extracts"]),
        "history": history_summary,
        "questions_asked": state["questions_asked"],
        "num": num_asked + 1
    })

    return {
        **state,
        "current_question": question,
        "step": "waiting_for_answer",
        "messages": state["messages"] + [AIMessage(content=f"Generated question: {question}")]
    }

# Agent 3: Evaluator Agent
def evaluator_agent(state: AgentState) -> AgentState:
    user_answer = state.get("user_input", "No answer provided")

    eval_prompt = ChatPromptTemplate.from_template("""
    As the Evaluator Agent, score the user's answer (0-10) based on relevance, depth, and alignment with resume.
    Provide brief feedback.

    Question: {question}
    Answer: {answer}
    Extracts: {extracts}

    Output: Score: X
    Feedback: Y
    """)

    chain = eval_prompt | llm | StrOutputParser()
    eval_output = chain.invoke({
        "question": state["current_question"],
        "answer": user_answer,
        "extracts": json.dumps(state["extracts"])
    })

    # Parse
    score_line = [line for line in eval_output.split("\n") if "Score:" in line]
    feedback_line = [line for line in eval_output.split("\n") if "Feedback:" in line]
    score = float(score_line[0].split(":")[1].strip()) if score_line else 0.0
    feedback = feedback_line[0].split(":")[1].strip() if feedback_line else "No feedback"

    total_score = state.get("total_score", 0) + score

    return {
        **state,
        "questions_asked": state["questions_asked"] + [state["current_question"]],
        "answers": state["answers"] + [user_answer],
        "scores": state["scores"] + [score],
        "total_score": total_score,
        "step": "evaluated",
        "messages": state["messages"] + [
            HumanMessage(content=user_answer),
            AIMessage(content=f"Evaluation: Score {score}/10 - {feedback}")
        ],
        "user_input": None,  # Clear
        "current_question": ""  # Clear for next
    }

# Supervisor Node (router - no state change)
def supervisor_node(state: AgentState) -> dict:
    return {}  # No change, routing handled by conditional

# Routing function for conditional edges
def route_supervisor(state: AgentState) -> str:
    if state["step"] == "extract":
        return "extractor"
    elif state["step"] == "ask_question":
        return "questioner"
    elif state["step"] == "waiting_for_answer" and state.get("user_input"):
        return "evaluator"
    elif state["step"] == "done":
        return END
    else:
        return END  # extracted, evaluated, waiting without input -> end

# Build the multi-agent graph
workflow = StateGraph(AgentState)

# Add nodes
workflow.add_node("supervisor", supervisor_node)
workflow.add_node("extractor", extractor_agent)
workflow.add_node("questioner", questioner_agent)
workflow.add_node("evaluator", evaluator_agent)

# Set entry point
workflow.set_entry_point("supervisor")

# Conditional from supervisor
workflow.add_conditional_edges(
    "supervisor",
    route_supervisor,
    {
        "extractor": "extractor",
        "questioner": "questioner",
        "evaluator": "evaluator",
        END: END
    }
)

# Edges back to supervisor
workflow.add_edge("extractor", "supervisor")
workflow.add_edge("questioner", "supervisor")
workflow.add_edge("evaluator", "supervisor")

# Compile with memory
memory = MemorySaver()
app_graph = workflow.compile(checkpointer=memory)

# Flask Routes

# Home/Upload
@app.route('/', methods=['GET', 'POST'])
def upload_resume():
    if request.method == 'POST':
        if 'resume' not in request.files:
            return jsonify({"error": "No file uploaded"}), 400
        file = request.files['resume']
        if file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        if file and file.filename.endswith('.pdf'):
            # Read PDF directly from bytes
            file.seek(0)
            reader = PdfReader(file.stream)
            resume_text = ""
            for page in reader.pages:
                resume_text += page.extract_text() + "\n"
            
            # Start workflow for extraction only
            initial_state = {
                "resume_text": resume_text,
                "extracts": {},
                "questions_asked": [],
                "answers": [],
                "scores": [],
                "total_score": 0.0,
                "messages": [],
                "current_question": "",
                "step": "extract",
                "user_input": None
            }
            thread_id = f"user_session_{hash(resume_text) % 10000}"  # Simple unique ID
            config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 50}
            
            # Run extraction
            result = app_graph.invoke(initial_state, config)
            
            session['thread_id'] = thread_id
            
            return jsonify({"status": "extraction_complete", "extracts": result['extracts']})
        return jsonify({"error": "Invalid file type"}), 400
    return '''
    <!doctype html>
    <title>Resume Interview Agent</title>
    <h1>Upload Resume</h1>
    <form method=post enctype=multipart/form-data>
      <input type=file name=resume accept=".pdf">
      <input type=submit value=Upload>
    </form>
    '''

# Get current question
@app.route('/question', methods=['GET'])
def get_question():
    thread_id = session.get('thread_id')
    if not thread_id:
        return jsonify({"error": "No session"}), 401
    
    config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 50}
    
    # Get current state
    state = app_graph.get_state(config).values
    if state.get("step") == "done":
        return jsonify({"done": True, "final_score": state.get("total_score", 0)})
    
    question = state.get("current_question", "")
    if not question or state.get("step") in ["extracted", "evaluated"]:
        # Generate next
        input_state = {"step": "ask_question"}
        app_graph.invoke(input_state, config)
        state = app_graph.get_state(config).values
        question = state.get("current_question", "Ready for next question")
    
    return jsonify({"question": question})

# Submit answer
@app.route('/answer', methods=['POST'])
def submit_answer():
    thread_id = session.get('thread_id')
    if not thread_id:
        return jsonify({"error": "No session"}), 401
    
    user_answer = request.json.get('answer', '')
    if not user_answer:
        return jsonify({"error": "No answer provided"}), 400
    
    config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 50}
    
    # Get current state to ensure waiting
    current_state = app_graph.get_state(config).values
    if current_state.get("step") != "waiting_for_answer":
        return jsonify({"error": "Not waiting for answer"}), 400
    
    # Proceed with user input (evaluator only)
    input_state = {"user_input": user_answer}
    result = app_graph.invoke(input_state, config)
    
    # Extract last score
    last_score = result["scores"][-1] if result["scores"] else 0
    
    return jsonify({
        "score": last_score,
        "feedback": "Evaluated successfully",
        "total_score": result["total_score"],
        "next_ready": len(result["questions_asked"]) < 10
    })

# Final results
@app.route('/results')
def results():
    thread_id = session.get('thread_id')
    if not thread_id:
        return jsonify({"error": "No session"}), 401
    
    config = {"configurable": {"thread_id": thread_id}, "recursion_limit": 50}
    state = app_graph.get_state(config).values
    
    if state.get("step") != "done":
        # Force generate last if needed, but assume done
        pass
    
    return jsonify({
        "total_score": state.get("total_score", 0),
        "questions": state.get("questions_asked", []),
        "answers": state.get("answers", []),
        "scores": state.get("scores", [])
    })

if __name__ == '__main__':
    app.run(debug=True)