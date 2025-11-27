from groq import Groq

client = Groq(api_key="**********")

completion = client.chat.completions.create(
    model="groq/compound",
    messages=[
        {"role": "user", "content": "2024 aptitude question asked by accenture"},
        {"role": "assistant", "content": ""},
        {"role": "user", "content": ""}
    ],
    temperature=1,
    max_completion_tokens=1024,
    top_p=1,
    stream=True,
    stop=None,
    compound_custom={
        "tools": {
            "enabled_tools": ["web_search", "code_interpreter", "visit_website"]
        }
    }
)

for chunk in completion:
    print(chunk.choices[0].delta.content or "", end="")
