from flask import Blueprint, request, jsonify
import os
import logging
import shutil
from typing import List, Dict, Any
from dotenv import load_dotenv

# LangChain imports
from langchain_text_splitters import RecursiveCharacterTextSplitter
from langchain_openai import OpenAIEmbeddings
from langchain_community.vectorstores import Chroma
from langchain_groq import ChatGroq
from langchain_classic.chains import RetrievalQA
from langchain_classic.retrievers.multi_query import MultiQueryRetriever
from langchain_classic.prompts import PromptTemplate
from langchain_community.document_loaders import PyPDFLoader

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Load environment variables
load_dotenv()

# Configure OpenRouter/OpenAI for Embeddings if not already set
# Using the logic from rfrag.py
if not os.getenv("OPENAI_API_KEY") and os.getenv("OPENROUTER_API_KEY"):
    os.environ["OPENAI_API_KEY"] = os.getenv("OPENROUTER_API_KEY")
    os.environ["OPENAI_API_BASE"] = "https://openrouter.ai/api/v1"

# Blueprint
aiassistant_bp = Blueprint('aiassistant', __name__, url_prefix='')

class EnhancedRAGSystem:
    def __init__(self):
        self.vectorstore = None
        self.persist_directory = "./chroma_db"
        
        # Initialize Embeddings (from rfrag.py)
        self.embeddings = OpenAIEmbeddings(
            model="text-embedding-3-large"
        )
        
        # Initialize LLM (from rfrag.py)
        self.llm = ChatGroq(
            model_name="llama3-70b-8192",
            temperature=0.1
        )
        
    def process_pdf(self, pdf_file):
        """Process PDF using RF-RAG approach"""
        try:
            # Debug: Check API Key
            api_key = os.environ.get("OPENAI_API_KEY")
            base_url = os.environ.get("OPENAI_API_BASE")
            logger.info(f"API Key present: {bool(api_key)}")
            logger.info(f"API Base URL: {base_url}")

            # Save PDF temporarily to use PyPDFLoader
            temp_path = "temp_uploaded.pdf"
            pdf_file.save(temp_path)
            
            # Load documents
            logger.info(f"Loading PDF from {temp_path}...")
            loader = PyPDFLoader(temp_path)
            documents = loader.load()
            
            if not documents:
                logger.error("No documents loaded from PDF (empty?)")
                return {"error": "Failed to extract text from PDF"}

            logger.info(f"Loaded {len(documents)} pages.")
            
            # Split documents
            logger.info("Splitting documents...")
            splitter = RecursiveCharacterTextSplitter(
                chunk_size=1000,
                chunk_overlap=200
            )
            docs = splitter.split_documents(documents)
            
            # Filter empty docs
            docs = [d for d in docs if d.page_content.strip()]
            
            if not docs:
                logger.error("No valid text chunks found after splitting.")
                return {"error": "No valid text content found in PDF"}

            logger.info(f"Created {len(docs)} text chunks.")
            logger.info(f"Sample chunk: {docs[0].page_content[:100]}...")

            # Test Embedding Generation
            try:
                logger.info("Testing embedding generation on sample text...")
                test_embed = self.embeddings.embed_query("test")
                if not test_embed:
                    raise ValueError("Generated embedding is empty")
                logger.info("Embedding test successful.")
            except Exception as e:
                logger.error(f"Embedding test failed: {e}")
                raise ValueError(f"Embedding generation failed. Check API keys and Model availability. Details: {e}")

            # Create Vector Store
            logger.info("Creating Vector Store...")
            # Clear existing db to ensure we search only the new file
            if os.path.exists(self.persist_directory):
                try:
                    shutil.rmtree(self.persist_directory)
                except Exception as e:
                    logger.warning(f"Could not delete chroma_db: {e}")
            
            # Re-initialize vectorstore
            self.vectorstore = Chroma.from_documents(
                documents=docs,
                embedding=self.embeddings,
                persist_directory=self.persist_directory
            )
            self.vectorstore.persist()
            
            # Cleanup temp file
            if os.path.exists(temp_path):
                os.remove(temp_path)
            
            logger.info(f"Processed {len(docs)} chunks.")
            
            # Return filtered_chunks structure to match expected output for count
            return {
                "filtered_chunks": docs
            }
            
        except Exception as e:
            logger.error(f"Error in process_pdf: {e}")
            raise e

    def query_documents(self, query: str):
        """Query using MultiQueryRetriever"""
        try:
            if not self.vectorstore:
                # Try loading from persistence if not in memory
                if os.path.exists(self.persist_directory):
                    self.vectorstore = Chroma(
                        persist_directory=self.persist_directory,
                        embedding_function=self.embeddings
                    )
                else:
                    return {
                        'answer': "No document loaded. Please upload a PDF first.",
                        'has_context': False,
                        'page_points': {}
                    }

            # Setup Retriever (RF-RAG logic)
            base_retriever = self.vectorstore.as_retriever(search_kwargs={"k": 5})
            
            retriever = MultiQueryRetriever.from_llm(
                retriever=base_retriever,
                llm=self.llm
            )
            retriever.verbose = True
            
            # Setup Prompt
            prompt = PromptTemplate(
                template="""
                Use the following context to answer the question.
                If the answer is not in the context, say "I don't know".

                Context:
                {context}

                Question:
                {question}

                Answer:
                """,
                input_variables=["context", "question"]
            )
            
            # Setup QA Chain
            qa_chain = RetrievalQA.from_chain_type(
                llm=self.llm,
                chain_type="stuff",
                retriever=retriever,
                chain_type_kwargs={"prompt": prompt},
                return_source_documents=True
            )
            
            # Execute Query
            logger.info(f"Querying: {query}")
            result = qa_chain.invoke({"query": query})
            
            answer = result["result"]
            source_docs = result["source_documents"]
            
            # Format output to maintain compatibility with frontend expected structure
            page_points = {}
            for doc in source_docs:
                page_num = doc.metadata.get('page', 0)
                # Convert page_num to int if possible, sometimes it might be 0-indexed or 1-indexed
                # PyPDFLoader usually uses 0-indexed 'page' metadata
                display_page_num = page_num + 1 
                
                if display_page_num not in page_points:
                    page_points[display_page_num] = []
                
                # We simply provide a snippet as a "point"
                snippet = doc.page_content[:300].replace('\n', ' ') + "..."
                page_points[display_page_num].append({
                    'text': snippet,
                    'score': 1.0
                })

            return {
                'answer': answer,
                'has_context': len(source_docs) > 0,
                'page_points': page_points,
                'total_sources': len(source_docs),
                'pages_referenced': list(page_points.keys())
            }
            
        except Exception as e:
            logger.error(f"Error in query_documents: {e}")
            return {
                'answer': f"An error occurred: {str(e)}",
                'has_context': False,
                'page_points': {}
            }

# Initialize the system
enhanced_rag = EnhancedRAGSystem()

@aiassistant_bp.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload and process PDF"""
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file uploaded'}), 400
        
        pdf_file = request.files['pdf']
        if pdf_file.filename == '' or not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Invalid PDF file'}), 400
        
        # Process synchronously
        result = enhanced_rag.process_pdf(pdf_file)
        
        chunk_count = len(result.get("filtered_chunks", []))
        
        return jsonify({
            'message': 'PDF processed successfully',
            'document_count': chunk_count,
            'filename': pdf_file.filename,
            'workflow_completed': True
        })
        
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500

@aiassistant_bp.route('/query', methods=['POST'])
def query_documents():
    """Query documents"""
    try:
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({'error': 'Question is required'}), 400
        
        question = data['question']
        
        # Query synchronously
        result = enhanced_rag.query_documents(question)
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        return jsonify({'error': f'Error processing query: {str(e)}'}), 500

@aiassistant_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    status = "ready" if (enhanced_rag.vectorstore or os.path.exists(enhanced_rag.persist_directory)) else "no document loaded"
    return jsonify({
        'status': 'healthy',
        'message': 'RAG system is running',
        'collection_status': status,
        'workflow_ready': True
    })

@aiassistant_bp.route('/clear', methods=['POST'])
def clear_database():
    """Clear the current document database"""
    try:
        if enhanced_rag.vectorstore:
            enhanced_rag.vectorstore = None
            
        if os.path.exists(enhanced_rag.persist_directory):
            shutil.rmtree(enhanced_rag.persist_directory)
            logger.info("Cleared chroma_db")
        
        return jsonify({'message': 'Database cleared successfully'})
        
    except Exception as e:
        logger.error(f"Error clearing database: {e}")
        return jsonify({'error': f'Error clearing database: {str(e)}'}), 500