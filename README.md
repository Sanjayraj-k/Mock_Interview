# 🎯 MockAI - AI-Powered Placement Assessment and Mock Interview Platform

[![Python](https://img.shields.io/badge/Python-3.9+-blue.svg)](https://www.python.org/)
[![Flask](https://img.shields.io/badge/Flask-3.0+-green.svg)](https://flask.palletsprojects.com/)
[![React](https://img.shields.io/badge/React-19.1.0-61DAFB.svg)](https://reactjs.org/)
[![Node.js](https://img.shields.io/badge/Node.js-20.x-339933.svg)](https://nodejs.org/)
[![Docker](https://img.shields.io/badge/Docker-Ready-2496ED.svg)](https://www.docker.com/)
[![LangChain](https://img.shields.io/badge/LangChain-Enabled-FF6F61.svg)](https://langchain.com/)

> **A comprehensive AI-driven platform for university placement training. MockAI enables students to practice placement mock tests and technical/HR interviews, while providing teachers with centralized dashboard controls and real-time proctoring analytics.**

---

## 📖 Table of Contents

- [🌟 About the Project](#-about-the-project)
- [✨ Key Features](#-key-features)
- [🛠️ Tech Stack](#️-tech-stack)
- [🏗️ System Architecture](#️-system-architecture)
- [📁 Folder Structure](#-folder-structure)
- [🔄 User Workflows](#-user-workflows)
- [⚙️ Installation & Setup](#️-installation--setup)
- [🐳 Docker Setup](#-docker-setup)
- [🔐 Environment Variables](#-environment-variables)
- [🚀 Future Enhancements](#-future-enhancements)

---

## 🌟 About the Project

**MockAI** is designed to train engineering students for campus placements. Scoped strictly around **Students** and **Teachers**, the platform automates a 4-round assessment lifecycle to provide targeted learning and integrity monitoring:

### 🎯 Problems It Solves in Universities
- ❌ **Manual mock interviews require excessive faculty hours**
- ❌ **Static placement tests do not focus on student weaknesses**
- ❌ **No integrated coding compilation sandbox for programming practice**
- ❌ **Inability of teachers to track student readiness and proctoring metrics in one place**

### ✅ Solutions Provided
- **Curriculum-Adaptive MCQ Testing** that generates more questions in topics where a student struggles.
- **Docker-Isolated Code Execution Engine** using the Judge0 API to evaluate programming solutions.
- **Dynamic AI Mock Interviews** (Technical & Behavioral/HR) with contextual conversation memory.
- **CPU-Friendly Multi-Hazard Proctoring** (gaze tracking, tab-switching, face presence) running without expensive GPU requirements.
- **Intelligent Teacher Dashboard** for managing assessments and recommending learning resources.

---

## ✨ Key Features

### 🎓 1. Student Placement Assessment Pipeline
MockAI guides students through an authenticated 4-round pipeline:
- **🔒 Face Authentication**: Identity verification using a webcam frame check at the start.
- **📝 Round 1 (Adaptive Aptitude)**: Quantitative, logical, verbal, and analytical questions. The system adapts question weighting to focus on student weaknesses.
- **💻 Round 2 (Coding assessment)**: A Leetcode-style editor compiling and evaluating C, C++, Java, JS, and Python solutions.
- **🤖 Round 3 (Technical Interview)**: A resume-parsed, 6-turn AI interview utilizing LangChain ConversationBufferMemory and progressing to advanced CS topics.
- **👔 Round 4 (HR Behavioral Interview)**: Probes situational and communication skills using STAR method guidelines.

### 🎥 2. Multi-Hazard Proctoring
Monitors student behavior in real-time during exams:
- Gaze estimation center deviation.
- Face absence detection.
- Multiple faces presence.
- Excessive head movements.
- Mobile phone detection.
- Browser/tab switching warnings (fired via window state listeners).
- Automatic termination after 3 warnings.

### 📊 3. Central Teacher Dashboard
Provides faculty and placement trainers with centralized analytics:
- **Topic-wise performance charts** for aptitude assessments.
- **Coding compilation logs** (passed test cases, memory, and runtime).
- **Interview transcripts** and AI-generated scorecards (strengths, weaknesses, marks out of 50).
- **Proctoring logs** containing warning descriptions and alert timestamps.
- **Overall placement readiness scores** to flag students requiring additional training.

---

## 🛠️ Tech Stack

### **Frontend**
- **React 19.1.0** (Vite-powered Single Page Application)
- **Tailwind CSS 3.4** (Sleek, modern styling)
- **Framer Motion 12.x** (Micro-animations and transitions)
- **Monaco Editor** (LeetCode-style code window)
- **face-api.js** (Webcam alignment check)

### **Backend**
- **Python 3.9+** & **Flask 3.0** (Modular Blueprints)
- **Node.js 20.x** & **Express 5.1** (Compilation server)
- **LangChain** (LLM conversational chains)
- **Groq API** (Sub-second Llama-3.1-8B and openai/gpt-oss-120b inference)
- **OpenCV** (CPU-based Haar Cascade face/eye trackers)

### **Databases & APIs**
- **MongoDB Atlas** (Student data, test papers, forums)
- **Judge0 API** (Sandboxed code execution)
- **Pinecone / Chroma DB** (Vector storage for local search helpers)

---

## 🏗️ System Architecture

```
┌─────────────────────────────────────────────────────────────────┐
│                        STUDENT FRONTEND                         │
│  ┌──────────────┐  ┌──────────────┐  ┌──────────────┐          │
│  │   React UI   │  │  Monaco      │  │  Face API    │          │
│  │   (Vite)     │──│  Code Editor │──│  (Proctoring)│          │
│  └──────────────┘  └──────────────┘  └──────────────┘          │
└───────────────────────────┬─────────────────────────────────────┘
                            │ HTTP API Calls
┌───────────────────────────▼─────────────────────────────────────┐
│                      FLASK BACKEND (app.py)                     │
│  ┌──────────────────────────────────────────────────────────┐   │
│  │ Blueprints registered:                                   │   │
│  │ • facetrack    (OpenCV Gaze)                             │   │
│  │ • quiz         (MCQs & Aggregation)                      │   │
│  │ • coding       (Judge0 Compiler)                         │   │
│  │ • interview    (Technical LLM)                           │   │
│  │ • hrround      (Behavioral LLM)                          │   │
│  └──────────────────────────────────────────────────────────┘   │
└───────────────────────────┬─────────────────────────────────────┘
                            │ DB queries
┌───────────────────────────▼─────────────────────────────────────┐
│                       MONGODB ATLAS CLOUD                       │
│  • students (Profiles)        • aptitude (Question Bank)         │
│  • roles (Placement Slots)   • quiz_results (Scorecards)        │
└─────────────────────────────────────────────────────────────────┘
```

---

## 🔄 User Workflows

### 👨‍🎓 Student Journey
1. **Login** $ightarrow$ Student authenticates via `StudentLandingpage`.
2. **Face Verification** $ightarrow$ Align face with the camera to open the test.
3. **Assessment Rounds** $ightarrow$ Complete Aptitude, Coding, Technical, and HR interviews. Gaze tracker monitors behavior.
4. **Scoring & Transcript** $ightarrow$ View detailed scores, strengths, weaknesses, and feedback.

### 👩‍🏫 Teacher Journey
1. **Login** $ightarrow$ Access dashboard via `/hr/login` (Teacher credentials).
2. **Role Creation** $ightarrow$ Configure placement drive templates and requirements.
3. **Student Enrolment** $ightarrow$ Add student list and assign placement practice papers.
4. **Analytics Monitoring** $ightarrow$ Review aggregate placement readiness metrics, transcripts, and proctoring warnings.

---

## ⚙️ Installation & Setup

### 1️⃣ Clone Repository
```bash
git clone https://github.com/Sanjayraj-k/Mock_Interview.git
cd Mock_Interview
```

### 2️⃣ Flask Backend Setup
```bash
cd backend
python -m venv env
# Windows: env\Scriptsctivate | MacOS: source env/bin/activate
pip install -r requirements.txt
pip install -r requirements1.txt
# Configure your .env file
python app.py
```

### 3️⃣ Node Code Execution Server
```bash
# In backend directory
npm install
node server.js
```

### 4️⃣ React Frontend Setup
```bash
cd ../Client/Interview
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173) in your web browser.

---

## 🐳 Docker Setup
Docker is recommended to sandbox user code compilation.
```bash
docker --version
docker ps
```
The node service in `server.js` will automatically route code submissions to sandboxed containers if Docker is running locally.

---

## 🔐 Environment Variables
Create a `.env` file in the `backend/` directory:
```env
GROQ_API_KEY=gsk_YOUR_GROQ_API_KEY
GEMINI_API_KEY=AIzaSy_YOUR_GEMINI_API_KEY
MONGO_URI=mongodb://localhost:27017/
DB_NAME=hrDashboard
PINECONE_API_KEY=pcsk_YOUR_PINECONE_API_KEY
```