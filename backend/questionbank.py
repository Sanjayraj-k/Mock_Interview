from flask import Flask, jsonify, request, send_file
from flask_cors import CORS
from flask_pymongo import PyMongo
from werkzeug.utils import secure_filename
from bson import ObjectId
from datetime import datetime, timedelta
import os
import re
from pathlib import Path

app = Flask(__name__)
CORS(app)

# Configuration
app.config['MONGO_URI'] = 'mongodb://localhost:27017/interview_platform'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'

# Initialize MongoDB
mongo = PyMongo(app)

# Create uploads directory if it doesn't exist
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf'}

# Sample data to populate the database
sample_questions = [
    {
        "title": "Tell me about yourself.",
        "category": "Behavioral",
        "company": "Apple",
        "difficulty": "Easy",
        "experience": "Focus on your professional journey, key achievements, and what you're looking for in your next role. Structure your answer using the present-past-future format.",
        "lastUpdated": datetime.now() - timedelta(minutes=7),
        "pdfUrl": "https://example.com/behavioral-questions-guide.pdf",
        "pdfName": "Behavioral Questions Guide.pdf",
        "type": "text",
        "views": 0
    },
    {
        "title": "How do you approach troubleshooting and resolving unexpected system failures in a production environment?",
        "category": "System Design",
        "company": "Visa",
        "difficulty": "Hard",
        "experience": "Start with immediate containment, then systematic diagnosis using logs, monitoring tools, and gradual rollback strategies. Follow incident response protocols and document everything for post-mortem analysis.",
        "lastUpdated": datetime.now() - timedelta(hours=8),
        "pdfUrl": "https://example.com/system-design-troubleshooting.pdf",
        "pdfName": "System Design Troubleshooting Guide.pdf",
        "type": "text",
        "views": 0
    },
    {
        "title": "What approaches would you use to manage a project that's falling behind schedule?",
        "category": "Technical",
        "company": "Amazon",
        "difficulty": "Hard",
        "experience": "Reassess scope and priorities, identify bottlenecks, consider adding resources or adjusting timeline. Communicate transparently with stakeholders about risks and mitigation strategies.",
        "lastUpdated": datetime.now() - timedelta(hours=9),
        "pdfUrl": "https://example.com/project-management-strategies.pdf",
        "pdfName": "Project Management Strategies.pdf",
        "type": "text",
        "views": 0
    },
    {
        "title": "Explain the difference between REST and GraphQL APIs",
        "category": "Technical",
        "company": "Google",
        "difficulty": "Medium",
        "experience": "REST uses multiple endpoints with fixed data structures and standard HTTP methods. GraphQL uses a single endpoint with flexible queries, allowing clients to request exactly the data they need.",
        "lastUpdated": datetime.now() - timedelta(days=2),
        "pdfUrl": "https://example.com/api-design-patterns.pdf",
        "pdfName": "API Design Patterns.pdf",
        "type": "text",
        "views": 0
    },
    {
        "title": "How do you handle conflicts in a team?",
        "category": "Behavioral",
        "company": "Microsoft",
        "difficulty": "Medium",
        "experience": "Listen actively to all perspectives, identify root causes, focus on solutions rather than blame. Facilitate open communication and find common ground that aligns with team objectives.",
        "lastUpdated": datetime.now() - timedelta(days=5),
        "pdfUrl": "https://example.com/team-collaboration-guide.pdf",
        "pdfName": "Team Collaboration Guide.pdf",
        "type": "text",
        "views": 0
    },
    {
        "title": "What is your experience with microservices architecture?",
        "category": "System Design",
        "company": "Netflix",
        "difficulty": "Hard",
        "experience": "Microservices offer scalability and independent deployment but require careful service boundaries, API versioning, and distributed system considerations like eventual consistency.",
        "lastUpdated": datetime.now() - timedelta(days=3),
        "pdfUrl": "https://example.com/microservices-architecture.pdf",
        "pdfName": "Microservices Architecture Guide.pdf",
        "type": "text",
        "views": 0
    },
    {
        "title": "Describe a time when you had to learn a new technology quickly",
        "category": "Behavioral",
        "company": "Facebook",
        "difficulty": "Medium",
        "experience": "Use the STAR method: Situation, Task, Action, Result. Focus on your learning process, resources used, and how you applied the knowledge successfully.",
        "lastUpdated": datetime.now() - timedelta(days=1),
        "pdfUrl": "https://example.com/learning-strategies.pdf",
        "pdfName": "Learning Strategies for Engineers.pdf",
        "type": "text",
        "views": 0
    },
    {
        "title": "How would you design a URL shortener like bit.ly?",
        "category": "System Design",
        "company": "Twitter",
        "difficulty": "Hard",
        "experience": "Consider URL encoding algorithms, database design for scalability, caching strategies, analytics tracking, and handling high read/write ratios with appropriate data structures.",
        "lastUpdated": datetime.now() - timedelta(days=6),
        "pdfUrl": "https://example.com/url-shortener-design.pdf",
        "pdfName": "URL Shortener System Design.pdf",
        "type": "text",
        "views": 0
    },
    {
        "title": "What is dependency injection and why is it useful?",
        "category": "Technical",
        "company": "Microsoft",
        "difficulty": "Medium",
        "experience": "Dependency injection is a design pattern where dependencies are provided to a class rather than created inside it. This improves testability, modularity, and loose coupling between components.",
        "lastUpdated": datetime.now() - timedelta(hours=12),
        "pdfUrl": None,
        "pdfName": None,
        "type": "text",
        "views": 0
    },
    {
        "title": "Explain the concept of eventual consistency in distributed systems",
        "category": "System Design",
        "company": "Amazon",
        "difficulty": "Hard",
        "experience": "Eventual consistency means that all replicas will eventually converge to the same state, but there may be temporary inconsistencies. This is often used in distributed databases for better availability and performance.",
        "lastUpdated": datetime.now() - timedelta(hours=4),
        "pdfUrl": None,
        "pdfName": None,
        "type": "text",
        "views": 0
    }
]

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_email(email):
    """Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def serialize_question(question):
    """Convert MongoDB document to JSON serializable format"""
    if question:
        question['_id'] = str(question['_id'])
        if 'lastUpdated' in question and isinstance(question['lastUpdated'], datetime):
            question['lastUpdated'] = question['lastUpdated'].isoformat()
        if 'createdAt' in question and isinstance(question['createdAt'], datetime):
            question['createdAt'] = question['createdAt'].isoformat()
    return question

def initialize_database():
    """Initialize the database with sample data if it's empty"""
    try:
        if mongo.db.questions.count_documents({}) == 0:
            mongo.db.questions.insert_many(sample_questions)
            print("Database initialized with sample questions!")
        else:
            print("Database already contains data.")
    except Exception as e:
        print(f"Error initializing database: {e}")

@app.route('/api/questions', methods=['GET'])
def get_questions():
    """Get all questions sorted by creation date (newest first)"""
    try:
        questions = list(mongo.db.questions.find().sort('lastUpdated', -1))
        serialized_questions = [serialize_question(q) for q in questions]
        return jsonify({
            'success': True,
            'questions': serialized_questions,
            'count': len(serialized_questions)
        }), 200
    except Exception as e:
        print(f"Error fetching questions: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to fetch questions',
            'message': str(e)
        }), 500

@app.route('/api/questions/<question_id>', methods=['GET'])
def get_question_by_id(question_id):
    """Get a specific question by ID"""
    try:
        if not ObjectId.is_valid(question_id):
            return jsonify({
                'success': False,
                'message': 'Invalid question ID'
            }), 400
        question = mongo.db.questions.find_one({'_id': ObjectId(question_id)})
        if question:
            return jsonify({
                'success': True,
                'question': serialize_question(question)
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Question not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to fetch question',
            'message': str(e)
        }), 500

@app.route('/api/questions/text', methods=['POST'])
def create_text_question():
    """Create new text question"""
    try:
        data = request.get_json()
        required_fields = ['title', 'category', 'company', 'difficulty', 'experience']
        for field in required_fields:
            if field not in data:
                return jsonify({
                    'success': False,
                    'error': f'Missing required field: {field}'
                }), 400
        question_data = {
            'title': data['title'].strip(),
            'category': data['category'].strip(),
            'company': data['company'].strip(),
            'difficulty': data['difficulty'].strip(),
            'experience': data['experience'].strip(),
            'type': 'text',
            'views': 0,
            'lastUpdated': datetime.utcnow(),
            'pdfUrl': data.get('pdfUrl'),
            'pdfName': data.get('pdfName')
        }
        result = mongo.db.questions.insert_one(question_data)
        created_question = mongo.db.questions.find_one({'_id': result.inserted_id})
        return jsonify({
            'success': True,
            'message': 'Question created successfully',
            'question_id': str(result.inserted_id),
            'data': serialize_question(created_question)
        }), 201
    except Exception as e:
        print(f"Error creating text question: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to create question',
            'message': str(e)
        }), 500

@app.route('/api/questions/pdf', methods=['POST'])
def create_pdf_question():
    """Create new PDF question"""
    try:
        if 'pdfFile' not in request.files:
            return jsonify({
                'success': False,
                'message': 'PDF file is required'
            }), 400
        file = request.files['pdfFile']
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'Only PDF files are allowed'
            }), 400
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        company = request.form.get('company', '').strip()
        round_name = request.form.get('round', '').strip()
        if not all([name, email, company, round_name]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            }), 400
        if not validate_email(email):
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        file.save(file_path)
        question_data = {
            'name': name,
            'email': email,
            'company': company,
            'round': round_name,
            'type': 'pdf',
            'content': f'PDF Question from {company}',
            'fileName': filename,
            'filePath': file_path,
            'views': 0,
            'lastUpdated': datetime.utcnow()
        }
        result = mongo.db.questions.insert_one(question_data)
        created_question = mongo.db.questions.find_one({'_id': result.inserted_id})
        return jsonify({
            'success': True,
            'message': 'Question created successfully',
            'data': serialize_question(created_question)
        }), 201
    except Exception as e:
        print(f"Error creating PDF question: {e}")
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        return jsonify({
            'success': False,
            'message': 'Error creating question',
            'error': str(e)
        }), 500

@app.route('/api/questions/<question_id>', methods=['PUT'])
def update_question(question_id):
    """Update an existing question"""
    try:
        if not ObjectId.is_valid(question_id):
            return jsonify({
                'success': False,
                'message': 'Invalid question ID'
            }), 400
        data = request.get_json()
        data['lastUpdated'] = datetime.utcnow()
        result = mongo.db.questions.update_one(
            {'_id': ObjectId(question_id)},
            {'$set': data}
        )
        if result.matched_count > 0:
            return jsonify({
                'success': True,
                'message': 'Question updated successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Question not found'
            }), 404
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Failed to update question',
            'message': str(e)
        }), 500

@app.route('/api/questions/<question_id>', methods=['DELETE'])
def delete_question(question_id):
    """Delete a question from the database"""
    try:
        if not ObjectId.is_valid(question_id):
            return jsonify({
                'success': False,
                'message': 'Invalid question ID'
            }), 400
        question = mongo.db.questions.find_one({'_id': ObjectId(question_id)})
        if not question:
            return jsonify({
                'success': False,
                'message': 'Question not found'
            }), 404
        if question.get('type') == 'pdf' and question.get('filePath'):
            file_path = question['filePath']
            if os.path.exists(file_path):
                os.remove(file_path)
        result = mongo.db.questions.delete_one({'_id': ObjectId(question_id)})
        if result.deleted_count > 0:
            return jsonify({
                'success': True,
                'message': 'Question deleted successfully'
            }), 200
        else:
            return jsonify({
                'success': False,
                'error': 'Question not found'
            }), 404
    except Exception as e:
        print(f"Error deleting question: {e}")
        return jsonify({
            'success': False,
            'error': 'Failed to delete question',
            'message': str(e)
        }), 500

@app.route('/api/questions/<question_id>/views', methods=['PATCH'])
def update_question_views(question_id):
    """Increment question views"""
    try:
        if not ObjectId.is_valid(question_id):
            return jsonify({
                'success': False,
                'message': 'Invalid question ID'
            }), 400
        result = mongo.db.questions.find_one_and_update(
            {'_id': ObjectId(question_id)},
            {'$inc': {'views': 1}},
            return_document=True
        )
        if not result:
            return jsonify({
                'success': False,
                'message': 'Question not found'
            }), 404
        return jsonify({
            'success': True,
            'data': serialize_question(result)
        }), 200
    except Exception as e:
        print(f"Error updating views: {e}")
        return jsonify({
            'success': False,
            'message': 'Error updating views',
            'error': str(e)
        }), 500

@app.route('/api/questions/<question_id>/download', methods=['GET'])
def download_pdf(question_id):
    """Download PDF file"""
    try:
        if not ObjectId.is_valid(question_id):
            return jsonify({
                'success': False,
                'message': 'Invalid question ID'
            }), 400
        question = mongo.db.questions.find_one({'_id': ObjectId(question_id)})
        if not question or question.get('type') != 'pdf':
            return jsonify({
                'success': False,
                'message': 'PDF not found'
            }), 404
        file_path = question.get('filePath')
        if not file_path or not os.path.exists(file_path):
            return jsonify({
                'success': False,
                'message': 'File not found on server'
            }), 404
        return send_file(
            file_path,
            as_attachment=True,
            download_name=question.get('fileName', 'question.pdf'),
            mimetype='application/pdf'
        )
    except Exception as e:
        print(f"Error downloading file: {e}")
        return jsonify({
            'success': False,
            'message': 'Error downloading file',
            'error': str(e)
        }), 500

@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        mongo.db.command('ping')
        return jsonify({
            'success': True,
            'message': 'API is running and database is connected',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'error': 'Database connection failed',
            'message': str(e)
        }), 500

@app.errorhandler(413)
def too_large(e):
    return jsonify({
        'success': False,
        'message': 'File size too large. Maximum size is 10MB.'
    }), 413

@app.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'message': 'Route not found'
    }), 404

@app.errorhandler(500)
def internal_error(e):
    return jsonify({
        'success': False,
        'message': 'Internal server error'
    }), 500

if __name__ == '__main__':
    print("Starting Interview Platform API Server...")
    print("Server running on http://localhost:5001")
    print("MongoDB URI: mongodb://localhost:27017/interview_platform")
    print("Upload folder: uploads/")
    initialize_database()
    app.run(debug=True, host='0.0.0.0', port=5001)  