from flask import Blueprint, request, jsonify
import PyPDF2
import io
import chromadb
from sentence_transformers import SentenceTransformer
import numpy as np
import os
from typing import List, Dict, TypedDict
import logging
import re
from langgraph.graph import StateGraph, END
from collections import Counter
import asyncio

# Set up logging
logging.basicConfig(level=logging.INFO)
logger = logging.getLogger(__name__)

# Blueprint for AI Assistant (RAG)
aiassistant_bp = Blueprint('aiassistant', __name__, url_prefix='')

# Define the workflow state
class WorkflowState(TypedDict):
    pdf_file: any
    raw_text: List[Dict]
    filtered_pages: List[Dict]
    filtered_chunks: List[Dict]
    embeddings: List[List[float]]
    query: str
    search_results: List[Dict]
    final_response: Dict

class EnhancedRAGSystem:
    def __init__(self):
        # Initialize sentence transformer
        self.encoder = SentenceTransformer('all-MiniLM-L6-v2')
        
        # Initialize ChromaDB client
        self.chroma_client = chromadb.Client()
        self.collection = None
        
        # Store document index
        self.document_index = {}
        
        # Initialize LangGraph workflow
        self.workflow = self._create_workflow()
    
    def _create_workflow(self) -> StateGraph:
        """Create the LangGraph workflow"""
        workflow = StateGraph(WorkflowState)
        
        # Add nodes
        workflow.add_node("extract_text", self.extract_text_node)
        workflow.add_node("filter_text", self.filter_text_node)
        workflow.add_node("chunk_text", self.chunk_text_node)
        workflow.add_node("generate_embeddings", self.generate_embeddings_node)
        workflow.add_node("store_documents", self.store_documents_node)
        workflow.add_node("search_documents", self.search_documents_node)
        workflow.add_node("generate_response", self.generate_response_node)
        
        # Define the workflow
        workflow.add_edge("extract_text", "filter_text")
        workflow.add_edge("filter_text", "chunk_text")
        workflow.add_edge("chunk_text", "generate_embeddings")
        workflow.add_edge("generate_embeddings", "store_documents")
        workflow.add_edge("store_documents", END)
        
        # Query workflow
        workflow.add_edge("search_documents", "generate_response")
        workflow.add_edge("generate_response", END)
        
        # Set entry points
        workflow.set_entry_point("extract_text")
        
        return workflow.compile()
    
    def extract_text_node(self, state: WorkflowState) -> WorkflowState:
        """Extract raw text from PDF"""
        logger.info("Node: Extracting text from PDF")
        
        try:
            pdf_reader = PyPDF2.PdfReader(state["pdf_file"])
            raw_pages = []
            
            for page_num, page in enumerate(pdf_reader.pages):
                text = page.extract_text()
                if text.strip():
                    raw_pages.append({
                        'page_num': page_num + 1,
                        'raw_text': text,
                        'word_count': len(text.split())
                    })
            
            state["raw_text"] = raw_pages
            logger.info(f"Extracted text from {len(raw_pages)} pages")
            return state
            
        except Exception as e:
            logger.error(f"Error in extract_text_node: {e}")
            state["raw_text"] = []
            return state
    
    def filter_text_node(self, state: WorkflowState) -> WorkflowState:
        """Filter out irrelevant content like TOC, index pages, etc."""
        logger.info("Node: Filtering text content")
        
        filtered_pages = []
        raw_pages = state.get("raw_text", []) or []
        
        for page_data in raw_pages:
            text = page_data["raw_text"].lower()
            page_num = page_data["page_num"]
            
            # Skip if page has filtering indicators
            skip_indicators = [
                'table of contents', 'contents', 'index', 'bibliography',
                'references', 'appendix', 'glossary', 'acknowledgments'
            ]
            
            should_skip = False
            for indicator in skip_indicators:
                if indicator in text and len(text.split()) < 150:  # Short pages with these indicators
                    should_skip = True
                    break
            
            # Skip pages that are mostly numbers/dots (TOC style)
            dot_ratio = text.count('.') / max(len(text.split()), 1)
            number_ratio = len(re.findall(r'\b\d+\b', text)) / max(len(text.split()), 1)
            
            if dot_ratio > 0.3 or number_ratio > 0.4:
                should_skip = True
            
            # Skip very short pages with no substantial content
            if len(text.split()) < 50:
                should_skip = True
            
            if not should_skip:
                # Extract meaningful content
                content_text = self._extract_meaningful_content(page_data["raw_text"])
                if content_text:
                    filtered_pages.append({
                        'page_num': page_num,
                        'filtered_text': content_text,
                        'word_count': len(content_text.split())
                    })
        
        state["filtered_pages"] = filtered_pages
        logger.info(f"Filtered to {len(filtered_pages)} relevant pages")
        return state
    
    def _extract_meaningful_content(self, text: str) -> str:
        """Extract meaningful content from page text"""
        lines = text.split('\n')
        meaningful_lines = []
        
        for line in lines:
            line = line.strip()
            # Skip very short lines, page numbers, headers/footers
            if len(line) < 10:
                continue
            if re.match(r'^\d+$', line):  # Just page numbers
                continue
            if len(line.split()) < 3:  # Very short phrases
                continue
                
            meaningful_lines.append(line)
        
        return ' '.join(meaningful_lines)
    
    def chunk_text_node(self, state: WorkflowState) -> WorkflowState:
        """Create semantic chunks from filtered text"""
        logger.info("Node: Creating text chunks")
        
        chunks = []
        pages = state.get("filtered_pages", []) or []
        for page_data in pages:
            page_num = page_data["page_num"]
            text = page_data["filtered_text"]
            
            # Create semantic chunks
            page_chunks = self._create_semantic_chunks(text, page_num)
            chunks.extend(page_chunks)
        
        state["filtered_chunks"] = chunks
        logger.info(f"Created {len(chunks)} semantic chunks")
        return state
    
    def _create_semantic_chunks(self, text: str, page_num: int) -> List[Dict]:
        """Create semantic chunks with topic detection"""
        sentences = [s.strip() for s in text.split('.') if len(s.strip()) > 20]
        chunks = []
        current_chunk = []
        current_length = 0
        chunk_idx = 0
        
        for sentence in sentences:
            sentence_length = len(sentence.split())
            
            if current_length + sentence_length > 120:  # Optimal chunk size
                if current_chunk:
                    chunk_text = '. '.join(current_chunk) + '.'
                    
                    # Extract key information for this chunk
                    chunk_info = {
                        'id': f"page_{page_num}_chunk_{chunk_idx}",
                        'text': chunk_text,
                        'page': page_num,
                        'chunk_index': chunk_idx,
                        'key_terms': self._extract_key_terms(chunk_text),
                        'topic_indicators': self._extract_topic_indicators(chunk_text)
                    }
                    
                    chunks.append(chunk_info)
                    chunk_idx += 1
                
                current_chunk = [sentence]
                current_length = sentence_length
            else:
                current_chunk.append(sentence)
                current_length += sentence_length
        
        # Add remaining chunk
        if current_chunk:
            chunk_text = '. '.join(current_chunk) + '.'
            chunk_info = {
                'id': f"page_{page_num}_chunk_{chunk_idx}",
                'text': chunk_text,
                'page': page_num,
                'chunk_index': chunk_idx,
                'key_terms': self._extract_key_terms(chunk_text),
                'topic_indicators': self._extract_topic_indicators(chunk_text)
            }
            chunks.append(chunk_info)
        
        return chunks
    
    def _extract_key_terms(self, text: str) -> List[str]:
        """Extract key terms from text"""
        # Technical terms pattern
        technical_patterns = [
            r'\b[A-Z][a-z]+(?:\s+[A-Z][a-z]+)*\b',  # Proper nouns/concepts
            r'\b(?:algorithm|method|technique|approach|system|model|framework|process|theory|analysis)\b',
            r'\b(?:machine\s+learning|artificial\s+intelligence|neural\s+network|deep\s+learning)\b',
        ]
        
        key_terms = []
        for pattern in technical_patterns:
            matches = re.findall(pattern, text, re.IGNORECASE)
            key_terms.extend(matches)
        
        # Remove duplicates and common words
        common_words = {'the', 'and', 'or', 'but', 'in', 'on', 'at', 'to', 'for', 'of', 'with', 'by'}
        key_terms = [term for term in key_terms if term.lower() not in common_words]
        
        return list(set(key_terms))[:8]  # Top 8 unique terms
    
    def _extract_topic_indicators(self, text: str) -> List[str]:
        """Extract topic/section indicators"""
        indicators = []
        
        # Look for section headers, important phrases
        header_patterns = [
            r'^[A-Z\s]{5,}$',  # All caps headers
            r'^\d+\.?\s+[A-Z].*$',  # Numbered sections
            r'^[A-Z][^.]*:$',  # Title with colon
        ]
        
        lines = text.split('\n')
        for line in lines[:3]:  # Check first 3 lines for headers
            line = line.strip()
            for pattern in header_patterns:
                if re.match(pattern, line) and len(line) < 80:
                    indicators.append(line)
                    break
        
        return indicators[:2]  # Max 2 indicators
    
    def generate_embeddings_node(self, state: WorkflowState) -> WorkflowState:
        """Generate embeddings for chunks"""
        logger.info("Node: Generating embeddings")
        
        texts = [chunk['text'] for chunk in state["filtered_chunks"]]
        embeddings = self.encoder.encode(texts).tolist()
        
        state["embeddings"] = embeddings
        logger.info(f"Generated embeddings for {len(embeddings)} chunks")
        return state
    
    def store_documents_node(self, state: WorkflowState) -> WorkflowState:
        """Store documents in ChromaDB"""
        logger.info("Node: Storing documents in vector DB")
        
        try:
            # Create new collection
            collection_name = "enhanced_pdf_docs"
            try:
                self.chroma_client.delete_collection(collection_name)
            except:
                pass
            
            self.collection = self.chroma_client.create_collection(
                name=collection_name,
                metadata={"hnsw:space": "cosine"}
            )
            
            # Prepare data for storage
            texts = [chunk['text'] for chunk in state["filtered_chunks"]]
            ids = [chunk['id'] for chunk in state["filtered_chunks"]]
            embeddings = state["embeddings"]
            metadatas = [{
                'page': chunk['page'],
                'chunk_index': chunk['chunk_index'],
                'key_terms': ','.join(chunk['key_terms']),
                'topic_indicators': ','.join(chunk['topic_indicators'])
            } for chunk in state["filtered_chunks"]]
            
            # Store in ChromaDB
            self.collection.add(
                embeddings=embeddings,
                documents=texts,
                ids=ids,
                metadatas=metadatas
            )
            
            # Store in document index for quick access
            for chunk in state["filtered_chunks"]:
                self.document_index[chunk['id']] = chunk
            
            logger.info(f"Stored {len(texts)} documents in vector database")
            
        except Exception as e:
            logger.error(f"Error in store_documents_node: {e}")
        
        return state
    
    def search_documents_node(self, state: WorkflowState) -> WorkflowState:
        """Search for relevant documents"""
        logger.info(f"Node: Searching documents for query: {state['query']}")
        
        try:
            if not self.collection:
                state["search_results"] = []
                return state
            
            query_embedding = self.encoder.encode([state["query"]]).tolist()
            results = self.collection.query(
                query_embeddings=query_embedding,
                n_results=12
            )
            
            # Process search results
            search_results = []
            if results['documents']:
                for i, doc in enumerate(results['documents'][0]):
                    doc_id = results['ids'][0][i]
                    distance = results['distances'][0][i] if 'distances' in results else 0
                    metadata = results['metadatas'][0][i]
                    
                    # Filter by relevance
                    if distance < 0.7:  # Similarity threshold
                        chunk_info = self.document_index.get(doc_id, {})
                        search_results.append({
                            'id': doc_id,
                            'text': doc,
                            'page': metadata['page'],
                            'distance': distance,
                            'key_terms': metadata.get('key_terms', '').split(','),
                            'topic_indicators': metadata.get('topic_indicators', '').split(',')
                        })
            
            # Sort by relevance and group by page
            search_results.sort(key=lambda x: x['distance'])
            state["search_results"] = search_results[:8]  # Top 8 results
            
            logger.info(f"Found {len(search_results)} relevant documents")
            
        except Exception as e:
            logger.error(f"Error in search_documents_node: {e}")
            state["search_results"] = []
        
        return state
    
    def generate_response_node(self, state: WorkflowState) -> WorkflowState:
        """Generate structured response with key points by page"""
        logger.info("Node: Generating structured response")
        
        search_results = state["search_results"]
        
        if not search_results:
            state["final_response"] = {
                'answer': "I couldn't find relevant information about your question in the document. Please try asking about specific topics covered in the document.",
                'has_context': False,
                'page_points': {},
                'total_sources': 0,
                'pages_referenced': []
            }
            return state
        
        # Group results by page
        pages_data = {}
        for result in search_results:
            page = result['page']
            if page not in pages_data:
                pages_data[page] = []
            pages_data[page].append(result)
        
        # Generate 3-4 key points per page
        page_points = {}
        response_parts = []
        
        for page in sorted(pages_data.keys())[:3]:  # Max 3 pages
            page_results = pages_data[page]
            key_points = self._extract_key_points_for_page(state["query"], page_results, page)
            
            if key_points:
                page_points[page] = key_points
                response_parts.append(self._format_page_response(page, key_points))
        
        # Combine response
        if response_parts:
            final_answer = '\n\n'.join(response_parts)
        else:
            final_answer = "Found relevant content but couldn't extract specific key points. Please try asking about more specific topics."
        
        state["final_response"] = {
            'answer': final_answer,
            'has_context': True,
            'page_points': page_points,
            'total_sources': len(search_results),
            'pages_referenced': list(page_points.keys())
        }
        
        return state
    
    def _extract_key_points_for_page(self, query: str, page_results: List[Dict], page: int) -> List[Dict]:
        """Extract 3-4 key points from page content"""
        combined_text = ' '.join([result['text'] for result in page_results])
        
        # Split into sentences and score them
        sentences = [s.strip() for s in combined_text.split('.') if len(s.strip()) > 25]
        query_words = set(query.lower().split())
        
        scored_sentences = []
        for sentence in sentences[:20]:  # Limit processing
            sentence_words = set(sentence.lower().split())
            
            # Calculate relevance score
            overlap_score = len(query_words.intersection(sentence_words))
            length_score = min(len(sentence.split()) / 15, 1.0)  # Prefer moderate length
            
            # Boost for important keywords
            importance_keywords = [
                'important', 'significant', 'key', 'main', 'primary', 'crucial',
                'method', 'approach', 'technique', 'algorithm', 'system', 'process',
                'result', 'finding', 'conclusion', 'shows', 'demonstrates'
            ]
            
            keyword_boost = sum(1 for word in importance_keywords if word in sentence.lower())
            total_score = overlap_score + length_score + (keyword_boost * 0.3)
            
            if total_score > 0.8:  # Minimum threshold
                # Extract key terms from this sentence
                sentence_key_terms = []
                for result in page_results:
                    sentence_key_terms.extend(result.get('key_terms', []))
                
                scored_sentences.append({
                    'text': sentence.strip(),
                    'score': total_score,
                    'key_terms': list(set(sentence_key_terms))[:4]  # Max 4 key terms
                })
        
        # Sort and select top points
        scored_sentences.sort(key=lambda x: x['score'], reverse=True)
        return scored_sentences[:4]  # Maximum 4 points per page
    
    def _format_page_response(self, page: int, key_points: List[Dict]) -> str:
        """Format response for a specific page"""
        response = f"**Page {page}**\n"
        
        for i, point in enumerate(key_points, 1):
            text = point['text']
            # Remove any existing bold formatting and just use plain text
            clean_text = text.replace('**', '').replace('__', '')
            
            response += f"• {clean_text}\n"
        
        return response
    
    # Main interface methods
    async def process_pdf(self, pdf_file):
        """Process PDF through LangGraph workflow"""
        initial_state = {
            "pdf_file": pdf_file,
            "raw_text": "",
            "filtered_chunks": [],
            "embeddings": [],
            "query": "",
            "search_results": [],
            "final_response": {}
        }
        
        # Run through processing workflow
        final_state = await self.workflow.ainvoke(initial_state)
        return final_state
    
    async def query_documents(self, query: str):
        """Query documents through search workflow"""
        if not self.collection:
            return {
                'answer': "No document has been uploaded. Please upload a PDF first.",
                'has_context': False,
                'page_points': {},
                'total_sources': 0,
                'pages_referenced': []
            }
        
        # Create search workflow
        search_workflow = StateGraph(WorkflowState)
        search_workflow.add_node("search_documents", self.search_documents_node)
        search_workflow.add_node("generate_response", self.generate_response_node)
        search_workflow.add_edge("search_documents", "generate_response")
        search_workflow.add_edge("generate_response", END)
        search_workflow.set_entry_point("search_documents")
        
        compiled_search = search_workflow.compile()
        
        search_state = {
            "query": query,
            "search_results": [],
            "final_response": {}
        }
        
        final_state = await compiled_search.ainvoke(search_state)
        return final_state["final_response"]

# Initialize the enhanced RAG system
enhanced_rag = EnhancedRAGSystem()

@aiassistant_bp.route('/upload-pdf', methods=['POST'])
def upload_pdf():
    """Upload and process PDF through LangGraph workflow"""
    try:
        if 'pdf' not in request.files:
            return jsonify({'error': 'No PDF file uploaded'}), 400
        
        pdf_file = request.files['pdf']
        if pdf_file.filename == '' or not pdf_file.filename.lower().endswith('.pdf'):
            return jsonify({'error': 'Invalid PDF file'}), 400
        
        # Process through LangGraph workflow
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        final_state = loop.run_until_complete(enhanced_rag.process_pdf(pdf_file))
        loop.close()
        
        chunk_count = len(final_state.get("filtered_chunks", []))
        
        return jsonify({
            'message': 'PDF processed successfully through enhanced workflow',
            'document_count': chunk_count,
            'filename': pdf_file.filename,
            'workflow_completed': True
        })
        
    except Exception as e:
        logger.error(f"Error processing PDF: {e}")
        return jsonify({'error': f'Error processing PDF: {str(e)}'}), 500

@aiassistant_bp.route('/query', methods=['POST'])
def query_documents():
    """Query documents with structured response"""
    try:
        data = request.get_json()
        if not data or 'question' not in data:
            return jsonify({'error': 'Question is required'}), 400
        
        question = data['question']
        
        # Query through LangGraph workflow
        loop = asyncio.new_event_loop()
        asyncio.set_event_loop(loop)
        result = loop.run_until_complete(enhanced_rag.query_documents(question))
        loop.close()
        
        return jsonify(result)
        
    except Exception as e:
        logger.error(f"Error processing query: {e}")
        return jsonify({'error': f'Error processing query: {str(e)}'}), 500

@aiassistant_bp.route('/health', methods=['GET'])
def health_check():
    """Health check endpoint"""
    collection_status = "ready" if enhanced_rag.collection else "no document loaded"
    return jsonify({
        'status': 'healthy',
        'message': 'Enhanced LangGraph RAG system is running',
        'collection_status': collection_status,
        'workflow_ready': True
    })

@aiassistant_bp.route('/clear', methods=['POST'])
def clear_database():
    """Clear the current document database"""
    try:
        if enhanced_rag.collection:
            collection_name = enhanced_rag.collection.name
            enhanced_rag.chroma_client.delete_collection(collection_name)
            enhanced_rag.collection = None
            enhanced_rag.document_index = {}
            logger.info(f"Cleared collection: {collection_name}")
        
        return jsonify({'message': 'Database cleared successfully'})
        
    except Exception as e:
        logger.error(f"Error clearing database: {e}")
        return jsonify({'error': f'Error clearing database: {str(e)}'}), 500