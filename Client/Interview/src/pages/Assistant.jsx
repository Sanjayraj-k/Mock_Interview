import React, { useState, useRef } from 'react';
import { Upload, Send, FileText, Bot, User, AlertCircle, CheckCircle, BookOpen, Workflow, Filter } from 'lucide-react';

const EnhancedAssistant = () => {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const [isProcessing, setIsProcessing] = useState(false);
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // API Configuration
  const API_BASE = 'http://localhost:5000';

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  React.useEffect(scrollToBottom, [messages]);

  const handleFileUpload = async (event) => {
    const file = event.target.files[0];
    if (!file || file.type !== 'application/pdf') {
      setUploadStatus('Please select a valid PDF file');
      return;
    }

    setUploadedFile(file);
    setUploadStatus('Processing through LangGraph workflow...');
    setIsProcessing(true);
    
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      const response = await fetch(`${API_BASE}/upload-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        const data = await response.json();
        setUploadStatus(`✅ PDF processed successfully! Created ${data.document_count} filtered chunks through enhanced workflow.`);
        setMessages([{
          type: 'system',
          content: `PDF "${file.name}" has been processed through the LangGraph workflow with advanced text filtering. The system extracted and filtered ${data.document_count} semantic chunks. You can now ask focused questions to get 3-4 key points per page with highlighted key terms.`,
          timestamp: new Date().toLocaleTimeString(),
          workflowSteps: ['Text Extraction', 'Content Filtering', 'Semantic Chunking', 'Embedding Generation', 'Vector Storage']
        }]);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadStatus('❌ Error processing PDF. Please try again.');
      console.error('Upload error:', error);
    } finally {
      setIsProcessing(false);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();
    if (!currentQuestion.trim() || isLoading) return;

    const userMessage = {
      type: 'user',
      content: currentQuestion,
      timestamp: new Date().toLocaleTimeString()
    };

    setMessages(prev => [...prev, userMessage]);
    setCurrentQuestion('');
    setIsLoading(true);

    try {
      const response = await fetch(`${API_BASE}/query`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          question: currentQuestion,
          use_context: uploadedFile !== null
        }),
      });

      const data = await response.json();
      
      const assistantMessage = {
        type: 'assistant',
        content: data.answer,
        hasContext: data.has_context,
        pagePoints: data.page_points || {},
        pagesReferenced: data.pages_referenced || [],
        totalSources: data.total_sources || 0,
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your question through the LangGraph workflow. Please try again.',
        hasContext: false,
        timestamp: new Date().toLocaleTimeString()
      };
      setMessages(prev => [...prev, errorMessage]);
      console.error('Query error:', error);
    } finally {
      setIsLoading(false);
    }
  };

  const handleKeyPress = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleQuestionSubmit(e);
    }
  };

  const formatStructuredResponse = (content) => {
    const lines = content.split('\n');
    const elements = [];
    
    lines.forEach((line, index) => {
      if (line.startsWith('**Page ') && line.endsWith('**')) {
        // Extract page number and format as header
        const pageMatch = line.match(/\*\*Page (\d+)\*\*/);
        if (pageMatch) {
          elements.push(
            <div key={`page-${index}`} className="flex items-center mb-4 mt-6 first:mt-0">
              <BookOpen size={18} className="text-blue-600 mr-2" />
              <h3 className="text-xl font-bold text-white bg-gradient-to-r from-blue-600 to-blue-800 px-4 py-2 rounded-lg shadow-md">
                Page {pageMatch[1]}
              </h3>
            </div>
          );
        }
      } else if (line.startsWith('• ')) {
        // Process bullet points and remove **bold** formatting
        let content = line.substring(2);
        
        // Remove **bold** markers and just display the plain text
        content = content.replace(/\*\*(.*?)\*\*/g, '$1');
        
        elements.push(
          <div key={`bullet-${index}`} className="flex items-start mb-3 ml-6">
            <div className="w-3 h-3 bg-green-500 rounded-full mt-2 mr-4 flex-shrink-0 shadow-sm"></div>
            <p className="text-gray-700 leading-relaxed text-sm">{content}</p>
          </div>
        );
      } else if (line.trim()) {
        // Regular text lines
        elements.push(
          <p key={`text-${index}`} className="text-gray-700 mb-2 text-sm">
            {line}
          </p>
        );
      }
    });
    
    return elements;
  };

  const MessageBubble = ({ message }) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-6`}>
        <div className={`flex max-w-5xl w-full ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
            <div className={`w-10 h-10 rounded-full flex items-center justify-center ${
              isUser ? 'bg-blue-500' : isSystem ? 'bg-purple-500' : 'bg-green-500'
            } shadow-md`}>
              {isUser ? <User size={18} className="text-white" /> : 
               isSystem ? <Workflow size={18} className="text-white" /> :
               <Bot size={18} className="text-white" />}
            </div>
          </div>
          <div className={`px-5 py-4 rounded-xl ${
            isUser ? 'bg-blue-500 text-white shadow-lg' : 
            isSystem ? 'bg-gradient-to-r from-purple-50 to-blue-50 text-gray-800 border-2 border-purple-200' :
            'bg-white text-gray-800 border shadow-lg'
          } flex-1`}>
            <div className="text-sm font-semibold mb-3 flex items-center justify-between">
              <span className="flex items-center">
                {isUser ? 'You' : isSystem ? 'LangGraph Workflow' : 'Enhanced Assistant'}
                <span className="ml-2 text-xs opacity-70 font-normal">{message.timestamp}</span>
              </span>
              
              {message.type === 'assistant' && message.totalSources > 0 && (
                <div className="flex items-center space-x-2">
                  <span className="text-xs bg-green-100 text-green-700 px-2 py-1 rounded-full font-medium">
                    {message.totalSources} sources
                  </span>
                  <span className="text-xs bg-blue-100 text-blue-700 px-2 py-1 rounded-full font-medium">
                    {message.pagesReferenced?.length} pages
                  </span>
                </div>
              )}
            </div>
            
            {/* Workflow steps for system messages */}
            {message.workflowSteps && (
              <div className="mb-4 p-3 bg-white rounded-lg border border-purple-200">
                <h4 className="text-sm font-semibold text-purple-800 mb-2 flex items-center">
                  <Workflow size={14} className="mr-2" />
                  Processing Steps Completed:
                </h4>
                <div className="flex flex-wrap gap-2">
                  {message.workflowSteps.map((step, index) => (
                    <span key={index} className="text-xs bg-purple-100 text-purple-800 px-2 py-1 rounded-full border border-purple-200">
                      {index + 1}. {step}
                    </span>
                  ))}
                </div>
              </div>
            )}
            
            {/* Enhanced content rendering */}
            {message.type === 'assistant' && message.content.includes('**Page ') ? (
              <div className="text-sm">
                {formatStructuredResponse(message.content)}
              </div>
            ) : (
              <div className="text-sm whitespace-pre-wrap leading-relaxed">{message.content}</div>
            )}
            
            {/* Context warning */}
            {message.type === 'assistant' && !message.hasContext && !isSystem && (
              <div className="mt-4 p-3 bg-yellow-50 border-l-4 border-yellow-400 text-xs text-yellow-800">
                <AlertCircle size={14} className="inline mr-2" />
                No relevant content found in your document for this query. Response based on general knowledge.
              </div>
            )}
            
            {/* Page reference footer */}
            {message.pagesReferenced && message.pagesReferenced.length > 0 && (
              <div className="mt-4 pt-3 border-t border-gray-200">
                <div className="text-xs text-gray-600 font-medium flex items-center">
                  <BookOpen size={12} className="mr-2" />
                  Referenced Pages: 
                  <div className="ml-2 flex space-x-1">
                    {message.pagesReferenced.map((page, index) => (
                      <span key={index} className="bg-blue-100 text-blue-800 px-2 py-1 rounded font-semibold">
                        {page}
                      </span>
                    ))}
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 to-blue-50 flex flex-col">
      {/* Enhanced Header */}
      <header className="bg-white shadow-lg border-b-2 border-blue-100">
        <div className="max-w-7xl mx-auto px-6 py-5">
          <h1 className="text-3xl font-bold bg-gradient-to-r from-blue-600 to-green-600 bg-clip-text text-transparent flex items-center">
            <Workflow className="mr-3 text-blue-500" size={28} />
            PDF Assistant
          </h1>
          <p className="text-gray-600 text-sm mt-2 flex items-center">
            <Filter size={16} className="mr-2 text-green-500" />
            Advanced PDF processing with intelligent text filtering, semantic chunking, and structured key-point extraction
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-7xl mx-auto w-full px-6 py-8">
        {/* Enhanced Upload Section */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-blue-100 p-6 mb-8">
          <h2 className="text-xl font-bold mb-4 flex items-center text-gray-800">
            <FileText className="mr-2 text-blue-500" />
            PDF Processing Pipeline
          </h2>
          
          <div className="flex items-center space-x-4 mb-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              disabled={isProcessing}
              className="flex items-center px-6 py-3 bg-gradient-to-r from-blue-500 to-blue-600 text-white rounded-lg hover:from-blue-600 hover:to-blue-700 transition-all duration-200 shadow-md disabled:opacity-50 disabled:cursor-not-allowed"
            >
              <Upload size={18} className="mr-2" />
              {isProcessing ? 'Processing...' : 'Upload PDF'}
            </button>
            
            {uploadedFile && (
              <div className="flex items-center text-sm text-gray-700 bg-green-50 px-3 py-2 rounded-lg border border-green-200">
                <CheckCircle size={16} className="mr-2 text-green-500" />
                {uploadedFile.name}
              </div>
            )}
          </div>
          
          {uploadStatus && (
            <div className={`p-3 rounded-lg text-sm ${
              uploadStatus.includes('successfully') ? 'bg-green-50 text-green-700 border border-green-200' : 
              uploadStatus.includes('Error') ? 'bg-red-50 text-red-700 border border-red-200' : 
              'bg-blue-50 text-blue-700 border border-blue-200'
            }`}>
              {uploadStatus}
            </div>
          )}

          {/* Processing indicator */}
          {isProcessing && (
            <div className="mt-4 p-4 bg-blue-50 rounded-lg border border-blue-200">
              <div className="flex items-center mb-3">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-blue-600 mr-3"></div>
                <span className="text-sm font-medium text-blue-800">Running LangGraph Workflow...</span>
              </div>
              <div className="space-y-2">
                {['Text Extraction', 'Content Filtering', 'Semantic Chunking', 'Embedding Generation', 'Vector Storage'].map((step, index) => (
                  <div key={index} className="flex items-center text-xs text-blue-700">
                    <div className="w-2 h-2 bg-blue-400 rounded-full mr-2"></div>
                    {step}
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

        {/* Enhanced Features Section */}
        

        {/* Chat Section */}
        <div className="bg-white rounded-xl shadow-lg border-2 border-gray-100 flex flex-col" style={{height: '600px'}}>
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-6">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-12">
                <Bot size={64} className="mx-auto mb-6 text-gray-300" />

                </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <MessageBubble key={index} message={message} />
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="flex max-w-5xl w-full">
                      <div className="flex-shrink-0 mr-3">
                        <div className="w-10 h-10 rounded-full flex items-center justify-center bg-green-500 shadow-md">
                          <Bot size={18} className="text-white" />
                        </div>
                      </div>
                      <div className="px-5 py-4 rounded-xl bg-white border shadow-lg">
                        <div className="text-sm font-semibold mb-3 text-gray-600">
                          Processing through LangGraph workflow...
                        </div>
                        <div className="flex space-x-2">
                          <div className="w-3 h-3 bg-green-400 rounded-full animate-bounce"></div>
                          <div className="w-3 h-3 bg-blue-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-3 h-3 bg-purple-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Enhanced Input Section */}
          <div className="border-t-2 border-gray-100 p-6 bg-gradient-to-r from-gray-50 to-blue-50">
            <div className="flex space-x-3 mb-3">
              <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={uploadedFile ? "Ask specific questions for focused, structured answers..." : "Upload a PDF first to enable intelligent querying"}
                className="flex-1 px-4 py-3 border-2 border-gray-200 rounded-xl focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white shadow-sm transition-all duration-200"
                disabled={isLoading}
              />
              <button
                onClick={handleQuestionSubmit}
                disabled={isLoading || !currentQuestion.trim()}
                className="px-6 py-3 bg-gradient-to-r from-green-500 to-green-600 text-white rounded-xl hover:from-green-600 hover:to-green-700 disabled:from-gray-300 disabled:to-gray-400 disabled:cursor-not-allowed transition-all duration-200 flex items-center shadow-md"
              >
                <Send size={16} className="mr-2" />
                Ask
              </button>
            </div>
            <div className="text-xs text-gray-500 flex items-center">
              <Bot size={12} className="mr-2" />
              Get 3-4 key points per page with clean text formatting
            </div>
          </div>
        </div>
      </div>

    </div>
  );
};

export default EnhancedAssistant;