import React, { useState } from 'react';
import { Upload, FileText, Target, TrendingUp, AlertCircle, CheckCircle, X, Sparkles, Zap, Award, Brain } from 'lucide-react';

const ATSResumeScorer = () => {
  const [file, setFile] = useState(null);
  const [jobDescription, setJobDescription] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      const allowedTypes = ['application/pdf', 'application/msword', 'application/vnd.openxmlformats-officedocument.wordprocessingml.document', 'text/plain'];
      if (allowedTypes.includes(selectedFile.type) || selectedFile.name.toLowerCase().endsWith('.pdf') || selectedFile.name.toLowerCase().endsWith('.doc') || selectedFile.name.toLowerCase().endsWith('.docx') || selectedFile.name.toLowerCase().endsWith('.txt')) {
        setFile(selectedFile);
        setError('');
      } else {
        setError('Please upload a PDF, DOC, DOCX, or TXT file');
        setFile(null);
      }
    }
  };

  const handleSubmit = async () => {
    if (!file) {
      setError('Please upload a resume file');
      return;
    }
    
    if (!jobDescription.trim()) {
      setError('Please enter a job description');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    const formData = new FormData();
    formData.append('resume', file);
    formData.append('job_description', jobDescription);

    try {
      const response = await fetch('http://localhost:5000/ats/analyze-resume', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error('Failed to analyze resume');
      }

      const data = await response.json();
      
      if (data.error) {
        setError(data.error);
      } else {
        setResults(data);
      }
    } catch (err) {
      setError(`Error: ${err.message}. Make sure the backend is running on http://localhost:5000 and the ATS route /ats/analyze-resume is reachable.`);
    } finally {
      setLoading(false);
    }
  };

  const getScoreColor = (score) => {
    if (score >= 80) return 'text-emerald-600';
    if (score >= 60) return 'text-amber-600';
    return 'text-red-500';
  };

  const getScoreBgColor = (score) => {
    if (score >= 80) return 'bg-gradient-to-br from-emerald-50 to-teal-50 border-emerald-200';
    if (score >= 60) return 'bg-gradient-to-br from-amber-50 to-orange-50 border-amber-200';
    return 'bg-gradient-to-br from-red-50 to-pink-50 border-red-200';
  };

  const getScoreGradient = (score) => {
    if (score >= 80) return 'from-emerald-500 to-teal-500';
    if (score >= 60) return 'from-amber-500 to-orange-500';
    return 'from-red-500 to-pink-500';
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-indigo-100">
      {/* Background Pattern */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_1px_1px,_rgb(99_102_241_/_0.15)_1px,_transparent_0)] bg-[size:20px_20px]"></div>
      
      <div className="relative max-w-7xl mx-auto p-6">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-gradient-to-r from-blue-600 to-purple-600 rounded-full mb-6 shadow-lg">
            <Brain className="w-8 h-8 text-white" />
          </div>
          <h1 className="text-5xl font-bold bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 bg-clip-text text-transparent mb-4">
            ATS Resume Scorer
          </h1>
          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
            Transform your resume with AI-powered analysis. Get instant ATS compatibility scores and actionable insights to land your dream job.
          </p>
        </div>

        {/* Main Content */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl border border-white/20 p-8 lg:p-12">
          <div className="grid lg:grid-cols-2 gap-12">
            {/* Left Side - Input */}
            <div className="space-y-8">
              {/* File Upload */}
              <div>
                <label className="block text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Upload className="w-5 h-5 mr-2 text-blue-600" />
                  Upload Your Resume
                </label>
                <div className="relative group">
                  <div className="absolute -inset-1 bg-gradient-to-r from-blue-600 to-purple-600 rounded-2xl blur opacity-25 group-hover:opacity-75 transition duration-1000 group-hover:duration-200"></div>
                  <div className="relative border-2 border-dashed border-blue-300 bg-gradient-to-br from-blue-50/50 to-indigo-50/50 rounded-2xl p-8 text-center hover:border-blue-400 transition-all duration-300 hover:shadow-lg">
                    <div className="bg-gradient-to-r from-blue-500 to-purple-500 w-16 h-16 rounded-full flex items-center justify-center mx-auto mb-4 shadow-lg">
                      <Upload className="h-8 w-8 text-white" />
                    </div>
                    <div className="space-y-2">
                      <label htmlFor="resume-upload" className="cursor-pointer">
                        <span className="text-lg font-semibold bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent hover:from-blue-700 hover:to-purple-700 transition-all">
                          Click to upload
                        </span>
                        <span className="text-gray-500"> or drag and drop</span>
                        <input
                          id="resume-upload"
                          type="file"
                          className="hidden"
                          accept=".pdf,.doc,.docx,.txt"
                          onChange={handleFileChange}
                        />
                      </label>
                      <p className="text-sm text-gray-500">PDF, DOC, DOCX, or TXT files supported</p>
                    </div>
                    {file && (
                      <div className="mt-6 inline-flex items-center space-x-3 bg-green-100 text-green-800 px-4 py-2 rounded-full shadow-sm">
                        <FileText className="h-5 w-5" />
                        <span className="font-medium">{file.name}</span>
                        <CheckCircle className="h-4 w-4 text-green-600" />
                      </div>
                    )}
                  </div>
                </div>
              </div>

              {/* Job Description */}
              <div>
                <label htmlFor="job-description" className="block text-lg font-semibold text-gray-800 mb-4 flex items-center">
                  <Target className="w-5 h-5 mr-2 text-purple-600" />
                  Job Description
                </label>
                <div className="relative">
                  <textarea
                    id="job-description"
                    rows={10}
                    className="w-full border-2 border-gray-200 bg-gradient-to-br from-gray-50 to-white rounded-2xl p-4 focus:ring-4 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 shadow-sm resize-none"
                    placeholder="Paste the complete job description here for accurate analysis..."
                    value={jobDescription}
                    onChange={(e) => setJobDescription(e.target.value)}
                  />
                  <div className="absolute bottom-3 right-3 text-xs text-gray-400 bg-white px-2 py-1 rounded">
                    {jobDescription.length} characters
                  </div>
                </div>
              </div>
            </div>

            {/* Right Side - Action & Preview */}
            <div className="flex flex-col justify-center space-y-8">
              <div className="bg-gradient-to-br from-indigo-50 to-purple-50 rounded-2xl p-8 border border-indigo-100">
                <div className="text-center">
                  <div className="inline-flex items-center justify-center w-12 h-12 bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full mb-4">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-xl font-bold text-gray-800 mb-2">AI-Powered Analysis</h3>
                  <p className="text-gray-600 mb-6 leading-relaxed">
                    Our advanced AI analyzes keyword matching, formatting, and ATS compatibility to give you actionable insights.
                  </p>
                  
                  {/* Error Display */}
                  {error && (
                    <div className="bg-red-50 border-l-4 border-red-400 rounded-r-lg p-4 mb-6 flex items-start space-x-3">
                      <AlertCircle className="h-5 w-5 text-red-500 mt-0.5 flex-shrink-0" />
                      <span className="text-red-700 text-sm">{error}</span>
                    </div>
                  )}

                  {/* Submit Button */}
                  <button
                    type="button"
                    onClick={handleSubmit}
                    disabled={loading}
                    className="w-full bg-gradient-to-r from-blue-600 to-purple-600 text-white py-4 px-6 rounded-2xl hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-500/20 disabled:opacity-50 disabled:cursor-not-allowed transition-all duration-300 shadow-lg hover:shadow-xl transform hover:-translate-y-0.5"
                  >
                    {loading ? (
                      <div className="flex items-center justify-center space-x-3">
                        <div className="animate-spin rounded-full h-6 w-6 border-b-2 border-white"></div>
                        <span className="text-lg font-semibold">Analyzing Magic...</span>
                      </div>
                    ) : (
                      <div className="flex items-center justify-center space-x-3">
                        <Zap className="h-6 w-6" />
                        <span className="text-lg font-semibold">Analyze Resume</span>
                      </div>
                    )}
                  </button>
                </div>
              </div>

              {/* Features Preview */}
              <div className="grid grid-cols-2 gap-4">
                <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-white/40 text-center">
                  <Target className="w-8 h-8 text-blue-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Keyword Matching</p>
                </div>
                <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-white/40 text-center">
                  <Award className="w-8 h-8 text-purple-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">ATS Score</p>
                </div>
                <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-white/40 text-center">
                  <TrendingUp className="w-8 h-8 text-green-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">Improvements</p>
                </div>
                <div className="bg-white/60 backdrop-blur rounded-xl p-4 border border-white/40 text-center">
                  <Sparkles className="w-8 h-8 text-indigo-500 mx-auto mb-2" />
                  <p className="text-sm font-medium text-gray-700">AI Insights</p>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Results */}
        {results && !results.error && (
          <div className="mt-12 space-y-8">
            {/* ATS Score - Hero Section */}
            <div className={`${getScoreBgColor(results.ats_score)} border-2 rounded-3xl p-8 lg:p-12 shadow-2xl`}>
              <div className="text-center lg:flex lg:items-center lg:justify-between lg:text-left">
                <div className="lg:flex-1">
                  <div className="inline-flex items-center space-x-2 bg-white/80 px-4 py-2 rounded-full mb-4">
                    <Award className="w-5 h-5 text-blue-600" />
                    <span className="text-sm font-semibold text-gray-700">ATS COMPATIBILITY SCORE</span>
                  </div>
                  <h2 className="text-4xl lg:text-5xl font-bold text-gray-900 mb-2">Your Resume Scored</h2>
                  <p className="text-xl text-gray-600">Against the job requirements</p>
                </div>
                <div className="mt-8 lg:mt-0 lg:ml-8">
                  <div className="relative inline-flex items-center justify-center">
                    <div className="absolute inset-0 bg-gradient-to-r from-white/50 to-white/30 rounded-full blur-xl"></div>
                    <div className={`relative w-32 h-32 lg:w-40 lg:h-40 rounded-full bg-gradient-to-br ${getScoreGradient(results.ats_score)} shadow-2xl flex items-center justify-center`}>
                      <div className="text-center">
                        <div className="text-4xl lg:text-5xl font-bold text-white">{results.ats_score}</div>
                        <div className="text-lg text-white/90">/100</div>
                      </div>
                    </div>
                  </div>
                </div>
              </div>
            </div>

            {/* Keyword Analysis */}
            {results.keyword_match && (
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-purple-500 rounded-full p-3 mr-4">
                    <Target className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Keyword Analysis</h3>
                </div>
                
                <div className="grid lg:grid-cols-2 gap-8">
                  <div className="bg-gradient-to-br from-green-50 to-emerald-50 rounded-2xl p-6 border border-green-200">
                    <h4 className="font-bold text-green-800 mb-4 flex items-center text-lg">
                      <CheckCircle className="h-5 w-5 mr-2" />
                      Matched Keywords ({results.keyword_match.matched_keywords?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {results.keyword_match.matched_keywords?.map((keyword, index) => (
                        <span key={index} className="bg-green-200 text-green-900 px-3 py-2 rounded-full text-sm font-medium shadow-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                  
                  <div className="bg-gradient-to-br from-red-50 to-pink-50 rounded-2xl p-6 border border-red-200">
                    <h4 className="font-bold text-red-800 mb-4 flex items-center text-lg">
                      <X className="h-5 w-5 mr-2" />
                      Missing Keywords ({results.keyword_match.missing_keywords?.length || 0})
                    </h4>
                    <div className="flex flex-wrap gap-2">
                      {results.keyword_match.missing_keywords?.map((keyword, index) => (
                        <span key={index} className="bg-red-200 text-red-900 px-3 py-2 rounded-full text-sm font-medium shadow-sm">
                          {keyword}
                        </span>
                      ))}
                    </div>
                  </div>
                </div>
                
                <div className="mt-8 bg-gray-50 rounded-2xl p-6">
                  <div className="flex justify-between items-center mb-3">
                    <span className="font-semibold text-gray-700">Overall Match Percentage</span>
                    <span className="text-2xl font-bold text-blue-600">{results.keyword_match.match_percentage || 0}%</span>
                  </div>
                  <div className="w-full bg-gray-200 rounded-full h-3 shadow-inner">
                    <div 
                      className="bg-gradient-to-r from-blue-500 to-purple-500 h-3 rounded-full transition-all duration-1000 shadow-sm"
                      style={{ width: `${results.keyword_match.match_percentage || 0}%` }}
                    ></div>
                  </div>
                </div>
              </div>
            )}

            {/* Section Analysis */}
            {results.sections_analysis && (
              <div className="bg-white/80 backdrop-blur-sm border border-white/20 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-r from-indigo-500 to-purple-500 rounded-full p-3 mr-4">
                    <FileText className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-gray-900">Section Analysis</h3>
                </div>
                <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {Object.entries(results.sections_analysis).map(([section, data]) => (
                    <div key={section} className="bg-gradient-to-br from-gray-50 to-white border-2 border-gray-100 rounded-2xl p-6 hover:shadow-lg transition-all duration-300">
                      <div className="flex justify-between items-center mb-4">
                        <h4 className="font-bold capitalize text-gray-800 text-lg">{section.replace('_', ' ')}</h4>
                        <div className={`w-12 h-12 rounded-full ${getScoreBgColor(data.score * 10)} border-2 flex items-center justify-center`}>
                          <span className={`font-bold text-lg ${getScoreColor(data.score * 10)}`}>
                            {data.score}
                          </span>
                        </div>
                      </div>
                      <p className="text-gray-600 leading-relaxed">{data.feedback}</p>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Strengths and Weaknesses */}
            <div className="grid lg:grid-cols-2 gap-8">
              {results.strengths && (
                <div className="bg-gradient-to-br from-green-50 to-emerald-50 border-2 border-green-200 rounded-3xl p-8 shadow-xl">
                  <h3 className="text-xl font-bold text-green-800 mb-6 flex items-center">
                    <div className="bg-green-500 rounded-full p-2 mr-3">
                      <TrendingUp className="h-5 w-5 text-white" />
                    </div>
                    Strengths
                  </h3>
                  <ul className="space-y-4">
                    {results.strengths.map((strength, index) => (
                      <li key={index} className="bg-white/60 rounded-xl p-4 flex items-start shadow-sm">
                        <CheckCircle className="h-5 w-5 text-green-600 mr-3 mt-1 flex-shrink-0" />
                        <span className="text-green-800 font-medium">{strength}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}

              {results.weaknesses && (
                <div className="bg-gradient-to-br from-red-50 to-pink-50 border-2 border-red-200 rounded-3xl p-8 shadow-xl">
                  <h3 className="text-xl font-bold text-red-800 mb-6 flex items-center">
                    <div className="bg-red-500 rounded-full p-2 mr-3">
                      <AlertCircle className="h-5 w-5 text-white" />
                    </div>
                    Areas for Improvement
                  </h3>
                  <ul className="space-y-4">
                    {results.weaknesses.map((weakness, index) => (
                      <li key={index} className="bg-white/60 rounded-xl p-4 flex items-start shadow-sm">
                        <X className="h-5 w-5 text-red-600 mr-3 mt-1 flex-shrink-0" />
                        <span className="text-red-800 font-medium">{weakness}</span>
                      </li>
                    ))}
                  </ul>
                </div>
              )}
            </div>

            {/* Recommendations */}
            {results.recommendations && (
              <div className="bg-gradient-to-br from-blue-50 to-indigo-50 border-2 border-blue-200 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full p-3 mr-4">
                    <Sparkles className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-blue-800">AI Recommendations</h3>
                </div>
                <div className="grid gap-4">
                  {results.recommendations.map((recommendation, index) => (
                    <div key={index} className="bg-white/80 rounded-2xl p-6 flex items-start shadow-sm hover:shadow-md transition-all duration-300">
                      <div className="bg-gradient-to-r from-blue-500 to-indigo-500 rounded-full w-8 h-8 flex items-center justify-center text-white font-bold text-sm mr-4 flex-shrink-0">
                        {index + 1}
                      </div>
                      <span className="text-blue-800 font-medium leading-relaxed">{recommendation}</span>
                    </div>
                  ))}
                </div>
              </div>
            )}

            {/* Overall Feedback */}
            {results.overall_feedback && (
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 border-2 border-purple-200 rounded-3xl p-8 shadow-xl">
                <div className="flex items-center mb-6">
                  <div className="bg-gradient-to-r from-purple-500 to-indigo-500 rounded-full p-3 mr-4">
                    <Brain className="w-6 h-6 text-white" />
                  </div>
                  <h3 className="text-2xl font-bold text-purple-800">Overall Assessment</h3>
                </div>
                <div className="bg-white/80 rounded-2xl p-6 shadow-sm">
                  <p className="text-purple-800 text-lg leading-relaxed">{results.overall_feedback}</p>
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </div>
  );
};

export default ATSResumeScorer;