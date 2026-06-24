import os

# =========================================================
# SET ENV VARIABLES FIRST
# =========================================================

from dotenv import load_dotenv
load_dotenv()

os.environ["LANGSMITH_TRACING"] = os.getenv("LANGSMITH_TRACING", "true")
os.environ["LANGSMITH_ENDPOINT"] = os.getenv("LANGSMITH_ENDPOINT", "https://api.smith.langchain.com")
os.environ["LANGSMITH_API_KEY"] = os.getenv("LANGSMITH_API_KEY", "")
os.environ["LANGSMITH_PROJECT"] = os.getenv("LANGSMITH_PROJECT", "pr-passionate-trinket-62")

os.environ["GROQ_API_KEY"] = os.getenv("GROQ_API_KEY", "")
os.environ["OPENAI_API_KEY"] = os.getenv("GROQ_API_KEY", "")

# =========================================================
# IMPORTS
# =========================================================

from flask import Flask, request, jsonify
from openai import OpenAI
from langsmith.wrappers import wrap_openai
from langsmith.run_helpers import traceable
from datetime import datetime

# =========================================================
# DEBUG PRINT
# =========================================================

print("PROJECT =", os.getenv("LANGSMITH_PROJECT"))

# =========================================================
# FLASK APP
# =========================================================

app = Flask(__name__)

# =========================================================
# GROQ CLIENT + LANGSMITH
# =========================================================

client = wrap_openai(
    OpenAI(
        api_key=os.environ["GROQ_API_KEY"],
        base_url="https://api.groq.com/openai/v1"
    )
)

# =========================================================
# AI FUNCTION
# =========================================================

@traceable(name="User Chat Session")
def ask_ai(user_message, session_id):

    response = client.chat.completions.create(
        model="meta-llama/llama-4-scout-17b-16e-instruct",

        messages=[
            {
                "role": "system",
                "content": "You are a helpful AI assistant."
            },
            {
                "role": "user",
                "content": user_message
            }
        ],

        temperature=0.7,
        max_tokens=500
    )

    ai_response = response.choices[0].message.content

    print("\n==============================")
    print("SESSION :", session_id)
    print("TIME    :", datetime.now())
    print("USER    :", user_message)
    print("AI      :", ai_response)
    print("==============================\n")

    return ai_response

# =========================================================
# HOME ROUTE
# =========================================================

@app.route("/")
def home():
    return "Groq + LangSmith Monitoring Running"

# =========================================================
# CHAT ROUTE
# =========================================================

@app.route("/chat", methods=["POST"])
def chat():

    try:

        data = request.get_json()

        user_message = data.get("message")
        session_id = data.get("session_id", "default_user")

        if not user_message:

            return jsonify({
                "success": False,
                "error": "Message is required"
            }), 400

        response = ask_ai(user_message, session_id)

        return jsonify({
            "success": True,
            "session_id": session_id,
            "response": response
        })

    except Exception as e:

        return jsonify({
            "success": False,
            "error": str(e)
        }), 500

# =========================================================
# MAIN
# =========================================================

if __name__ == "__main__":

    app.run(
        host="0.0.0.0",
        port=5000,
        debug=True
    )