"""
Company Profile Blueprint for Flask Application
Enhanced Company Profile Backend Server
Workflow: User Input -> Groq (find full name) -> Wikipedia -> Content extraction -> Groq summarization -> Frontend
"""

from flask import Blueprint, request, jsonify
import os
import re
import wikipedia
import requests
from bs4 import BeautifulSoup
from langchain_groq import ChatGroq
from dotenv import load_dotenv

# Load environment variables
load_dotenv()

# Blueprint for Company Scrap
companyscrap_bp = Blueprint('companyscrap', __name__, url_prefix='/companyscrap')

# --- Global Configuration ---
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def call_groq_model(prompt, max_tokens=250, temperature=0.8):
    """Generic function to call the Groq model."""
    if not os.getenv("GROQ_API_KEY"):
        print("Groq API key not configured. Set GROQ_API_KEY environment variable. Skipping model call.")
        return "AI model not available. API key is missing."

    try:
        # Initialize Groq Chat Model
        llm = ChatGroq(
            model_name="llama-3.1-8b-instant",
            temperature=temperature,
            max_tokens=max_tokens
        )
        response = llm.invoke(prompt)
        
        # Clean the response to remove potential markdown formatting if needed
        # (Though ChatGroq usually returns clean text, we strip just in case)
        return re.sub(r'[\*`]', '', response.content).strip()
    except Exception as e:
        print(f"Error calling Groq model: {e}")
        return None

def find_full_company_name(user_input):
    """Step 1: Use Groq to find the full company name from user input"""
    print(f"Finding full company name for: '{user_input}'")
    prompt = f"""
    Given the company name or ticker symbol: "{user_input}"
    What is the full, official legal name of this company?
    Examples:
    - Input: "Apple" -> Output: "Apple Inc."
    - Input: "Google" -> Output: "Alphabet Inc."
    
    Respond with ONLY the full company name and nothing else. Do not add any explanation.
    """
    full_name = call_groq_model(prompt, max_tokens=50, temperature=0.0)
    if full_name and full_name.strip():
        cleaned_name = full_name.replace('"', '').strip()
        print(f"Full company name found via Groq: {cleaned_name}")
        return cleaned_name
    else:
        print(f"Groq failed, using fallback. Using original input as full name: {user_input}")
        return user_input.strip()

def extract_wikipedia_content(company_name):
    """Step 2: Extract content from Wikipedia"""
    print(f"Extracting Wikipedia content for: {company_name}")
    wikipedia_content = {"summary": "", "page_content": "", "url": "", "found": False}
    try:
        search_results = wikipedia.search(company_name, results=3)
        if not search_results:
            print("No Wikipedia results found")
            return wikipedia_content
        page = wikipedia.page(search_results[0], auto_suggest=False)
        if any(keyword in page.content.lower() for keyword in ['company', 'corporation', 'inc.', 'ltd.', 'business', 'founded']):
            wikipedia_content = {"summary": page.summary, "page_content": page.content, "url": page.url, "title": page.title, "found": True}
            print(f"Found relevant Wikipedia page: {page.title}")
    except wikipedia.exceptions.DisambiguationError as e:
        print(f"Disambiguation error. Trying first option: {e.options[0]}")
        try:
            page = wikipedia.page(e.options[0], auto_suggest=False)
            wikipedia_content = {"summary": page.summary, "page_content": page.content, "url": page.url, "title": page.title, "found": True}
            print(f"Found Wikipedia page via disambiguation: {page.title}")
        except Exception as e_inner:
            print(f"Could not resolve disambiguation: {e_inner}")
    except Exception as e:
        print(f"Error extracting Wikipedia content: {e}")
    return wikipedia_content

def extract_relevant_text(page_content, keywords, max_length=2000):
    """Extracts sentences containing specific keywords from a larger text."""
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
    """Step 3 & 4: Extract relevant context and summarize with Groq"""
    if not wikipedia_content["found"]:
        return None
    print(f"Summarizing '{topic}' content for {company_name} with Groq...")
    topic_keywords = {
        "vision": ["vision", "aspiration", "future goal", "aims to"],
        "mission": ["mission", "purpose", "core values", "objective"],
        "founding_info": ["founded", "founder", "established", "history", "inception"],
        "business_model": ["business model", "operates", "revenue", "products", "services"],
        "products_services": ["products", "services", "offers", "sells", "develops"],
        "achievements": ["achievement", "milestone", "award", "recognition"],
        "financial_info": ["revenue", "net income", "profit", "assets", "market capitalization"],
        # New keywords for the new fields
        "founder": ["founder", "founded by", "established by"],
        "headquarters": ["headquarters", "headquartered", "based in", "main office"],
        "employees": ["employees", "number of employees", "staff", "workforce"],
    }
    context = extract_relevant_text(wikipedia_content["page_content"], topic_keywords.get(topic, []))
    prompts = {
        "vision": f"Based on this text about {company_name}, what is its corporate vision? Summarize it into a concise statement (1-2 sentences). If not explicitly stated, infer its long-term aspiration. Context: '{context}'",
        "mission": f"Based on this text about {company_name}, what is its corporate mission? Summarize what the company does and for whom in 1-2 sentences. Context: '{context}'",
        "founding_info": f"From this text about {company_name}, describe its founding. Include the year, founders, and original purpose. Format as a short paragraph. Context: '{context}'",
        "products_services": f"Based on this content for {company_name}, list its main products and/or services. Use a bulleted list format. Context: '{context}'",
        "achievements": f"From the provided text about {company_name}, list 3-4 of its most significant recent achievements or milestones. Use a bulleted list. Context: '{context}'",
        "financial_info": f"Extract key financial metrics for {company_name} from this text. Look for revenue or market cap, and include the year if available. Present it concisely. Context: '{context}'",
        # New prompts for the new fields
        "founder": f"From the text about {company_name}, who is the founder or who are the founders? Respond with only the name(s) (e.g., 'Steve Jobs, Steve Wozniak, Ronald Wayne'). If not found, respond with 'Not available'. Context: '{context}'",
        "headquarters": f"From the text about {company_name}, where is its headquarters? Provide the city and country (e.g., 'Westminster, Colorado, U.S.'). If not found, respond with 'Not available'. Context: '{context}'",
        "employees": f"From this text about {company_name}, what is the number of employees? Provide the number and the year if available (e.g., '164,000 (2022)'). If not found, respond with 'Not available'. Context: '{context}'",
    }
    prompt = prompts.get(topic)
    if not prompt: return f"No summarization prompt configured for topic: {topic}"
    result = call_groq_model(prompt, max_tokens=200, temperature=0.1)
    return result if result and result.strip() else "Information not found in the provided context."

def process_company_profile(user_input):
    """Main processing function following the required workflow"""
    print(f"\n=== Starting company profile processing for: {user_input} ===")
    profile = {
        "original_input": user_input, "full_company_name": "", "vision": None, "mission": None,
        "founding_info": None, "products_services": [], "recent_achievements": [], "financial_info": None,
        # New fields added to the profile
        "founder": None, "headquarters": None, "employees": None,
        "wikipedia_source": "", "processing_steps": []
    }
    
    try:
        profile["processing_steps"].append("🔍 Finding full company name with Groq...")
        full_name = find_full_company_name(user_input)
        profile["full_company_name"] = full_name
        profile["processing_steps"].append(f"✅ Full name identified: {full_name}")
        
        profile["processing_steps"].append("📚 Searching Wikipedia...")
        wikipedia_content = extract_wikipedia_content(full_name)
        
        if not wikipedia_content["found"]:
            profile["processing_steps"].append("❌ No relevant Wikipedia page found.")
            profile["vision"] = f"Could not find a reliable Wikipedia page for '{full_name}'. Please try a more specific name."
            return profile

        profile["wikipedia_source"] = wikipedia_content["url"]
        profile["processing_steps"].append(f"✅ Wikipedia page found: {wikipedia_content['title']}")
        
        topics = [
            ("vision", "🎯 Summarizing Vision..."),
            ("mission", "🧭 Summarizing Mission..."),
            ("founding_info", "📅 Summarizing Founding Info..."),
            # New topics added to the processing queue
            ("founder", "👤 Identifying Founder(s)..."),
            ("headquarters", "📍 Locating Headquarters..."),
            ("employees", "👥 Counting Employees..."),
            ("products_services", "📦 Listing Products & Services..."),
            ("achievements", "🏆 Identifying Achievements..."),
            ("financial_info", "💰 Extracting Financial Info...")
        ]
        
        for topic, step_msg in topics:
            profile["processing_steps"].append(step_msg)
            summary = summarize_with_ai(wikipedia_content, topic, full_name)
            if summary:
                if topic in ["products_services", "recent_achievements"]:
                    items = [item.strip() for item in re.split(r'\n\s*[\*•-]\s*', summary) if item.strip()]
                    profile[topic] = items
                else:
                    profile[topic] = summary
                profile["processing_steps"].append(f"✅ {topic.replace('_', ' ').title()} processed.")
            else:
                profile["processing_steps"].append(f"⚠️ {topic.replace('_', ' ').title()} - AI summarization failed.")
        profile["processing_steps"].append("🎉 Processing completed successfully!")
    except Exception as e:
        print(f"An unexpected error occurred in process_company_profile: {e}")
        profile["processing_steps"].append(f"❌ Critical Error: {str(e)}")
        profile["vision"] = f"An error occurred while processing '{user_input}'. Please try again."
    return profile

# --- API Routes ---

@companyscrap_bp.route('/api/company-profile', methods=['POST'])
def company_profile():
    """Main endpoint to get company profile information"""
    try:
        data = request.get_json()
        company_input = data.get('company_name', '').strip()
        
        if not company_input:
            return jsonify({"error": "Company name is required"}), 400
        
        profile = process_company_profile(company_input)
        
        return jsonify({"success": True, "data": profile}), 200
    except Exception as e:
        print(f"Error processing POST request: {e}")
        return jsonify({"success": False, "error": str(e)}), 500

@companyscrap_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({
        'status': 'healthy',
        'message': 'Company Scrap service is running',
        'groq_configured': bool(os.getenv("GROQ_API_KEY"))
    }), 200

@companyscrap_bp.route('/', methods=['GET'])
def index():
    """Index page with API documentation"""
    return jsonify({
        'service': 'Company Profile API',
        'version': '1.0.0',
        'endpoints': {
            'POST /api/company-profile': 'Get company profile information',
            'GET /health': 'Health check',
            'GET /': 'This documentation'
        },
        'workflow': [
            'User Input -> Groq (find full name)',
            'Extract content from Wikipedia',
            'Extract topic-specific text from Wikipedia content',
            'Groq summarizes each topic (Vision, Mission, Founder, HQ, etc.)',
            'Structured JSON response sent to frontend'
        ]
    }), 200
