"""
Company Profile Blueprint for Flask Application
Enhanced Company Profile Backend Server
Workflow: User Input → Groq (Llama 3.1 405B) find full name → Wikipedia → Content extraction → Groq summarization → Frontend
"""

from flask import Blueprint, request, jsonify
import os
import re
import wikipedia
from bs4 import BeautifulSoup
from groq import Groq

# Blueprint for Company Scrap
companyscrap_bp = Blueprint('companyscrap', __name__, url_prefix='/companyscrap')

# --- Groq API Configuration ---
# Get your free Groq API key from: https://console.groq.com/keys
GROQ_API_KEY = os.getenv("GROQ_API_KEY")

# Preferred model: Llama 3.1 405B (extremely capable)
# Fallback: llama3-70b-8192 if rate-limited or unavailable
GROQ_MODEL = "openai/gpt-oss-120b"  # Best performance
# GROQ_MODEL = "llama3-70b-8192"  # Reliable fallback

client = Groq(api_key=GROQ_API_KEY) if GROQ_API_KEY else None

# --- Global Configuration ---
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def call_groq_model(prompt, max_tokens=300, temperature=0.7):
    """Generic function to call Groq's Llama model."""
    if not client:
        print("Groq API key not configured. Set GROQ_API_KEY environment variable.")
        return "AI model not available. API key is missing."

    try:
        chat_completion = client.chat.completions.create(
            messages=[{"role": "user", "content": prompt}],
            model=GROQ_MODEL,
            temperature=temperature,
            max_tokens=max_tokens,
            top_p=1,
            stop=None,
        )
        response_text = chat_completion.choices[0].message.content.strip()
        # Clean markdown artifacts
        return re.sub(r'[\*`#]', '', response_text).strip()
    except Exception as e:
        print(f"Error calling Groq model: {e}")
        return None

def find_full_company_name(user_input):
    """Step 1: Use Groq (Llama) to find the full company name from user input"""
    print(f"Finding full company name for: '{user_input}'")
    prompt = f"""
You are a precise company name resolver.
Given a company name, abbreviation, or ticker symbol: "{user_input}"
Return ONLY the full official legal name of the company.

Examples:
- "Apple" → "Apple Inc."
- "MSFT" → "Microsoft Corporation"
- "Google" → "Alphabet Inc."
- "Tesla" → "Tesla, Inc."

Respond with nothing but the full name.
"""
    full_name = call_groq_model(prompt, max_tokens=50, temperature=0.0)
    if full_name and full_name.strip():
        cleaned_name = full_name.strip().strip('"').strip()
        print(f"Full company name found via Groq: {cleaned_name}")
        return cleaned_name
    else:
        print(f"Groq failed or returned empty. Falling back to original input: {user_input}")
        return user_input.strip()

def extract_wikipedia_content(company_name):
    """Step 2: Extract content from Wikipedia"""
    print(f"Extracting Wikipedia content for: {company_name}")
    wikipedia_content = {"summary": "", "page_content": "", "url": "", "title": "", "found": False}
    try:
        search_results = wikipedia.search(company_name, results=5)
        if not search_results:
            print("No Wikipedia results found")
            return wikipedia_content

        # Try first result, validate it's a company page
        for result in search_results:
            try:
                page = wikipedia.page(result, auto_suggest=False)
                content_lower = page.content.lower()
                if any(keyword in content_lower for keyword in ['company', 'corporation', 'inc.', 'ltd.', 'business', 'founded', 'headquarters']):
                    wikipedia_content = {
                        "summary": page.summary,
                        "page_content": page.content,
                        "url": page.url,
                        "title": page.title,
                        "found": True
                    }
                    print(f"Found relevant Wikipedia page: {page.title}")
                    return wikipedia_content
            except wikipedia.exceptions.PageError:
                continue
            except wikipedia.exceptions.DisambiguationError as e:
                # Try the first disambiguation option
                try:
                    page = wikipedia.page(e.options[0], auto_suggest=False)
                    wikipedia_content = {
                        "summary": page.summary,
                        "page_content": page.content,
                        "url": page.url,
                        "title": page.title,
                        "found": True
                    }
                    print(f"Found via disambiguation: {page.title}")
                    return wikipedia_content
                except:
                    continue
        print("No valid company page found after trying multiple results.")
    except Exception as e:
        print(f"Error extracting Wikipedia content: {e}")
    return wikipedia_content

def extract_relevant_text(page_content, keywords, max_length=3000):
    """Extracts sentences containing specific keywords."""
    sentences = re.split(r'(?<=[.!?])\s+', page_content)
    relevant_text = []
    current_length = 0
    for sentence in sentences:
        if any(keyword in sentence.lower() for keyword in keywords):
            relevant_text.append(sentence)
            current_length += len(sentence)
            if current_length > max_length:
                break
    return " ".join(relevant_text) if relevant_text else page_content[:max_length]

def summarize_with_ai(wikipedia_content, topic, company_name):
    """Step 3 & 4: Extract relevant context and summarize with Groq (Llama)"""
    if not wikipedia_content["found"]:
        return None

    print(f"Summarizing '{topic}' for {company_name} with Groq...")

    topic_keywords = {
        "vision": ["vision", "aspiration", "future", "long-term goal", "aims to"],
        "mission": ["mission", "purpose", "core values", "objective", "commitment"],
        "founding_info": ["founded", "founder", "established", "history", "inception"],
        "business_model": ["business model", "operates", "revenue", "products", "services"],
        "products_services": ["products", "services", "offers", "platform", "develops"],
        "achievements": ["achievement", "milestone", "award", "recognition", "launched"],
        "financial_info": ["revenue", "profit", "income", "market cap", "valuation"],
        "founder": ["founder", "founded by", "co-founder", "established by"],
        "headquarters": ["headquarters", "headquartered", "based in", "located in"],
        "employees": ["employees", "workforce", "staff", "team size", "employs"],
    }

    context = extract_relevant_text(wikipedia_content["page_content"], topic_keywords.get(topic, []))

    prompts = {
        "vision": f"Based on the following text about {company_name}, what is the company's vision statement or long-term aspiration? Write it as 1-2 clear sentences. If not explicit, infer from goals and direction.\n\nContext: {context}",
        "mission": f"Summarize the mission or core purpose of {company_name} in 1-2 sentences based on this text. Focus on what the company does and whom it serves.\n\nContext: {context}",
        "founding_info": f"Describe the founding of {company_name}: include year, founder(s), and original purpose or idea. Write as a short paragraph.\n\nContext: {context}",
        "products_services": f"List the main products and services of {company_name} in a clean bulleted list format (use - for bullets).\n\nContext: {context}",
        "achievements": f"List 3–5 of the most significant recent achievements or milestones of {company_name} in bullet points.\n\nContext: {context}",
        "financial_info": f"Extract the latest available key financial figures for {company_name} (e.g., revenue, profit, market cap) and the year they refer to. Present concisely.\n\nContext: {context}",
        "founder": f"Who founded {company_name}? Return only the name(s) of the founder(s), comma-separated if multiple. If unknown, say 'Not available'.\n\nContext: {context}",
        "headquarters": f"Where is {company_name} headquartered? Return only the city and country (e.g., 'Cupertino, California, United States'). If unknown, say 'Not available'.\n\nContext: {context}",
        "employees": f"How many employees does {company_name} have? Return the number and year if available (e.g., '165,000 (2023)'). If unknown, say 'Not available'.\n\nContext: {context}",
    }

    prompt = prompts.get(topic)
    if not prompt:
        return f"No prompt configured for topic: {topic}"

    result = call_groq_model(prompt, max_tokens=250, temperature=0.2)
    return result.strip() if result else "Information not available."

def process_company_profile(user_input):
    """Main processing function"""
    print(f"\n=== Starting company profile processing for: {user_input} ===")
    profile = {
        "original_input": user_input,
        "full_company_name": "",
        "vision": None,
        "mission": None,
        "founding_info": None,
        "products_services": [],
        "recent_achievements": [],
        "financial_info": None,
        "founder": None,
        "headquarters": None,
        "employees": None,
        "wikipedia_source": "",
        "processing_steps": []
    }

    try:
        profile["processing_steps"].append("🔍 Finding full company name with Groq (Llama 3.1)...")
        full_name = find_full_company_name(user_input)
        profile["full_company_name"] = full_name
        profile["processing_steps"].append(f"✅ Full name: {full_name}")

        profile["processing_steps"].append("📚 Searching Wikipedia...")
        wikipedia_content = extract_wikipedia_content(full_name)

        if not wikipedia_content["found"]:
            profile["processing_steps"].append("❌ No relevant Wikipedia page found.")
            profile["vision"] = f"Could not find a reliable Wikipedia page for '{full_name}'."
            return profile

        profile["wikipedia_source"] = wikipedia_content["url"]
        profile["processing_steps"].append(f"✅ Found: {wikipedia_content['title']}")

        topics = [
            ("vision", "🎯 Summarizing Vision..."),
            ("mission", "🧭 Summarizing Mission..."),
            ("founding_info", "📅 Summarizing Founding..."),
            ("founder", "👤 Identifying Founder(s)..."),
            ("headquarters", "📍 Locating Headquarters..."),
            ("employees", "👥 Employee Count..."),
            ("products_services", "📦 Products & Services..."),
            ("achievements", "🏆 Recent Achievements..."),
            ("financial_info", "💰 Financial Info...")
        ]

        for topic, step_msg in topics:
            profile["processing_steps"].append(step_msg)
            summary = summarize_with_ai(wikipedia_content, topic, full_name)
            if summary and summary not in ["Information not available.", "Not available"]:
                if topic in ["products_services", "recent_achievements"]:
                    # Parse bullet points
                    items = [line.strip("-•* ").strip() for line in summary.split('\n') if line.strip().startswith(('-', '•', '*')) or line.strip()]
                    if not items:  # fallback
                        items = [s.strip() for s in summary.split('\n') if s.strip()]
                    profile[topic if topic != "achievements" else "recent_achievements"] = items
                else:
                    profile[topic] = summary
                profile["processing_steps"].append(f"✅ {topic.replace('_', ' ').title()} completed")
            else:
                profile["processing_steps"].append(f"ℹ️ {topic.replace('_', ' ').title()}: Not available")

        profile["processing_steps"].append("🎉 Processing completed!")

    except Exception as e:
        print(f"Critical error: {e}")
        profile["processing_steps"].append(f"❌ Error: {str(e)}")

    return profile

# --- API Routes ---

@companyscrap_bp.route('/api/company-profile', methods=['POST'])
def company_profile():
    try:
        data = request.get_json()
        company_input = data.get('company_name', '').strip()
        if not company_input:
            return jsonify({"error": "Company name is required"}), 400

        profile = process_company_profile(company_input)
        return jsonify({"success": True, "data": profile}), 200
    except Exception as e:
        print(f"API Error: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@companyscrap_bp.route('/health', methods=['GET'])
def health_check():
    return jsonify({
        'status': 'healthy',
        'message': 'Company Profile service running with Groq (Llama 3.1)',
        'groq_configured': bool(GROQ_API_KEY),
        'model': GROQ_MODEL
    }), 200

@companyscrap_bp.route('/', methods=['GET'])
def index():
    return jsonify({
        'service': 'Company Profile API (Powered by Groq + Llama 3.1)',
        'version': '1.1.0',
        'model': GROQ_MODEL,
        'endpoints': {
            'POST /api/company-profile': 'Get structured company profile',
            'GET /health': 'Health check',
            'GET /': 'API documentation'
        },
        'workflow': [
            'User Input → Groq Llama 3.1 (resolve full name)',
            'Wikipedia search & content extraction',
            'Topic-specific context extraction',
            'Groq Llama 3.1 summarizes each section',
            'Return structured JSON'
        ]
    }), 200