from flask import Blueprint, request, jsonify
import os
from groq import Groq
import PyPDF2
import docx
import json
import re
from werkzeug.utils import secure_filename
import tempfile

# Blueprint for ATS
ats_bp = Blueprint('ats', __name__, url_prefix='/ats')

# Configure Groq client
groq_api_key = os.getenv('GROQ_API_KEY')
if groq_api_key:
    client = Groq(api_key=groq_api_key)
else:
    client = None
    print("Warning: GROQ_API_KEY not set. ATS analysis will be limited.")

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'doc', 'docx', 'txt'}

def allowed_file(filename):
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def extract_text_from_pdf(file_path):
    """Extract text from PDF file"""
    try:
        with open(file_path, 'rb') as file:
            reader = PyPDF2.PdfReader(file)
            text = ""
            for page in reader.pages:
                text += page.extract_text() + "\n"
        return text
    except Exception as e:
        return f"Error reading PDF: {str(e)}"

def extract_text_from_docx(file_path):
    """Extract text from DOCX file"""
    try:
        doc = docx.Document(file_path)
        text = ""
        for paragraph in doc.paragraphs:
            text += paragraph.text + "\n"
        return text
    except Exception as e:
        return f"Error reading DOCX: {str(e)}"

def extract_text_from_txt(file_path):
    """Extract text from TXT file"""
    try:
        with open(file_path, 'r', encoding='utf-8') as file:
            return file.read()
    except Exception as e:
        return f"Error reading TXT: {str(e)}"

def extract_resume_text(file):
    """Extract text from uploaded resume file"""
    # Save uploaded file temporarily
    with tempfile.NamedTemporaryFile(delete=False, suffix=f".{file.filename.rsplit('.', 1)[1].lower()}") as temp_file:
        file.save(temp_file.name)
        temp_path = temp_file.name
    
    try:
        filename = file.filename.lower()
        if filename.endswith('.pdf'):
            text = extract_text_from_pdf(temp_path)
        elif filename.endswith('.docx'):
            text = extract_text_from_docx(temp_path)
        elif filename.endswith('.txt'):
            text = extract_text_from_txt(temp_path)
        else:
            text = "Unsupported file format"
    finally:
        # Clean up temporary file
        os.unlink(temp_path)
    
    return text

def analyze_with_groq(resume_text, job_description):
    """Analyze resume against job description using Groq LLM"""
    
    # Check if Groq client is available
    if client is None:
        return {
            "error": "Groq API key not configured. Please set GROQ_API_KEY environment variable.",
            "ats_score": 0,
            "keyword_match": {
                "matched_keywords": [],
                "missing_keywords": [],
                "match_percentage": 0
            },
            "sections_analysis": {
                "contact_info": {"score": 0, "feedback": "API not configured"},
                "summary": {"score": 0, "feedback": "API not configured"},
                "experience": {"score": 0, "feedback": "API not configured"},
                "skills": {"score": 0, "feedback": "API not configured"},
                "education": {"score": 0, "feedback": "API not configured"},
                "formatting": {"score": 0, "feedback": "API not configured"}
            },
            "strengths": [],
            "weaknesses": ["Groq API not configured"],
            "recommendations": ["Please configure GROQ_API_KEY environment variable"],
            "overall_feedback": "Groq API key not configured. Please set GROQ_API_KEY environment variable to enable ATS analysis."
        }
    
    prompt = f"""
    You are an expert ATS (Applicant Tracking System) analyzer. Analyze the following resume against the job description and provide a comprehensive evaluation.

    JOB DESCRIPTION:
    {job_description}

    RESUME:
    {resume_text}

    Please provide your analysis in the following JSON format:
    {{
        "ats_score": <score out of 100>,
        "keyword_match": {{
            "matched_keywords": ["keyword1", "keyword2", ...],
            "missing_keywords": ["missing1", "missing2", ...],
            "match_percentage": <percentage>
        }},
        "sections_analysis": {{
            "contact_info": {{"score": <0-10>, "feedback": "feedback text"}},
            "summary": {{"score": <0-10>, "feedback": "feedback text"}},
            "experience": {{"score": <0-10>, "feedback": "feedback text"}},
            "skills": {{"score": <0-10>, "feedback": "feedback text"}},
            "education": {{"score": <0-10>, "feedback": "feedback text"}},
            "formatting": {{"score": <0-10>, "feedback": "feedback text"}}
        }},
        "strengths": ["strength1", "strength2", ...],
        "weaknesses": ["weakness1", "weakness2", ...],
        "recommendations": ["recommendation1", "recommendation2", ...],
        "overall_feedback": "Detailed overall feedback about the resume's compatibility with the job"
    }}

    Focus on:
    1. Keyword matching between resume and job description
    2. Relevant experience alignment
    3. Skills compatibility
    4. Education requirements
    5. Resume formatting and ATS-friendliness
    6. Missing critical elements
    7. Quantifiable achievements
    8. Industry-specific terminology

    Provide specific, actionable feedback that will help improve the ATS score.
    """

    try:
        response = client.chat.completions.create(
            model="meta-llama/llama-4-scout-17b-16e-instruct",
            messages=[
                {"role": "system", "content": "You are an expert ATS analyzer. Always respond with valid JSON format."},
                {"role": "user", "content": prompt}
            ],
            temperature=0.3,
            max_tokens=2000
        )
        
        # Extract JSON from response
        response_text = response.choices[0].message.content
        
        # Try to find JSON in the response
        json_match = re.search(r'\{.*\}', response_text, re.DOTALL)
        if json_match:
            json_str = json_match.group(0)
            return json.loads(json_str)
        else:
            # Fallback if JSON not found
            return {
                "error": "Could not parse response",
                "raw_response": response_text
            }
            
    except Exception as e:
        return {
            "error": f"Error analyzing with Groq: {str(e)}",
            "ats_score": 0
        }

@ats_bp.route('/analyze-resume', methods=['POST'])
def analyze_resume():
    """Main endpoint to analyze resume against job description"""
    
    try:
        # Check if file and job description are provided
        if 'resume' not in request.files:
            return jsonify({"error": "No resume file uploaded"}), 400
        
        if 'job_description' not in request.form:
            return jsonify({"error": "No job description provided"}), 400
        
        resume_file = request.files['resume']
        job_description = request.form['job_description']
        
        if resume_file.filename == '':
            return jsonify({"error": "No file selected"}), 400
        
        if not allowed_file(resume_file.filename):
            return jsonify({"error": "File type not allowed. Use PDF, DOC, DOCX, or TXT"}), 400
        
        # Extract text from resume
        resume_text = extract_resume_text(resume_file)
        
        if resume_text.startswith("Error"):
            return jsonify({"error": resume_text}), 400
        
        # Analyze with Groq
        analysis_result = analyze_with_groq(resume_text, job_description)
        
        # Add metadata
        analysis_result['metadata'] = {
            'filename': secure_filename(resume_file.filename),
            'file_type': resume_file.filename.rsplit('.', 1)[1].lower(),
            'job_description_length': len(job_description),
            'resume_text_length': len(resume_text)
        }
        
        return jsonify(analysis_result)
        
    except Exception as e:
        return jsonify({"error": f"Server error: {str(e)}"}), 500

@ats_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    return jsonify({"status": "healthy", "service": "ATS Resume Scorer"})

@ats_bp.route('/test-groq', methods=['GET'])
def test_groq():
    """Test Groq API connection"""
    try:
        response = client.chat.completions.create(
            model="llama-3.1-70b-versatile",
            messages=[{"role": "user", "content": "Hello, this is a test."}],
            max_tokens=50
        )
        return jsonify({
            "status": "success",
            "message": "Groq API is working",
            "response": response.choices[0].message.content
        })
    except Exception as e:
        return jsonify({
            "status": "error",
            "message": f"Groq API error: {str(e)}"
        }), 500

# Note: This module is registered as a Blueprint by the main app