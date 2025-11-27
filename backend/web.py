from flask import Flask, request, jsonify
from groq import Groq
from tavily import TavilyClient
import os
import re

app = Flask(__name__)

groq_client = Groq(api_key="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")
tavily = TavilyClient(api_key="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")

def search_web(query):
    res = tavily.search(query, max_results=3)
    return "\n".join([item["content"][:2000] for item in res.get("results", [])])

def call_llm(prompt):
    completion = groq_client.chat.completions.create(
        model="openai/gpt-oss-120b",
        messages=[{"role": "user", "content": prompt}]
    )
    return completion.choices[0].message.content

def extract_company_name(text):
    # simple regex for major companies
    companies = ["accenture", "tcs", "infosys", "wipro", "cognizant",
                 "hcl", "capgemini", "ibm", "hpe", "zoho", "amazon"]
    for c in companies:
        if c in text:
            return c.capitalize()
    return None

@app.route("/chat", methods=["POST"])
def chat():
    user_query = request.json["query"].lower()

    company = extract_company_name(user_query)

    if company and ("question" in user_query or "paper" in user_query):
        search_query = f"{company} sample aptitude logical verbal questions exam pattern"
        web_info = search_web(search_query)

        prompt = f"""
Act like a placement paper generator for {company}.

Use ONLY the info below as reference (don't copy exact content).
Generate a NEW model question paper for {company} freshers hiring test.

Format:
- 30 questions total:
  - 10 Aptitude
  - 10 Logical Reasoning
  - 10 English Verbal
- Give answers at the end only.
- Same difficulty level as {company} real test.

Reference info:
{web_info}
"""
        answer = call_llm(prompt)
        return jsonify({"response": answer})

    return jsonify({"response": call_llm(user_query)})

if __name__ == "__main__":
    app.run(debug=True, port=5000)
