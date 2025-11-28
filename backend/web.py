from flask import Flask, request, jsonify
from flask_cors import CORS
from groq import Groq
from tavily import TavilyClient
import os
import re

app = Flask(__name__)
CORS(app)

groq_client = Groq(api_key="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")
tavily = TavilyClient(api_key="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")

def search_web(query):
    res = tavily.search(query, max_results=3)
    return "\n".join([item["content"][:2000] for item in res.get("results", [])])

def call_llm(prompt, system_prompt=None):
    messages = []
    if system_prompt:
        messages.append({"role": "system", "content": system_prompt})
    messages.append({"role": "user", "content": prompt})

    completion = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=messages
    )
    return completion.choices[0].message.content

def extract_company_name(text):
    # simple regex for major companies
    companies = ["accenture", "tcs", "infosys", "wipro", "cognizant",
                 "hcl", "capgemini", "ibm", "hpe", "zoho", "amazon", "sap", "oracle", "microsoft", "google"]
    for c in companies:
        if c in text:
            return c.capitalize()
    return None

@app.route("/chat", methods=["POST"])
def chat():
    user_query = request.json["query"].lower()

    company = extract_company_name(user_query)
    
    # Check for intent to generate a paper/questions
    keywords = ["question", "paper", "exam", "test", "aptitude", "reasoning", "verbal", "interview"]
    is_paper_request = any(keyword in user_query for keyword in keywords)

    if is_paper_request:
        target_entity = company if company else "General Placement"
        
        search_query = f"{target_entity} sample aptitude logical verbal questions exam pattern"
        web_info = search_web(search_query)

        system_prompt = """You are a strict JSON generator. 
You must output ONLY valid JSON. 
Do not include any conversational text, markdown formatting (like ```json), or explanations.
If you cannot generate the JSON, output an empty JSON object {}."""

        prompt = f"""
Act like a placement paper generator for {target_entity}.
Use the reference info below to generate a NEW model question paper for {target_entity} freshers hiring test.

Output strictly valid JSON with this structure:
{{
  "title": "Paper Title",
  "sections": [
    {{
      "section_name": "Section Name",
      "questions": [
        {{
          "question": "Question text",
          "options": ["Option A", "Option B", "Option C", "Option D"],
          "answer": "Correct Option or Answer"
        }}
      ]
    }}
  ]
}}

Requirements:
- 30 questions total (10 Aptitude, 10 Logical, 10 Verbal).
- Options array must be present for MCQs.
- Answer field must contain the correct value.
- NO markdown, NO code blocks, ONLY raw JSON.

Reference info:
{web_info}
"""
        answer = call_llm(prompt, system_prompt=system_prompt)
        return jsonify({"response": answer})

    return jsonify({"response": call_llm(user_query)})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
