import os
import tempfile
from flask import Blueprint, request, jsonify
from langchain_core.output_parsers import JsonOutputParser
from langchain_core.prompts import ChatPromptTemplate
from langchain_groq import ChatGroq
from langchain_community.document_loaders import PyPDFLoader
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_community.vectorstores import FAISS
from langchain_community.embeddings import HuggingFaceEmbeddings
from langchain_classic.retrievers import MultiQueryRetriever
from langgraph.graph import END, StateGraph
from typing import TypedDict, List, Dict
from urllib.parse import urlparse, parse_qs
import re
import logging
from youtube_transcript_api import YouTubeTranscriptApi
from pydub import AudioSegment
import speech_recognition as sr
import traceback

# Blueprint for Quiz generation
quiz_bp = Blueprint('quiz', __name__, url_prefix='/quiz')
GROQ_API_KEY = os.environ.get("GROQ_API_KEY", "your-grok-api-key-here")
# Local temp upload folder for this module
QUIZ_UPLOAD_FOLDER = tempfile.mkdtemp()

# Logger
logger = logging.getLogger(__name__)
if not logger.handlers:
    logging.basicConfig(level=logging.INFO)

# Initialize LLM and Embeddings
try:
    llm = ChatGroq(
        temperature=0.2,
        model_name="openai/gpt-oss-120b",  # Use a known working model
        groq_api_key=GROQ_API_KEY
    )
    embeddings = HuggingFaceEmbeddings(model_name="sentence-transformers/all-MiniLM-L6-v2")
except Exception as e:
    logger.error(f"Initialization failed: {str(e)}")
    raise

class GraphState(TypedDict):
    retriever: MultiQueryRetriever
    content: str
    difficulty: str
    num_questions: int
    questions: List[Dict]

def get_video_id(url: str) -> str:
    """
    Extract the video ID from a YouTube URL (supports youtube.com and youtu.be)
    """
    parsed_url = urlparse(url)
    if parsed_url.hostname in ("youtu.be",):
        return parsed_url.path.lstrip("/")
    elif parsed_url.hostname in ("www.youtube.com", "youtube.com", "m.youtube.com"):
        return parse_qs(parsed_url.query).get("v", [None])[0]
    else:
        raise ValueError("Invalid YouTube URL format")

def basic_preprocess_text(content: str) -> str:
    """
    Basic preprocessing to remove filler words if LLM fails.
    """
    fillers = r'\b(um|uh|like|you know|I mean|basically|sort of|kind of|right|yeah)\b'
    content = re.sub(fillers, '', content, flags=re.IGNORECASE)
    content = re.sub(r'\s+', ' ', content).strip()
    return content

def preprocess_text(content: str) -> str:
    """
    Preprocess text using LLM to remove filler words, fluff, and condense content.
    Fall back to basic preprocessing if LLM fails.
    """
    try:
        prompt = ChatPromptTemplate.from_template("""
        You are an expert text preprocessor. Process the following text to:
        1. Remove filler words (e.g., 'um', 'like', 'you know').
        2. Remove conversational fluff (e.g., greetings, off-topic remarks).
        3. Condense repetitive or redundant statements.
        4. Focus on key insights relevant to generating quiz questions.
        
        Input Text:
        {content}
        
        Return the result as a JSON object with a 'text' field:
        json
        {"text": "processed content"}
        
        """)
        
        parser = JsonOutputParser()
        chain = prompt | llm | parser
        result = chain.invoke({"content": content})
        
        logger.debug(f"LLM preprocessing result: {result}")
        
        if isinstance(result, dict) and "text" in result:
            return result["text"]
        elif isinstance(result, str):
            # Fallback: If LLM returns plain text, use it directly
            logger.warning("LLM returned plain text instead of JSON")
            return result
        else:
            raise ValueError("Invalid LLM response format")
    except Exception as e:
        logger.error(f"LLM preprocessing failed: {str(e)}")
        logger.info("Falling back to basic preprocessing")
        return basic_preprocess_text(content)

def process_document(file_path: str) -> MultiQueryRetriever:
    """
    Process PDF document and return a retriever.
    """
    try:
        loader = PyPDFLoader(file_path)
        documents = loader.load()
        content = "\n".join([doc.page_content for doc in documents])
        if not content:
            raise ValueError("Failed to extract content from PDF")

        # Preprocess PDF content
        content = preprocess_text(content)

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
        chunks = text_splitter.split_text(content)
        if not chunks:
            raise ValueError("No text chunks created from PDF")

        vectorstore = FAISS.from_texts(chunks, embeddings)
        base_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
        retriever = MultiQueryRetriever.from_llm(retriever=base_retriever, llm=llm)
        return retriever
    except Exception as e:
        raise ValueError(f"Failed to process document: {str(e)}")

def process_youtube_url(url: str) -> MultiQueryRetriever:
    """
    Process YouTube URL to extract transcript and return a retriever.
    Updated to use the working YouTube transcript fetching method.
    """
    try:
        video_id = get_video_id(url)
        logger.info(f"Extracted Video ID: {video_id}")
        
        # Use the working approach from your test code
        ytt_api = YouTubeTranscriptApi()
        transcript = ytt_api.fetch(video_id, languages=["en"])
        
        # Join transcript snippets into a single paragraph
        content = " ".join(snippet.text for snippet in transcript)
        
        logger.info(f"Transcript extracted, length: {len(content)} characters")
        
        if not content or len(content.strip()) == 0:
            raise ValueError("Failed to extract transcript from YouTube video - transcript is empty")

        # Preprocess transcript
        content = preprocess_text(content)
        
        if not content or len(content.strip()) == 0:
            raise ValueError("Content became empty after preprocessing")

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
        chunks = text_splitter.split_text(content)
        
        if not chunks:
            raise ValueError("No text chunks created from transcript")

        logger.info(f"Created {len(chunks)} text chunks")

        vectorstore = FAISS.from_texts(chunks, embeddings)
        base_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
        retriever = MultiQueryRetriever.from_llm(retriever=base_retriever, llm=llm)
        
        return retriever
    except Exception as e:
        logger.error(f"YouTube processing error: {str(e)}")
        raise ValueError(f"Failed to process YouTube URL: {str(e)}")

def process_audio(file_path: str) -> MultiQueryRetriever:
    """
    Process audio file to extract transcript and return a retriever.
    """
    try:
        # Convert audio to WAV if necessary
        audio = AudioSegment.from_file(file_path)
        wav_path = file_path.rsplit(".", 1)[0] + ".wav"
        audio.export(wav_path, format="wav")

        # Transcribe audio
        recognizer = sr.Recognizer()
        with sr.AudioFile(wav_path) as source:
            audio_data = recognizer.record(source)
            content = recognizer.recognize_google(audio_data)
        
        if not content:
            raise ValueError("Failed to transcribe audio")

        # Preprocess audio transcript
        content = preprocess_text(content)

        text_splitter = RecursiveCharacterTextSplitter(chunk_size=2000, chunk_overlap=200)
        chunks = text_splitter.split_text(content)
        if not chunks:
            raise ValueError("No text chunks created from audio transcript")

        vectorstore = FAISS.from_texts(chunks, embeddings)
        base_retriever = vectorstore.as_retriever(search_kwargs={"k": 4})
        retriever = MultiQueryRetriever.from_llm(retriever=base_retriever, llm=llm)
        return retriever
    except Exception as e:
        raise ValueError(f"Failed to process audio: {str(e)}")
    finally:
        try:
            if 'wav_path' in locals() and os.path.exists(wav_path):
                os.remove(wav_path)
        except Exception:
            pass

def retrieve_content(state: GraphState) -> GraphState:
    try:
        retriever = state.get("retriever")
        difficulty = state.get("difficulty", "medium")
        query = f"Information for {difficulty} difficulty quiz"
        docs = retriever.invoke(query)
        content = "\n\n".join([doc.page_content for doc in docs]) if docs else ""
        if not content:
            raise ValueError("No relevant content retrieved")

        return {
            "retriever": retriever,
            "content": content,
            "difficulty": difficulty,
            "num_questions": state["num_questions"]
        }
    except Exception as e:
        raise ValueError(f"Failed to retrieve content: {str(e)}")

def generate_questions(state: GraphState) -> GraphState:
    try:
        content = state["content"]
        difficulty = state["difficulty"]
        num_questions = state["num_questions"]

        prompt = ChatPromptTemplate.from_template(""" 
        You are an expert quiz creator. Create {num_questions} quiz questions with the following parameters:
        
        1. Difficulty level: {difficulty}
        2. Each question should have four possible answers (A, B, C, D)
        3. One answer should be correct
        4. Only use information found in the provided content
        
        Content:
        {content}
        
        Return the quiz in the following JSON format:
        
        [
            {{"question": "Question text",
              "options": [
                  "A. Option A",
                  "B. Option B", 
                  "C. Option C",
                  "D. Option D"
              ],
              "correct_answer": "A. Option A",
              "explanation": "Brief explanation of why this is correct"
            }}
        ]
        
        Only return the JSON without any additional explanation or text.
        """)

        parser = JsonOutputParser()
        chain = prompt | llm | parser
        questions = chain.invoke({
            "content": content,
            "difficulty": difficulty,
            "num_questions": num_questions
        })

        if not questions or not isinstance(questions, list):
            raise ValueError("No valid questions generated")
        
        return {"questions": questions}
    except Exception as e:
        raise ValueError(f"Failed to generate questions: {str(e)}")

def create_quiz_graph():
    workflow = StateGraph(GraphState)
    workflow.add_node("retrieve_content", retrieve_content)
    workflow.add_node("generate_questions", generate_questions)
    workflow.add_edge("retrieve_content", "generate_questions")
    workflow.add_edge("generate_questions", END)
    workflow.set_entry_point("retrieve_content")
    return workflow.compile()

@quiz_bp.route('/api/generate-quiz', methods=['POST'])
def generate_quiz():
    source_type = request.form.get('source_type')
    difficulty = request.form.get('difficulty', 'medium')
    try:
        num_questions = int(request.form.get('num_questions', 5))
        if num_questions < 1:
            raise ValueError("Number of questions must be at least 1")
    except ValueError:
        return jsonify({"error": "Invalid number of questions"}), 400

    try:
        if source_type == "pdf":
            if 'file' not in request.files:
                return jsonify({"error": "No PDF file uploaded"}), 400
            file = request.files['file']
            if file.filename == '' or not file.filename.lower().endswith('.pdf'):
                return jsonify({"error": "Please upload a valid PDF file"}), 400
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(file_path)
            retriever = process_document(file_path)
        elif source_type == "youtube":
            youtube_url = request.form.get('youtube_url')
            if not youtube_url:
                return jsonify({"error": "No YouTube URL provided"}), 400
            logger.info(f"Processing YouTube URL: {youtube_url}")
            retriever = process_youtube_url(youtube_url)
        elif source_type == "audio":
            if 'file' not in request.files:
                return jsonify({"error": "No audio file uploaded"}), 400
            file = request.files['file']
            if file.filename == '' or not file.filename.lower().endswith(('.wav', '.mp3')):
                return jsonify({"error": "Please upload a valid audio file (WAV or MP3)"}), 400
            file_path = os.path.join(app.config['UPLOAD_FOLDER'], file.filename)
            file.save(file_path)
            retriever = process_audio(file_path)
        else:
            return jsonify({"error": "Invalid source type. Use 'pdf', 'youtube', or 'audio'"}), 400

        quiz_graph = create_quiz_graph()
        result = quiz_graph.invoke({
            "retriever": retriever,
            "difficulty": difficulty,
            "num_questions": num_questions
        })

        if not result.get("questions"):
            return jsonify({"error": "No questions generated"}), 500

        return jsonify({
            "message": "Quiz generated successfully",
            "quiz": result["questions"]
        })

    except Exception as e:
        error_details = traceback.format_exc()
        logger.error(f"Error processing quiz request: {str(e)}\n{error_details}")
        return jsonify({"error": str(e), "details": error_details}), 500
    finally:
        try:
            if 'file_path' in locals() and os.path.exists(file_path):
                os.remove(file_path)
        except Exception as e:
            logger.error(f"Failed to remove temporary file: {str(e)}")