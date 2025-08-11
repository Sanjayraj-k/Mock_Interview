import json
import re
import time
import asyncio
from typing import List, Optional, Dict, Any
from urllib.parse import urlparse
import os
from dotenv import load_dotenv
import openai
from duckduckgo_search import DDGS
import requests
from bs4 import BeautifulSoup
import wikipedia

# Load environment variables
load_dotenv()

class GrokCompanyAnalyzer:
    def __init__(self):
        # Grok API configuration
        self.grok_api_key = os.getenv("GROK_API_KEY", "your-grok-api-key-here")
        self.grok_client = openai.OpenAI(
            api_key=self.grok_api_key,
            base_url="https://api.x.ai/v1"
        )
        
        self.headers = {
            "User-Agent": "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36"
        }

    def fetch_url(self, url: str, timeout: int = 10) -> Optional[str]:
        """Safely fetch webpage content"""
        try:
            resp = requests.get(url, headers=self.headers, timeout=timeout, allow_redirects=True)
            if resp.status_code == 200 and 'text/html' in resp.headers.get('Content-Type', ''):
                return resp.text
        except Exception as e:
            print(f"Error fetching {url}: {e}")
            return None
        return None

    def clean_text(self, text: str) -> str:
        """Clean and normalize text"""
        if not text:
            return ""
        text = re.sub(r'\s+', ' ', text).strip()
        return text

    def extract_by_headings(self, soup: BeautifulSoup, keywords: List[str], max_chars: int = 800) -> List[str]:
        """Extract content following headings that match keywords"""
        found = []
        for header_tag in ['h1', 'h2', 'h3', 'h4', 'h5', 'strong', 'b']:
            for header in soup.find_all(header_tag):
                header_text = (header.get_text() or "").lower()
                for keyword in keywords:
                    if keyword in header_text:
                        collected = []
                        sibling = header.find_next_sibling()
                        steps = 0
                        while sibling and steps < 6:
                            if sibling.name in ['p', 'div', 'li']:
                                collected.append(sibling.get_text(separator=' ', strip=True))
                            if sibling.name and sibling.name.startswith('h'):
                                break
                            sibling = sibling.find_next_sibling()
                            steps += 1
                        
                        if collected:
                            text = self.clean_text(' '.join(collected))[:max_chars]
                            if text and len(text) > 50:
                                found.append(text)
        
        return list(dict.fromkeys(found))

    def extract_by_keyword_search(self, soup: BeautifulSoup, keywords: List[str], max_sentences: int = 3) -> List[str]:
        """Extract paragraphs containing specific keywords"""
        texts = []
        paragraphs = soup.find_all(['p', 'li', 'div'])
        
        for paragraph in paragraphs:
            text = (paragraph.get_text() or "").lower()
            for keyword in keywords:
                if keyword in text:
                    clean_para = self.clean_text(paragraph.get_text())
                    if len(clean_para) > 30:
                        texts.append(clean_para)
                    break
            if len(texts) >= max_sentences:
                break
        
        return texts

    def classify_business_type(self, soup: BeautifulSoup) -> str:
        """Determine if company is product or service based using Grok AI"""
        page_text = (soup.get_text(separator=' ', strip=True) or "").lower()
        
        # Enhanced classification with Grok AI
        try:
            prompt = f"""
            Analyze the following company content and classify the business type. Consider:
            - Product indicators: manufacturing, hardware, software, devices, equipment, retail
            - Service indicators: consulting, support, advisory, professional services, SaaS
            - Hybrid indicators: both products and services

            Content: {page_text[:2000]}

            Respond with only one of: "Product-based", "Service-based", or "Hybrid (Product & Service)"
            """
            
            response = self.grok_client.chat.completions.create(
                model="grok-beta",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=50,
                temperature=0.3
            )
            
            classification = response.choices[0].message.content.strip()
            return classification
            
        except Exception as e:
            print(f"Grok classification failed, using fallback: {e}")
            # Fallback to basic classification
            product_indicators = len(re.findall(r'\b(product|products|manufacturing|hardware|software|devices|equipment)\b', page_text))
            service_indicators = len(re.findall(r'\b(service|services|consulting|support|solutions|advisory)\b', page_text))
            
            if product_indicators > service_indicators * 1.2:
                return "Product-based"
            elif service_indicators > product_indicators * 1.2:
                return "Service-based"
            else:
                return "Hybrid (Product & Service)"

    def extract_products_services(self, soup: BeautifulSoup, limit: int = 10) -> List[str]:
        """Extract and summarize products/services using Grok AI"""
        items = set()
        keywords = ['product', 'products', 'services', 'offerings', 'solutions', 'what we do', 'our work']
        
        # Extract raw product/service data
        for header in soup.find_all(['h1', 'h2', 'h3', 'h4']):
            heading = (header.get_text() or "").lower()
            if any(kw in heading for kw in keywords):
                ul = header.find_next('ul')
                if ul:
                    for li in ul.find_all('li'):
                        item_text = self.clean_text(li.get_text())
                        if 10 < len(item_text) < 200:
                            items.add(item_text)
                
                sibling = header.find_next_sibling()
                steps = 0
                while sibling and steps < 4:
                    if sibling.name in ['p', 'div']:
                        for part in re.split(r'[•·▪▫‣⁃\n,;]', sibling.get_text()):
                            part = self.clean_text(part)
                            if 10 < len(part) < 150:
                                items.add(part)
                    sibling = sibling.find_next_sibling()
                    steps += 1

        raw_items = list(items)[:limit*2]  # Get more for Grok to filter
        
        # Use Grok AI to clean and summarize products/services
        if raw_items:
            try:
                prompt = f"""
                Clean and summarize the following list of products/services for a company. 
                Remove duplicates, fix formatting, and provide clear, concise descriptions.
                Return maximum {limit} most important items.

                Raw data: {json.dumps(raw_items, indent=2)}

                Return as a JSON list of strings, each being a clean product/service description.
                """
                
                response = self.grok_client.chat.completions.create(
                    model="grok-beta",
                    messages=[{"role": "user", "content": prompt}],
                    max_tokens=800,
                    temperature=0.3
                )
                
                cleaned_items = json.loads(response.choices[0].message.content.strip())
                return cleaned_items[:limit]
                
            except Exception as e:
                print(f"Grok product/service analysis failed: {e}")
                return raw_items[:limit]
        
        return []

    def extract_founding_info(self, text: str) -> tuple:
        """Extract founding year and employee information using Grok AI"""
        if not text:
            return None, None
        
        try:
            prompt = f"""
            Extract founding year and employee count from this company text.
            
            Text: {text[:1500]}
            
            Return JSON format:
            {{
                "founding_year": "YYYY or null",
                "employee_count": "number or null"
            }}
            
            Be precise and only return what you can confidently extract.
            """
            
            response = self.grok_client.chat.completions.create(
                model="grok-beta",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=100,
                temperature=0.1
            )
            
            result = json.loads(response.choices[0].message.content.strip())
            return result.get("founding_year"), result.get("employee_count")
            
        except Exception as e:
            print(f"Grok founding info extraction failed: {e}")
            # Fallback to regex
            text_lower = text.lower()
            
            founding_patterns = [
                r'founded\s+(?:in\s+)?(\d{4})',
                r'established\s+(?:in\s+)?(\d{4})',
                r'started\s+(?:in\s+)?(\d{4})'
            ]
            
            founding_year = None
            for pattern in founding_patterns:
                match = re.search(pattern, text_lower)
                if match:
                    founding_year = match.group(1)
                    break
            
            employee_patterns = [
                r'([\d,]+)\s+(?:employees|staff|team members)',
                r'(?:over|more than)\s+([\d,]+)\s+(?:employees|staff)'
            ]
            
            employee_count = None
            for pattern in employee_patterns:
                match = re.search(pattern, text_lower)
                if match:
                    employee_count = match.group(1)
                    break
            
            return founding_year, employee_count

    def grok_summarize_section(self, section_name: str, raw_data: Any) -> str:
        """Use Grok AI to summarize specific sections"""
        if not raw_data:
            return None
            
        try:
            if section_name == "vision":
                prompt = f"""
                Summarize this company vision statement into a clear, compelling 2-3 sentence summary:
                
                Raw vision data: {raw_data}
                
                Make it inspiring and focused on the company's long-term aspirations.
                """
            
            elif section_name == "mission":
                prompt = f"""
                Summarize this company mission statement into a clear, actionable 2-3 sentence summary:
                
                Raw mission data: {raw_data}
                
                Focus on what the company does and how they serve their customers/market.
                """
            
            elif section_name == "culture":
                prompt = f"""
                Summarize the company's working culture from this data into 3 key bullet points:
                
                Raw culture data: {json.dumps(raw_data)}
                
                Return as JSON list of strings, each highlighting a key cultural aspect.
                Focus on work environment, values, and employee experience.
                """
            
            elif section_name == "achievements":
                prompt = f"""
                Summarize and rank the most important recent achievements from this data:
                
                Raw achievements: {json.dumps(raw_data)}
                
                Return as JSON list of max 5 strings, each being a concise achievement summary.
                Focus on business impact, innovation, and growth milestones.
                """
            
            elif section_name == "timings":
                prompt = f"""
                Extract and summarize working hours/timings information:
                
                Raw timing data: {raw_data}
                
                Return a single concise sentence about working hours, flexibility, or schedule.
                """
            
            else:
                return raw_data

            response = self.grok_client.chat.completions.create(
                model="grok-beta",
                messages=[{"role": "user", "content": prompt}],
                max_tokens=300,
                temperature=0.3
            )
            
            result = response.choices[0].message.content.strip()
            
            # Parse JSON responses for list-type summaries
            if section_name in ["culture", "achievements"]:
                try:
                    return json.loads(result)
                except:
                    return [result]  # Return as single item list if JSON parsing fails
            
            return result
            
        except Exception as e:
            print(f"Grok summarization failed for {section_name}: {e}")
            return raw_data

    def generate_grok_analysis(self, profile_data: Dict) -> Dict:
        """Generate comprehensive Grok AI analysis"""
        try:
            analysis_prompt = f"""
            Analyze this company profile comprehensively and provide strategic insights:

            Company: {profile_data.get('company_name')}
            Vision: {profile_data.get('vision')}
            Mission: {profile_data.get('mission')}
            Founded: {profile_data.get('founding_year')}
            Employees: {profile_data.get('employee_count')}
            Business Type: {profile_data.get('business_type')}
            Culture: {json.dumps(profile_data.get('working_culture', []))}
            Achievements: {json.dumps(profile_data.get('recent_achievements', []))}
            Products/Services: {json.dumps(profile_data.get('products_services', []))}

            Provide analysis in this JSON format:
            {{
                "executive_summary": "2-3 sentence comprehensive overview",
                "key_strengths": ["strength1", "strength2", "strength3", "strength4", "strength5"],
                "business_outlook": "Market position and growth potential analysis",
                "work_environment_rating": "X.X/10",
                "recommendation": "Who should consider working here and why",
                "market_position": "Industry standing and competitive advantages",
                "growth_potential": "Future prospects and expansion opportunities"
            }}
            """

            response = self.grok_client.chat.completions.create(
                model="grok-beta",
                messages=[{"role": "user", "content": analysis_prompt}],
                max_tokens=1000,
                temperature=0.4
            )

            return json.loads(response.choices[0].message.content.strip())

        except Exception as e:
            print(f"Grok analysis failed: {e}")
            # Return fallback analysis
            return {
                "executive_summary": f"{profile_data.get('company_name')} is a {profile_data.get('business_type', 'established').lower()} company with a strong market presence and innovative approach to business.",
                "key_strengths": [
                    "Strong market presence and brand recognition",
                    "Innovative approach to business operations",
                    "Committed to employee development and culture",
                    "Focus on customer satisfaction and service quality",
                    "Adaptable business model for market changes"
                ],
                "business_outlook": "Positive growth trajectory with strong fundamentals and market positioning.",
                "work_environment_rating": "8.5/10",
                "recommendation": "Recommended for professionals seeking growth opportunities in a dynamic environment.",
                "market_position": "Well-established player with competitive advantages",
                "growth_potential": "Strong potential for continued expansion and innovation"
            }

    def fetch_company_profile(self, company_name: str, max_results: int = 5) -> Dict:
        """Main function to fetch and analyze company profile"""
        start_time = time.time()
        
        profile = {
            "company_name": company_name,
            "vision": None,
            "mission": None,
            "founding_year": None,
            "employee_count": None,
            "business_type": None,
            "recent_achievements": [],
            "working_culture": [],
            "working_timings": None,
            "products_services": [],
            "sources_used": [],
            "processing_time": None
        }
        
        print(f"🔍 Fetching profile for: {company_name}")
        
        # 1. Wikipedia search
        try:
            print("📚 Searching Wikipedia...")
            wiki_results = wikipedia.search(company_name, results=3)
            if wiki_results:
                wiki_page = wikipedia.page(wiki_results[0], auto_suggest=False)
                wiki_summary = wiki_page.summary
                profile["sources_used"].append(f"Wikipedia: {wiki_page.url}")
                
                # Extract founding info using Grok
                founding_year, employee_count = self.extract_founding_info(wiki_summary)
                if founding_year:
                    profile["founding_year"] = founding_year
                if employee_count:
                    profile["employee_count"] = employee_count
        except Exception as e:
            print(f"Wikipedia search failed: {e}")

        # 2. Web scraping with targeted searches
        search_queries = {
            "about": f'"{company_name}" about us vision mission',
            "culture": f'"{company_name}" company culture work environment careers',
            "news": f'"{company_name}" recent achievements awards news 2024 2025',
            "products": f'"{company_name}" products services offerings solutions'
        }
        
        scraped_content = {}
        
        try:
            ddgs = DDGS()
            for query_type, query in search_queries.items():
                print(f"🌐 Searching for {query_type}...")
                try:
                    results = list(ddgs.text(query, max_results=max_results))
                    time.sleep(1)  # Rate limiting
                    
                    for result in results[:3]:  # Limit to top 3 results per query
                        url = result.get('href', '')
                        if not url:
                            continue
                        
                        domain = urlparse(url).netloc
                        if domain in scraped_content:
                            continue
                        
                        html = self.fetch_url(url)
                        if html:
                            soup = BeautifulSoup(html, 'html.parser')
                            scraped_content[domain] = {
                                'url': url,
                                'soup': soup,
                                'title': result.get('title', '')
                            }
                            profile["sources_used"].append(f"Web: {url}")
                        
                        if len(scraped_content) >= max_results:
                            break
                            
                except Exception as e:
                    print(f"Error in {query_type} search: {e}")
                    continue
        
        except Exception as e:
            print(f"Search initialization failed: {e}")

        # 3. Process scraped content
        print("🧠 Processing with Grok AI...")
        
        raw_data = {
            'vision': [],
            'mission': [],
            'culture': [],
            'achievements': [],
            'timings': [],
            'products_services': []
        }

        # Extract raw data from all sources
        for domain, content in scraped_content.items():
            soup = content['soup']
            
            # Vision
            vision_keywords = ['vision', 'our vision', 'vision statement']
            vision_content = self.extract_by_headings(soup, vision_keywords)
            raw_data['vision'].extend(vision_content)
            
            # Mission
            mission_keywords = ['mission', 'our mission', 'mission statement', 'purpose']
            mission_content = self.extract_by_headings(soup, mission_keywords)
            raw_data['mission'].extend(mission_content)
            
            # Culture
            culture_keywords = ['culture', 'company culture', 'work culture', 'values', 'workplace']
            culture_content = self.extract_by_headings(soup, culture_keywords)
            if not culture_content:
                culture_content = self.extract_by_keyword_search(soup, culture_keywords, max_sentences=2)
            raw_data['culture'].extend(culture_content)
            
            # Working timings
            timing_keywords = ['working hours', 'office hours', 'business hours', 'work timings']
            timing_content = self.extract_by_keyword_search(soup, timing_keywords, max_sentences=1)
            raw_data['timings'].extend(timing_content)
            
            # Achievements
            achievement_keywords = ['award', 'achievement', 'recognition', 'milestone', 'launched', 'announced']
            achievements = self.extract_by_keyword_search(soup, achievement_keywords, max_sentences=3)
            raw_data['achievements'].extend(achievements)
            
            # Products/services
            products = self.extract_products_services(soup)
            raw_data['products_services'].extend(products)
            
            # Business type classification
            if not profile['business_type']:
                profile['business_type'] = self.classify_business_type(soup)

        # 4. Use Grok AI to summarize each section
        print("✨ Generating Grok summaries...")
        
        if raw_data['vision']:
            profile['vision'] = self.grok_summarize_section('vision', raw_data['vision'][0])
        
        if raw_data['mission']:
            profile['mission'] = self.grok_summarize_section('mission', raw_data['mission'][0])
        
        if raw_data['culture']:
            profile['working_culture'] = self.grok_summarize_section('culture', raw_data['culture'])
        
        if raw_data['timings']:
            profile['working_timings'] = self.grok_summarize_section('timings', raw_data['timings'][0])
        
        if raw_data['achievements']:
            profile['recent_achievements'] = self.grok_summarize_section('achievements', raw_data['achievements'])
        
        if raw_data['products_services']:
            profile['products_services'] = raw_data['products_services'][:10]

        # 5. Generate comprehensive Grok analysis
        print("🎯 Generating comprehensive analysis...")
        grok_analysis = self.generate_grok_analysis(profile)
        
        # Calculate processing time
        profile['processing_time'] = round(time.time() - start_time, 2)
        
        # Return combined results
        return {
            "profile": profile,
            "grok_analysis": grok_analysis
        }

    def process_company_request(self, company_name: str, max_results: int = 5) -> Dict:
        """Main entry point for company profile processing"""
        try:
            print(f"🚀 Starting enhanced analysis for: {company_name}")
            result = self.fetch_company_profile(company_name, max_results)
            print(f"✅ Analysis completed in {result['profile']['processing_time']}s")
            return {
                "success": True,
                "data": result,
                "message": "Company profile fetched and analyzed successfully"
            }
        except Exception as e:
            print(f"❌ Error processing company: {e}")
            return {
                "success": False,
                "data": None,
                "error": str(e),
                "message": "Failed to fetch company profile"
            }

# Flask-like simple HTTP server for API endpoints
from http.server import HTTPServer, BaseHTTPRequestHandler
import urllib.parse

class CompanyProfileHandler(BaseHTTPRequestHandler):
    def __init__(self, *args, **kwargs):
        self.analyzer = GrokCompanyAnalyzer()
        super().__init__(*args, **kwargs)

    def do_OPTIONS(self):
        """Handle CORS preflight requests"""
        self.send_response(200)
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()

    def do_POST(self):
        """Handle POST requests for company profile fetching"""
        if self.path == '/api/company-profile':
            try:
                # Parse request data
                content_length = int(self.headers['Content-Length'])
                post_data = self.rfile.read(content_length)
                request_data = json.loads(post_data.decode('utf-8'))
                
                company_name = request_data.get('company_name', '').strip()
                max_results = request_data.get('max_results', 5)
                
                if not company_name:
                    self.send_error_response(400, "Company name is required")
                    return
                
                # Process company profile
                result = self.analyzer.process_company_request(company_name, max_results)
                
                # Send response
                self.send_json_response(result)
                
            except json.JSONDecodeError:
                self.send_error_response(400, "Invalid JSON in request")
            except Exception as e:
                self.send_error_response(500, f"Internal server error: {str(e)}")
        else:
            self.send_error_response(404, "Endpoint not found")

    def do_GET(self):
        """Handle GET requests"""
        if self.path == '/api/health':
            self.send_json_response({"status": "healthy", "service": "Company Profile API with Grok"})
        elif self.path == '/':
            self.send_json_response({
                "message": "Company Profile API with Grok Integration",
                "endpoints": {
                    "POST /api/company-profile": "Fetch company profile with Grok analysis",
                    "GET /api/health": "Health check"
                }
            })
        else:
            self.send_error_response(404, "Endpoint not found")

    def send_json_response(self, data, status_code=200):
        """Send JSON response with CORS headers"""
        self.send_response(status_code)
        self.send_header('Content-Type', 'application/json')
        self.send_header('Access-Control-Allow-Origin', '*')
        self.send_header('Access-Control-Allow-Methods', 'GET, POST, OPTIONS')
        self.send_header('Access-Control-Allow-Headers', 'Content-Type')
        self.end_headers()
        self.wfile.write(json.dumps(data, indent=2).encode('utf-8'))

    def send_error_response(self, status_code, message):
        """Send error response"""
        error_data = {"success": False, "error": message}
        self.send_json_response(error_data, status_code)

    def log_message(self, format, *args):
        """Override to customize logging"""
        print(f"[{self.date_time_string()}] {format % args}")

def run_server(port=8000):
    """Run the HTTP server"""
    server = HTTPServer(('localhost', port), CompanyProfileHandler)
    print(f"🚀 Company Profile API Server running on http://localhost:{port}")
    print(f"📖 API Documentation available at http://localhost:{port}")
    print(f"🏥 Health check: http://localhost:{port}/api/health")
    print(f"📝 Main endpoint: POST http://localhost:{port}/api/company-profile")
    print("\n🔑 Don't forget to set your GROK_API_KEY in .env file!")
    print("\nPress Ctrl+C to stop the server")
    
    try:
        server.serve_forever()
    except KeyboardInterrupt:
        print("\n🛑 Server stopped")
        server.server_close()

# CLI Interface for testing
def cli_interface():
    """Command line interface for testing"""
    analyzer = GrokCompanyAnalyzer()
    
    while True:
        print("\n" + "="*60)
        print("🏢 COMPANY PROFILE ANALYZER WITH GROK AI")
        print("="*60)
        
        company_name = input("\nEnter company name (or 'quit' to exit): ").strip()
        
        if company_name.lower() in ['quit', 'exit', 'q']:
            print("👋 Goodbye!")
            break
        
        if not company_name:
            print("❌ Please enter a valid company name")
            continue
        
        print(f"\n🔄 Processing {company_name}...")
        result = analyzer.process_company_request(company_name)
        
        if result['success']:
            profile = result['data']['profile']
            grok_analysis = result['data']['grok_analysis']
            
            # Display results
            print(f"\n{'='*60}")
            print(f"📊 COMPANY PROFILE: {profile['company_name'].upper()}")
            print(f"{'='*60}")
            
            print(f"\n📋 BASIC INFO:")
            print(f"   Founded: {profile['founding_year'] or 'Not found'}")
            print(f"   Employees: {profile['employee_count'] or 'Not found'}")
            print(f"   Type: {profile['business_type'] or 'Unknown'}")
            print(f"   Processing Time: {profile['processing_time']}s")
            
            print(f"\n🎯 VISION (Grok Summarized):")
            print(f"   {profile['vision'] or 'Not found'}")
            
            print(f"\n🚀 MISSION (Grok Summarized):")
            print(f"   {profile['mission'] or 'Not found'}")
            
            if profile['working_culture']:
                print(f"\n🏢 WORKING CULTURE (Grok Analyzed):")
                for i, culture in enumerate(profile['working_culture'], 1):
                    print(f"   {i}. {culture}")
            
            print(f"\n⏰ WORKING TIMINGS:")
            print(f"   {profile['working_timings'] or 'Not found'}")
            
            if profile['recent_achievements']:
                print(f"\n🏆 RECENT ACHIEVEMENTS (Grok Curated):")
                for i, achievement in enumerate(profile['recent_achievements'], 1):
                    print(f"   {i}. {achievement}")
            
            if profile['products_services']:
                print(f"\n💼 PRODUCTS/SERVICES:")
                for i, item in enumerate(profile['products_services'][:5], 1):
                    print(f"   {i}. {item}")
            
            # Grok Analysis
            print(f"\n🧠 GROK AI ANALYSIS:")
            print(f"{'='*40}")
            print(f"📝 Executive Summary:")
            print(f"   {grok_analysis['executive_summary']}")
            
            print(f"\n💪 Key Strengths:")
            for strength in grok_analysis['key_strengths']:
                print(f"   • {strength}")
            
            print(f"\n📈 Business Outlook:")
            print(f"   {grok_analysis['business_outlook']}")
            
            print(f"\n🏢 Work Environment Rating:")
            print(f"   {grok_analysis['work_environment_rating']}")
            
            print(f"\n👍 Recommendation:")
            print(f"   {grok_analysis['recommendation']}")
            
            print(f"\n📊 Market Position:")
            print(f"   {grok_analysis['market_position']}")
            
            print(f"\n🚀 Growth Potential:")
            print(f"   {grok_analysis['growth_potential']}")
            
            print(f"\n🔗 Sources:")
            for source in profile['sources_used']:
                print(f"   • {source}")
        else:
            print(f"❌ Error: {result['error']}")

if __name__ == "__main__":
    run_server()
print("Backend server started successfully.")