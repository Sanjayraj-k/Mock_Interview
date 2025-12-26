import os
import json
import time
from typing import List, TypedDict, Dict, Any
from dotenv import load_dotenv
from flask import Flask, request, jsonify
from flask_cors import CORS
# LangChain / LangGraph Imports
from langchain_openai import OpenAIEmbeddings
from langchain_pinecone import PineconeVectorStore
from langchain_groq import ChatGroq
from langchain_core.prompts import ChatPromptTemplate, MessagesPlaceholder
from langchain_core.output_parsers import StrOutputParser
from langchain_core.messages import HumanMessage, AIMessage, SystemMessage
from pinecone import Pinecone, ServerlessSpec
from langgraph.graph import StateGraph, END
# Load environment variables
load_dotenv()
# Configuration
app = Flask(__name__)
CORS(app)
GROQ_API_KEY = os.getenv("GROQ_API_KEY")
OPENROUTER_API_KEY = os.getenv("OPENROUTER_API_KEY")
PINECONE_API_KEY = os.getenv("PINECONE_API_KEY")
PINECONE_ENV = os.getenv("PINECONE_ENV", "us-east-1")
INDEX_NAME = "portfolio-chatbot"
# Use a standard supported Llama 3 model
MODEL_NAME = "llama-3.1-8b-instant"  # Corrected to a valid Groq model
EMBEDDING_MODEL = "openai/text-embedding-3-small"  # Standard OpenAI model available on OpenRouter, 1536 dimensions
# Initialize global clients
embeddings = OpenAIEmbeddings(
    model=EMBEDDING_MODEL,
    openai_api_key=OPENROUTER_API_KEY,
    base_url="https://openrouter.ai/api/v1"
)
vectorstore = None
# --- 1. Data Loading ---
def load_portfolio_data(file_path: str = "chatbot_training_data.json") -> tuple[List[str], List[Dict[str, Any]]]:
    """Loads JSON data and converts it into text chunks with metadata."""
    if not os.path.exists(file_path):
        print(f"Warning: {file_path} not found. Using dummy data.")
        return ["Sanjay K is a developer."], [{"section": "personal"}]
    
    with open(file_path, "r", encoding="utf-8") as f:
        data = json.load(f)
   
    texts = []
    metadatas = []
   
    # Helper to safely get nested keys
    def safe_get(d: Dict, keys: List[str], default: str = "") -> str:
        for k in keys:
            d = d.get(k, default)
            if isinstance(d, str): 
                break
        return str(d)
   
    # Personal Info
    section = "personal_info"
    p = data.get('personal_info', {})
    text = f"Personal Info: Name: {p.get('name')}, Role: {p.get('role')}, Email: {p.get('email')}, Phone: {p.get('phone')}, Location: {p.get('location')}, Portfolio: {p.get('portfolio_url')}, GitHub: {p.get('github')}, LinkedIn: {p.get('linkedin')}, LeetCode: {p.get('leetcode')}, Open to: {', '.join(p.get('open_to', []))}."
    texts.append(text)
    metadatas.append({"section": section})
   
    # Introduction
    section = "introduction"
    intro = data.get('introduction', {})
    text = f"Introduction: Tagline: {intro.get('tagline')}. Summary: {intro.get('summary')}. About: {intro.get('about')}."
    texts.append(text)
    metadatas.append({"section": section})
   
    # Education
    section = "education"
    edu = data.get('education', [])
    for e in edu:
        duration = e.get('duration', e.get('graduation_date', 'N/A'))
        text = f"Education: {e.get('degree')} at {e.get('institution')} ({duration}). Grade: {e.get('grade')}. Status: {e.get('status', 'Completed')}."
        texts.append(text)
        metadatas.append({"section": section})
   
    # Skills
    section = "skills"
    skills = data.get('skills', {})
    text = f"Programming Languages: {', '.join(skills.get('programming_languages', []))}"
    texts.append(text)
    metadatas.append({"section": section})
    text = f"Frontend Skills: {', '.join(skills.get('frontend', []))}"
    texts.append(text)
    metadatas.append({"section": section})
    text = f"Backend Skills: {', '.join(skills.get('backend', []))}"
    texts.append(text)
    metadatas.append({"section": section})
    text = f"Databases: {', '.join(skills.get('databases', []))}"
    texts.append(text)
    metadatas.append({"section": section})
    text = f"AI/ML Skills: {', '.join(skills.get('ai_ml', []))}"
    texts.append(text)
    metadatas.append({"section": section})
    text = f"Frameworks/Libraries: {', '.join(skills.get('frameworks_libraries', []))}"
    texts.append(text)
    metadatas.append({"section": section})
    text = f"Tools/Platforms: {', '.join(skills.get('tools_platforms', []))}"
    texts.append(text)
    metadatas.append({"section": section})
    text = f"Integrations: {', '.join(skills.get('integrations', []))}"
    texts.append(text)
    metadatas.append({"section": section})
    text = f"Other Skills: {', '.join(skills.get('other', []))}"
    texts.append(text)
    metadatas.append({"section": section})
   
    # Experience
    section = "experience"
    exp = data.get('experience', [])
    for e in exp:
        text = f"Experience: {e.get('role')} at {e.get('company')}, {e.get('duration')}, {e.get('location')}, Type: {e.get('type')}. Responsibilities: {'. '.join(e.get('responsibilities', []))}."
        texts.append(text)
        metadatas.append({"section": section})
   
    # Projects
    section = "projects"
    projects = data.get('projects', [])
    for proj in projects:
        desc = proj.get('description', '')
        tech = ', '.join(proj.get('tech_stack', []))
        feats = '. '.join(proj.get('features', []))
        outcome = proj.get('outcome', '')
        cats = ', '.join(proj.get('category', []))
        text = f"Project: {proj.get('name')}. Description: {desc}. Tech Stack: {tech}. Features: {feats}. Outcome: {outcome}. Category: {cats}."
        texts.append(text)
        metadatas.append({"section": section})
   
    # Achievements
    section = "achievements"
    ach = data.get('achievements', [])
    for a in ach:
        text = f"Achievement: {a.get('prize')} in {a.get('event')} for {a.get('project')} at {a.get('venue')}, {a.get('date')}."
        texts.append(text)
        metadatas.append({"section": section})
   
    # Competitive Programming
    section = "competitive_programming"
    comp = data.get('competitive_programming', {})
    text = f"Competitive Programming: {comp.get('problems_solved')} on {comp.get('platform')} using {', '.join(comp.get('languages_used', []))}. Focus: {', '.join(comp.get('focus_areas', []))}. Goal: {comp.get('goal')}."
    texts.append(text)
    metadatas.append({"section": section})
   
    # Leadership
    section = "leadership"
    lead = data.get('leadership', [])
    for l in lead:
        text = f"Leadership: {l.get('role')} at {l.get('organization')}, {l.get('duration')}."
        texts.append(text)
        metadatas.append({"section": section})
   
    # Career Goals
    section = "career_goals"
    goals = data.get('career_goals', {})
    text = f"Career Goals: Target Roles: {', '.join(goals.get('target_roles', []))}. Target Companies: {goals.get('target_companies')}. Interests: {', '.join(goals.get('interests', []))}. Short-term: {goals.get('short_term_goal')}. Objective: {goals.get('career_objective')}."
    texts.append(text)
    metadatas.append({"section": section})
   
    # Areas of Interest
    section = "areas_of_interest"
    interests = data.get('areas_of_interest', [])
    text = f"Areas of Interest: {', '.join(interests)}"
    texts.append(text)
    metadatas.append({"section": section})
   
    return texts, metadatas
# --- 2. Vector DB Setup (Fixed to prevent duplicate ingestion) ---
def setup_vector_db(texts: List[str], metadatas: List[Dict[str, Any]]):
    global vectorstore
   
    pc = Pinecone(api_key=PINECONE_API_KEY)
    existing_indexes = [i.name for i in pc.list_indexes()]
    if INDEX_NAME not in existing_indexes:
        print(f"Creating new index: {INDEX_NAME}")
        pc.create_index(
            name=INDEX_NAME,
            dimension=1536,  # Updated for text-embedding-3-small
            metric="cosine",
            spec=ServerlessSpec(cloud="aws", region=PINECONE_ENV)
        )
        time.sleep(10) # Wait for initialization
       
        # Only ingest if index is new
        print("Ingesting data...")
        vectorstore = PineconeVectorStore.from_texts(
            texts=texts,
            embedding=embeddings,
            metadatas=metadatas,  # Add metadata
            index_name=INDEX_NAME
        )
    else:
        print(f"Index '{INDEX_NAME}' exists. Connecting to it...")
        # Connect to existing index without re-ingesting
        vectorstore = PineconeVectorStore.from_existing_index(
            index_name=INDEX_NAME,
            embedding=embeddings
        )
   
    return vectorstore
# --- 3. LangGraph Logic ---
class AgentState(TypedDict):
    # We will manually handle the message list update to ensure we don't lose the query
    messages: List[HumanMessage | AIMessage]
def get_section_from_query(query: str) -> str:
    """Simple heuristic to detect section for 'list all X' queries."""
    query_lower = query.lower()
    if "project" in query_lower:
        return "projects"
    elif "achievement" in query_lower:
        return "achievements"
    elif "experience" in query_lower or "intern" in query_lower:
        return "experience"
    elif "skill" in query_lower:
        return "skills"
    elif "education" in query_lower:
        return "education"
    # Add more as needed
    return ""
def retrieve_docs(state: AgentState):
    """Retrieves docs and reformulates the prompt to include BOTH context and query."""
    if vectorstore is None:
        return {"messages": [HumanMessage(content="Error: Database not initialized.")]}
    # 1. Get the User's original question
    original_query = state["messages"][-1].content
   
    # 2. Detect if it's a 'list all' query and use metadata filter
    section = get_section_from_query(original_query)
    if section:
        # Use metadata filter to get ALL from that section
        docs = vectorstore.similarity_search(original_query, k=50, filter={"section": section})  # k high to get all
    else:
        # Fallback to general similarity search
        docs = vectorstore.similarity_search(original_query, k=20)
    
    context_text = "\n\n".join([doc.page_content for doc in docs])
   
    # 3. Combine Context + Question into a new message
    augmented_prompt = f"""You are an assistant for Sanjay K's portfolio. Always respond in a concise, summarized, and easy-to-understand format for users. Use simple language, short sentences, bullet points, and bold headings. Avoid long walls of text—focus on key highlights.

Context Information:
{context_text}
User Question:
{original_query}
Answer the question strictly based on the context above. Summarize key details without unnecessary jargon. 

- If the question is asking for a count (e.g., 'how many achievements'), provide a concise 1-2 sentence summary with the total number and 2-3 key highlights. Do not list all items.
- For existence questions (e.g., 'any intern', 'has he done any project'), answer with 'Yes/No' followed by a 1-line summary of the most relevant one. Keep the entire response to 1-2 lines total.
- If the question asks to list all items from a section (e.g., 'list all projects'), check if the query specifically says 'only names' or similar—then extract and list ONLY the names of EVERY SINGLE item from the context, numbered 1, 2, 3, etc. Otherwise, provide a brief summary for each: include the name, a 1-2 sentence description, main tech/features (bullet 2-3 points max), and outcome. Keep each entry to 5-7 lines total for readability. Do not omit any items—cover all provided in the context."""
    return {"messages": [HumanMessage(content=augmented_prompt)]}
def create_llm_chain():
    llm = ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name=MODEL_NAME,
        temperature=0.1
    )
   
    # Simple prompt, as the heavy lifting is done in the retrieval formatting
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a professional portfolio assistant. Always provide detailed, complete responses based on the given context."),
        MessagesPlaceholder(variable_name="messages"),
    ])
   
    return prompt | llm | StrOutputParser()
def create_langgraph_agent():
    chain = create_llm_chain()
   
    workflow = StateGraph(state_schema=AgentState)
   
    workflow.add_node("retriever", retrieve_docs)
   
    def llm_node(state: AgentState):
        try:
            # state["messages"] now contains the context+query combined string
            response = chain.invoke({"messages": state["messages"]})
            return {"messages": [AIMessage(content=response)]}
        except Exception as e:
            return {"messages": [AIMessage(content=f"LLM Error: {str(e)}")]}
   
    workflow.add_node("llm", llm_node)
   
    workflow.set_entry_point("retriever")
    workflow.add_edge("retriever", "llm")
    workflow.add_edge("llm", END)
   
    return workflow.compile()
# --- 4. Initialization & Routes ---
agent = None
def init_app():
    global agent
    # Check if API keys are loaded
    if not OPENROUTER_API_KEY:
        raise ValueError("OPENROUTER_API_KEY not found in environment variables. Check your .env file.")
    if not GROQ_API_KEY:
        raise ValueError("GROQ_API_KEY not found in environment variables. Check your .env file.")
    if not PINECONE_API_KEY:
        raise ValueError("PINECONE_API_KEY not found in environment variables. Check your .env file.")
    print("--- Initializing Backend ---")
    texts, metadatas = load_portfolio_data()
    if not texts:
        raise ValueError("No data chunks loaded. Check your data file.")
    print(f"Loaded {len(texts)} chunks with metadata.")  # Debug: Print number of chunks
    setup_vector_db(texts, metadatas)
    agent = create_langgraph_agent()
    print("--- Ready ---")
@app.route('/health', methods=['GET'])
def health():
    return jsonify({"status": "active"})
@app.route('/chat', methods=['POST'])
def chat():
    if not agent:
        return jsonify({"error": "Server initializing..."}), 503
   
    data = request.json
    query = data.get('message', '')
   
    if not query:
        return jsonify({"error": "Empty message"}), 400
    # Invoke Agent
    try:
        initial_state = {"messages": [HumanMessage(content=query)]}
        result = agent.invoke(initial_state)
       
        # Get last message
        bot_response = result["messages"][-1].content
        return jsonify({"response": bot_response})
    except Exception as e:
        print(f"Error: {e}")
        return jsonify({"error": "Internal server error"}), 500
if __name__ == '__main__':
    init_app()
    app.run(debug=True, host='0.0.0.0', port=5000)