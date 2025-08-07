from flask import Flask, request, jsonify, send_file
from flask_cors import CORS
from flask_pymongo import PyMongo
from werkzeug.utils import secure_filename
from bson import ObjectId
from datetime import datetime
import os
import re
from pathlib import Path

app = Flask(__name__)

# Configuration
app.config['MONGO_URI'] = 'mongodb://localhost:27017/questionbank'
app.config['MAX_CONTENT_LENGTH'] = 10 * 1024 * 1024  # 10MB max file size
app.config['UPLOAD_FOLDER'] = 'uploads'

# Initialize extensions
CORS(app)
mongo = PyMongo(app)

# Create uploads directory if it doesn't exist
Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf'}

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_email(email):
    """Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def serialize_question(question):
    """Convert MongoDB document to JSON serializable format"""
    if question:
        question['_id'] = str(question['_id'])
        if 'createdAt' in question:
            question['createdAt'] = question['createdAt'].isoformat()
    return question

# Routes

@app.route('/api/questions', methods=['GET'])
def get_all_questions():
    """Get all questions sorted by creation date (newest first)"""
    try:
        questions = list(mongo.db.questions.find().sort('createdAt', -1))
        serialized_questions = [serialize_question(q) for q in questions]
        
        return jsonify({
            'success': True,
            'data': serialized_questions
        }), 200
    
    except Exception as e:
        print(f"Error fetching questions: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching questions',
            'error': str(e)
        }), 500

@app.route('/api/questions/<question_id>', methods=['GET'])
def get_question_by_id(question_id):
    """Get single question by ID"""
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
        
        return jsonify({
            'success': True,
            'data': serialize_question(question)
        }), 200
    
    except Exception as e:
        print(f"Error fetching question: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching question',
            'error': str(e)
        }), 500

@app.route('/api/questions/text', methods=['POST'])
def create_text_question():
    """Create new text question"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['name', 'email', 'company', 'round', 'content']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field.capitalize()} is required'
                }), 400
        
        # Email validation
        if not validate_email(data['email']):
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        # Create question document
        question_data = {
            'name': data['name'].strip(),
            'email': data['email'].strip().lower(),
            'company': data['company'].strip(),
            'round': data['round'].strip(),
            'type': 'text',
            'content': data['content'].strip(),
            'views': 0,
            'createdAt': datetime.utcnow()
        }
        
        # Insert into database
        result = mongo.db.questions.insert_one(question_data)
        
        # Get the created question
        created_question = mongo.db.questions.find_one({'_id': result.inserted_id})
        
        return jsonify({
            'success': True,
            'message': 'Question created successfully',
            'data': serialize_question(created_question)
        }), 201
    
    except Exception as e:
        print(f"Error creating text question: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error creating question',
            'error': str(e)
        }), 500

@app.route('/api/questions/pdf', methods=['POST'])
def create_pdf_question():
    """Create new PDF question"""
    try:
        # Check if file is present
        if 'pdfFile' not in request.files:
            return jsonify({
                'success': False,
                'message': 'PDF file is required'
            }), 400
        
        file = request.files['pdfFile']
        
        # Check if file is selected
        if file.filename == '':
            return jsonify({
                'success': False,
                'message': 'No file selected'
            }), 400
        
        # Check if file is allowed
        if not allowed_file(file.filename):
            return jsonify({
                'success': False,
                'message': 'Only PDF files are allowed'
            }), 400
        
        # Get form data
        name = request.form.get('name', '').strip()
        email = request.form.get('email', '').strip().lower()
        company = request.form.get('company', '').strip()
        round_name = request.form.get('round', '').strip()
        
        # Validation
        if not all([name, email, company, round_name]):
            return jsonify({
                'success': False,
                'message': 'All fields are required'
            }), 400
        
        # Email validation
        if not validate_email(email):
            return jsonify({
                'success': False,
                'message': 'Invalid email format'
            }), 400
        
        # Generate unique filename
        filename = secure_filename(file.filename)
        timestamp = datetime.now().strftime('%Y%m%d_%H%M%S')
        unique_filename = f"{timestamp}_{filename}"
        file_path = os.path.join(app.config['UPLOAD_FOLDER'], unique_filename)
        
        # Save file
        file.save(file_path)
        
        # Create question document
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
            'createdAt': datetime.utcnow()
        }
        
        # Insert into database
        result = mongo.db.questions.insert_one(question_data)
        
        # Get the created question
        created_question = mongo.db.questions.find_one({'_id': result.inserted_id})
        
        return jsonify({
            'success': True,
            'message': 'Question created successfully',
            'data': serialize_question(created_question)
        }), 201
    
    except Exception as e:
        print(f"Error creating PDF question: {str(e)}")
        # Clean up file if it was saved but database insertion failed
        if 'file_path' in locals() and os.path.exists(file_path):
            os.remove(file_path)
        
        return jsonify({
            'success': False,
            'message': 'Error creating question',
            'error': str(e)
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
        
        # Increment views
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
        print(f"Error updating views: {str(e)}")
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
        print(f"Error downloading file: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error downloading file',
            'error': str(e)
        }), 500

@app.route('/api/questions/<question_id>', methods=['DELETE'])
def delete_question(question_id):
    """Delete question (optional - for admin use)"""
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
        
        # Delete associated file if it's a PDF
        if question.get('type') == 'pdf' and question.get('filePath'):
            file_path = question['filePath']
            if os.path.exists(file_path):
                os.remove(file_path)
        
        # Delete from database
        mongo.db.questions.delete_one({'_id': ObjectId(question_id)})
        
        return jsonify({
            'success': True,
            'message': 'Question deleted successfully'
        }), 200
    
    except Exception as e:
        print(f"Error deleting question: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error deleting question',
            'error': str(e)
        }), 500

# Error handlers

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

# Health check endpoint
@app.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        mongo.db.command('ping')
        return jsonify({
            'success': True,
            'message': 'Server is healthy',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Database connection failed',
            'error': str(e)
        }), 500

if __name__ == '__main__':
    print("Starting Question Bank API Server...")
    print("Server running on http://localhost:5001")
    print("MongoDB URI: mongodb://localhost:27017/questionbank")
    print("Upload folder: uploads/")
    app.run(debug=True, host='0.0.0.0', port=5001)