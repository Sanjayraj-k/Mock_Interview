from flask import Flask, request, jsonify
from groq import Groq
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

groq_client = Groq(api_key="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")

def call_compound(query):
    prompt = f"""
User Query: {query}

Your Job:
1️⃣ Detect the **company name** (if present)
2️⃣ Detect the **question type** (aptitude, verbal, logical, coding, etc.)
3️⃣ Do **web search** yourself to find reference exam patterns and question types
4️⃣ Generate **40 fresh questions** + **correct answers**
5️⃣ Include a list of **Sources** (URLs) you used for reference

Output MUST be a valid JSON object with the following structure:
{{
    "title": "Placement Paper for [Company] - [Type]",
    "sections": [
        {{
            "section_name": "[Section Name]",
            "questions": [
                {{
                    "question": "Question text here",
                    "options": ["Option 1", "Option 2", "Option 3", "Option 4"],
                    "answer": "Correct answer text here"
                }}
            ]
        }}
    ],
    "sources": ["https://source1.com", "https://source2.com"]
}}

Ensure the response is ONLY the JSON object, no markdown formatting or backticks.
"""

    stream = groq_client.chat.completions.create(
        model="llama-3.3-70b-versatile",  # Stable, recommended for now
        messages=[{"role": "user", "content": prompt}],
        temperature=1,
        max_completion_tokens=2000,
        top_p=1,
        stream=True,
        response_format={"type": "json_object"}
    )

    result = ""
    for chunk in stream:
        delta = chunk.choices[0].delta.content
        if delta:
            result += delta
    print(result)
    return result


@app.route("/chat", methods=["POST"])
def chat():
    user_query = request.json.get("query", "")

    if not user_query.strip():
        return jsonify({"error": "Please provide a valid query"})

    result = call_compound(user_query)

    return jsonify({
        "input": user_query,
        "output": result
    })


if __name__ == "__main__":
    app.run(debug=True, port=4000)