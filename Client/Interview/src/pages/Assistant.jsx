import React, { useState, useRef } from 'react';
import { Upload, Send, FileText, Bot, User, AlertCircle, CheckCircle } from 'lucide-react';

const Assistant = () => {
  const [messages, setMessages] = useState([]);
  const [currentQuestion, setCurrentQuestion] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [uploadedFile, setUploadedFile] = useState(null);
  const [uploadStatus, setUploadStatus] = useState('');
  const fileInputRef = useRef(null);
  const messagesEndRef = useRef(null);

  // Simulate backend API calls (replace with actual API endpoints)
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
    setUploadStatus('Processing PDF...');
    
    try {
      const formData = new FormData();
      formData.append('pdf', file);

      // Simulate API call
      const response = await fetch(`${API_BASE}/upload-pdf`, {
        method: 'POST',
        body: formData,
      });

      if (response.ok) {
        setUploadStatus('PDF processed successfully!');
        setMessages([{
          type: 'system',
          content: `PDF "${file.name}" has been uploaded and processed. You can now ask questions about its content.`,
          timestamp: new Date().toLocaleTimeString()
        }]);
      } else {
        throw new Error('Upload failed');
      }
    } catch (error) {
      setUploadStatus('Error processing PDF. Please try again.');
      console.error('Upload error:', error);
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
      // Simulate API call to RAG system
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
        sources: data.sources || [],
        timestamp: new Date().toLocaleTimeString()
      };

      setMessages(prev => [...prev, assistantMessage]);
    } catch (error) {
      const errorMessage = {
        type: 'assistant',
        content: 'Sorry, I encountered an error while processing your question. Please try again.',
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

  const MessageBubble = ({ message }) => {
    const isUser = message.type === 'user';
    const isSystem = message.type === 'system';

    return (
      <div className={`flex ${isUser ? 'justify-end' : 'justify-start'} mb-4`}>
        <div className={`flex max-w-3xl ${isUser ? 'flex-row-reverse' : 'flex-row'}`}>
          <div className={`flex-shrink-0 ${isUser ? 'ml-3' : 'mr-3'}`}>
            <div className={`w-8 h-8 rounded-full flex items-center justify-center ${
              isUser ? 'bg-blue-500' : isSystem ? 'bg-gray-500' : 'bg-green-500'
            }`}>
              {isUser ? <User size={16} className="text-white" /> : 
               isSystem ? <AlertCircle size={16} className="text-white" /> :
               <Bot size={16} className="text-white" />}
            </div>
          </div>
          <div className={`px-4 py-2 rounded-lg ${
            isUser ? 'bg-blue-500 text-white' : 
            isSystem ? 'bg-gray-100 text-gray-800 border' :
            'bg-white text-gray-800 border shadow-sm'
          }`}>
            <div className="text-sm font-medium mb-1">
              {isUser ? 'You' : isSystem ? 'System' : 'Assistant'}
              <span className="ml-2 text-xs opacity-70">{message.timestamp}</span>
            </div>
            <div className="text-sm whitespace-pre-wrap">{message.content}</div>
            
            {message.type === 'assistant' && !message.hasContext && !isSystem && (
              <div className="mt-2 p-2 bg-yellow-50 border border-yellow-200 rounded text-xs text-yellow-800">
                <AlertCircle size={12} className="inline mr-1" />
                The provided context is not in the knowledge base you have provided. This answer is based on my general knowledge.
              </div>
            )}
            
            {message.sources && message.sources.length > 0 && (
              <div className="mt-2 pt-2 border-t border-gray-200">
                <div className="text-xs text-gray-600 mb-1">Sources from PDF:</div>
                {message.sources.map((source, idx) => (
                  <div key={idx} className="text-xs bg-gray-50 p-1 rounded mb-1">
                    Page {source.page}: "{source.snippet}..."
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="max-w-4xl mx-auto px-4 py-4">
          <h1 className="text-2xl font-bold text-gray-900 flex items-center">
            <Bot className="mr-2 text-blue-500" />
            RAG PDF Assistant
          </h1>
          <p className="text-gray-600 text-sm mt-1">
            Upload a PDF and ask questions about its content
          </p>
        </div>
      </header>

      {/* Main Content */}
      <div className="flex-1 max-w-4xl mx-auto w-full px-4 py-6">
        {/* File Upload Section */}
        <div className="bg-white rounded-lg shadow-sm border p-6 mb-6">
          <h2 className="text-lg font-semibold mb-4 flex items-center">
            <FileText className="mr-2" />
            PDF Upload
          </h2>
          
          <div className="flex items-center space-x-4">
            <input
              type="file"
              accept=".pdf"
              onChange={handleFileUpload}
              ref={fileInputRef}
              className="hidden"
            />
            
            <button
              onClick={() => fileInputRef.current?.click()}
              className="flex items-center px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 transition-colors"
            >
              <Upload size={16} className="mr-2" />
              Choose PDF File
            </button>
            
            {uploadedFile && (
              <div className="flex items-center text-sm text-gray-600">
                <CheckCircle size={16} className="mr-1 text-green-500" />
                {uploadedFile.name}
              </div>
            )}
          </div>
          
          {uploadStatus && (
            <div className={`mt-3 text-sm ${
              uploadStatus.includes('successfully') ? 'text-green-600' : 
              uploadStatus.includes('Error') ? 'text-red-600' : 'text-blue-600'
            }`}>
              {uploadStatus}
            </div>
          )}
        </div>

        {/* Chat Section */}
        <div className="bg-white rounded-lg shadow-sm border flex flex-col h-96">
          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4">
            {messages.length === 0 ? (
              <div className="text-center text-gray-500 py-8">
                <Bot size={48} className="mx-auto mb-4 text-gray-300" />
                <p>Upload a PDF file and start asking questions!</p>
              </div>
            ) : (
              <>
                {messages.map((message, index) => (
                  <MessageBubble key={index} message={message} />
                ))}
                {isLoading && (
                  <div className="flex justify-start mb-4">
                    <div className="flex max-w-3xl">
                      <div className="flex-shrink-0 mr-3">
                        <div className="w-8 h-8 rounded-full flex items-center justify-center bg-green-500">
                          <Bot size={16} className="text-white" />
                        </div>
                      </div>
                      <div className="px-4 py-2 rounded-lg bg-white border shadow-sm">
                        <div className="flex space-x-1">
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce"></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.1s'}}></div>
                          <div className="w-2 h-2 bg-gray-400 rounded-full animate-bounce" style={{animationDelay: '0.2s'}}></div>
                        </div>
                      </div>
                    </div>
                  </div>
                )}
                <div ref={messagesEndRef} />
              </>
            )}
          </div>

          {/* Input Section */}
          <div className="border-t p-4">
            <div className="flex space-x-2">
              <input
                type="text"
                value={currentQuestion}
                onChange={(e) => setCurrentQuestion(e.target.value)}
                onKeyPress={handleKeyPress}
                placeholder={uploadedFile ? "Ask a question about your PDF..." : "Upload a PDF first to ask questions"}
                className="flex-1 px-3 py-2 border rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500"
                disabled={isLoading}
              />
              <button
                onClick={handleQuestionSubmit}
                disabled={isLoading || !currentQuestion.trim()}
                className="px-4 py-2 bg-blue-500 text-white rounded-lg hover:bg-blue-600 disabled:bg-gray-300 disabled:cursor-not-allowed transition-colors"
              >
                <Send size={16} />
              </button>
            </div>
          </div>
        </div>
      </div>

      {/* Footer */}
      <footer className="bg-white border-t py-4">
        <div className="max-w-4xl mx-auto px-4 text-center text-sm text-gray-500">
          RAG System powered by Sentence Transformers, ChromaDB, and Grok LLM
        </div>
      </footer>
    </div>
  );
};

export default Assistant;