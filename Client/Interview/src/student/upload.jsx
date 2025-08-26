import React, { useState, useCallback } from 'react';
import { useDropzone } from 'react-dropzone';
import { Upload, FileText, Youtube, Music, Settings, PlayCircle } from 'lucide-react';

const Quiz = () => {
  const [sourceType, setSourceType] = useState('pdf');
  const [file, setFile] = useState(null);
  const [youtubeUrl, setYoutubeUrl] = useState('');
  const [questions, setQuestions] = useState([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [difficulty, setDifficulty] = useState('medium');
  const [numQuestions, setNumQuestions] = useState(5);
  const [showAnswers, setShowAnswers] = useState({});

  // Handle file drop for PDF and Audio
  const onDrop = useCallback((acceptedFiles) => {
    if (acceptedFiles.length > 0) {
      const acceptedFile = acceptedFiles[0];
      const fileType = acceptedFile.type;
      const fileName = acceptedFile.name.toLowerCase();
      
      if (sourceType === 'pdf' && fileType === 'application/pdf') {
        setFile(acceptedFile);
        setError(null);
      } else if (sourceType === 'audio' && (fileType.startsWith('audio/') || fileName.endsWith('.wav') || fileName.endsWith('.mp3'))) {
        setFile(acceptedFile);
        setError(null);
      } else {
        const expectedType = sourceType === 'pdf' ? 'PDF documents' : 'audio files (WAV or MP3)';
        setError(`Only ${expectedType} are allowed for ${sourceType} source!`);
      }
    }
  }, [sourceType]);

  const getAcceptedFileTypes = () => {
    if (sourceType === 'pdf') {
      return { 'application/pdf': ['.pdf'] };
    } else if (sourceType === 'audio') {
      return { 
        'audio/*': ['.wav', '.mp3'],
        'audio/wav': ['.wav'],
        'audio/mpeg': ['.mp3']
      };
    }
    return {};
  };

  const { getRootProps, getInputProps, isDragActive } = useDropzone({
    onDrop,
    accept: getAcceptedFileTypes(),
    multiple: false,
    disabled: sourceType === 'youtube'
  });

  // Reset file when source type changes
  const handleSourceTypeChange = (newSourceType) => {
    setSourceType(newSourceType);
    setFile(null);
    setYoutubeUrl('');
    setError(null);
    setQuestions([]);
  };

  // Validate inputs based on source type
  const validateInputs = () => {
    if (sourceType === 'pdf' || sourceType === 'audio') {
      if (!file) {
        setError(`Please upload a ${sourceType === 'pdf' ? 'PDF' : 'audio'} file first!`);
        return false;
      }
    } else if (sourceType === 'youtube') {
      if (!youtubeUrl.trim()) {
        setError('Please enter a YouTube URL!');
        return false;
      }
      // Basic YouTube URL validation
      const youtubeRegex = /^(https?:\/\/)?(www\.)?(youtube\.com|youtu\.be)\/.+/;
      if (!youtubeRegex.test(youtubeUrl)) {
        setError('Please enter a valid YouTube URL!');
        return false;
      }
    }
    return true;
  };

  // Fetch questions from API
  const fetchQuestions = async () => {
    if (!validateInputs()) return;

    setLoading(true);
    setError(null);

    const formData = new FormData();
    formData.append('source_type', sourceType);
    formData.append('difficulty', difficulty);
    formData.append('num_questions', numQuestions);

    if (sourceType === 'pdf' || sourceType === 'audio') {
      formData.append('file', file);
    } else if (sourceType === 'youtube') {
      formData.append('youtube_url', youtubeUrl);
    }

    try {
      const response = await fetch('http://localhost:5000/api/generate-quiz', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || `Server error: ${response.statusText}`);
      }

      if (data.quiz && Array.isArray(data.quiz)) {
        setQuestions(data.quiz);
        setShowAnswers(data.quiz.reduce((acc, _, index) => ({ ...acc, [index]: false }), {}));
        // Clear inputs after successful submission
        setFile(null);
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

  const getSourceIcon = (type) => {
    switch (type) {
      case 'pdf': return <FileText className="w-5 h-5" />;
      case 'youtube': return <Youtube className="w-5 h-5" />;
      case 'audio': return <Music className="w-5 h-5" />;
      default: return <Upload className="w-5 h-5" />;
    }
  };

  const getDropzoneContent = () => {
    if (sourceType === 'pdf') {
      return {
        icon: <FileText className="w-8 h-8 mb-2 text-indigo-500" />,
        activeText: "Drop the PDF file here...",
        inactiveText: "Drag & drop a PDF document here, or click to select one"
      };
    } else if (sourceType === 'audio') {
      return {
        icon: <Music className="w-8 h-8 mb-2 text-indigo-500" />,
        activeText: "Drop the audio file here...",
        inactiveText: "Drag & drop an audio file (WAV or MP3) here, or click to select one"
      };
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
        <div className="bg-gradient-to-r from-indigo-500 to-purple-600 py-6 px-8">
          <h1 className="text-3xl font-bold text-white text-center">Multi-Source Quiz Generator</h1>
          <p className="text-indigo-100 text-center mt-2">Generate quizzes from PDFs, YouTube videos, or audio files</p>
        </div>

        <div className="p-8">
          {/* Source Type Selection */}
          <div className="mb-8">
            <h3 className="text-lg font-semibold text-gray-800 mb-4 flex items-center">
              <Settings className="w-5 h-5 mr-2" />
              Choose Your Content Source
            </h3>
            <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
              {[
                { key: 'pdf', label: 'PDF Document', icon: FileText, desc: 'Upload PDF files' },
                { key: 'youtube', label: 'YouTube Video', icon: Youtube, desc: 'Enter YouTube URL' },
                { key: 'audio', label: 'Audio File', icon: Music, desc: 'Upload WAV/MP3 files' }
              ].map(({ key, label, icon: Icon, desc }) => (
                <button
                  key={key}
                  onClick={() => handleSourceTypeChange(key)}
                  className={`p-4 rounded-lg border-2 transition-all duration-200 ${
                    sourceType === key
                      ? 'border-indigo-500 bg-indigo-50 text-indigo-700'
                      : 'border-gray-200 hover:border-indigo-300 hover:bg-gray-50'
                  }`}
                >
                  <div className="flex flex-col items-center text-center">
                    <Icon className="w-6 h-6 mb-2" />
                    <span className="font-medium">{label}</span>
                    <span className="text-xs text-gray-500 mt-1">{desc}</span>
                  </div>
                </button>
              ))}
            </div>
          </div>

          {/* File Upload Section (PDF & Audio) */}
          {(sourceType === 'pdf' || sourceType === 'audio') && (
            <div
              {...getRootProps()}
              className={`border-2 border-dashed rounded-lg p-8 mb-6 text-center cursor-pointer transition-all ${
                isDragActive ? 'border-blue-500 bg-blue-50' : 'border-gray-300 hover:border-blue-400 hover:bg-blue-50'
              }`}
            >
              <input {...getInputProps()} />
              <div className="flex flex-col items-center">
                {getDropzoneContent().icon}
                {isDragActive ? (
                  <p className="text-blue-500 font-medium">{getDropzoneContent().activeText}</p>
                ) : (
                  <p className="text-gray-500">{getDropzoneContent().inactiveText}</p>
                )}
              </div>
            </div>
          )}

          {/* YouTube URL Input */}
          {sourceType === 'youtube' && (
            <div className="mb-6">
              <label className="block text-gray-700 font-medium mb-2 flex items-center">
                <Youtube className="w-5 h-5 mr-2 text-red-500" />
                YouTube URL
              </label>
              <div className="relative">
                <input
                  type="url"
                  value={youtubeUrl}
                  onChange={(e) => setYoutubeUrl(e.target.value)}
                  placeholder="https://www.youtube.com/watch?v=... or https://youtu.be/..."
                  className="w-full px-4 py-3 pl-12 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                />
                <PlayCircle className="absolute left-3 top-3.5 w-5 h-5 text-gray-400" />
              </div>
              {youtubeUrl && (
                <div className="mt-2 p-2 bg-green-50 border border-green-200 rounded text-sm text-green-700">
                  ✓ YouTube URL entered
                </div>
              )}
            </div>
          )}

          {/* File Selected Indicator */}
          {file && (sourceType === 'pdf' || sourceType === 'audio') && (
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
              <span className="text-green-700">
                Selected {sourceType === 'pdf' ? 'PDF' : 'Audio'} File: {file.name}
              </span>
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
                max="20"
                onChange={(e) => setNumQuestions(parseInt(e.target.value) || 5)}
                placeholder="Enter number of questions"
                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
              />
            </div>
          </div>

          {/* Generate Button */}
          <button
            onClick={fetchQuestions}
            disabled={loading}
            className={`w-full py-3 px-6 text-white font-medium rounded-lg shadow-md transition-all duration-300 flex items-center justify-center ${
              loading
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:-translate-y-1'
            }`}
          >
            {loading ? (
              <>
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
                Processing {sourceType === 'pdf' ? 'PDF' : sourceType === 'youtube' ? 'YouTube Video' : 'Audio'}...
              </>
            ) : (
              <>
                {getSourceIcon(sourceType)}
                <span className="ml-2">Generate Quiz from {sourceType.toUpperCase()}</span>
              </>
            )}
          </button>

          {/* Error Message */}
          {error && (
            <div className="mt-6 p-4 bg-red-100 border-l-4 border-red-500 text-red-700 rounded">
              <div className="flex">
                <div className="flex-shrink-0">
                  <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                    <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                  </svg>
                </div>
                <div className="ml-3">
                  <p className="text-sm">{error}</p>
                </div>
              </div>
            </div>
          )}

          {/* Questions Display */}
          {questions.length > 0 && (
            <div className="mt-8 space-y-6">
              <div className="flex items-center justify-between">
                <h2 className="text-2xl font-bold text-gray-800">Generated Questions</h2>
                <div className="flex items-center text-sm text-gray-600">
                  {getSourceIcon(sourceType)}
                  <span className="ml-2">Source: {sourceType.toUpperCase()}</span>
                </div>
              </div>
              {questions.map((question, index) => (
                <div key={index} className="p-6 bg-gray-50 rounded-lg shadow-sm border border-gray-200">
                  <div className="flex items-start justify-between mb-4">
                    <h3 className="text-lg font-semibold text-gray-800 flex-1 pr-4">
                      <span className="text-indigo-600 mr-2">Q{index + 1}.</span>
                      {question.question}
                    </h3>
                  </div>
                  <ul className="space-y-2 mb-4">
                    {question.options.map((option, optIndex) => (
                      <li key={optIndex} className="text-sm text-gray-700 p-2 bg-white rounded border">
                        {option}
                      </li>
                    ))}
                  </ul>
                  <button
                    onClick={() => toggleAnswer(index)}
                    className="bg-gradient-to-r from-green-500 to-emerald-600 text-white px-4 py-2 rounded-lg hover:from-green-600 hover:to-emerald-700 text-sm font-medium transition-all duration-200 transform hover:-translate-y-0.5"
                  >
                    {showAnswers[index] ? 'Hide Answer' : 'Show Answer'}
                  </button>
                  {showAnswers[index] && (
                    <div className="mt-4 p-4 bg-gradient-to-r from-green-50 to-emerald-50 rounded-lg border border-green-200">
                      <p className="text-sm font-medium text-green-800 mb-2">
                        <strong>Correct Answer:</strong> {question.correct_answer}
                      </p>
                      <p className="text-sm text-gray-700">
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