import os
import traceback
from typing import List, TypedDict
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS

# LangChain / LangGraph Imports
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage
from pinecone import Pinecone
from langgraph.graph import StateGraph, END

# Load ENV
load_dotenv()

# Flask Setup
app = Flask(__name__)
CORS(app)

# Environment Variables
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
INDEX_NAME = "portfolio-chatbot"

# Model Config
MODEL_NAME = "llama-3.1-8b-instant"
EMBEDDING_MODEL = "openai/text-embedding-3-small"  # 1536 dim

# Embedding client
embeddings = OpenAIEmbeddings(
    model=EMBEDDING_MODEL,
    openai_api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)

vectorstore = None
agent = None
initialized = False  # for lazy initialization


# ------------------------------------------------------------
#                     LangGraph Logic
# ------------------------------------------------------------
class AgentState(TypedDict):
    messages: List[HumanMessage | AIMessage]


def get_section_from_query(query: str):
    q = query.lower()
    if "project" in q: return "projects"
    if "achievement" in q: return "achievements"
    if "experience" in q or "intern" in q: return "experience"
    if "skill" in q: return "skills"
    if "education" in q: return "education"
    return ""


def validate_query_relevance(state: AgentState):
    """
    Stage 0: Check if the question is relevant to Sanjay K's portfolio
    """
    original_query = state["messages"][-1].content
    query_lower = original_query.lower().strip()
    
    # HARD-CODED FILTERS - Reject immediately without LLM call
    
    # 1. Check for greetings
    greetings = ["hi", "hello", "hey", "good morning", "good evening", "good afternoon", "hola", "namaste", "sup"]
    if any(greeting == query_lower or query_lower.startswith(greeting + " ") for greeting in greetings):
        if len(query_lower) < 20:  # Short greeting
            greeting_message = "Hello! I'm here to help you learn about Sanjay K's portfolio. You can ask me about his:\n- Projects and applications\n- Skills and technologies\n- Education and CGPA\n- Internships and work experience\n- Achievements and certifications\n\nWhat would you like to know?"
            return {"messages": state["messages"] + [AIMessage(content=f"NOT_RELEVANT:{greeting_message}")]}
    
    # 2. Check for math/arithmetic patterns
    math_patterns = [
        "add", "subtract", "multiply", "divide", "what is", "calculate", 
        "+", "-", "*", "/", "=", "solve", "²", "³", "√"
    ]
    # Check if it's a math question (contains numbers AND math operators)
    has_numbers = any(char.isdigit() for char in query_lower)
    has_math_keywords = any(pattern in query_lower for pattern in math_patterns)
    
    if has_numbers and has_math_keywords:
        # Check if it's asking about numeric portfolio data (CGPA, count, etc.)
        portfolio_numeric_keywords = ["cgpa", "gpa", "project", "achievement", "experience", "skill", "year", "how many", "count"]
        is_portfolio_numeric = any(keyword in query_lower for keyword in portfolio_numeric_keywords)
        
        if not is_portfolio_numeric:
            # It's a math question, reject it
            decline_message = "I'm here to help with questions about Sanjay K's portfolio. I can answer questions about his projects, skills, education, internships, achievements, and professional background. Please ask something related to his portfolio!"
            return {"messages": state["messages"] + [AIMessage(content=f"NOT_RELEVANT:{decline_message}")]}
    
    # 3. Check for obviously irrelevant questions
    irrelevant_keywords = [
        "capital of", "who invented", "how to learn", "what is python", "what is machine learning",
        "who is", "best framework", "tutorial", "explain neural network", "what does",
        "weather", "recipe", "movie", "song", "game"
    ]
    if any(keyword in query_lower for keyword in irrelevant_keywords):
        # Double-check it's not asking about Sanjay
        if "sanjay" not in query_lower:
            decline_message = "I'm here to help with questions about Sanjay K's portfolio. I can answer questions about his projects, skills, education, internships, achievements, and professional background. Please ask something related to his portfolio!"
            return {"messages": state["messages"] + [AIMessage(content=f"NOT_RELEVANT:{decline_message}")]}
    
    # If passed hard-coded filters, use LLM for final validation
    llm = ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name=MODEL_NAME,
        temperature=0.0
    )
    
    validation_prompt = f"""You are a strict relevance checker for Sanjay K's portfolio chatbot.

Sanjay K's portfolio ONLY includes:
- Personal details (Sanjay K's name, role, CGPA, contact)
- Projects (Sanjay K's web apps, AI/ML projects, applications)
- Skills (Sanjay K's programming languages, frameworks, tools)
- Education (Sanjay K's college, degree, CGPA)
- Internships and work experience (Sanjay K's internships)
- Achievements and certifications (Sanjay K's achievements)

User Question: {original_query}

REJECT (respond "IRRELEVANT") if the question is:
- Greetings or small talk (e.g., "hi", "hello", "hey", "how are you")
- Math/arithmetic (e.g., "add 2+5", "what is 10*5")
- General knowledge (e.g., "capital of France", "who invented...")
- About other people (not Sanjay K)
- Technical definitions not related to Sanjay K (e.g., "what is Python", "explain machine learning")
- Any topic NOT directly about Sanjay K's portfolio
- Empty or unclear messages

ACCEPT (respond "RELEVANT") ONLY if asking specifically about:
- Sanjay K's projects, skills, education, internships, achievements, or personal details

Respond with ONLY one word - "RELEVANT" or "IRRELEVANT":
"""
    
    validation_result = llm.invoke(validation_prompt)
    is_relevant = "RELEVANT" in validation_result.content.upper()
    
    if not is_relevant:
        # Return a polite decline message and skip further processing
        decline_message = "I'm here to help with questions about Sanjay K's portfolio. I can answer questions about his projects, skills, education, internships, achievements, and professional background. Please ask something related to his portfolio!"
        return {"messages": state["messages"] + [AIMessage(content=f"NOT_RELEVANT:{decline_message}")]}
    
    # If relevant, continue to next stage
    return {"messages": state["messages"] + [AIMessage(content="RELEVANT:continue")]}


def restructure_query(state: AgentState):
    """
    Stage 1: Convert user's casual question into a structured query format
    """
    original_query = state["messages"][0].content  # Get original user question
    
    # LLM to restructure the query
    llm = ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name=MODEL_NAME,
        temperature=0.0
    )
    
    restructure_prompt = f"""You are a query parser for Sanjay K's portfolio chatbot.

Your job is to convert casual user questions into structured, precise queries that focus on extracting exact information.

User Question: {original_query}

Convert this into a clear, structured query that specifies:
1. What information is being requested (e.g., count, existence, details, list)
2. Which section (projects, achievements, internships, skills, education, CGPA, etc.)
3. Any specific filters or constraints

Examples:
- "sanjay any done internship" → "Check if Sanjay K has completed any internships. If yes, provide the company name, duration, and key highlights."
- "what is cgpa" → "What is Sanjay K's CGPA score?"
- "how many project is done" → "Count the total number of projects completed by Sanjay K."

Provide ONLY the restructured query, nothing else.
"""
    
    restructured = llm.invoke(restructure_prompt)
    # Store the restructured query in state for the next node
    return {"messages": state["messages"] + [AIMessage(content=f"RESTRUCTURED:{restructured.content}")]}


def retrieve_docs(state: AgentState):
    """
    Stage 2: Retrieve relevant documents based on restructured query
    """
    # Get the restructured query from previous node
    restructured_msg = [m for m in state["messages"] if isinstance(m, AIMessage) and m.content.startswith("RESTRUCTURED:")]
    
    if restructured_msg:
        query_to_use = restructured_msg[-1].content.replace("RESTRUCTURED:", "").strip()
    else:
        query_to_use = state["messages"][0].content  # Fallback to original
    
    original_query = state["messages"][0].content

    section = get_section_from_query(query_to_use)
    docs = vectorstore.similarity_search(
        query_to_use,
        k=50 if section else 20,
        filter={"section": section} if section else None
    )

    # Prepend basic identity to context
    header_context = "Identity: This portfolio belongs to Sanjay K, a Full Stack & GenAI Developer.\n\n"
    context_text = header_context + "\n\n".join([d.page_content for d in docs])

    # Create a focused prompt for exact answers - DON'T include structured query in visible output
    augmented_prompt = f"""
You are an assistant for Sanjay K's portfolio. Provide ONLY exact, direct answers in complete sentences.

Context Information:
{context_text}

User Question:
{original_query}

CRITICAL INSTRUCTIONS:
- DO NOT repeat or restate the question in your answer
- DO NOT mention "Structured Query" or any internal processing
- Provide ONLY the direct answer that the user needs
- ALWAYS respond in complete, natural sentences (never single words or values only)
- Answer ONLY what is asked - no extra information
- For "what is" questions: Provide the value in a complete sentence (e.g., "Sanjay K's CGPA is 8.35/10")
- For yes/no questions: Start with Yes/No in a complete sentence with key details (e.g., "Yes, Sanjay K completed an internship at Aerele Technologies from Aug-Oct 2025")
- For count questions: State the count in a sentence, then list 2-3 highlights
- For existence questions: Answer in a complete sentence with the key information
- Keep responses concise (1-3 sentences) unless specifically asked for a full list

Answer in complete sentences:
"""
    return {"messages": [HumanMessage(content=augmented_prompt)]}


def create_llm_chain():
    """
    Stage 3: Generate the final answer using LLM
    """
    llm = ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name=MODEL_NAME,
        temperature=0.1
    )

    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a portfolio assistant. Always respond in complete, natural sentences. Never give single-word answers or bare values. Be direct but conversational."),
        MessagesPlaceholder(variable_name="messages"),
    ])

    return prompt | llm | StrOutputParser()


def create_langgraph_agent():
    """
    Create a 4-stage agent with validation:
    0. validate_query_relevance: Check if question is about Sanjay K's portfolio
    1. restructure_query: Convert casual question to structured query (if relevant)
    2. retriever: Retrieve relevant documents (if relevant)
    3. llm: Generate exact answer
    """
    chain = create_llm_chain()
    graph = StateGraph(state_schema=AgentState)

    # Add validation node
    graph.add_node("validate", validate_query_relevance)
    
    # Add processing nodes
    graph.add_node("restructure_query", restructure_query)
    graph.add_node("retriever", retrieve_docs)

    def llm_node(state: AgentState):
        result = chain.invoke({"messages": state["messages"]})
        return {"messages": [AIMessage(content=result)]}

    graph.add_node("llm", llm_node)
    
    # Create a simple response node for irrelevant queries
    def decline_node(state: AgentState):
        # Find the NOT_RELEVANT message
        not_relevant_msgs = [m for m in state["messages"] if isinstance(m, AIMessage) and m.content.startswith("NOT_RELEVANT:")]
        if not_relevant_msgs:
            decline_text = not_relevant_msgs[-1].content.replace("NOT_RELEVANT:", "").strip()
            return {"messages": [AIMessage(content=decline_text)]}
        return {"messages": [AIMessage(content="I can only answer questions about Sanjay K's portfolio.")]}
    
    graph.add_node("decline", decline_node)
    
    # Define conditional routing after validation
    def route_after_validation(state: AgentState):
        # Check if the last AI message indicates relevance
        ai_messages = [m for m in state["messages"] if isinstance(m, AIMessage)]
        if ai_messages:
            last_ai_msg = ai_messages[-1].content
            if "NOT_RELEVANT:" in last_ai_msg:
                return "decline"
            elif "RELEVANT:" in last_ai_msg:
                return "restructure_query"
        return "restructure_query"  # Default to continue
    
    # Define the flow
    graph.set_entry_point("validate")
    graph.add_conditional_edges("validate", route_after_validation, {
        "decline": "decline",
        "restructure_query": "restructure_query"
    })
    graph.add_edge("decline", END)
    graph.add_edge("restructure_query", "retriever")
    graph.add_edge("retriever", "llm")
    graph.add_edge("llm", END)

    return graph.compile()


# ------------------------------------------------------------
#               Lazy Initialization (Flask 3.1 Fix)
# ------------------------------------------------------------
@app.before_request
def init_backend():
    global initialized, vectorstore, agent

    if initialized:
        return

    try:
        print("Connecting to Pinecone...")
        Pinecone(api_key=PINECONE_API_KEY)

        vectorstore = PineconeVectorStore.from_existing_index(
            index_name=INDEX_NAME,
            embedding=embeddings
        )
        print("Pinecone Connected!")

        agent = create_langgraph_agent()
        initialized = True
        print("Agent Ready! Initialization done once.")

    except Exception as e:
        print("Initialization Error:", e)
        print(traceback.format_exc())


# ------------------------------------------------------------
#                          ROUTES
# ------------------------------------------------------------
@app.route("/", methods=["GET"])
def home():
    return jsonify({"status": "running"})


@app.route("/chat", methods=["POST"])
def chat():
    if not initialized:
        return jsonify({"error": "Server is still starting... Try again in 2-3 seconds"}), 503

    query = request.json.get("message", "")
    if not query:
        return jsonify({"error": "Message required"}), 400

    try:
        result = agent.invoke({"messages": [HumanMessage(content=query)]})
        return jsonify({"response": result["messages"][-1].content})
    except Exception as e:
        print("ChatError:", e)
        return jsonify({"error": "LLM Processing Failed"}), 500


# ------------------------------------------------------------
#                       START SERVER
# ------------------------------------------------------------
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=int(os.environ.get("PORT", 10000)))
