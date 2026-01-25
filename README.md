# 🎯 MockAI - AI-Powered Mock Interview Platform

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![LangChain](https://img.shields.io/badge/LangChain-Enabled-FF6F61.svg)](https://langchain.com/)
[![License](https://img.shields.io/badge/License-MIT-yellow.svg)](LICENSE)

> **A comprehensive AI-driven platform for conducting mock interviews, technical assessments, and placement preparation with real-time proctoring, automated evaluation, and intelligent feedback.**

---

## 📖 Table of Contents

- [🌟 About the Project](#-about-the-project)
- [✨ Key Features](#-key-features)
- [🎥 Project Preview](#-project-preview)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ System Architecture](#️-system-architecture)
- [📁 Folder Structure](#-folder-structure)
- [🔄 How It Works](#-how-it-works)
- [⚙️ Installation & Setup](#️-installation--setup)
- [🐳 Docker Setup](#-docker-setup)
- [🔐 Environment Variables](#-environment-variables)
- [🌐 API Endpoints](#-api-endpoints)
- [💾 Database Schema](#-database-schema)
- [📸 Screenshots](#-screenshots)
- [🚀 Future Enhancements](#-future-enhancements)
- [🐛 Common Errors & Fixes](#-common-errors--fixes)
- [🤝 Contributing](#-contributing)
- [📄 License](#-license)
- [👤 Author & Contact](#-author--contact)

---

## 🌟 About the Project

**MockAI** is a cutting-edge, production-ready platform designed to revolutionize the interview preparation and recruitment process. Built for **students**, **job seekers**, and **HR professionals**, it combines the power of **AI/ML**, **LangChain**, **LangGraph**, and **real-time proctoring** to deliver:

### 🎯 **Problem It Solves**

- ❌ **Traditional interview prep is expensive and time-consuming**
- ❌ **Lack of personalized feedback for candidates**
- ❌ **Manual resume screening is inefficient**
- ❌ **No standardized technical assessment platform**
- ❌ **Difficulty in tracking candidate performance**

### ✅ **Solution Provided**

✔️ **AI-powered mock interviews** with domain-specific questions  
✔️ **Automated resume analysis (ATS)** with match scoring  
✔️ **Real-time face & gaze tracking proctoring**  
✔️ **Code execution engine** with Docker isolation  
✔️ **Smart quiz generation** from PDFs, YouTube, and audio  
✔️ **Portfolio chatbot** with RAG (Retrieval-Augmented Generation)  
✔️ **HR dashboard** for managing roles and candidates  

### 🎓 **Target Users**

- **Students & Job Seekers**: Practice interviews, improve skills, get AI feedback
- **HR Teams**: Conduct structured assessments, track results, manage candidates
- **Educators**: Create placement papers, manage question banks

---

## ✨ Key Features

### 🎤 **1. AI Mock Interviews (Core Feature)**
- 🤖 **LLM-Powered Question Generation**: Dynamic interview questions using Groq's Llama models
- 📹 **Real-Time Proctoring**: 
  - Face detection using OpenCV Haar Cascades
  - Eye tracking and gaze direction analysis
  - Long blink detection (>1.5s triggers warning)
  - Alert system with audio notifications
  - Maximum 3 warnings before exam termination
- 🎯 **Multi-Round Assessment**:
  - **Round 1**: Aptitude & General Questions
  - **Round 2**: Technical Interview (domain-specific)
  - **Round 3**: HR Round
- 📊 **AI Evaluation**: Automated scoring with detailed feedback (STRENGTHS, WEAKNESSES, FINAL MARK out of 50)
- 💾 **Session Management**: Conversation history with LangChain memory

### 💻 **2. Code Execution Engine**
- 🐳 **Docker-Isolated Execution**: Runs user code in secure containers
- 🌐 **Multi-Language Support**:
  - C, C++, Java, Python
  - Node.js / JavaScript
- 🧪 **Test Case Validation**: 
  - Automatic test case execution
  - Input/Output matching
  - Runtime error detection
- 📝 **LeetCode-Style Problems**:
  - Gas Station (Hard)
  - Candy Distribution (Hard)
  - Longest Increasing Subsequence (Hard)
- 🔒 **Security**: Non-root user execution, resource limits, timeout protection

### 📄 **3. ATS (Applicant Tracking System)**
- 📤 **Resume Upload**: Supports PDF, DOC, DOCX, TXT formats
- 🔍 **AI-Powered Analysis**:
  - Match percentage calculation
  - Skills gap identification
  - Relevant experience extraction
  - Keyword matching
- 💡 **Improvement Suggestions**: Actionable feedback for resume enhancement
- ⚡ **Groq LLM Integration**: Fast resume parsing and analysis

### 🧠 **4. Smart Quiz Generator**
- 📚 **Multi-Source Input**:
  - PDF documents (text extraction with PyPDF2)
  - YouTube videos (transcript extraction)
  - Audio files (speech-to-text conversion)
- 🤖 **LangGraph Workflow**: 4-stage processing pipeline
  - Content retrieval
  - Preprocessing (remove filler words)
  - Question generation
  - MCQ formatting
- 🎯 **Customizable**:
  - Difficulty levels (Easy, Medium, Hard)
  - Number of questions
  - Question types (MCQ, True/False, Short Answer)
- 🗄️ **Vector Store Integration**: Uses HuggingFace embeddings + Chroma DB

### 💬 **5. Portfolio Chatbot (RAG-Powered)**
- 🧩 **4-Stage Agent System** (LangGraph):
  - **Stage 0**: Query relevance validation
  - **Stage 1**: Query restructuring for clarity
  - **Stage 2**: Document retrieval from Pinecone
  - **Stage 3**: LLM answer generation
- 🔍 **Section-Aware Retrieval**: Filters by projects, skills, experience, education, achievements
- 🎯 **Concise Responses**: Trained to give exact answers without fluff
- 🚫 **Irrelevant Query Rejection**: Politely declines off-topic questions
- 📊 **Architecture Documentation**: Full workflow in `CHAT_ARCHITECTURE.md`

### 🏢 **6. Company Profile Scraper**
- 🔎 **Intelligent Search**: Uses Groq LLM to resolve company names
- 🌐 **Wikipedia Integration**: Extracts structured company data
- 📝 **AI Summarization**: Generates concise profiles covering:
  - Vision & Mission
  - Founding information
  - Products & Services
  - Notable achievements
  - Financial highlights
  - Headquarters & employee count
- ⚡ **Real-Time Processing**: Fast API responses with caching

### 🗨️ **7. Domain-Specific Forum**
- 👥 **User Management**: Registration, profiles, domain selection
- 💬 **Discussion Boards**: Create, like, reply to discussions
- ❓ **Interview Question Bank**: 
  - Filter by company, difficulty, round
  - Upload answer PDFs
  - View count tracking
- 📎 **File Attachments**: Support for images, PDFs, documents
- 🔔 **Connection System**: Send/accept connection requests
- 📊 **Analytics Dashboard**: Domain-wise statistics

### 📋 **8. Placement Paper Generator**
- 🎲 **Question Bank Integration**: Curated interview questions
- 🏢 **Company-Specific Papers**: Generate based on company/domain
- 📄 **Multiple Formats**: Text and PDF questions
- 🔍 **Advanced Filtering**: By category, difficulty, company
- 📈 **Performance Tracking**: View counts and popularity

### 👔 **9. HR Dashboard**
- 📊 **Role Management**: Create and manage job roles
- 👨‍💼 **Candidate Management**: Add students, assign to roles
- 📈 **Results Tracking**: View all test results by role and student
- 🔐 **Authentication**: Secure login with bcrypt password hashing
- 🎯 **Multi-Round Results**: Aggregated scores across 3 rounds

### 🎓 **10. Student Dashboard**
- 📝 **Test Interface**: Clean UI for taking assessments
- 📊 **Progress Tracking**: View past results and performance
- 🎯 **Practice Mode**: Access question banks and practice quizzes
- 💼 **Portfolio Assistant**: Chat with AI about developer portfolios
- 🏢 **Company Research**: Scrape company profiles for interview prep

---

## 🎥 Project Preview

> **Screenshots placeholders - Replace with actual images**

![Landing Page](assets/screenshots/landing.png)
*Modern landing page with role selection (HR/Candidate)*

![Interview Dashboard](assets/screenshots/interview-dashboard.png)
*AI-powered interview interface with real-time proctoring*

![Code Editor](assets/screenshots/code-editor.png)
*Monaco editor with multi-language support and test execution*

![ATS Analysis](assets/screenshots/ats-result.png)
*Resume analysis with match percentage and recommendations*

![HR Dashboard](assets/screenshots/hr-dashboard.png)
*Comprehensive dashboard for managing candidates and roles*

---

## 🛠️ Tech Stack

### **Frontend**
| Technology | Purpose |
|------------|---------|
| ⚛️ **React 19.1.0** | Modern UI library |
| 🎨 **Tailwind CSS 3.4** | Utility-first styling |
| 🎭 **Framer Motion 12.x** | Smooth animations |
| 🧭 **React Router 7.x** | Client-side routing |
| 📝 **Monaco Editor** | Code editor (VS Code engine) |
| 🎬 **Lottie React** | Animation rendering |
| 📹 **face-api.js** | Face detection library |
| 📦 **Axios** | HTTP client |
| 🔔 **React Toastify** | Notifications |
| ⚡ **Vite 6.3** | Build tool & dev server |

### **Backend**
| Technology | Purpose |
|------------|---------|
| 🐍 **Python 3.9+** | Core language |
| 🌶️ **Flask 3.0** | Web framework |
| 🟢 **Node.js 20.x** | JavaScript runtime |
| ⚡ **Express 5.1** | Node.js framework |
| 🤖 **LangChain** | LLM orchestration |
| 🔄 **LangGraph** | Agent workflow engine |
| 🧠 **Groq API** | Llama 3.1 LLM inference |
| 🔍 **Pinecone** | Vector database |
| 📊 **HuggingFace Embeddings** | Text embeddings |
| 🐳 **Docker (Dockerode)** | Code execution isolation |
| 📄 **PyPDF2 / Mammoth** | Document parsing |
| 🎥 **YouTube Transcript API** | Video transcript extraction |

### **Database**
| Database | Use Case |
|----------|----------|
| 🍃 **MongoDB Atlas** | Primary database (via Pymongo) |
| 🌲 **Pinecone** | Vector store for RAG |
| 💾 **Chroma DB** | Local vector storage |

### **AI/ML Models**
- **LLM**: Groq's `llama-3.1-8b-instant` (primary), OpenRouter's `gpt-oss-120b`
- **Embeddings**: `openai/text-embedding-3-small` (1536 dimensions)
- **Vision**: OpenCV Haar Cascades for face/eye detection

### **DevOps & Deployment**
- 🐳 **Docker**: Containerization for code execution
- 📦 **Docker Compose**: Multi-container setup (optional)
- ☁️ **Platform-Ready**: Deployable to Render, Railway, Heroku, AWS

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                         CLIENT LAYER                            │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  Monaco      │  │  Face API    │          │
│  │   (Vite)     │──│  Code Editor │──│  (Proctoring)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP/REST API
┌───────────────────────────▼─────────────────────────────────────┐
│                      BACKEND LAYER (API Gateway)                │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Flask App (app.py) - Main Entry Point                    │   │
│  │ ├─ CORS Middleware                                       │   │
│  │ ├─ Blueprint Registration                                │   │
│  │ └─ MongoDB Connection Pool                               │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │
        ┌───────────────────┼───────────────────┐
        │                   │                   │
┌───────▼─────┐  ┌─────────▼────────┐  ┌───────▼──────────┐
│ Flask       │  │   Node.js        │  │  AI/ML Layer     │
│ Blueprints  │  │   Microservice   │  │                  │
│             │  │                  │  │                  │
│ • interview │  │ • Code Execution │  │ • LangChain      │
│ • quiz      │  │ • Docker Manager │  │ • LangGraph      │
│ • ats       │  │ • Judge0 API     │  │ • Groq LLM       │
│ • chat      │  │ • Monaco Backend │  │ • Pinecone RAG   │
│ • portfolio │  │                  │  │ • HuggingFace    │
│ • question  │  └──────────────────┘  │ • OpenCV Vision  │
│ • company   │                        └──────────────────┘
│ • domain    │
└─────┬───────┘
      │
┌─────▼──────────────────────────────────────────────────────────┐
│                    DATA PERSISTENCE LAYER                      │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐         │
│  │  MongoDB     │  │   Pinecone   │  │  File System │         │
│  │  Atlas       │  │  Vector DB   │  │  (Uploads)   │         │
│  │              │  │              │  │              │         │
│  │ • Users      │  │ • Portfolio  │  │ • Resumes    │         │
│  │ • Students   │  │   Embeddings │  │ • PDFs       │         │
│  │ • Roles      │  │ • Context    │  │ • Audio      │         │
│  │ • Results    │  │   Chunks     │  │ • Images     │         │
│  │ • Questions  │  └──────────────┘  └──────────────┘         │
│  │ • Messages   │                                              │
│  └──────────────┘                                              │
└────────────────────────────────────────────────────────────────┘
```

### **Interview Processing Flow**

```
User Starts Interview
      │
      ▼
┌─────────────────┐
│ Face Detection  │◄──── OpenCV Haar Cascade
│ Initialization  │      (Load models)
└────────┬────────┘
         │
         ▼
┌─────────────────┐
│ Question Gen    │◄──── Groq LLM (Llama 3.1)
│ (Per Round)     │      + Domain-specific prompts
└────────┬────────┘
         │
    ┌────▼─────┐
    │ For each │
    │ Question │
    └────┬─────┘
         │
    ┌────▼────────────────────┐
    │ Real-time Monitoring:   │
    │ • Face in frame?        │◄──── Process video frame
    │ • Eyes detected?        │      every request
    │ • Gaze direction OK?    │
    │ • Long blink check      │
    │ • Warning counter       │
    └────┬────────────────────┘
         │
         ▼
    [User Answers]
         │
         ▼
┌────────────────────┐
│ LLM Evaluation     │◄──── Conversation history
│ + Scoring          │      + Answer content
└────────┬───────────┘
         │
         ▼
┌────────────────────┐
│ Store Results      │──────► MongoDB
│ (Marks, Feedback)  │
└────────────────────┘
```

### **LangGraph Agent Architecture (Chat/Quiz)**

Detailed architecture is documented in `backend/CHAT_ARCHITECTURE.md`. Summary:

```
User Query → Validate Relevance → Restructure Query → 
Retrieve Docs (Pinecone) → Generate Answer (LLM) → Return
```

---

## 📁 Folder Structure

```
📦 mockai/
├── 📂 Client/
│   └── 📂 Interview/                  # React Frontend (Vite)
│       ├── 📂 public/
│       │   ├── 📂 Face_AI_Models/     # face-api.js model weights
│       │   ├── 📂 audio/              # Notification sounds
│       │   └── vite.svg
│       ├── 📂 src/
│       │   ├── 📂 Auth/               # Landing & login pages
│       │   │   ├── Landingpage.jsx
│       │   │   ├── login.jsx          # Student login
│       │   │   └── StudentLandingpage.jsx
│       │   ├── 📂 Dashboard/          # HR & Teacher dashboards
│       │   │   ├── Hr.jsx
│       │   │   ├── StudentDashboard.jsx
│       │   │   ├── TeacherDashboard.jsx
│       │   │   ├── login.jsx          # HR login
│       │   │   └── signup.jsx
│       │   ├── 📂 pages/              # Main application pages
│       │   │   ├── Interview.jsx      # Core interview interface
│       │   │   ├── Coding.jsx         # Code execution page
│       │   │   ├── Round1.jsx         # Aptitude test
│       │   │   ├── Round2.jsx         # Technical round
│       │   │   ├── Ats.jsx            # Resume analysis
│       │   │   ├── PracticeQuiz.jsx   # Quiz interface
│       │   │   ├── QuestionBank.jsx   # Question repository
│       │   │   ├── QuestionForum.jsx  # Discussion forum
│       │   │   ├── Domainforum.jsx    # Domain-specific forum
│       │   │   ├── Assistant.jsx      # Portfolio chatbot
│       │   │   ├── PlacementPaperGenerator.jsx
│       │   │   ├── FaceDetection.jsx  # Proctoring setup
│       │   │   ├── Protected.jsx      # Route protection
│       │   │   └── UserSelect.jsx     # User type selection
│       │   ├── 📂 student/            # Student-specific features
│       │   │   ├── Upload.jsx
│       │   │   └── CompanyFetch.jsx   # Company scraper UI
│       │   ├── 📂 context/
│       │   │   └── AuthContext.jsx    # Global auth state
│       │   ├── App.jsx                # Main app component
│       │   ├── main.jsx               # React entry point
│       │   └── index.css              # Global styles
│       ├── package.json               # Frontend dependencies
│       ├── vite.config.js             # Vite configuration
│       ├── tailwind.config.js         # Tailwind setup
│       └── index.html                 # HTML entry
│
├── 📂 backend/                        # Python & Node.js Backend
│   ├── 📂 audio/                      # Uploaded audio files
│   ├── 📂 uploads/                    # Resume/document uploads
│   ├── 📂 temp/                       # Temporary files for Docker
│   ├── 📂 chroma_db/                  # Local vector store
│   │
│   ├── 🐍 PYTHON MODULES (Flask)
│   ├── app.py                         # Main Flask entry + HR routes
│   ├── interview.py                   # Mock interview logic (Blueprint)
│   ├── quiz.py                        # Quiz generation (Blueprint)
│   ├── ats.py                         # Resume analysis (Blueprint)
│   ├── chat.py                        # Portfolio chatbot RAG (Blueprint)
│   ├── portfolio.py                   # Alternate chat implementation
│   ├── coding.py                      # Code execution wrapper
│   ├── questionbank.py                # Question CRUD (Blueprint)
│   ├── companyscrap_bp.py             # Company scraper (Blueprint)
│   ├── Domainforum.py                 # Forum system (Blueprint)
│   ├── practicequiz_bp.py             # Practice quiz routes
│   ├── Questionforum.py               # Forum integration
│   ├── facetrack.py                   # Face detection logic
│   ├── safety.py                      # Content moderation
│   ├── linkedin.py                    # LinkedIn integrations
│   ├── pdf.py                         # PDF processing
│   ├── aiassistant.py                 # AI helper functions
│   ├── web2.py                        # Additional web routes
│   ├── template.py                    # Prompt templates
│   ├── graph.py                       # LangGraph utilities
│   │
│   ├── 🟢 NODE.JS MODULES (Express)
│   ├── server.js                      # Code execution server (Docker)
│   ├── index.js                       # Alternative entry point
│   ├── company.js                     # Company data handler
│   ├── node.js                        # Node utilities
│   │
│   ├── 📄 CONFIGURATION FILES
│   ├── .env                           # API keys & secrets
│   ├── requirements.txt               # Minimal Python deps
│   ├── requirements1.txt              # Full Python dependencies
│   ├── package.json                   # Node.js dependencies
│   ├── Dockerfile                     # Docker container config
│   ├── .dockerignore
│   ├── langgraph.json                 # LangGraph workflow config
│   │
│   ├── 📚 DOCUMENTATION
│   ├── CHAT_ARCHITECTURE.md           # 4-stage agent system docs
│   ├── langraph_workflow.png          # Visual workflow diagram
│   │
│   └── 🧪 TEST/DATA FILES
│       ├── test.py, test1.py
│       ├── chatbot_qa_pairs.json      # Training data
│       ├── chatbot_training_data.json
│       └── scraper.log
│
├── 📂 linkedin/                       # LinkedIn integration module
├── 📄 .gitignore
├── 📄 langraph_workflow.png           # Root-level workflow diagram
└── 📄 README.md                       # This file
```

### **Key Directories Explained**

| Directory | Purpose |
|-----------|---------|
| `Client/Interview/` | React frontend built with Vite + Tailwind |
| `backend/` | Python (Flask) + Node.js (Express) hybrid backend |
| `backend/audio/` | Uploaded audio files for quiz generation |
| `backend/uploads/` | Resumes, PDFs, and user uploads |
| `backend/temp/` | Temporary code files for Docker execution |
| `backend/chroma_db/` | Local vector database for embeddings |
| `public/Face_AI_Models/` | Pre-trained models for face detection |

---

## 🔄 How It Works

### **User Journey: Student Taking Mock Interview**

1. **🚀 Landing** → User visits platform, selects "Candidate" role
2. **🔐 Login** → Enters email and password (stored in MongoDB with bcrypt)
3. **📝 Role Selection** → Chooses job role from available positions
4. **🎥 Face Setup** → Uploads ID proof, completes face detection setup
5. **📊 Round 1: Aptitude** → Answers general questions (20-30 MCQs)
6. **🔍 Round 2: Technical** → AI-generated domain-specific questions
   - Groq LLM generates questions based on role
   - User answers are stored with conversation history
   - OpenCV monitors face/eye in real-time
   - Warnings issued for suspicious behavior
7. **👔 Round 3: HR** → Behavioral questions and scenario-based queries
8. **🎯 Evaluation** → LLM analyzes all answers and generates:
   - Overall score out of 50
   - Strengths and weaknesses
   - Detailed justification
9. **📈 Results** → Submitted to MongoDB, accessible to HR dashboard

### **User Journey: HR Creating Assessment**

1. **🔐 Login** → HR authenticates via `/hr/login`
2. **➕ Create Role** → Adds new job role (e.g., "Frontend Developer")
3. **👤 Add Candidates** → Associates students with the role
4. **📊 Monitor** → Views real-time results from `/test-results/{roleId}`
5. **📈 Analyze** → Reviews aggregated scores across all 3 rounds

### **Code Execution Workflow**

```
User writes code in Monaco Editor
        │
        ▼
Frontend sends {code, language, testCases} to /run
        │
        ▼
Backend (server.js) receives request
        │
        ├─ Generates test harness (wraps user code)
        ├─ Writes to /temp/{uuid}/solution.{ext}
        │
        ▼
Docker container spawned
        │
        ├─ Mounts /temp volume
        ├─ Compiles (if C/C++/Java)
        ├─ Executes with stdin from test case
        ├─ Captures stdout, stderr, exit code
        │
        ▼
Output parsed and validated
        │
        ├─ Compare actual vs expected output
        ├─ Check runtime errors
        ├─ Calculate execution time
        │
        ▼
Return results {passed, failed, error, output}
```

### **Quiz Generation Workflow (LangGraph)**

```
User uploads PDF/YouTube URL/Audio
        │
        ▼
Content Extraction
        │
        ├─ PDF → PyPDF2 text extraction
        ├─ YouTube → Transcript API
        ├─ Audio → Speech-to-text (Groq)
        │
        ▼
Preprocessing (LLM-based)
        │
        ├─ Remove filler words
        ├─ Condense content
        ├─ Extract key concepts
        │
        ▼
Create Vector Store (Chroma DB)
        │
        ├─ Chunk content (500 chars)
        ├─ Generate embeddings (HuggingFace)
        ├─ Store in Chroma
        │
        ▼
LangGraph Agent: retrieve_content
        │
        ├─ Query: "Generate {num} {difficulty} questions"
        ├─ Retrieve relevant chunks (k=50)
        │
        ▼
LangGraph Agent: generate_questions
        │
        ├─ Prompt: "Create MCQs with distractors"
        ├─ LLM outputs structured JSON
        ├─ Parse and validate
        │
        ▼
Return quiz to frontend
```

---

## ⚙️ Installation & Setup

### **Prerequisites**

- **Python**: 3.9 or higher ([Download](https://www.python.org/downloads/))
- **Node.js**: 20.x or higher ([Download](https://nodejs.org/))
- **MongoDB**: Atlas account or local instance ([Setup Guide](https://www.mongodb.com/docs/atlas/getting-started/))
- **Docker**: For code execution (optional but recommended) ([Install](https://docs.docker.com/get-docker/))
- **Git**: For cloning repository

### **1️⃣ Clone Repository**

```bash
git clone https://github.com/Sanjayraj-k/Mock_Interview.git
cd Mock_Interview
```

### **2️⃣ Backend Setup (Python + Flask)**

```bash
# Navigate to backend
cd backend

# Create virtual environment
python -m venv env

# Activate virtual environment
# On Windows:
env\Scripts\activate
# On macOS/Linux:
source env/bin/activate

# Install Python dependencies
pip install -r requirements.txt
pip install -r requirements1.txt

# Create .env file (see Environment Variables section)
# Add your API keys and MongoDB URI

# Run Flask backend
python app.py
# Server will start on http://localhost:5000
```

### **3️⃣ Backend Setup (Node.js + Express)**

```bash
# In the same backend directory
npm install

# Run Node.js server for code execution
node server.js
# Server will start on http://localhost:3000
```

### **4️⃣ Frontend Setup (React + Vite)**

```bash
# Navigate to frontend
cd ../Client/Interview

# Install dependencies
npm install

# Run development server
npm run dev
# Frontend will start on http://localhost:5173
```

### **5️⃣ Access Application**

- **Frontend**: http://localhost:5173
- **Flask API**: http://localhost:5000
- **Node.js API**: http://localhost:3000

### **6️⃣ Initial Database Setup**

The application will auto-initialize MongoDB collections on first run:
- `hrDashboard.users` (HR accounts)
- `hrDashboard.students` (Candidates)
- `hrDashboard.roles` (Job positions)
- `hrDashboard.results` (Test scores)
- `hrDashboard.questionbank` (Interview questions)
- `hrDashboard.domainforum` (Forum data)

---

## 🐳 Docker Setup

### **Option 1: Code Execution Only (Recommended)**

Docker is used for secure code execution. If you've installed Docker Desktop, the backend will automatically use it.

**Verify Docker is running:**
```bash
docker --version
docker ps
```

**Test code execution:**
```bash
curl -X POST http://localhost:3000/run \
  -H "Content-Type: application/json" \
  -d '{"code":"print(\"Hello, World!\")", "language":"python", "problemId":"gas-station"}'
```

### **Option 2: Full Application with Docker Compose**

**Create `docker-compose.yml`:**
```yaml
version: '3.8'

services:
  backend-flask:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "5000:5000"
    environment:
      - MONGO_URI=${MONGO_URI}
      - GROQ_API_KEY=${GROQ_API_KEY}
      - PINECONE_API_KEY=${PINECONE_API_KEY}
    volumes:
      - ./backend:/app
    command: python app.py

  backend-node:
    build:
      context: ./backend
      dockerfile: Dockerfile
    ports:
      - "3000:3000"
    volumes:
      - ./backend:/app
      - /var/run/docker.sock:/var/run/docker.sock  # For Docker-in-Docker
    command: node server.js

  frontend:
    build:
      context: ./Client/Interview
      dockerfile: Dockerfile
    ports:
      - "5173:5173"
    volumes:
      - ./Client/Interview:/app
    command: npm run dev

volumes:
  mongo-data:
```

**Run with Docker Compose:**
```bash
docker-compose up --build
```

### **Security Note**

The provided `Dockerfile` in `backend/` is configured for the Node.js code execution server with:
- Multi-language support (C, C++, Java, Python)
- Non-root user execution
- Resource limits
- Temp directory isolation

---

## 🔐 Environment Variables

Create a `.env` file in the `backend/` directory:

```env
# ===== AI/ML API KEYS =====
GROQ_API_KEY=gsk_YOUR_GROQ_API_KEY_HERE
GEMINI_API_KEY=AIzaSy_YOUR_GEMINI_KEY_HERE
OPENROUTER_API_KEY=sk-or-v1-YOUR_OPENROUTER_KEY
HUGGINGFACEHUB_API_TOKEN=hf_YOUR_HUGGINGFACE_TOKEN
TAVILY_API_KEY=tvly-dev-YOUR_TAVILY_KEY

# ===== VECTOR DATABASE =====
PINECONE_API_KEY=pcsk_YOUR_PINECONE_API_KEY

# ===== DATABASE =====
MONGO_URI=mongodb+srv://username:password@cluster.mongodb.net/
DB_NAME=hrDashboard

# ===== WHATSAPP INTEGRATION (Optional) =====
PHONENUMBERID=your_phone_number_id
ACCESS_TOKEN=your_whatsapp_access_token
VERIFY_TOKEN=myverytoken

# ===== DEPLOYMENT =====
PORT=5000
```

### **How to Get API Keys**

| Service | URL | Free Tier |
|---------|-----|-----------|
| **Groq** | https://console.groq.com | ✅ Free (60 req/min) |
| **Pinecone** | https://www.pinecone.io | ✅ 1 index free |
| **MongoDB Atlas** | https://www.mongodb.com/cloud/atlas | ✅ 512MB free |
| **OpenRouter** | https://openrouter.ai | ⚡ Pay-per-use |
| **HuggingFace** | https://huggingface.co/settings/tokens | ✅ Free |
| **Google Gemini** | https://makersuite.google.com/app/apikey | ✅ Free tier |

### **⚠️ Security Warning**

- **NEVER commit `.env` to version control**
- The provided `.env` contains exposed keys (should be rotated immediately)
- Add `.env` to `.gitignore` (already included)
- Use environment variable managers in production (AWS Secrets, Vercel Env, etc.)

---

## 🌐 API Endpoints

### **Authentication & User Management**

#### **HR Routes** (`app.py`)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/hr/signup` | Register new HR user | `{email, password, companyName}` |
| POST | `/hr/login` | HR authentication | `{email, password}` |
| POST | `/candidate/login` | Student login | `{email, password}` |

#### **Role Management**

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/roles` | Create job role | `{title, department, description, hrEmail}` |
| GET | `/roles?hrEmail={email}` | Get roles by HR | - |

#### **Student Management**

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/students` | Add student | `{name, email, role, hrEmail}` |
| GET | `/students?hrEmail={email}` | Get students by HR | - |

#### **Results**

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/submit-results` | Submit Round 1 results | `{studentId, roleId, score, percentage, ...}` |
| POST | `/submit-round2-results` | Submit Round 2 | `{studentId, roleId, score, evaluation, ...}` |
| POST | `/submit-round3-results` | Submit Round 3 | Same as Round 2 |
| GET | `/test-results/{roleId}` | Get all results for role | - |

---

### **Interview System** (`interview.py` Blueprint)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/interview/start` | Start new interview | `{}` |
| POST | `/interview/submit` | Submit answer | `{question_number, answer}` |
| POST | `/interview/finish` | End interview & evaluate | `{}` |
| POST | `/interview/process-frame` | Submit video frame for proctoring | `{image: base64}` |
| POST | `/interview/end-exam` | Terminate exam | `{}` |
| POST | `/interview/reset` | Reset session | `{}` |
| GET | `/interview/health` | Health check | - |

**Proctoring Response Example:**
```json
{
  "status": "ok",
  "warnings": 0,
  "message": "All good!",
  "face_detected": true,
  "eyes_detected": true,
  "looking_away": false
}
```

---

### **Quiz Generation** (`quiz.py` Blueprint)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/quiz/generate` | Generate quiz from content | `{type: "pdf/youtube/audio", content: file/url, difficulty, num_questions}` |

**Request Example:**
```json
{
  "type": "youtube",
  "content": "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
  "difficulty": "medium",
  "num_questions": 10
}
```

**Response Example:**
```json
{
  "questions": [
    {
      "question": "What is the main topic?",
      "options": ["A", "B", "C", "D"],
      "correct_answer": "A",
      "explanation": "..."
    }
  ]
}
```

---

### **ATS (Resume Analysis)** (`ats.py` Blueprint)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/ats/analyze` | Analyze resume vs JD | `{resume: file, job_description: string}` |
| GET | `/ats/health` | Health check | - |
| GET | `/ats/test-groq` | Test Groq connection | - |

**Response Example:**
```json
{
  "match_percentage": 78,
  "analysis": {
    "relevant_skills": ["Python", "React", "MongoDB"],
    "missing_skills": ["Docker", "Kubernetes"],
    "relevant_experience": "3 years in full-stack development",
    "suggestions": [
      "Add cloud deployment experience",
      "Highlight leadership skills"
    ]
  }
}
```

---

### **Portfolio Chatbot** (`chat.py` Blueprint)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/chat` | Ask portfolio question | `{message: string}` |
| GET | `/` | Health check | - |

**Example Interaction:**
```bash
# Request
POST /chat
{
  "message": "How many projects has Sanjay completed?"
}

# Response
{
  "response": "Sanjay K has completed 9 projects, including:\n• Event Management System (MERN Stack)\n• AI Mock Interview Platform\n• Museum Ticket Booking Chatbot"
}
```

**Irrelevant Query:**
```bash
# Request
{"message": "What is the capital of France?"}

# Response
{
  "response": "I'm here to help with questions about Sanjay K's portfolio. I can answer questions about his projects, skills, education, internships, achievements, and professional background. Please ask something related to his portfolio!"
}
```

---

### **Code Execution** (`server.js` Node.js)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `/problem/{problemId}` | Get problem details | - |
| POST | `/run` | Run code with test cases | `{code, language, problemId}` |
| POST | `/submit` | Submit final solution | `{code, language, problemId}` |
| GET | `/health` | Health check | - |

**Supported Languages:**
- `c`, `cpp`, `java`, `python`

**Request Example:**
```json
{
  "code": "def can_complete_circuit(gas, cost):\n    return 0",
  "language": "python",
  "problemId": "gas-station"
}
```

**Response Example:**
```json
{
  "testResults": [
    {
      "testId": 1,
      "passed": false,
      "input": "gas = [1,2,3,4,5], cost = [3,4,5,1,2]",
      "expected": "3",
      "actual": "0",
      "error": null
    }
  ]
}
```

---

### **Question Bank** (`questionbank.py` Blueprint)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| GET | `/questionbank/questions` | Get all questions | - |
| GET | `/questionbank/question/{id}` | Get specific question | - |
| POST | `/questionbank/question/text` | Create text question | `{title, category, company, difficulty, answer}` |
| POST | `/questionbank/question/pdf` | Create PDF question | `{title, category, company, difficulty, file}` |
| PUT | `/questionbank/question/{id}` | Update question | `{title, answer, ...}` |
| DELETE | `/questionbank/question/{id}` | Delete question | - |
| POST | `/questionbank/question/{id}/view` | Increment view count | - |

---

### **Company Scraper** (`companyscrap_bp.py` Blueprint)

| Method | Endpoint | Description | Body |
|--------|----------|-------------|------|
| POST | `/company/profile` | Get company profile | `{company_name: string}` |
| GET | `/company/health` | Health check | - |

**Response Example:**
```json
{
  "company_name": "Google LLC",
  "vision": "To organize the world's information...",
  "mission": "...",
  "founded": "1998",
  "founders": "Larry Page, Sergey Brin",
  "products": ["Google Search", "YouTube", "Android", "Chrome"],
  "achievements": ["...", "..."],
  "financials": "Revenue: $282.8B (2023)",
  "headquarters": "Mountain View, California",
  "employees": "~190,000"
}
```

---

### **Domain Forum** (`Domainforum.py` Blueprint)

| Method | Endpoint | Description |
|--------|----------|-------------|
| POST | `/forum/user/register` | Register user |
| GET | `/forum/user/{user_id}` | Get user profile |
| POST | `/forum/discussion` | Create discussion |
| GET | `/forum/discussions/{domain}` | Get discussions by domain |
| POST | `/forum/discussion/{id}/like` | Like discussion |
| POST | `/forum/question` | Create interview question |
| GET | `/forum/questions/{domain}` | Get questions by domain |
| POST | `/forum/message` | Send direct message |
| GET | `/forum/search?q={query}&type={type}` | Search content |

---

## 💾 Database Schema

### **MongoDB Collections**

#### **1. Users Collection** (`hrDashboard.users`)

```javascript
{
  "_id": ObjectId,
  "email": "hr@company.com",
  "password": "$2b$12$hashed_password",  // bcrypt
  "companyName": "Tech Corp",
  "createdAt": ISODate("2024-01-15")
}
```

#### **2. Students Collection** (`hrDashboard.students`)

```javascript
{
  "_id": ObjectId,
  "name": "John Doe",
  "email": "john@example.com",
  "password": "$2b$12$hashed",
  "role": "Frontend Developer",
  "hrEmail": "hr@company.com",
  "createdAt": ISODate("2024-01-15")
}
```

#### **3. Roles Collection** (`hrDashboard.roles`)

```javascript
{
  "_id": ObjectId,
  "title": "Full Stack Developer",
  "department": "Engineering",
  "description": "Build scalable web applications",
  "hrEmail": "hr@company.com",
  "createdAt": ISODate("2024-01-15")
}
```

#### **4. Results Collection** (`hrDashboard.results`)

```javascript
{
  "_id": ObjectId,
  "studentId": ObjectId,
  "roleId": ObjectId,
  "studentName": "John Doe",
  "studentEmail": "john@example.com",
  "roleName": "Full Stack Developer",
  
  // Round 1: Aptitude
  "round1": {
    "score": 18,
    "totalQuestions": 20,
    "percentage": 90,
    "submittedAt": ISODate("2024-01-15T10:30:00Z")
  },
  
  // Round 2: Technical
  "round2": {
    "score": 42,
    "totalMarks": 50,
    "evaluation": "STRENGTHS: Strong problem-solving...",
    "submittedAt": ISODate("2024-01-15T11:00:00Z")
  },
  
  // Round 3: HR
  "round3": {
    "score": 45,
    "totalMarks": 50,
    "evaluation": "Excellent communication...",
    "submittedAt": ISODate("2024-01-15T11:30:00Z")
  },
  
  "createdAt": ISODate("2024-01-15"),
  "updatedAt": ISODate("2024-01-15")
}
```

#### **5. Question Bank** (`hrDashboard.questionbank`)

```javascript
{
  "_id": ObjectId,
  "title": "Explain the difference between let and var",
  "category": "Technical",
  "company": "Google",
  "difficulty": "Medium",
  "type": "text",  // or "pdf"
  "answer": "let is block-scoped...",
  "pdfUrl": null,
  "pdfName": null,
  "views": 42,
  "createdAt": ISODate("2024-01-10"),
  "lastUpdated": ISODate("2024-01-10")
}
```

#### **6. Domain Forum Users** (`hrDashboard.forumUsers`)

```javascript
{
  "_id": ObjectId,
  "name": "Alice Smith",
  "email": "alice@example.com",
  "password": "$2b$12$hashed",
  "bio": "Passionate about web development",
  "domain": "Web Developer",
  "skills": ["React", "Node.js", "MongoDB"],
  "location": "San Francisco, CA",
  "profilePicture": "profiles/alice_123.jpg",
  "createdAt": ISODate("2024-01-12")
}
```

#### **7. Forum Discussions** (`hrDashboard.discussions`)

```javascript
{
  "_id": ObjectId,
  "userId": ObjectId,
  "userName": "Alice Smith",
  "domain": "Web Developer",
  "title": "Best practices for React Hooks",
  "content": "What are your top tips...",
  "attachments": ["uploads/diagram.png"],
  "likes": [ObjectId, ObjectId],  // Array of user IDs
  "likeCount": 2,
  "replyCount": 5,
  "createdAt": ISODate("2024-01-13"),
  "updatedAt": ISODate("2024-01-14")
}
```

#### **8. Interview Questions (Forum)** (`hrDashboard.forumQuestions`)

```javascript
{
  "_id": ObjectId,
  "userId": ObjectId,
  "userName": "Bob Johnson",
  "domain": "Data Science",
  "company": "Amazon",
  "interviewRound": "Technical Round 2",
  "difficulty": "Hard",
  "question": "Explain the bias-variance tradeoff",
  "options": ["A", "B", "C", "D"],  // For MCQs
  "correctAnswer": "B",
  "answerPdfUrl": "uploads/answer_456.pdf",
  "likes": [ObjectId],
  "likeCount": 1,
  "views": 23,
  "createdAt": ISODate("2024-01-14")
}
```

---

### **Pinecone Vector Store**

**Index Name**: `portfolio-chatbot`  
**Dimensions**: 1536 (OpenAI text-embedding-3-small)  
**Metric**: Cosine similarity

**Document Structure**:
```javascript
{
  "id": "proj_001",
  "values": [0.123, -0.456, ...],  // 1536-dim embedding
  "metadata": {
    "section": "projects",
    "content": "Event Management System: Built with MERN stack...",
    "title": "Event Management System"
  }
}
```

**Sections**:
- `projects`
- `skills`
- `experience`
- `education`
- `achievements`

---

## 📸 Screenshots

### **Landing Page**
![Landing Page](assets/screenshots/landing.png)
*Clean, modern landing page with role-based navigation*

---

### **HR Dashboard**
![HR Dashboard](assets/screenshots/hr-dashboard.png)
*Comprehensive view of roles, candidates, and aggregated test results*

---

### **Interview Interface**
![Interview Screen](assets/screenshots/interview.png)
*AI-powered interview with real-time proctoring indicators*

---

### **Proctoring in Action**
![Proctoring](assets/screenshots/proctoring.png)
*Face detection box, eye tracking, and warning system*

---

### **Code Editor**
![Code Editor](assets/screenshots/code-editor.png)
*Monaco editor with syntax highlighting and test execution*

---

### **ATS Resume Analysis**
![ATS Result](assets/screenshots/ats.png)
*Match percentage, skills analysis, and recommendations*

---

### **Quiz Generator**
![Quiz Generator](assets/screenshots/quiz.png)
*Upload PDF/YouTube/Audio and generate custom quizzes*

---

### **Portfolio Chatbot**
![Chatbot](assets/screenshots/chatbot.png)
*RAG-powered assistant answering portfolio questions*

---

### **Question Bank**
![Question Bank](assets/screenshots/questionbank.png)
*Filterable repository of interview questions*

---

### **Domain Forum**
![Forum](assets/screenshots/forum.png)
*Discussion boards for domain-specific knowledge sharing*

---

### **Company Scraper**
![Company Profile](assets/screenshots/company.png)
*AI-generated company profiles from Wikipedia*

---

## 🚀 Future Enhancements

### **Planned Features**

- [ ] 🎥 **Video Interview Recording**: Save interview sessions for review
- [ ] 📊 **Advanced Analytics Dashboard**: Visual charts for performance trends
- [ ] 🌍 **Multi-Language Support**: Internationalization (i18n)
- [ ] 📱 **Mobile App**: React Native version for iOS/Android
- [ ] 🔔 **Real-Time Notifications**: WebSocket integration for instant alerts
- [ ] 🎓 **Learning Paths**: Personalized study plans based on weaknesses
- [ ] 🤝 **Peer Mock Interviews**: Connect two candidates for practice
- [ ] 🎯 **Gamification**: Badges, leaderboards, and achievements
- [ ] 📧 **Email Reports**: Automated result emails to candidates
- [ ] 🔗 **LinkedIn Integration**: Auto-import candidate profiles
- [ ] 🗣️ **Voice Assistant**: Speech-to-text answer input
- [ ] 🧪 **A/B Testing**: Experiment with different question formats
- [ ] 📚 **Content Library**: Pre-built courses and interview prep materials
- [ ] 🔐 **SSO Integration**: Google/GitHub OAuth login
- [ ] 💳 **Payment Gateway**: Subscription plans for premium features

### **Technical Improvements**

- [ ] ⚡ **Redis Caching**: Speed up API responses
- [ ] 🧪 **Unit Tests**: Jest (frontend) + Pytest (backend)
- [ ] 🚀 **CI/CD Pipeline**: GitHub Actions for automated deployment
- [ ] 📊 **Logging & Monitoring**: Winston/Sentry integration
- [ ] 🔒 **Rate Limiting**: Prevent API abuse
- [ ] 📖 **API Documentation**: Swagger/OpenAPI spec
- [ ] 🐳 **Kubernetes Deployment**: Scalable container orchestration
- [ ] 🔄 **GraphQL API**: Alternative to REST for complex queries
- [ ] 🧩 **Microservices**: Split into smaller, independent services

---

## 🐛 Common Errors & Fixes

### **1. MongoDB Connection Error**

**Error:**
```
pymongo.errors.ServerSelectionTimeoutError: 
No servers are available for the requested read preference
```

**Fix:**
- Verify `MONGO_URI` in `.env` is correct
- Check network connectivity
- Whitelist your IP in MongoDB Atlas (Network Access)
- Ensure MongoDB service is running (if local)

---

### **2. Groq API Rate Limit**

**Error:**
```
groq.RateLimitError: Rate limit exceeded (60 requests/min)
```

**Fix:**
- Implement exponential backoff retry logic
- Cache LLM responses for repeated queries
- Upgrade to paid tier for higher limits
- Switch to alternative model (e.g., OpenRouter)

---

### **3. Docker Not Found**

**Error:**
```
Error: connect ENOENT //./pipe/docker_engine
```

**Fix:**
- Install Docker Desktop and start the engine
- On Windows: Ensure WSL2 backend is enabled
- Verify Docker is running: `docker ps`
- Restart Docker service

---

### **4. Pinecone Index Not Found**

**Error:**
```
pinecone.exceptions.NotFoundException: Index 'portfolio-chatbot' not found
```

**Fix:**
- Create index in Pinecone dashboard
- Ensure index name matches `INDEX_NAME` in `.env`
- Check API key has correct permissions
- Wait for index initialization (~1-2 minutes)

---

### **5. CORS Errors in Frontend**

**Error:**
```
Access to fetch at 'http://localhost:5000/chat' from origin 'http://localhost:5173' 
has been blocked by CORS policy
```

**Fix:**
- Ensure `flask-cors` is installed: `pip install flask-cors`
- Verify `CORS(app)` is present in `app.py`
- Check frontend proxy settings in `vite.config.js`
- Allow specific origins in production

---

### **6. Face Detection Models Not Loading**

**Error:**
```
Error loading face-api.js models
```

**Fix:**
- Ensure models are in `public/Face_AI_Models/`
- Download from: https://github.com/justadudewhohacks/face-api.js/tree/master/weights
- Check model file names match exactly (case-sensitive)
- Verify public path is correctly configured

---

### **7. Code Execution Timeout**

**Error:**
```
Container execution timed out
```

**Fix:**
- Increase `WaitMsBeforeAsync` in `runInDocker()` function
- Optimize test code to run faster
- Check for infinite loops in user code
- Increase Docker container CPU/memory limits

---

### **8. Module Not Found Errors**

**Error:**
```
ModuleNotFoundError: No module named 'langchain_groq'
```

**Fix:**
```bash
pip install langchain-groq langchain-pinecone
pip install -r requirements1.txt  # Install all dependencies
```

---

## 🤝 Contributing

We welcome contributions from the community! Here's how you can help:

### **How to Contribute**

1. **Fork the Repository**
   ```bash
   git clone https://github.com/Sanjayraj-k/Mock_Interview.git
   cd Mock_Interview
   ```

2. **Create a Branch**
   ```bash
   git checkout -b feature/amazing-feature
   ```

3. **Make Changes**
   - Follow existing code style
   - Add comments for complex logic
   - Update documentation if needed

4. **Test Your Changes**
   ```bash
   # Backend
   python -m pytest  # (when tests are added)
   
   # Frontend
   npm run lint
   npm run build
   ```

5. **Commit & Push**
   ```bash
   git add .
   git commit -m "Add amazing feature"
   git push origin feature/amazing-feature
   ```

6. **Open Pull Request**
   - Go to GitHub repository
   - Click "Compare & pull request"
   - Describe your changes clearly
   - Link related issues

### **Contribution Guidelines**

✅ **Do:**
- Write clear, descriptive commit messages
- Test thoroughly before submitting
- Update README for new features
- Follow existing code patterns
- Ask questions if unclear

❌ **Don't:**
- Commit API keys or `.env` files
- Make breaking changes without discussion
- Submit untested code
- Ignore linting errors

### **Project Structure for Contributors**

- **Frontend bugs/features**: Work in `Client/Interview/src/`
- **Backend APIs**: Update relevant Blueprint files in `backend/`
- **Documentation**: Update `README.md` or create docs in `/docs`
- **AI/ML improvements**: Modify prompt templates in individual modules

---

## 📄 License

This project is licensed under the **MIT License**.

```
MIT License

Copyright (c) 2026 Sanjay K & Shimal 

Permission is hereby granted, free of charge, to any person obtaining a copy
of this software and associated documentation files (the "Software"), to deal
in the Software without restriction, including without limitation the rights
to use, copy, modify, merge, publish, distribute, sublicense, and/or sell
copies of the Software, and to permit persons to whom the Software is
furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all
copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED "AS IS", WITHOUT WARRANTY OF ANY KIND, EXPRESS OR
IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY,
FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE
AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER
LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM,
OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE
SOFTWARE.
```

---

## 👨‍💻 Meet the Team

<div align="center">

### 🚀 **Sanjay K**
[![GitHub](https://img.shields.io/badge/GitHub-Sanjayraj--k-181717?style=for-the-badge&logo=github)](https://github.com/Sanjayraj-k)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-sanjayraj--k-0077B5?style=for-the-badge&logo=linkedin)](https://linkedin.com/in/sanjayraj-k)

---

### 💡 **Shimal Akmal**
[![GitHub](https://img.shields.io/badge/GitHub-Shimal007-181717?style=for-the-badge&logo=github)](https://github.com/Shimal007)
[![LinkedIn](https://img.shields.io/badge/LinkedIn-shimal--akmal-0077B5?style=for-the-badge&logo=linkedin)](https://www.linkedin.com/in/shimal-akmal/)

</div>

---

### **🙏 Acknowledgments**

Special thanks to:
- **Groq** for lightning-fast LLM inference
- **LangChain** team for the amazing framework
- **Pinecone** for vector database infrastructure
- **Face-API.js** for browser-based face detection
- **Monaco Editor** for the VS Code-like experience
- **OpenCV** for computer vision capabilities
- **MongoDB** for reliable data storage
- **Vite** for blazing-fast development builds

### **⭐ Support the Project**

If you find MockAI useful, please:
- ⭐ Star this repository
- 🐛 Report bugs via [Issues](https://github.com/Sanjayraj-k/Mock_Interview/issues)
- 💡 Suggest features via [Discussions](https://github.com/Sanjayraj-k/Mock_Interview/discussions)
- 🍴 Fork and contribute
- 📢 Share with your network

---

<div align="center">

### **Built by Sanjay & Shimal**

[![GitHub followers](https://img.shields.io/github/followers/Sanjayraj-k?style=social)](https://github.com/Sanjayraj-k)
[![GitHub stars](https://img.shields.io/github/stars/Sanjayraj-k/Mock_Interview?style=social)](https://github.com/Sanjayraj-k/Mock_Interview/stargazers)

**[⬆ Back to Top](#-mockai---ai-powered-mock-interview-platform)**

</div>
