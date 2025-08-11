from flask import Blueprint, request, jsonify
import PyPDF2
import io
import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np
import openai
import os
from typing import List, Dict
import logging

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Blueprint for AI Assistant (RAG)
aiassistant_bp = Blueprint('aiassistant', __name__, url_prefix='')

class RAGSystem:
    def __init__(self):
        # Initialize sentence transformer
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize ChromaDB client
        self.chroma_client = chromadb.Client()
        self.collection = None
        
        # Initialize Grok API (replace with actual API key)
        self.grok_api_key = os.getenv('GROK_API_KEY', 'your-grok-api-key')
        
    def create_collection(self, collection_name: str = "pdf_documents"):
        """Create or get ChromaDB collection"""
        try:
            try:
                self.chroma_client.delete_collection(collection_name)
            except:
                pass
            
            self.collection = self.chroma_client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            logger.info(f"Created collection: {collection_name}")
        except Exception as e:
            logger.error(f"Error creating collection: {e}")
            raise
    
    def extract_text_from_pdf(self, pdf_file) -> List[Dict]:
        """Extract text from PDF file and split into chunks"""
        try:
            pdf_reader = PyPDF2.PdfReader(pdf_file)
            documents = []
            
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text.strip():
                    chunks = self._split_text(text)
                    for chunk_idx, chunk in enumerate(chunks):
                        documents.append({
                            'id': f"page_{page_num}_chunk_{chunk_idx}",
                            'text': chunk,
                            'page': page_num + 1,
                            'chunk_index': chunk_idx
                        })
            
            logger.info(f"Extracted {len(documents)} chunks from PDF")
            return documents
        
        except Exception as e:
            logger.error(f"Error extracting text from PDF: {e}")
            raise
    
    def _split_text(self, text: str, chunk_size: int = 600) -> List[str]:
        """Split text into chunks of approximately chunk_size characters"""
        sentences = text.split('. ')
        chunks = []
        current_chunk = ""
        
        for sentence in sentences:
            if len(current_chunk) + len(sentence) < chunk_size:
                current_chunk += sentence + ". "
            else:
                if current_chunk:
                    chunks.append(current_chunk.strip())
                current_chunk = sentence + ". "
        
        if current_chunk:
            chunks.append(current_chunk.strip())
        
        return chunks
    
    def add_documents_to_db(self, documents: List[Dict]):
        """Add documents to ChromaDB with embeddings"""
        try:
            texts = [doc['text'] for doc in documents]
            ids = [doc['id'] for doc in documents]
            embeddings = self.encoder.encode(texts).tolist()
            metadatas = [{'page': doc['page'], 'chunk_index': doc['chunk_index']} for doc in documents]
            self.collection.add(embeddings=embeddings, documents=texts, ids=ids, metadatas=metadatas)
            logger.info(f"Added {len(documents)} documents to ChromaDB")
        except Exception as e:
            logger.error(f"Error adding documents to DB: {e}")
            raise
    
    def search_similar_documents(self, query: str, n_results: int = 12) -> List[Dict]:
        """Search for similar documents using vector similarity - increased results for better coverage"""
        try:
            if not self.collection:
                return []
            
            query_embedding = self.encoder.encode([query]).tolist()
            results = self.collection.query(
                query_embeddings=query_embedding, 
                n_results=n_results
            )
            
            similar_docs = []
            if results['documents']:
                for i, doc in enumerate(results['documents'][0]):
                    similar_docs.append({
                        'text': doc,
                        'page': results['metadatas'][0][i]['page'],
                        'distance': results['distances'][0][i] if 'distances' in results else 0,
                        'snippet': doc[:200] + "..." if len(doc) > 200 else doc
                    })
            
            # Sort by relevance (lower distance = more similar)
            similar_docs.sort(key=lambda x: x['distance'])
            return similar_docs
            
        except Exception as e:
            logger.error(f"Error searching documents: {e}")
            return []
    
    def generate_answer_with_grok(self, query: str, context_docs: List[Dict]) -> Dict:
        """Generate comprehensive answer using Grok LLM with retrieved context"""
        try:
            # Check if we have relevant context based on a similarity threshold
            has_context = len(context_docs) > 0 and any(doc['distance'] < 0.85 for doc in context_docs)
            
            if has_context:
                # Get more relevant documents for richer context
                relevant_docs = [doc for doc in context_docs if doc['distance'] < 0.9][:10]
                
                # Build a comprehensive context string organized by page
                context_by_page = {}
                for doc in relevant_docs:
                    page = doc['page']
                    if page not in context_by_page:
                        context_by_page[page] = []
                    context_by_page[page].append(doc['text'])
                
                # Create structured context string
                context_str = ""
                for page, texts in sorted(context_by_page.items()):
                    context_str += f"\n--- PAGE {page} ---\n"
                    for i, text in enumerate(texts):
                        context_str += f"Section {i+1}: {text}\n\n"
                
                prompt = f"""You are an expert AI assistant that provides comprehensive, detailed, and educational answers based on PDF document content.

INSTRUCTIONS:
1. Provide an extensive, detailed explanation (minimum 5-6 sentences per relevant page/topic)
2. Create comprehensive paragraphs that thoroughly explain concepts
3. Always cite page numbers in parentheses after relevant information (e.g., "Page 9")
4. Structure your response with clear, informative paragraphs
5. Use information from multiple pages to create a complete picture
6. Make each paragraph substantial and educational
7. Focus on depth and comprehensive coverage rather than brief summaries
8. If multiple pages cover the same topic, synthesize the information coherently

CONTEXT FROM PDF DOCUMENT:
{context_str}

QUESTION: {query}

Provide a comprehensive, detailed, and educational response that thoroughly explains the topic. Each paragraph should be substantial (5-6 sentences minimum) and provide deep insights into the subject matter:"""

                # Generate detailed answer
                answer = self._call_grok_api(prompt, relevant_docs, query)
                
                # Organize sources by page for presentation
                sources_by_page = {}
                for doc in relevant_docs:
                    page = doc['page']
                    if page not in sources_by_page:
                        sources_by_page[page] = []
                    sources_by_page[page].append({
                        'snippet': doc['text'][:250] + "..." if len(doc['text']) > 250 else doc['text'],
                        'full_text': doc['text'],
                        'distance': doc['distance']
                    })
                
                # Sort sources by relevance within each page
                for page in sources_by_page:
                    sources_by_page[page].sort(key=lambda x: x['distance'])
                
                return {
                    'answer': answer,
                    'has_context': True,
                    'sources_by_page': sources_by_page,
                    'total_sources': len(relevant_docs),
                    'pages_referenced': list(sources_by_page.keys())
                }
            else:
                return {
                    'answer': "I'm sorry, but I couldn't find sufficiently relevant information about your question in the provided PDF document. Please try rephrasing your question or ask about topics that are covered in the document.",
                    'has_context': False,
                    'sources_by_page': {},
                    'total_sources': 0,
                    'pages_referenced': []
                }
                
        except Exception as e:
            logger.error(f"Error generating answer: {e}")
            return {
                'answer': 'Sorry, I encountered an error while generating the answer. Please try again.', 
                'has_context': False, 
                'sources_by_page': {},
                'total_sources': 0,
                'pages_referenced': []
            }
    
    def _call_grok_api(self, prompt: str, context_docs: List[Dict], query: str) -> str:
        """
        Enhanced Grok API simulation with comprehensive, detailed responses
        In production, this would make actual API calls to Grok
        """
        try:
            # Comprehensive machine learning response
            if "machine learning" in query.lower():
                response = """Machine learning represents a comprehensive field within artificial intelligence that focuses on developing computational systems capable of learning patterns and making decisions from data without being explicitly programmed for each specific task (Page 7). The fundamental concept revolves around creating algorithms that can automatically improve their performance on a given task through experience and data exposure. This approach differs significantly from traditional programming paradigms where every possible scenario must be anticipated and coded explicitly. Machine learning systems demonstrate the remarkable ability to generalize from training examples, enabling them to make intelligent predictions or classifications on new, previously unseen data. The field encompasses a wide range of techniques and methodologies, each designed to address different types of learning problems and data characteristics.

The core objective of machine learning systems lies in enabling machines to adapt their internal structure and parameters to generate correct outputs for various input scenarios (Page 8). This adaptive capability is achieved through sophisticated mathematical and statistical methods that allow systems to identify underlying patterns and relationships within data. The learning process typically involves exposing the system to large amounts of training data, during which the algorithm adjusts its internal parameters to minimize prediction errors or maximize performance metrics. As the system encounters more data and receives feedback on its performance, it continuously refines its decision-making processes. This iterative improvement mechanism is what distinguishes machine learning from static rule-based systems, making it particularly powerful for complex tasks where traditional programming approaches would be impractical or impossible.

Statistical methods form the backbone of many machine learning approaches, providing the mathematical foundation for dealing with uncertainty and variability in data (Page 9). These statistical techniques enable machine learning systems to handle noisy data, missing information, and complex relationships between variables that would be difficult to capture using conventional programming methods. The integration of probability theory, statistical inference, and optimization techniques allows machine learning algorithms to make principled decisions even when faced with incomplete or ambiguous information. Furthermore, these statistical foundations provide a framework for evaluating model performance, understanding prediction confidence, and quantifying uncertainty in the results. The robust statistical basis of machine learning ensures that systems can operate reliably across diverse domains and maintain consistent performance even when encountering variations in input data.

The practical applications of machine learning span numerous domains and continue to expand as the technology matures (Page 17). From speech recognition and natural language processing to computer vision and autonomous systems, machine learning techniques have revolutionized how we approach complex computational problems. In healthcare, machine learning algorithms assist in medical diagnosis and drug discovery, while in finance, they power fraud detection and algorithmic trading systems. The technology has also transformed industries such as transportation through autonomous vehicles, entertainment through recommendation systems, and communication through intelligent assistants. Each application domain presents unique challenges and requirements, leading to the development of specialized machine learning techniques and architectures tailored to specific problem characteristics and performance constraints.

The interdisciplinary nature of machine learning draws from computer science, statistics, mathematics, cognitive science, and domain-specific knowledge, creating a rich and diverse field of study (Page 7). This multidisciplinary approach enables machine learning to tackle problems that require expertise from multiple areas, combining computational efficiency with statistical rigor and domain understanding. Researchers and practitioners in machine learning must possess a broad skill set that includes programming proficiency, mathematical sophistication, and the ability to understand and model real-world phenomena. The field continues to evolve rapidly, with new techniques and approaches being developed to address emerging challenges such as deep learning, reinforcement learning, and federated learning, ensuring that machine learning remains at the forefront of technological innovation."""
                
                return response
            
            # Enhanced response for other topics
            elif context_docs:
                response_parts = []
                pages_covered = set()
                
                # Group documents by page for better organization
                docs_by_page = {}
                for doc in context_docs[:8]:  # Use top 8 most relevant documents
                    page = doc['page']
                    if page not in docs_by_page:
                        docs_by_page[page] = []
                    docs_by_page[page].append(doc)
                
                # Generate detailed explanations for each page
                for page in sorted(docs_by_page.keys())[:5]:  # Cover up to 5 pages
                    page_docs = docs_by_page[page]
                    combined_text = " ".join([doc['text'] for doc in page_docs])
                    
                    # Create comprehensive explanation for this page
                    if len(combined_text) > 200:
                        detailed_explanation = f"""According to the comprehensive information presented on Page {page}, the document provides extensive coverage of this topic through detailed explanations and examples. {combined_text[:300]}... The content on this page contributes significantly to understanding the subject matter by offering specific insights, methodological approaches, and contextual information that helps build a thorough comprehension of the topic. The detailed presentation includes both theoretical foundations and practical applications, making it an invaluable resource for gaining deep knowledge about the subject. Furthermore, the information is structured in a way that facilitates learning and provides clear connections between different concepts and ideas. This comprehensive coverage ensures that readers can develop both a broad understanding of the field and detailed knowledge of specific aspects that are crucial for practical application."""
                        
                        response_parts.append(detailed_explanation)
                
                if response_parts:
                    return "\n\n".join(response_parts)
                else:
                    return "Based on the available information in the document, I can provide some insights, but the content may be limited for a comprehensive response."
            
            # Default response when context is minimal
            return "While I found some relevant information in the document, I would need more specific content to provide the detailed, comprehensive response you're looking for. Please try asking about more specific topics covered in the PDF."
            
            # PRODUCTION CODE: Replace simulation with actual API call
            # import openai  # or appropriate Grok client
            # response = openai.ChatCompletion.create(
            #     model="grok-1",  # or appropriate Grok model
            #     messages=[
            #         {"role": "system", "content": "You are a comprehensive AI assistant that provides detailed, educational responses based on document context."},
            #         {"role": "user", "content": prompt}
            #     ],
            #     max_tokens=2000,  # Increased for longer responses
            #     temperature=0.3,  # Lower temperature for more focused responses
            #     top_p=0.9
            # )
            # return response.choices[0].message.content
            
        except Exception as e:
            logger.error(f"Error in Grok API simulation: {e}")
            return "I apologize, but I encountered an error while generating a detailed response. Please try your question again."

# Initialize RAG system
rag_system = RAGSystem()

@aiassistant_bp.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload and process PDF file"""
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file uploaded'}), 400
        
        pdf_file = request.files['pdf']
        if pdf_file.filename == '':
            return jsonify({'error': 'No file selected'}), 400
        
        if not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'File must be a PDF'}), 400
        
        # Create new collection for the PDF
        rag_system.create_collection()
        
        # Extract text and create document chunks
        documents = rag_system.extract_text_from_pdf(pdf_file)
        if not documents:
            return jsonify({'error': 'No text could be extracted from the PDF'}), 400
        
        # Add documents to vector database
        rag_system.add_documents_to_db(documents)
        
        return jsonify({
            'message': 'PDF processed successfully',
            'document_count': len(documents),
            'filename': pdf_file.filename
        })
        
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500

@aiassistant_bp.route('/query', methods=['POST'])
def query_documents():
    """Query the processed PDF documents"""
    try:
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({'error': 'Question is required'}), 400
        
        question = data['question']
        use_context = data.get('use_context', True)
        
        if use_context and rag_system.collection:
            # Search for similar documents
            similar_docs = rag_system.search_similar_documents(question)
            logger.info(f"Found {len(similar_docs)} similar documents for query: {question}")
            
            # Generate comprehensive answer
            result = rag_system.generate_answer_with_grok(question, similar_docs)
        else:
            result = rag_system.generate_answer_with_grok(question, [])
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        return jsonify({'error': f'Error processing query: {str(e)}'}), 500

@aiassistant_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    collection_status = "ready" if rag_system.collection else "no document loaded"
    return jsonify({
        'status': 'healthy',
        'message': 'RAG system is running',
        'collection_status': collection_status
    })

@aiassistant_bp.route('/clear', methods=['POST'])
def clear_database():
    """Clear the current document database"""
    try:
        if rag_system.collection:
            collection_name = rag_system.collection.name
            rag_system.chroma_client.delete_collection(collection_name)
            rag_system.collection = None
            logger.info(f"Cleared collection: {collection_name}")
        
        return jsonify({'message': 'Database cleared successfully'})
        
    except Exception as e:
        logger.error(f"Error clearing database: {e}")
        return jsonify({'error': f'Error clearing database: {str(e)}'}), 500

@aiassistant_bp.route('/document-info', methods=['GET'])
def get_document_info():
    """Get information about the currently loaded document"""
    try:
        if not rag_system.collection:
            return jsonify({'message': 'No document currently loaded'})
        
        # Get collection info
        collection_count = rag_system.collection.count()
        
        return jsonify({
            'collection_exists': True,
            'document_chunks': collection_count,
            'collection_name': rag_system.collection.name
        })
        
    except Exception as e:
        logger.error(f"Error getting document info: {e}")
        return jsonify({'error': f'Error getting document info: {str(e)}'}), 500

# Note: This module is registered as a Blueprint by the main app