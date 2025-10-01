"""
Domain Forum Blueprint for Flask Application
A comprehensive forum system for domain-specific discussions and questions
"""

from flask import Blueprint, request, jsonify, send_file
from flask_cors import CORS
from flask_pymongo import PyMongo
from werkzeug.utils import secure_filename
from bson import ObjectId
from datetime import datetime
import os
import re
from pathlib import Path
import uuid

# Blueprint for Domain Forum
domainforum_bp = Blueprint('domainforum', __name__, url_prefix='/domainforum')
CORS(domainforum_bp)

# Initialize MongoDB (will be set in init_domainforum)
mongo = None

# Allowed file extensions
ALLOWED_EXTENSIONS = {'pdf', 'png', 'jpg', 'jpeg', 'gif', 'doc', 'docx'}

DOMAINS = [
    'Software Developer',
    'AI Developer', 
    'Full Stack Developer',
    'Flutter Developer',
    'Frontend Developer',
    'Backend Developer',
    'DevOps Engineer',
    'Data Scientist',
    'Machine Learning Engineer',
    'Mobile Developer',
    'UI/UX Designer',
    'Product Manager',
    'System Administrator',
    'Cybersecurity Specialist',
    'Database Administrator',
    'QA Engineer',
    'Cloud Architect',
    'Blockchain Developer',
    'Game Developer',
    'Network Engineer',
    'Business Analyst',
    'Digital Marketing',
    'Other'
]

def init_domainforum(app):
    """Initialize PyMongo and folders using the main Flask app config."""
    global mongo
    if mongo is None:
        app.config.setdefault('MONGO_URI', 'mongodb://localhost:27017/domainforum')
        app.config.setdefault('MAX_CONTENT_LENGTH', 10 * 1024 * 1024)  # 10MB max file size
        app.config.setdefault('UPLOAD_FOLDER', 'uploads')
        app.config.setdefault('SECRET_KEY', 'your-secret-key-here')
        
        # Create uploads directory if it doesn't exist
        Path(app.config['UPLOAD_FOLDER']).mkdir(exist_ok=True)
        mongo = PyMongo(app)

def allowed_file(filename):
    """Check if file extension is allowed"""
    return '.' in filename and \
           filename.rsplit('.', 1)[1].lower() in ALLOWED_EXTENSIONS

def validate_email(email):
    """Validate email format"""
    pattern = r'^[^\s@]+@[^\s@]+\.[^\s@]+$'
    return re.match(pattern, email) is not None

def serialize_doc(doc):
    """Convert MongoDB document to JSON serializable format"""
    if doc:
        if '_id' in doc:
            doc['_id'] = str(doc['_id'])
        if 'authorId' in doc:
            doc['authorId'] = str(doc['authorId'])
        if 'createdAt' in doc:
            doc['createdAt'] = doc['createdAt'].isoformat()
        if 'joinedAt' in doc:
            doc['joinedAt'] = doc['joinedAt'].isoformat()
        if 'updatedAt' in doc:
            doc['updatedAt'] = doc['updatedAt'].isoformat()
    return doc

def save_file(file, folder_type='general'):
    """Save uploaded file and return filename"""
    if file and allowed_file(file.filename):
        filename = secure_filename(file.filename)
        # Add timestamp to avoid naming conflicts
        name, ext = os.path.splitext(filename)
        filename = f"{name}_{int(datetime.utcnow().timestamp())}{ext}"
        
        folder_path = os.path.join(mongo.app.config['UPLOAD_FOLDER'], folder_type)
        Path(folder_path).mkdir(exist_ok=True)
        
        file_path = os.path.join(folder_path, filename)
        file.save(file_path)
        return filename
    return None

# Error handlers
@domainforum_bp.errorhandler(413)
def too_large(e):
    return jsonify({
        'success': False,
        'message': 'File too large. Maximum size is 10MB.'
    }), 413

@domainforum_bp.errorhandler(404)
def not_found(e):
    return jsonify({
        'success': False,
        'message': 'Endpoint not found'
    }), 404

# User Management Routes

@domainforum_bp.route('/api/users/register', methods=['POST'])
def register_user():
    """Register a new user"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['name', 'email', 'domain']
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
        
        # Domain validation
        if data['domain'] not in DOMAINS:
            return jsonify({
                'success': False,
                'message': 'Invalid domain selection'
            }), 400
        
        # Check if user already exists
        existing_user = mongo.db.users.find_one({'email': data['email'].lower()})
        if existing_user:
            return jsonify({
                'success': False,
                'message': 'User already exists with this email'
            }), 409
        
        # Create user document
        user_data = {
            'name': data['name'].strip(),
            'email': data['email'].strip().lower(),
            'domain': data['domain'],
            'linkedinId': data.get('linkedinId', '').strip(),
            'githubId': data.get('githubId', '').strip(),
            'mobileNumber': data.get('mobileNumber', '').strip(),
            'avatar': ''.join([word[0] for word in data['name'].strip().split()]).upper(),
            'contributions': 0,
            'joinedAt': datetime.utcnow(),
            'profileViews': 0,
            'isActive': True
        }
        
        # Insert into database
        result = mongo.db.users.insert_one(user_data)
        
        # Get the created user
        created_user = mongo.db.users.find_one({'_id': result.inserted_id})
        
        return jsonify({
            'success': True,
            'message': 'User registered successfully',
            'data': serialize_doc(created_user)
        }), 201
    
    except Exception as e:
        print(f"Error registering user: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error registering user',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/users/<user_id>', methods=['GET'])
def get_user(user_id):
    """Get user by ID"""
    try:
        if not ObjectId.is_valid(user_id):
            return jsonify({
                'success': False,
                'message': 'Invalid user ID'
            }), 400
        
        user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        if not user:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Increment profile views
        mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$inc': {'profileViews': 1}}
        )
        
        return jsonify({
            'success': True,
            'data': serialize_doc(user)
        }), 200
    
    except Exception as e:
        print(f"Error fetching user: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching user',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/users/domain/<domain>', methods=['GET'])
def get_users_by_domain(domain):
    """Get all users in a specific domain"""
    try:
        if domain not in DOMAINS:
            return jsonify({
                'success': False,
                'message': 'Invalid domain'
            }), 400
        
        users = list(mongo.db.users.find({
            'domain': domain,
            'isActive': True
        }).sort('joinedAt', -1))
        
        serialized_users = [serialize_doc(user) for user in users]
        
        return jsonify({
            'success': True,
            'data': serialized_users
        }), 200
    
    except Exception as e:
        print(f"Error fetching users: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching users',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/users/<user_id>/profile', methods=['PUT'])
def update_user_profile(user_id):
    """Update user profile"""
    try:
        if not ObjectId.is_valid(user_id):
            return jsonify({
                'success': False,
                'message': 'Invalid user ID'
            }), 400
        
        data = request.get_json()
        
        # Prepare update data
        update_data = {}
        allowed_fields = ['name', 'linkedinId', 'githubId', 'mobileNumber', 'domain']
        
        for field in allowed_fields:
            if field in data:
                if field == 'domain' and data[field] not in DOMAINS:
                    return jsonify({
                        'success': False,
                        'message': 'Invalid domain selection'
                    }), 400
                update_data[field] = data[field].strip() if isinstance(data[field], str) else data[field]
        
        update_data['updatedAt'] = datetime.utcnow()
        
        # Update user
        result = mongo.db.users.update_one(
            {'_id': ObjectId(user_id)},
            {'$set': update_data}
        )
        
        if result.matched_count == 0:
            return jsonify({
                'success': False,
                'message': 'User not found'
            }), 404
        
        # Get updated user
        updated_user = mongo.db.users.find_one({'_id': ObjectId(user_id)})
        
        return jsonify({
            'success': True,
            'message': 'Profile updated successfully',
            'data': serialize_doc(updated_user)
        }), 200
    
    except Exception as e:
        print(f"Error updating profile: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error updating profile',
            'error': str(e)
        }), 500

# Discussion Management Routes

@domainforum_bp.route('/api/discussions', methods=['POST'])
def create_discussion():
    """Create new discussion"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['title', 'content', 'authorId', 'domain']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field.capitalize()} is required'
                }), 400
        
        # Validate domain
        if data['domain'] not in DOMAINS:
            return jsonify({
                'success': False,
                'message': 'Invalid domain'
            }), 400
        
        # Validate author exists
        if not ObjectId.is_valid(data['authorId']):
            return jsonify({
                'success': False,
                'message': 'Invalid author ID'
            }), 400
        
        author = mongo.db.users.find_one({'_id': ObjectId(data['authorId'])})
        if not author:
            return jsonify({
                'success': False,
                'message': 'Author not found'
            }), 404
        
        # Create discussion document
        discussion_data = {
            'title': data['title'].strip(),
            'content': data['content'].strip(),
            'authorId': ObjectId(data['authorId']),
            'domain': data['domain'],
            'attachments': data.get('attachments', []),
            'likes': 0,
            'likedBy': [],
            'replies': 0,
            'views': 0,
            'createdAt': datetime.utcnow(),
            'isActive': True
        }
        
        # Insert into database
        result = mongo.db.discussions.insert_one(discussion_data)
        
        # Update user contributions
        mongo.db.users.update_one(
            {'_id': ObjectId(data['authorId'])},
            {'$inc': {'contributions': 1}}
        )
        
        # Get the created discussion with author info
        discussion = list(mongo.db.discussions.aggregate([
            {'$match': {'_id': result.inserted_id}},
            {'$lookup': {
                'from': 'users',
                'localField': 'authorId',
                'foreignField': '_id',
                'as': 'author'
            }},
            {'$unwind': '$author'}
        ]))[0]
        
        return jsonify({
            'success': True,
            'message': 'Discussion created successfully',
            'data': serialize_doc(discussion)
        }), 201
    
    except Exception as e:
        print(f"Error creating discussion: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error creating discussion',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/discussions/domain/<domain>', methods=['GET'])
def get_discussions_by_domain(domain):
    """Get all discussions for a specific domain"""
    try:
        if domain not in DOMAINS:
            return jsonify({
                'success': False,
                'message': 'Invalid domain'
            }), 400
        
        discussions = list(mongo.db.discussions.aggregate([
            {'$match': {'domain': domain, 'isActive': True}},
            {'$lookup': {
                'from': 'users',
                'localField': 'authorId',
                'foreignField': '_id',
                'as': 'author'
            }},
            {'$unwind': '$author'},
            {'$sort': {'createdAt': -1}}
        ]))
        
        serialized_discussions = [serialize_doc(discussion) for discussion in discussions]
        
        return jsonify({
            'success': True,
            'data': serialized_discussions
        }), 200
    
    except Exception as e:
        print(f"Error fetching discussions: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching discussions',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/discussions/<discussion_id>', methods=['GET'])
def get_discussion(discussion_id):
    """Get single discussion by ID"""
    try:
        if not ObjectId.is_valid(discussion_id):
            return jsonify({
                'success': False,
                'message': 'Invalid discussion ID'
            }), 400
        
        # Increment view count
        mongo.db.discussions.update_one(
            {'_id': ObjectId(discussion_id)},
            {'$inc': {'views': 1}}
        )
        
        # Get discussion with author info
        discussion = list(mongo.db.discussions.aggregate([
            {'$match': {'_id': ObjectId(discussion_id)}},
            {'$lookup': {
                'from': 'users',
                'localField': 'authorId',
                'foreignField': '_id',
                'as': 'author'
            }},
            {'$unwind': '$author'}
        ]))
        
        if not discussion:
            return jsonify({
                'success': False,
                'message': 'Discussion not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': serialize_doc(discussion[0])
        }), 200
    
    except Exception as e:
        print(f"Error fetching discussion: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching discussion',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/discussions/<discussion_id>/like', methods=['PATCH'])
def like_discussion(discussion_id):
    """Like/unlike a discussion"""
    try:
        if not ObjectId.is_valid(discussion_id):
            return jsonify({
                'success': False,
                'message': 'Invalid discussion ID'
            }), 400
        
        data = request.get_json()
        user_id = data.get('userId')
        
        if not user_id or not ObjectId.is_valid(user_id):
            return jsonify({
                'success': False,
                'message': 'Valid user ID required'
            }), 400
        
        discussion = mongo.db.discussions.find_one({'_id': ObjectId(discussion_id)})
        if not discussion:
            return jsonify({
                'success': False,
                'message': 'Discussion not found'
            }), 404
        
        user_obj_id = ObjectId(user_id)
        liked_by = discussion.get('likedBy', [])
        
        if user_obj_id in liked_by:
            # Unlike - remove user from likedBy and decrement likes
            mongo.db.discussions.update_one(
                {'_id': ObjectId(discussion_id)},
                {
                    '$pull': {'likedBy': user_obj_id},
                    '$inc': {'likes': -1}
                }
            )
            action = 'unliked'
        else:
            # Like - add user to likedBy and increment likes
            mongo.db.discussions.update_one(
                {'_id': ObjectId(discussion_id)},
                {
                    '$push': {'likedBy': user_obj_id},
                    '$inc': {'likes': 1}
                }
            )
            action = 'liked'
        
        # Get updated discussion
        updated_discussion = mongo.db.discussions.find_one({'_id': ObjectId(discussion_id)})
        
        return jsonify({
            'success': True,
            'message': f'Discussion {action} successfully',
            'data': {
                'likes': updated_discussion['likes'],
                'action': action
            }
        }), 200
    
    except Exception as e:
        print(f"Error liking discussion: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error updating like status',
            'error': str(e)
        }), 500

# Question Management Routes

@domainforum_bp.route('/api/questions', methods=['POST'])
def create_question():
    """Create new interview question"""
    try:
        # Handle file upload
        if 'pdfFile' in request.files:
            file = request.files['pdfFile']
            filename = save_file(file, 'questions')
            if not filename:
                return jsonify({
                    'success': False,
                    'message': 'Invalid file type or file upload failed'
                }), 400
        else:
            filename = None
        
        # Get form data
        data = request.form.to_dict()
        
        # Validation
        required_fields = ['company', 'round', 'authorId', 'domain', 'questionType']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field.capitalize()} is required'
                }), 400
        
        # Validate domain
        if data['domain'] not in DOMAINS:
            return jsonify({
                'success': False,
                'message': 'Invalid domain'
            }), 400
        
        # Validate question type specific requirements
        if data['questionType'] == 'text' and not data.get('textContent'):
            return jsonify({
                'success': False,
                'message': 'Text content is required for text questions'
            }), 400
        
        if data['questionType'] == 'pdf' and not filename:
            return jsonify({
                'success': False,
                'message': 'PDF file is required for PDF questions'
            }), 400
        
        # Validate author exists
        if not ObjectId.is_valid(data['authorId']):
            return jsonify({
                'success': False,
                'message': 'Invalid author ID'
            }), 400
        
        author = mongo.db.users.find_one({'_id': ObjectId(data['authorId'])})
        if not author:
            return jsonify({
                'success': False,
                'message': 'Author not found'
            }), 404
        
        # Create question document
        question_data = {
            'company': data['company'].strip(),
            'round': data['round'].strip(),
            'questionType': data['questionType'],
            'authorId': ObjectId(data['authorId']),
            'domain': data['domain'],
            'views': 0,
            'likes': 0,
            'likedBy': [],
            'createdAt': datetime.utcnow(),
            'isActive': True
        }
        
        if data['questionType'] == 'text':
            question_data['content'] = data['textContent'].strip()
        else:
            question_data['fileName'] = filename
            question_data['filePath'] = f"questions/{filename}"
            question_data['content'] = f"PDF Question from {data['company']}"
        
        # Insert into database
        result = mongo.db.questions.insert_one(question_data)
        
        # Update user contributions
        mongo.db.users.update_one(
            {'_id': ObjectId(data['authorId'])},
            {'$inc': {'contributions': 1}}
        )
        
        # Get the created question with author info
        question = list(mongo.db.questions.aggregate([
            {'$match': {'_id': result.inserted_id}},
            {'$lookup': {
                'from': 'users',
                'localField': 'authorId',
                'foreignField': '_id',
                'as': 'author'
            }},
            {'$unwind': '$author'}
        ]))[0]
        
        return jsonify({
            'success': True,
            'message': 'Question created successfully',
            'data': serialize_doc(question)
        }), 201
    
    except Exception as e:
        print(f"Error creating question: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error creating question',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/questions/domain/<domain>', methods=['GET'])
def get_questions_by_domain(domain):
    """Get all questions for a specific domain"""
    try:
        if domain not in DOMAINS:
            return jsonify({
                'success': False,
                'message': 'Invalid domain'
            }), 400
        
        questions = list(mongo.db.questions.aggregate([
            {'$match': {'domain': domain, 'isActive': True}},
            {'$lookup': {
                'from': 'users',
                'localField': 'authorId',
                'foreignField': '_id',
                'as': 'author'
            }},
            {'$unwind': '$author'},
            {'$sort': {'createdAt': -1}}
        ]))
        
        serialized_questions = [serialize_doc(question) for question in questions]
        
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

@domainforum_bp.route('/api/questions/<question_id>', methods=['GET'])
def get_question(question_id):
    """Get single question by ID"""
    try:
        if not ObjectId.is_valid(question_id):
            return jsonify({
                'success': False,
                'message': 'Invalid question ID'
            }), 400
        
        # Increment view count
        mongo.db.questions.update_one(
            {'_id': ObjectId(question_id)},
            {'$inc': {'views': 1}}
        )
        
        # Get question with author info
        question = list(mongo.db.questions.aggregate([
            {'$match': {'_id': ObjectId(question_id)}},
            {'$lookup': {
                'from': 'users',
                'localField': 'authorId',
                'foreignField': '_id',
                'as': 'author'
            }},
            {'$unwind': '$author'}
        ]))
        
        if not question:
            return jsonify({
                'success': False,
                'message': 'Question not found'
            }), 404
        
        return jsonify({
            'success': True,
            'data': serialize_doc(question[0])
        }), 200
    
    except Exception as e:
        print(f"Error fetching question: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching question',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/questions/<question_id>/like', methods=['PATCH'])
def like_question(question_id):
    """Like/unlike a question"""
    try:
        if not ObjectId.is_valid(question_id):
            return jsonify({
                'success': False,
                'message': 'Invalid question ID'
            }), 400
        
        data = request.get_json()
        user_id = data.get('userId')
        
        if not user_id or not ObjectId.is_valid(user_id):
            return jsonify({
                'success': False,
                'message': 'Valid user ID required'
            }), 400
        
        question = mongo.db.questions.find_one({'_id': ObjectId(question_id)})
        if not question:
            return jsonify({
                'success': False,
                'message': 'Question not found'
            }), 404
        
        user_obj_id = ObjectId(user_id)
        liked_by = question.get('likedBy', [])
        
        if user_obj_id in liked_by:
            # Unlike
            mongo.db.questions.update_one(
                {'_id': ObjectId(question_id)},
                {
                    '$pull': {'likedBy': user_obj_id},
                    '$inc': {'likes': -1}
                }
            )
            action = 'unliked'
        else:
            # Like
            mongo.db.questions.update_one(
                {'_id': ObjectId(question_id)},
                {
                    '$push': {'likedBy': user_obj_id},
                    '$inc': {'likes': 1}
                }
            )
            action = 'liked'
        
        # Get updated question
        updated_question = mongo.db.questions.find_one({'_id': ObjectId(question_id)})
        
        return jsonify({
            'success': True,
            'message': f'Question {action} successfully',
            'data': {
                'likes': updated_question['likes'],
                'action': action
            }
        }), 200
    
    except Exception as e:
        print(f"Error liking question: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error updating like status',
            'error': str(e)
        }), 500

# File Management Routes

@domainforum_bp.route('/api/upload/discussion', methods=['POST'])
def upload_discussion_files():
    """Upload files for discussions"""
    try:
        if 'files' not in request.files:
            return jsonify({
                'success': False,
                'message': 'No files provided'
            }), 400
        
        files = request.files.getlist('files')
        uploaded_files = []
        
        for file in files:
            if file and file.filename:
                filename = save_file(file, 'discussions')
                if filename:
                    uploaded_files.append({
                        'originalName': file.filename,
                        'savedName': filename,
                        'path': f"discussions/{filename}"
                    })
        
        if not uploaded_files:
            return jsonify({
                'success': False,
                'message': 'No valid files uploaded'
            }), 400
        
        return jsonify({
            'success': True,
            'message': f'{len(uploaded_files)} files uploaded successfully',
            'data': uploaded_files
        }), 200
    
    except Exception as e:
        print(f"Error uploading files: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error uploading files',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/files/<folder>/<filename>')
def get_file(folder, filename):
    """Serve uploaded files"""
    try:
        file_path = os.path.join(mongo.app.config['UPLOAD_FOLDER'], folder, filename)
        if os.path.exists(file_path):
            return send_file(file_path)
        else:
            return jsonify({
                'success': False,
                'message': 'File not found'
            }), 404
    
    except Exception as e:
        print(f"Error serving file: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error serving file',
            'error': str(e)
        }), 500

# Message/Reply Management Routes

@domainforum_bp.route('/api/discussions/<discussion_id>/replies', methods=['POST'])
def create_reply():
    """Create a reply to a discussion"""
    try:
        discussion_id = request.view_args['discussion_id']
        
        if not ObjectId.is_valid(discussion_id):
            return jsonify({
                'success': False,
                'message': 'Invalid discussion ID'
            }), 400
        
        data = request.get_json()
        
        # Validation
        required_fields = ['content', 'authorId']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field.capitalize()} is required'
                }), 400
        
        # Validate author exists
        if not ObjectId.is_valid(data['authorId']):
            return jsonify({
                'success': False,
                'message': 'Invalid author ID'
            }), 400
        
        author = mongo.db.users.find_one({'_id': ObjectId(data['authorId'])})
        if not author:
            return jsonify({
                'success': False,
                'message': 'Author not found'
            }), 404
        
        # Check if discussion exists
        discussion = mongo.db.discussions.find_one({'_id': ObjectId(discussion_id)})
        if not discussion:
            return jsonify({
                'success': False,
                'message': 'Discussion not found'
            }), 404
        
        # Create reply document
        reply_data = {
            'discussionId': ObjectId(discussion_id),
            'content': data['content'].strip(),
            'authorId': ObjectId(data['authorId']),
            'likes': 0,
            'likedBy': [],
            'createdAt': datetime.utcnow(),
            'isActive': True
        }
        
        # Insert reply into database
        result = mongo.db.replies.insert_one(reply_data)
        
        # Update discussion reply count
        mongo.db.discussions.update_one(
            {'_id': ObjectId(discussion_id)},
            {'$inc': {'replies': 1}}
        )
        
        # Update user contributions
        mongo.db.users.update_one(
            {'_id': ObjectId(data['authorId'])},
            {'$inc': {'contributions': 1}}
        )
        
        # Get the created reply with author info
        reply = list(mongo.db.replies.aggregate([
            {'$match': {'_id': result.inserted_id}},
            {'$lookup': {
                'from': 'users',
                'localField': 'authorId',
                'foreignField': '_id',
                'as': 'author'
            }},
            {'$unwind': '$author'}
        ]))[0]
        
        return jsonify({
            'success': True,
            'message': 'Reply created successfully',
            'data': serialize_doc(reply)
        }), 201
    
    except Exception as e:
        print(f"Error creating reply: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error creating reply',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/discussions/<discussion_id>/replies', methods=['GET'])
def get_discussion_replies(discussion_id):
    """Get all replies for a discussion"""
    try:
        if not ObjectId.is_valid(discussion_id):
            return jsonify({
                'success': False,
                'message': 'Invalid discussion ID'
            }), 400
        
        replies = list(mongo.db.replies.aggregate([
            {'$match': {'discussionId': ObjectId(discussion_id), 'isActive': True}},
            {'$lookup': {
                'from': 'users',
                'localField': 'authorId',
                'foreignField': '_id',
                'as': 'author'
            }},
            {'$unwind': '$author'},
            {'$sort': {'createdAt': 1}}
        ]))
        
        serialized_replies = [serialize_doc(reply) for reply in replies]
        
        return jsonify({
            'success': True,
            'data': serialized_replies
        }), 200
    
    except Exception as e:
        print(f"Error fetching replies: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching replies',
            'error': str(e)
        }), 500

# Direct Messaging Routes

@domainforum_bp.route('/api/messages', methods=['POST'])
def send_message():
    """Send direct message between users"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['senderId', 'receiverId', 'content']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field.capitalize()} is required'
                }), 400
        
        # Validate user IDs
        for user_id in [data['senderId'], data['receiverId']]:
            if not ObjectId.is_valid(user_id):
                return jsonify({
                    'success': False,
                    'message': 'Invalid user ID'
                }), 400
        
        # Check if both users exist
        sender = mongo.db.users.find_one({'_id': ObjectId(data['senderId'])})
        receiver = mongo.db.users.find_one({'_id': ObjectId(data['receiverId'])})
        
        if not sender or not receiver:
            return jsonify({
                'success': False,
                'message': 'One or both users not found'
            }), 404
        
        # Create message document
        message_data = {
            'senderId': ObjectId(data['senderId']),
            'receiverId': ObjectId(data['receiverId']),
            'content': data['content'].strip(),
            'isRead': False,
            'createdAt': datetime.utcnow()
        }
        
        # Insert into database
        result = mongo.db.messages.insert_one(message_data)
        
        # Get the created message with sender info
        message = list(mongo.db.messages.aggregate([
            {'$match': {'_id': result.inserted_id}},
            {'$lookup': {
                'from': 'users',
                'localField': 'senderId',
                'foreignField': '_id',
                'as': 'sender'
            }},
            {'$lookup': {
                'from': 'users',
                'localField': 'receiverId',
                'foreignField': '_id',
                'as': 'receiver'
            }},
            {'$unwind': '$sender'},
            {'$unwind': '$receiver'}
        ]))[0]
        
        return jsonify({
            'success': True,
            'message': 'Message sent successfully',
            'data': serialize_doc(message)
        }), 201
    
    except Exception as e:
        print(f"Error sending message: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error sending message',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/messages/conversation/<user1_id>/<user2_id>', methods=['GET'])
def get_conversation(user1_id, user2_id):
    """Get conversation between two users"""
    try:
        # Validate user IDs
        for user_id in [user1_id, user2_id]:
            if not ObjectId.is_valid(user_id):
                return jsonify({
                    'success': False,
                    'message': 'Invalid user ID'
                }), 400
        
        messages = list(mongo.db.messages.aggregate([
            {'$match': {
                '$or': [
                    {'senderId': ObjectId(user1_id), 'receiverId': ObjectId(user2_id)},
                    {'senderId': ObjectId(user2_id), 'receiverId': ObjectId(user1_id)}
                ]
            }},
            {'$lookup': {
                'from': 'users',
                'localField': 'senderId',
                'foreignField': '_id',
                'as': 'sender'
            }},
            {'$lookup': {
                'from': 'users',
                'localField': 'receiverId',
                'foreignField': '_id',
                'as': 'receiver'
            }},
            {'$unwind': '$sender'},
            {'$unwind': '$receiver'},
            {'$sort': {'createdAt': 1}}
        ]))
        
        serialized_messages = [serialize_doc(message) for message in messages]
        
        return jsonify({
            'success': True,
            'data': serialized_messages
        }), 200
    
    except Exception as e:
        print(f"Error fetching conversation: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching conversation',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/messages/user/<user_id>', methods=['GET'])
def get_user_messages(user_id):
    """Get all conversations for a user"""
    try:
        if not ObjectId.is_valid(user_id):
            return jsonify({
                'success': False,
                'message': 'Invalid user ID'
            }), 400
        
        # Get latest message from each conversation
        conversations = list(mongo.db.messages.aggregate([
            {'$match': {
                '$or': [
                    {'senderId': ObjectId(user_id)},
                    {'receiverId': ObjectId(user_id)}
                ]
            }},
            {'$sort': {'createdAt': -1}},
            {'$group': {
                '_id': {
                    '$cond': [
                        {'$eq': ['$senderId', ObjectId(user_id)]},
                        '$receiverId',
                        '$senderId'
                    ]
                },
                'lastMessage': {'$first': '$ROOT'}
            }},
            {'$lookup': {
                'from': 'users',
                'localField': '_id',
                'foreignField': '_id',
                'as': 'otherUser'
            }},
            {'$unwind': '$otherUser'},
            {'$sort': {'lastMessage.createdAt': -1}}
        ]))
        
        serialized_conversations = []
        for conv in conversations:
            conv['lastMessage'] = serialize_doc(conv['lastMessage'])
            conv['otherUser'] = serialize_doc(conv['otherUser'])
            serialized_conversations.append(conv)
        
        return jsonify({
            'success': True,
            'data': serialized_conversations
        }), 200
    
    except Exception as e:
        print(f"Error fetching user messages: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching messages',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/connections', methods=['POST'])
def create_connection():
    """Send connection request"""
    try:
        data = request.get_json()
        
        # Validation
        required_fields = ['requesterId', 'receiverId']
        for field in required_fields:
            if not data.get(field):
                return jsonify({
                    'success': False,
                    'message': f'{field.capitalize()} is required'
                }), 400
        
        # Validate user IDs
        for user_id in [data['requesterId'], data['receiverId']]:
            if not ObjectId.is_valid(user_id):
                return jsonify({
                    'success': False,
                    'message': 'Invalid user ID'
                }), 400
        
        # Check if users exist
        requester = mongo.db.users.find_one({'_id': ObjectId(data['requesterId'])})
        receiver = mongo.db.users.find_one({'_id': ObjectId(data['receiverId'])})
        
        if not requester or not receiver:
            return jsonify({
                'success': False,
                'message': 'One or both users not found'
            }), 404
        
        # Check if connection already exists
        existing_connection = mongo.db.connections.find_one({
            '$or': [
                {'requesterId': ObjectId(data['requesterId']), 'receiverId': ObjectId(data['receiverId'])},
                {'requesterId': ObjectId(data['receiverId']), 'receiverId': ObjectId(data['requesterId'])}
            ]
        })
        
        if existing_connection:
            return jsonify({
                'success': False,
                'message': 'Connection already exists or pending'
            }), 409
        
        # Create connection request
        connection_data = {
            'requesterId': ObjectId(data['requesterId']),
            'receiverId': ObjectId(data['receiverId']),
            'status': 'pending',
            'message': data.get('message', ''),
            'createdAt': datetime.utcnow()
        }
        
        result = mongo.db.connections.insert_one(connection_data)
        
        # Get the created connection with user info
        connection = list(mongo.db.connections.aggregate([
            {'$match': {'_id': result.inserted_id}},
            {'$lookup': {
                'from': 'users',
                'localField': 'requesterId',
                'foreignField': '_id',
                'as': 'requester'
            }},
            {'$lookup': {
                'from': 'users',
                'localField': 'receiverId',
                'foreignField': '_id',
                'as': 'receiver'
            }},
            {'$unwind': '$requester'},
            {'$unwind': '$receiver'}
        ]))[0]
        
        return jsonify({
            'success': True,
            'message': 'Connection request sent successfully',
            'data': serialize_doc(connection)
        }), 201
    
    except Exception as e:
        print(f"Error creating connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error sending connection request',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/connections/<connection_id>/respond', methods=['PATCH'])
def respond_to_connection(connection_id):
    """Accept or reject connection request"""
    try:
        if not ObjectId.is_valid(connection_id):
            return jsonify({
                'success': False,
                'message': 'Invalid connection ID'
            }), 400
        
        data = request.get_json()
        action = data.get('action')  # 'accept' or 'reject'
        
        if action not in ['accept', 'reject']:
            return jsonify({
                'success': False,
                'message': 'Action must be either "accept" or "reject"'
            }), 400
        
        # Update connection status
        status = 'accepted' if action == 'accept' else 'rejected'
        result = mongo.db.connections.update_one(
            {'_id': ObjectId(connection_id), 'status': 'pending'},
            {
                '$set': {
                    'status': status,
                    'respondedAt': datetime.utcnow()
                }
            }
        )
        
        if result.matched_count == 0:
            return jsonify({
                'success': False,
                'message': 'Connection request not found or already responded'
            }), 404
        
        return jsonify({
            'success': True,
            'message': f'Connection request {action}ed successfully'
        }), 200
    
    except Exception as e:
        print(f"Error responding to connection: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error responding to connection request',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/users/<user_id>/connections', methods=['GET'])
def get_user_connections(user_id):
    """Get all connections for a user"""
    try:
        if not ObjectId.is_valid(user_id):
            return jsonify({
                'success': False,
                'message': 'Invalid user ID'
            }), 400
        
        connections = list(mongo.db.connections.aggregate([
            {'$match': {
                '$or': [
                    {'requesterId': ObjectId(user_id)},
                    {'receiverId': ObjectId(user_id)}
                ],
                'status': 'accepted'
            }},
            {'$lookup': {
                'from': 'users',
                'localField': 'requesterId',
                'foreignField': '_id',
                'as': 'requester'
            }},
            {'$lookup': {
                'from': 'users',
                'localField': 'receiverId',
                'foreignField': '_id',
                'as': 'receiver'
            }},
            {'$unwind': '$requester'},
            {'$unwind': '$receiver'}
        ]))
        
        # Format connections to show the "other" user
        formatted_connections = []
        for conn in connections:
            other_user = conn['receiver'] if str(conn['requesterId']) == user_id else conn['requester']
            formatted_connections.append({
                'connectionId': str(conn['_id']),
                'user': serialize_doc(other_user),
                'connectedAt': conn['createdAt'].isoformat() if 'createdAt' in conn else None
            })
        
        return jsonify({
            'success': True,
            'data': formatted_connections
        }), 200
    
    except Exception as e:
        print(f"Error fetching connections: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching connections',
            'error': str(e)
        }), 500

# Search and Analytics Routes

@domainforum_bp.route('/api/search', methods=['GET'])
def search_content():
    """Search discussions and questions"""
    try:
        query = request.args.get('q', '').strip()
        domain = request.args.get('domain', '')
        content_type = request.args.get('type', 'all')  # 'discussions', 'questions', or 'all'
        
        if not query:
            return jsonify({
                'success': False,
                'message': 'Search query is required'
            }), 400
        
        if domain and domain not in DOMAINS:
            return jsonify({
                'success': False,
                'message': 'Invalid domain'
            }), 400
        
        results = {'discussions': [], 'questions': []}
        
        # Search discussions
        if content_type in ['discussions', 'all']:
            discussion_filter = {
                '$and': [
                    {'isActive': True},
                    {
                        '$or': [
                            {'title': {'$regex': query, '$options': 'i'}},
                            {'content': {'$regex': query, '$options': 'i'}}
                        ]
                    }
                ]
            }
            
            if domain:
                discussion_filter['$and'].append({'domain': domain})
            
            discussions = list(mongo.db.discussions.aggregate([
                {'$match': discussion_filter},
                {'$lookup': {
                    'from': 'users',
                    'localField': 'authorId',
                    'foreignField': '_id',
                    'as': 'author'
                }},
                {'$unwind': '$author'},
                {'$sort': {'createdAt': -1}},
                {'$limit': 20}
            ]))
            
            results['discussions'] = [serialize_doc(disc) for disc in discussions]
        
        # Search questions
        if content_type in ['questions', 'all']:
            question_filter = {
                '$and': [
                    {'isActive': True},
                    {
                        '$or': [
                            {'company': {'$regex': query, '$options': 'i'}},
                            {'round': {'$regex': query, '$options': 'i'}},
                            {'content': {'$regex': query, '$options': 'i'}}
                        ]
                    }
                ]
            }
            
            if domain:
                question_filter['$and'].append({'domain': domain})
            
            questions = list(mongo.db.questions.aggregate([
                {'$match': question_filter},
                {'$lookup': {
                    'from': 'users',
                    'localField': 'authorId',
                    'foreignField': '_id',
                    'as': 'author'
                }},
                {'$unwind': '$author'},
                {'$sort': {'createdAt': -1}},
                {'$limit': 20}
            ]))
            
            results['questions'] = [serialize_doc(q) for q in questions]
        
        return jsonify({
            'success': True,
            'data': results
        }), 200
    
    except Exception as e:
        print(f"Error searching content: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error searching content',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/analytics/domain/<domain>', methods=['GET'])
def get_domain_analytics(domain):
    """Get analytics for a specific domain"""
    try:
        if domain not in DOMAINS:
            return jsonify({
                'success': False,
                'message': 'Invalid domain'
            }), 400
        
        # Get domain statistics
        total_users = mongo.db.users.count_documents({'domain': domain, 'isActive': True})
        total_discussions = mongo.db.discussions.count_documents({'domain': domain, 'isActive': True})
        total_questions = mongo.db.questions.count_documents({'domain': domain, 'isActive': True})
        
        # Get top contributors
        top_contributors = list(mongo.db.users.find(
            {'domain': domain, 'isActive': True}
        ).sort('contributions', -1).limit(5))
        
        # Get recent activity (last 30 days)
        from datetime import timedelta
        thirty_days_ago = datetime.utcnow() - timedelta(days=30)
        
        recent_discussions = mongo.db.discussions.count_documents({
            'domain': domain,
            'isActive': True,
            'createdAt': {'$gte': thirty_days_ago}
        })
        
        recent_questions = mongo.db.questions.count_documents({
            'domain': domain,
            'isActive': True,
            'createdAt': {'$gte': thirty_days_ago}
        })
        
        analytics_data = {
            'domain': domain,
            'totalUsers': total_users,
            'totalDiscussions': total_discussions,
            'totalQuestions': total_questions,
            'recentDiscussions': recent_discussions,
            'recentQuestions': recent_questions,
            'topContributors': [serialize_doc(user) for user in top_contributors]
        }
        
        return jsonify({
            'success': True,
            'data': analytics_data
        }), 200
    
    except Exception as e:
        print(f"Error fetching analytics: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching analytics',
            'error': str(e)
        }), 500

# Company and Interview Round Routes

@domainforum_bp.route('/api/companies', methods=['GET'])
def get_companies():
    """Get list of companies from questions"""
    try:
        domain = request.args.get('domain')
        
        match_filter = {'isActive': True}
        if domain and domain in DOMAINS:
            match_filter['domain'] = domain
        
        companies = mongo.db.questions.aggregate([
            {'$match': match_filter},
            {'$group': {
                '_id': '$company',
                'questionCount': {'$sum': 1},
                'domains': {'$addToSet': '$domain'}
            }},
            {'$sort': {'questionCount': -1}}
        ])
        
        company_list = []
        for company in companies:
            company_list.append({
                'name': company['_id'],
                'questionCount': company['questionCount'],
                'domains': company['domains']
            })
        
        return jsonify({
            'success': True,
            'data': company_list
        }), 200
    
    except Exception as e:
        print(f"Error fetching companies: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching companies',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/rounds', methods=['GET'])
def get_interview_rounds():
    """Get list of interview rounds from questions"""
    try:
        domain = request.args.get('domain')
        company = request.args.get('company')
        
        match_filter = {'isActive': True}
        if domain and domain in DOMAINS:
            match_filter['domain'] = domain
        if company:
            match_filter['company'] = company
        
        rounds = mongo.db.questions.aggregate([
            {'$match': match_filter},
            {'$group': {
                '_id': '$round',
                'questionCount': {'$sum': 1},
                'companies': {'$addToSet': '$company'}
            }},
            {'$sort': {'questionCount': -1}}
        ])
        
        rounds_list = []
        for round_data in rounds:
            rounds_list.append({
                'name': round_data['_id'],
                'questionCount': round_data['questionCount'],
                'companies': round_data['companies']
            })
        
        return jsonify({
            'success': True,
            'data': rounds_list
        }), 200
    
    except Exception as e:
        print(f"Error fetching rounds: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching rounds',
            'error': str(e)
        }), 500

# Utility Routes

@domainforum_bp.route('/api/domains', methods=['GET'])
def get_domains():
    """Get list of available domains"""
    return jsonify({
        'success': True,
        'data': DOMAINS
    }), 200

@domainforum_bp.route('/api/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    try:
        # Test database connection
        mongo.db.command('ping')
        return jsonify({
            'success': True,
            'message': 'API is healthy',
            'timestamp': datetime.utcnow().isoformat()
        }), 200
    except Exception as e:
        return jsonify({
            'success': False,
            'message': 'Database connection failed',
            'error': str(e)
        }), 500

# Additional utility functions for data management

@domainforum_bp.route('/api/users/<user_id>/activity', methods=['GET'])
def get_user_activity(user_id):
    """Get user's recent activity"""
    try:
        if not ObjectId.is_valid(user_id):
            return jsonify({
                'success': False,
                'message': 'Invalid user ID'
            }), 400
        
        # Get user's discussions
        discussions = list(mongo.db.discussions.find({
            'authorId': ObjectId(user_id),
            'isActive': True
        }).sort('createdAt', -1).limit(10))
        
        # Get user's questions
        questions = list(mongo.db.questions.find({
            'authorId': ObjectId(user_id),
            'isActive': True
        }).sort('createdAt', -1).limit(10))
        
        # Get user's replies
        replies = list(mongo.db.replies.aggregate([
            {'$match': {'authorId': ObjectId(user_id), 'isActive': True}},
            {'$lookup': {
                'from': 'discussions',
                'localField': 'discussionId',
                'foreignField': '_id',
                'as': 'discussion'
            }},
            {'$unwind': '$discussion'},
            {'$sort': {'createdAt': -1}},
            {'$limit': 10}
        ]))
        
        activity_data = {
            'discussions': [serialize_doc(d) for d in discussions],
            'questions': [serialize_doc(q) for q in questions],
            'replies': [serialize_doc(r) for r in replies]
        }
        
        return jsonify({
            'success': True,
            'data': activity_data
        }), 200
    
    except Exception as e:
        print(f"Error fetching user activity: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching user activity',
            'error': str(e)
        }), 500

@domainforum_bp.route('/api/admin/stats', methods=['GET'])
def get_admin_stats():
    """Get overall platform statistics (for admin use)"""
    try:
        stats = {}
        
        # Overall statistics
        stats['totalUsers'] = mongo.db.users.count_documents({'isActive': True})
        stats['totalDiscussions'] = mongo.db.discussions.count_documents({'isActive': True})
        stats['totalQuestions'] = mongo.db.questions.count_documents({'isActive': True})
        stats['totalConnections'] = mongo.db.connections.count_documents({'status': 'accepted'})
        
        # Domain-wise breakdown
        domain_stats = []
        for domain in DOMAINS:
            domain_data = {
                'domain': domain,
                'users': mongo.db.users.count_documents({'domain': domain, 'isActive': True}),
                'discussions': mongo.db.discussions.count_documents({'domain': domain, 'isActive': True}),
                'questions': mongo.db.questions.count_documents({'domain': domain, 'isActive': True})
            }
            domain_stats.append(domain_data)
        
        stats['domainBreakdown'] = domain_stats
        
        return jsonify({
            'success': True,
            'data': stats
        }), 200
    
    except Exception as e:
        print(f"Error fetching admin stats: {str(e)}")
        return jsonify({
            'success': False,
            'message': 'Error fetching statistics',
            'error': str(e)
        }), 500

# Database initialization (run once)
def init_db():
    """Initialize database with indexes"""
    try:
        # Create indexes for better performance
        mongo.db.users.create_index([('email', 1)], unique=True)
        mongo.db.users.create_index([('domain', 1)])
        mongo.db.discussions.create_index([('domain', 1), ('createdAt', -1)])
        mongo.db.questions.create_index([('domain', 1), ('createdAt', -1)])
        mongo.db.questions.create_index([('company', 1)])
        mongo.db.connections.create_index([('requesterId', 1), ('receiverId', 1)])
        mongo.db.messages.create_index([('senderId', 1), ('receiverId', 1), ('createdAt', -1)])
        mongo.db.replies.create_index([('discussionId', 1), ('createdAt', 1)])
        
        print("Database indexes created successfully")
    except Exception as e:
        print(f"Error creating indexes: {str(e)}")

# Note: This module is registered as a Blueprint by the main app