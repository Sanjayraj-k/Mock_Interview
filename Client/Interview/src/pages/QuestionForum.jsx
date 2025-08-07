import React, { useState, useEffect } from 'react';
import { Upload, FileText, Plus, Calendar, Building, Users, Eye, Loader2, X, CheckCircle, AlertCircle, Download, Sparkles } from 'lucide-react';
import axios from 'axios';

const QuestionContribute = () => {
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showContributeForm, setShowContributeForm] = useState(false);
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    company: '',
    round: '',
    questionType: 'text',
    textContent: '',
    pdfFile: null
  });
  const [submitting, setSubmitting] = useState(false);
  const [notification, setNotification] = useState(null);

  // Fetch questions from backend
  const fetchQuestions = async () => {
    try {
      setLoading(true);
      setError(null);
      
      const response = await axios.get('http://localhost:5001/api/questions');
      
      if (response.data.success) {
        setQuestions(response.data.data);
      } else {
        setError('Failed to fetch questions');
      }
    } catch (err) {
      console.error('Error fetching questions:', err);
      setError('Failed to load questions. Please try again later.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchQuestions();
  }, []);

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    if (file && file.type === 'application/pdf') {
      setFormData(prev => ({
        ...prev,
        pdfFile: file
      }));
    } else {
      showNotification('Please select a valid PDF file', 'error');
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    
    if (!formData.name || !formData.email || !formData.company || !formData.round) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(formData.email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    if (formData.questionType === 'text' && !formData.textContent) {
      showNotification('Please enter the question text', 'error');
      return;
    }

    if (formData.questionType === 'pdf' && !formData.pdfFile) {
      showNotification('Please select a PDF file', 'error');
      return;
    }

    try {
      setSubmitting(true);

      if (formData.questionType === 'text') {
        // Submit text question
        const response = await axios.post('http://localhost:5001/api/questions/text', {
          name: formData.name,
          email: formData.email,
          company: formData.company,
          round: formData.round,
          content: formData.textContent
        });

        if (response.data.success) {
          // Refresh questions list
          await fetchQuestions();
          showNotification('Question contributed successfully! 🎉');
        } else {
          showNotification(response.data.message || 'Failed to submit question', 'error');
        }
      } else {
        // Submit PDF question
        const formDataToSend = new FormData();
        formDataToSend.append('name', formData.name);
        formDataToSend.append('email', formData.email);
        formDataToSend.append('company', formData.company);
        formDataToSend.append('round', formData.round);
        formDataToSend.append('pdfFile', formData.pdfFile);

        const response = await axios.post('http://localhost:5001/api/questions/pdf', formDataToSend, {
          headers: {
            'Content-Type': 'multipart/form-data'
          }
        });

        if (response.data.success) {
          // Refresh questions list
          await fetchQuestions();
          showNotification('Question contributed successfully! 🎉');
        } else {
          showNotification(response.data.message || 'Failed to submit question', 'error');
        }
      }

      // Reset form
      setFormData({
        name: '',
        email: '',
        company: '',
        round: '',
        questionType: 'text',
        textContent: '',
        pdfFile: null
      });
      
      setShowContributeForm(false);
    } catch (error) {
      console.error('Error submitting question:', error);
      showNotification(error.response?.data?.message || 'Failed to submit question. Please try again.', 'error');
    } finally {
      setSubmitting(false);
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric'
    });
  };

  const incrementViews = async (questionId) => {
    try {
      const response = await axios.patch(`http://localhost:5001/api/questions/${questionId}/views`);
      if (response.data.success) {
        // Update the question in the local state
        setQuestions(prev => prev.map(q => 
          q._id === questionId ? { ...q, views: response.data.data.views } : q
        ));
      }
    } catch (error) {
      console.error('Error updating views:', error);
    }
  };

  const handleDownloadPDF = async (questionId, fileName) => {
    try {
      const response = await axios.get(`http://localhost:5001/api/questions/${questionId}/download`, {
        responseType: 'blob'
      });
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.download = fileName;
      document.body.appendChild(link);
      link.click();
      document.body.removeChild(link);
      window.URL.revokeObjectURL(url);
      
      showNotification(`Downloading ${fileName}...`, 'success');
    } catch (error) {
      console.error('Error downloading PDF:', error);
      showNotification('Failed to download PDF. Please try again.', 'error');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Animated background elements */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-r from-blue-400/20 to-purple-400/20 rounded-full blur-3xl animate-pulse"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-r from-purple-400/20 to-pink-400/20 rounded-full blur-3xl animate-pulse delay-1000"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-blue-300/10 to-purple-300/10 rounded-full blur-3xl animate-pulse delay-500"></div>
      </div>

      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl backdrop-blur-sm border transform transition-all duration-500 ease-out ${
          notification.type === 'success' 
            ? 'bg-green-50/90 border-green-200 text-green-800' 
            : 'bg-red-50/90 border-red-200 text-red-800'
        } animate-in slide-in-from-right-full`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <AlertCircle className="text-red-600" size={20} />
            )}
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8 transform hover:scale-[1.01] transition-all duration-500">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                    Question Bank
                  </h1>
                </div>
                <p className="text-gray-600 ml-14">Contribute and explore interview questions from top companies</p>
              </div>
              <button
                onClick={() => setShowContributeForm(true)}
                className="group bg-gradient-to-r from-blue-600 to-purple-600 text-white px-8 py-4 rounded-2xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-2xl transform hover:scale-105 flex items-center gap-3 relative overflow-hidden"
              >
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent opacity-0 group-hover:opacity-100 transition-opacity duration-300"></div>
                <Plus size={20} className="group-hover:rotate-90 transition-transform duration-300" />
                <span className="relative z-10">Contribute Question</span>
              </button>
            </div>
          </div>

          {/* Contribute Form Modal */}
          {showContributeForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto transform animate-in zoom-in-95 duration-300">
                <div className="flex justify-between items-center mb-8">
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                      <Plus className="text-white" size={20} />
                    </div>
                    <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      Contribute New Question
                    </h2>
                  </div>
                  <button
                    onClick={() => setShowContributeForm(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  >
                    <X size={24} />
                  </button>
                </div>
                
                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Full Name *
                      </label>
                      <input
                        type="text"
                        name="name"
                        value={formData.name}
                        onChange={handleInputChange}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                        placeholder="Enter your full name"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Email Address *
                      </label>
                      <input
                        type="email"
                        name="email"
                        value={formData.email}
                        onChange={handleInputChange}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                        placeholder="Enter your email address"
                        required
                      />
                    </div>
                  </div>

                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        name="company"
                        value={formData.company}
                        onChange={handleInputChange}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                        placeholder="e.g., Google, Microsoft, Amazon"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Interview Round *
                      </label>
                      <input
                        type="text"
                        name="round"
                        value={formData.round}
                        onChange={handleInputChange}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                        placeholder="e.g., Technical Round 1, System Design"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Question Type
                    </label>
                    <select
                      name="questionType"
                      value={formData.questionType}
                      onChange={handleInputChange}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm"
                    >
                      <option value="text">Text Question</option>
                      <option value="pdf">PDF Upload</option>
                    </select>
                  </div>

                  {formData.questionType === 'text' ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Question Content *
                      </label>
                      <textarea
                        name="textContent"
                        value={formData.textContent}
                        onChange={handleInputChange}
                        rows={4}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 bg-white/50 backdrop-blur-sm resize-none"
                        placeholder="Enter the interview question here..."
                        required={formData.questionType === 'text'}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Upload PDF *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-all duration-300 bg-gradient-to-br from-blue-50/50 to-purple-50/50">
                        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={handleFileChange}
                          className="hidden"
                          id="pdf-upload"
                          required={formData.questionType === 'pdf'}
                        />
                        <label
                          htmlFor="pdf-upload"
                          className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-lg"
                        >
                          Click to upload PDF
                        </label>
                        <p className="text-gray-500 text-sm mt-2">Maximum file size: 10MB</p>
                        {formData.pdfFile && (
                          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-green-800 font-medium">
                              ✓ {formData.pdfFile.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowContributeForm(false)}
                      className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200 transform hover:scale-105"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      onClick={handleSubmit}
                      disabled={submitting}
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-300 disabled:opacity-50 disabled:cursor-not-allowed flex items-center justify-center gap-3 transform hover:scale-105 disabled:hover:scale-100 shadow-lg hover:shadow-xl"
                    >
                      {submitting ? (
                        <>
                          <Loader2 className="animate-spin" size={20} />
                          Submitting...
                        </>
                      ) : (
                        <>
                          <Plus size={20} />
                          Submit Question
                        </>
                      )}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Loading State */}
          {loading && (
            <div className="flex items-center justify-center py-20">
              <div className="flex flex-col items-center gap-4">
                <div className="relative">
                  <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
                  <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
                </div>
                <p className="text-gray-600 font-medium">Loading questions...</p>
              </div>
            </div>
          )}

          {/* Error State */}
          {error && !loading && (
            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 rounded-2xl p-8 mb-8 transform animate-in slide-in-from-bottom duration-500">
              <div className="flex items-center gap-4">
                <div className="p-2 bg-red-100 rounded-xl">
                  <AlertCircle className="text-red-600" size={24} />
                </div>
                <div>
                  <p className="text-red-800 font-semibold text-lg">Error loading questions</p>
                  <p className="text-red-600">{error}</p>
                  <button 
                    onClick={fetchQuestions}
                    className="mt-3 text-red-600 hover:text-red-800 underline font-medium"
                  >
                    Try again
                  </button>
                </div>
              </div>
            </div>
          )}

          {/* Questions List */}
          {!loading && !error && (
            <div className="space-y-8">
              <div className="flex items-center justify-between">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  Recent Questions
                </h2>
                <div className="px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20 text-gray-600 font-medium">
                  {questions.length} questions available
                </div>
              </div>

              <div className="grid gap-6">
                {questions.map((question, index) => (
                  <div
                    key={question._id}
                    className="group bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 border border-white/20 transform hover:scale-[1.02] animate-in slide-in-from-bottom duration-700"
                    style={{ animationDelay: `${index * 100}ms` }}
                  >
                    <div className="flex flex-col lg:flex-row lg:items-start gap-6">
                      <div className="flex-1 space-y-4">
                        <div className="flex flex-wrap items-center gap-3">
                          <span className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm">
                            <Building size={16} />
                            {question.company}
                          </span>
                          <span className="bg-gradient-to-r from-green-100 to-green-50 text-green-800 px-4 py-2 rounded-full text-sm font-semibold shadow-sm">
                            {question.round}
                          </span>
                          <span className="bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2 shadow-sm">
                            <FileText size={16} />
                            {question.type.toUpperCase()}
                          </span>
                        </div>

                        <div>
                          {question.type === 'pdf' ? (
                            <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
                              <div className="p-3 bg-red-100 rounded-xl">
                                <FileText className="text-red-600" size={28} />
                              </div>
                              <div>
                                <p className="font-semibold text-gray-800 text-lg">{question.content}</p>
                                <p className="text-gray-600">File: {question.fileName}</p>
                              </div>
                            </div>
                          ) : (
                            <p className="text-gray-700 leading-relaxed text-lg font-medium">{question.content}</p>
                          )}
                        </div>

                        <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                          <div className="flex items-center gap-2">
                            <Users size={16} />
                            <span className="font-medium">By {question.name}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Calendar size={16} />
                            <span>{formatDate(question.createdAt)}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <Eye size={16} />
                            <span className="font-medium">{question.views} views</span>
                          </div>
                        </div>
                      </div>

                      <div className="flex gap-3">
                        <button
                          onClick={() => incrementViews(question._id)}
                          className="px-6 py-3 bg-gradient-to-r from-blue-50 to-blue-100 text-blue-700 rounded-xl hover:from-blue-100 hover:to-blue-200 transition-all duration-300 font-semibold shadow-sm hover:shadow-md transform hover:scale-105 flex items-center gap-2"
                        >
                          <Eye size={18} />
                          View Details
                        </button>
                        {question.type === 'pdf' && (
                          <button 
                            onClick={() => handleDownloadPDF(question._id, question.fileName)}
                            className="px-6 py-3 bg-gradient-to-r from-green-50 to-green-100 text-green-700 rounded-xl hover:from-green-100 hover:to-green-200 transition-all duration-300 font-semibold shadow-sm hover:shadow-md transform hover:scale-105 flex items-center gap-2"
                          >
                            <Download size={18} />
                            Download
                          </button>
                        )}
                      </div>
                    </div>
                  </div>
                ))}

                {questions.length === 0 && (
                  <div className="text-center py-20 animate-in fade-in duration-1000">
                    <div className="relative mb-8">
                      <div className="p-6 bg-gradient-to-r from-blue-100 to-purple-100 rounded-full w-32 h-32 mx-auto flex items-center justify-center">
                        <FileText className="text-gray-400" size={64} />
                      </div>
                      <div className="absolute -top-2 -right-2 p-2 bg-gradient-to-r from-yellow-400 to-orange-400 rounded-full animate-bounce">
                        <Sparkles className="text-white" size={20} />
                      </div>
                    </div>
                    <h3 className="text-2xl font-bold text-gray-600 mb-3">No questions yet</h3>
                    <p className="text-gray-500 text-lg">Be the first to contribute a question and help the community!</p>
                  </div>
                )}
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default QuestionContribute;