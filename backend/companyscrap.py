"""
Enhanced Company Profile Backend Server
Workflow: User Input → Gemini (find full name) → Wikipedia → Content extraction → Gemini summarization → Frontend
"""

import http.server
import socketserver
import json
import os
import re
import wikipedia
import requests
from bs4 import BeautifulSoup
import google.generativeai as genai

# --- Gemini API Configuration ---
# Securely get the API key from environment variables.
# Get your free key from Google AI Studio: https://aistudio.google.com/app/apikey
GEMINI_API_KEY = "AIzaSyAMHofGFNDtR1FIwVNooqsCRcnxW15MDUQ"

# --- Global Configuration ---
HEADERS = {
    "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/91.0.4472.124 Safari/537.36"
}

def call_gemini_model(prompt, max_tokens=250, temperature=0.8):
    """Generic function to call the Gemini model."""
    if not GEMINI_API_KEY:
        print("Gemini API key not configured. Set GOOGLE_API_KEY environment variable. Skipping model call.")
        return "AI model not available. API key is missing."

    try:
        genai.configure(api_key=GEMINI_API_KEY)
        generation_config = {"temperature": temperature, "max_output_tokens": max_tokens}
        model = genai.GenerativeModel(model_name="gemini-2.0-flash-lite", generation_config=generation_config)
        response = model.generate_content(prompt)
        # Clean the response to remove potential markdown formatting
        return re.sub(r'[\*`]', '', response.text).strip()
    except Exception as e:
        print(f"Error calling Gemini model: {e}")
        return None

def find_full_company_name(user_input):
    """Step 1: Use Gemini to find the full company name from user input"""
    print(f"Finding full company name for: '{user_input}'")
    prompt = f"""
    Given the company name or ticker symbol: "{user_input}"
    What is the full, official legal name of this company?
    Examples:
    - Input: "Apple" -> Output: "Apple Inc."
    - Input: "Google" -> Output: "Alphabet Inc."
    Respond with ONLY the full company name and nothing else.
    """
    full_name = call_gemini_model(prompt, max_tokens=50, temperature=0.0)
    if full_name and full_name.strip():
        cleaned_name = full_name.replace('"', '').strip()
        print(f"Full company name found via Gemini: {cleaned_name}")
        return cleaned_name
    else:
        print(f"Gemini failed, using fallback. Using original input as full name: {user_input}")
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
    """Step 3 & 4: Extract relevant context and summarize with Gemini"""
    if not wikipedia_content["found"]:
        return None
    print(f"Summarizing '{topic}' content for {company_name} with Gemini...")
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
    result = call_gemini_model(prompt, max_tokens=200, temperature=0.1)
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
        profile["processing_steps"].append("🔍 Finding full company name with Gemini...")
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

# --- HTTP Server Class (No changes needed here) ---
class CompanyProfileHandler(http.server.SimpleHTTPRequestHandler):
    def do_OPTIONS(self):
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        if self.path == '/api/company-profile':
            try:
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode('utf-8'))
                company_input = request_data.get('company_name', '').strip()
                
                if not company_input:
                    self.send_response(400, "Bad Request")
                    self.send_header('Content-type', 'application/json'); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
                    self.wfile.write(json.dumps({"error": "Company name is required"}).encode())
                    return
                
                profile = process_company_profile(company_input)
                
                self.send_response(200)
                self.send_header('Content-type', 'application/json'); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
                self.wfile.write(json.dumps({"success": True, "data": profile}, ensure_ascii=False).encode('utf-8'))
            except Exception as e:
                print(f"Error processing POST request: {e}")
                self.send_response(500)
                self.send_header('Content-type', 'application/json'); self.send_header('Access-Control-Allow-Origin', '*'); self.end_headers()
                self.wfile.write(json.dumps({"success": False, "error": str(e)}).encode())
        else:
            self.send_response(404); self.end_headers()

    def do_GET(self):
        if self.path == '/':
            self.send_response(200)
            self.send_header('Content-type', 'text/html'); self.end_headers()
            html = """
            <!DOCTYPE html><html><head><title>Company Profile API</title>
            <style>body{font-family:-apple-system,BlinkMacSystemFont,Segoe UI,Roboto,Helvetica,Arial,sans-serif;margin:40px;background:#f9f9f9;color:#333}h1,h2,h3{color:#1a1a1a}div{background:white;padding:20px;border-radius:8px;box-shadow:0 2px 4px rgba(0,0,0,0.1);margin:20px 0}.step{margin:10px 0;padding:10px;background:#eef;border-left:4px solid #4a90e2;border-radius:4px}.warning{color:#c0392b;background:#fbeae5;padding:15px;border-radius:4px;border-left:4px solid #c0392b}code{background:#eee;padding:2px 6px;border-radius:4px}</style>
            </head><body>
            <h1>Company Profile Backend API (Powered by Gemini)</h1><p>Server is running on port 8000.</p>
            <div><h2>Processing Workflow:</h2>
            <div class="step">1. User Input → <b>Gemini</b> finds full company name</div>
            <div class="step">2. Extract content from Wikipedia</div>
            <div class="step">3. Extract topic-specific text from Wikipedia content</div>
            <div class="step">4. <b>Gemini</b> summarizes each topic (Vision, Mission, Founder, HQ, etc.)</div>
            <div class="step">5. Structured JSON response sent to frontend</div></div>
            <h3>API Usage:</h3><p>POST to <code>/api/company-profile</code> with JSON: <code>{"company_name": "Your Company"}</code></p>
            <div class="warning"><b>Action Required:</b> This server uses the Google Gemini API. For full functionality, you must set an environment variable with your API key. Get a free key at <a href="https://aistudio.google.com/app/apikey">Google AI Studio</a>, then set the <code>GOOGLE_API_KEY</code> environment variable.</div>
            </body></html>
            """
            self.wfile.write(html.encode())
        else:
            self.send_response(404); self.end_headers()

def run_server(port=8000):
    print("=" * 60); print("COMPANY PROFILE BACKEND SERVER (GEMINI EDITION)"); print("=" * 60)
    if not GEMINI_API_KEY:
        print("\n⚠️  WARNING: Google Gemini API key not configured!")
        print("   To enable all features, get a free key from Google AI Studio and set the GOOGLE_API_KEY environment variable.")
    else:
        print("\n✅ Google Gemini API key configured successfully.")
    try:
        with socketserver.TCPServer(("", port), CompanyProfileHandler) as httpd:
            print(f"\n🚀 Server running at: http://localhost:{port}"); print(f"📡 API endpoint: POST /api/company-profile"); print("\nPress Ctrl+C to stop the server"); print("=" * 60)
            httpd.serve_forever()
    except OSError as e: print(f"\n❌ Error starting server: {e}. Is port {port} already in use?")
    except KeyboardInterrupt: print("\n\n⏹️  Server stopped by user.")

if __name__ == "__main__":
    run_server(8000)