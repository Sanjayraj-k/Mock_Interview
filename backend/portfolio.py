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


def retrieve_docs(state: AgentState):
    original_query = state["messages"][-1].content

    section = get_section_from_query(original_query)
    docs = vectorstore.similarity_search(
        original_query,
        k=50 if section else 20,
        filter={"section": section} if section else None
    )

    context_text = "\n\n".join([d.page_content for d in docs])

    # YOUR ORIGINAL EXACT PROMPT IS KEPT HERE ✔
    augmented_prompt = f"""
You are an assistant for Sanjay K's portfolio. Always respond in a concise, summarized, and easy-to-understand format for users. Use simple language, short sentences, bullet points, and bold headings. Avoid long walls of text—focus on key highlights.

Context Information:
{context_text}

User Question:
{original_query}

Answer the question strictly based on the context above. Summarize key details without unnecessary jargon. 

- If the question is asking for a count (e.g., 'how many achievements'), provide a concise 1-2 sentence summary with the total number and 2-3 key highlights. Do not list all items.
- For existence questions (e.g., 'any intern', 'has he done any project'), answer with 'Yes/No' followed by a 1-line summary of the most relevant one. Keep the entire response to 1-2 lines total.
- If the question asks to list all items from a section (e.g., 'list all projects'), check if the query specifically says 'only names' or similar—then extract and list ONLY the names of EVERY SINGLE item from the context, numbered 1, 2, 3, etc. Otherwise, provide a brief summary for each: include the name, a 1-2 sentence description, main tech/features (bullet 2-3 points max), and outcome. Keep each entry to 5-7 lines total for readability. Do not omit any items—cover all provided in the context.
"""
    return {"messages": [HumanMessage(content=augmented_prompt)]}


def create_llm_chain():
    llm = ChatGroq(
        groq_api_key=GROQ_API_KEY,
        model_name=MODEL_NAME,
        temperature=0.1
    )

    # YOUR ORIGINAL SYSTEM PROMPT IS ALSO KEPT ✔
    prompt = ChatPromptTemplate.from_messages([
        ("system", "You are a professional portfolio assistant. Always provide detailed, complete responses based on the given context."),
        MessagesPlaceholder(variable_name="messages"),
    ])

    return prompt | llm | StrOutputParser()


def create_langgraph_agent():
    chain = create_llm_chain()
    graph = StateGraph(state_schema=AgentState)

    graph.add_node("retriever", retrieve_docs)

    def llm_node(state: AgentState):
        result = chain.invoke({"messages": state["messages"]})
        return {"messages": [AIMessage(content=result)]}

    graph.add_node("llm", llm_node)
    graph.set_entry_point("retriever")
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
