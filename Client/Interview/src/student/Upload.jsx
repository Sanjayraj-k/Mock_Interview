// Quiz.jsx
import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';

const Quiz = () => {
  const [file, setFile] = useState(null);
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [showAnswers, setShowAnswers] = useState({});
  const [sourceType, setSourceType] = useState('pdf'); // 'pdf' | 'youtube'
  const [youtubeUrl, setYoutubeUrl] = useState('');

  // Handle file drop
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const acceptedFile = acceptedFiles[0];
      if (acceptedFile.type === 'application/pdf') {
        setFile(acceptedFile);
        setError(null);
      } else {
        setError('Only PDF documents are allowed!');
      }
    }
  }, []);

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: { 'application/pdf': ['.pdf'] },
    multiple: false,
  });

  // Fetch questions from API
  const fetchQuestions = async () => {
    if (sourceType === 'pdf') {
      if (!file) {
        setError('Please upload a PDF file first!');
        return;
      }
    } else if (sourceType === 'youtube') {
      if (!youtubeUrl.trim()) {
        setError('Please enter a YouTube URL!');
        return;
      }
    }

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('difficulty', difficulty);
    formData.append('num_questions', numQuestions);
    formData.append('source_type', sourceType);
    if (sourceType === 'pdf') {
      formData.append('file', file);
    } else if (sourceType === 'youtube') {
      formData.append('youtube_url', youtubeUrl);
    }

    try {
      const response = await fetch('http://localhost:5000/quiz/generate-quiz', {
        method: 'POST',
        body: formData,
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      if (data.quiz && Array.isArray(data.quiz)) {
        setQuestions(data.quiz);
        setShowAnswers(data.quiz.reduce((acc, _, index) => ({ ...acc, [index]: false }), {}));
        setFile(null); // Clear file after successful submission
        setYoutubeUrl('');
      } else {
        throw new Error('Invalid quiz format received from the server.');
      }
    } catch (error) {
      console.error('Error:', error);
      setError(`Error generating quiz: ${error.message}`);
    } finally {
      setLoading(false);
    }
  };

  // Toggle answer visibility
  const toggleAnswer = (index) => {
    setShowAnswers((prev) => ({ ...prev, [index]: !prev[index] }));
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 py-6 px-8">
          <h1 className="text-3xl font-bold text-white text-center">Quiz Generator</h1>
        </div>

        <div className="p-8">
          {/* Source Type Toggle */}
          <div className="flex gap-3 mb-6">
            <button
              className={`px-4 py-2 rounded-full font-medium transition-all ${sourceType === 'pdf' ? 'bg-indigo-600 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => { setSourceType('pdf'); setError(null); }}
            >
              Document (PDF)
            </button>
            <button
              className={`px-4 py-2 rounded-full font-medium transition-all ${sourceType === 'youtube' ? 'bg-red-500 text-white' : 'bg-gray-100 text-gray-700'}`}
              onClick={() => { setSourceType('youtube'); setFile(null); setError(null); }}
            >
              YouTube Video
            </button>
          </div>

          {/* File Upload Section */}
          {sourceType === 'pdf' ? (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                <svg
                  className="w-8 h-6 mb-2 text-indigo-500"
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                  xmlns="http://www.w3.org/2000/svg"
                >
                  <path
                    strokeLinecap="round"
                    strokeLinejoin="round"
                    strokeWidth="2"
                    d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12"
                  />
                </svg>
                {isDragActive ? (
                  <p className="text-blue-500 font-medium">Drop the PDF file here...</p>
                ) : (
                  <p className="text-gray-500">Drag & drop a PDF document here, or click to select one</p>
                )}
              </div>
            </div>
          ) : (
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2">YouTube Video URL:</label>
              <input
                type="text"
                value={youtubeUrl}
                onChange={(e) => setYoutubeUrl(e.target.value)}
                placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=...)"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
              />
            </div>
          )}

          {sourceType === 'pdf' && file && (
            <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
              <svg
                className="w-5 h-5 text-green-500 mr-2"
                fill="currentColor"
                viewBox="0 0 20 20"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  fillRule="evenodd"
                  d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z"
                  clipRule="evenodd"
                />
              </svg>
              <span className="text-green-700">Selected File: {file.name}</span>
            </div>
          )}

          {/* Configuration Inputs */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div>
              <label className="block text-gray-700 font-medium mb-2">Difficulty Level:</label>
              <select
                value={difficulty}
                onChange={(e) => setDifficulty(e.target.value)}
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500 bg-white"
              >
                <option value="easy">Easy</option>
                <option value="medium">Medium</option>
                <option value="hard">Hard</option>
              </select>
            </div>
            <div>
              <label className="block text-gray-700 font-medium mb-2">Number of Questions:</label>
              <input
                type="number"
                value={numQuestions}
                min="1"
                onChange={(e) => setNumQuestions(e.target.value)}
                placeholder="Enter number of questions"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={fetchQuestions}
            disabled={loading}
            className={`w-full py-3 px-6 text-white font-medium rounded-lg shadow-md transition-all duration-300 ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:-translate-y-1'
            }`}
          >
            {loading ? (
              <span className="flex items-center justify-center">
                <svg
                  className="animate-spin -ml-1 mr-3 h-5 w-5 text-white"
                  xmlns="http://www.w3.org/2000/svg"
                  fill="none"
                  viewBox="0 0 24 24"
                >
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path
                    className="opacity-75"
                    fill="currentColor"
                    d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"
                  ></path>
                </svg>
                Generating Quiz...
              </span>
            ) : (
              'Generate Quiz'
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-3 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
              {error}
            </div>
          )}

          {/* Questions Display */}
          {questions.length > 0 && (
            <div className="mt-8 space-y-6">
              <h2 className="text-2xl font-bold text-gray-800">Generated Questions</h2>
              {questions.map((question, index) => (
                <div key={index} className="p-4 bg-gray-50 rounded-lg shadow-sm">
                  <h3 className="text-lg font-semibold mb-2">{question.question}</h3>
                  <ul className="space-y-2 mb-4">
                    {question.options.map((option, optIndex) => (
                      <li key={optIndex} className="text-sm text-gray-700">
                        {option}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => toggleAnswer(index)}
                    className="bg-green-500 text-white px-3 py-1 rounded hover:bg-green-600 text-sm"
                  >
                    {showAnswers[index] ? 'Hide Answer' : 'Show Answer'}
                  </button>
                  {showAnswers[index] && (
                    <div className="mt-4 p-3 bg-green-50 rounded-lg">
                      <p className="text-sm font-medium text-green-700">
                        <strong>Correct Answer:</strong> {question.correct_answer}
                      </p>
                      <p className="text-sm text-gray-700 mt-2">
                        <strong>Explanation:</strong> {question.explanation}
                      </p>
                    </div>
                  )}
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Quiz;