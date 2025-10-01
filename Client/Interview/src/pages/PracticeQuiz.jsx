import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";

const UploadPage = () => {
    const [file, setFile] = useState(null);
    const [youtubeUrl, setYoutubeUrl] = useState("");
    const [contentType, setContentType] = useState("pdf");
    const [difficulty, setDifficulty] = useState("medium");
    const [numQuestions, setNumQuestions] = useState(3);
    const [className, setClassName] = useState("");
    const [year, setYear] = useState("");
    const [loading, setLoading] = useState(false);
    const [quiz, setQuiz] = useState(null);
    const [currentQuestion, setCurrentQuestion] = useState(0);
    const [selectedAnswers, setSelectedAnswers] = useState({});
    const [showResults, setShowResults] = useState(false);
    const [score, setScore] = useState(0);

    const navigate = useNavigate();

    const onDrop = useCallback((acceptedFiles) => {
        if (acceptedFiles.length > 0) {
            const acceptedFile = acceptedFiles[0];
            if (acceptedFile.type === "application/pdf" || acceptedFile.type.startsWith("audio/")) {
                setFile(acceptedFile);
                setContentType(acceptedFile.type === "application/pdf" ? "pdf" : "audio");
            } else {
                alert("Only PDF documents and audio files are allowed!");
            }
        }
    }, []);

    const { getRootProps, getInputProps, isDragActive } = useDropzone({
        onDrop,
        accept: {
            'application/pdf': ['.pdf'],
            'audio/*': ['.mp3', '.wav', '.ogg', '.m4a']
        },
        multiple: false,
    });

    const submitForm = async () => {
        if (contentType === "youtube" && !youtubeUrl.trim()) {
            alert("Please enter a YouTube URL!");
            return;
        } else if (contentType !== "youtube" && !file) {
            alert("Please upload a document or audio file first!");
            return;
        }
        
        if (!className.trim()) {
            alert("Please enter the class name!");
            return;
        }
        
        if (!year || isNaN(year) || year.length !== 4) {
            alert("Please enter a valid 4-digit year!");
            return;
        }

        setLoading(true); // Start loading state

        const formData = new FormData();
        if (contentType === "youtube") {
            formData.append("youtube_url", youtubeUrl);
            formData.append("content_type", "youtube");
        } else {
            formData.append("file", file);
            formData.append("content_type", contentType);
        }
        
        formData.append("difficulty", difficulty);
        formData.append("num_questions", numQuestions);
        formData.append("class_name", className);
        formData.append("year_level", year);

        try {
            const response = await fetch("http://localhost:5000/practicequiz/api/generate-quiz", {
                method: "POST",
                body: formData,
            });

            if (!response.ok) {
                throw new Error(`Server error: ${response.statusText}`);
            }

            const data = await response.json();

            if (data.quiz && Array.isArray(data.quiz)) {
                setQuiz(data.quiz);
                setCurrentQuestion(0);
                setSelectedAnswers({});
                setShowResults(false);
                setScore(0);
            } else {
                throw new Error("Invalid quiz format received from the server.");
            }
        } catch (error) {
            console.error("Error:", error);
            alert(`Error generating quiz: ${error.message}`);
        } finally {
            setLoading(false); // Stop loading state
        }
    };

    const handleContentTypeChange = (type) => {
        setContentType(type);
        setFile(null);
        setYoutubeUrl("");
    };

    const handleAnswerSelect = (questionIndex, answer) => {
        setSelectedAnswers(prev => ({
            ...prev,
            [questionIndex]: answer
        }));
    };

    const handleNextQuestion = () => {
        if (currentQuestion < quiz.length - 1) {
            setCurrentQuestion(currentQuestion + 1);
        }
    };

    const handlePreviousQuestion = () => {
        if (currentQuestion > 0) {
            setCurrentQuestion(currentQuestion - 1);
        }
    };

    const handleSubmitQuiz = () => {
        let correctAnswers = 0;
        quiz.forEach((question, index) => {
            if (selectedAnswers[index] === question.correct_answer) {
                correctAnswers++;
            }
        });
        setScore(correctAnswers);
        setShowResults(true);
    };

    const handleResetQuiz = () => {
        setQuiz(null);
        setCurrentQuestion(0);
        setSelectedAnswers({});
        setShowResults(false);
        setScore(0);
    };

    // If quiz is generated, show quiz interface
    if (quiz && !showResults) {
        const currentQ = quiz[currentQuestion];
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-6 px-8">
                        <h2 className="text-3xl font-bold text-white text-center">
                            Practice Quiz - Question {currentQuestion + 1} of {quiz.length}
                        </h2>
                    </div>
                    
                    <div className="p-8">
                        <div className="mb-6">
                            <div className="w-full bg-gray-200 rounded-full h-2 mb-4">
                                <div 
                                    className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                                    style={{ width: `${((currentQuestion + 1) / quiz.length) * 100}%` }}
                                ></div>
                            </div>
                        </div>

                        <div className="mb-8">
                            <h3 className="text-xl font-semibold text-gray-800 mb-6">
                                {currentQ.question}
                            </h3>
                            
                            <div className="space-y-3">
                                {currentQ.options.map((option, index) => (
                                    <label 
                                        key={index}
                                        className={`block p-4 border-2 rounded-lg cursor-pointer transition-all ${
                                            selectedAnswers[currentQuestion] === option
                                                ? 'border-indigo-500 bg-indigo-50'
                                                : 'border-gray-200 hover:border-gray-300'
                                        }`}
                                    >
                                        <input
                                            type="radio"
                                            name={`question-${currentQuestion}`}
                                            value={option}
                                            checked={selectedAnswers[currentQuestion] === option}
                                            onChange={() => handleAnswerSelect(currentQuestion, option)}
                                            className="sr-only"
                                        />
                                        <span className="text-gray-700">{option}</span>
                                    </label>
                                ))}
                            </div>
                        </div>

                        <div className="flex justify-between">
                            <button
                                onClick={handlePreviousQuestion}
                                disabled={currentQuestion === 0}
                                className={`px-6 py-2 rounded-lg font-medium transition-all ${
                                    currentQuestion === 0
                                        ? 'bg-gray-300 text-gray-500 cursor-not-allowed'
                                        : 'bg-gray-500 text-white hover:bg-gray-600'
                                }`}
                            >
                                Previous
                            </button>
                            
                            {currentQuestion === quiz.length - 1 ? (
                                <button
                                    onClick={handleSubmitQuiz}
                                    className="px-6 py-2 bg-gradient-to-r from-green-500 to-blue-500 text-white rounded-lg font-medium hover:from-green-600 hover:to-blue-600 transition-all"
                                >
                                    Submit Quiz
                                </button>
                            ) : (
                                <button
                                    onClick={handleNextQuestion}
                                    className="px-6 py-2 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                                >
                                    Next
                                </button>
                            )}
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // If results are shown, display score and explanations
    if (quiz && showResults) {
        return (
            <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
                <div className="max-w-4xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                    <div className="bg-gradient-to-r from-green-500 via-blue-500 to-purple-500 py-6 px-8">
                        <h2 className="text-3xl font-bold text-white text-center">
                            Quiz Results
                        </h2>
                    </div>
                    
                    <div className="p-8">
                        <div className="text-center mb-8">
                            <div className="text-6xl font-bold text-gray-800 mb-2">
                                {score}/{quiz.length}
                            </div>
                            <div className="text-xl text-gray-600 mb-4">
                                {Math.round((score / quiz.length) * 100)}% Correct
                            </div>
                            <div className={`text-lg font-semibold ${
                                score === quiz.length ? 'text-green-600' : 
                                score >= quiz.length * 0.7 ? 'text-blue-600' : 'text-red-600'
                            }`}>
                                {score === quiz.length ? 'Perfect! 🎉' : 
                                 score >= quiz.length * 0.7 ? 'Good Job! 👍' : 'Keep Practicing! 💪'}
                            </div>
                        </div>

                        <div className="space-y-6 mb-8">
                            {quiz.map((question, index) => (
                                <div key={index} className="border border-gray-200 rounded-lg p-6">
                                    <h3 className="text-lg font-semibold text-gray-800 mb-4">
                                        Question {index + 1}: {question.question}
                                    </h3>
                                    
                                    <div className="space-y-2 mb-4">
                                        {question.options.map((option, optIndex) => (
                                            <div 
                                                key={optIndex}
                                                className={`p-3 rounded-lg ${
                                                    option === question.correct_answer
                                                        ? 'bg-green-100 border-2 border-green-500'
                                                        : option === selectedAnswers[index] && option !== question.correct_answer
                                                        ? 'bg-red-100 border-2 border-red-500'
                                                        : 'bg-gray-50 border border-gray-200'
                                                }`}
                                            >
                                                <span className={`font-medium ${
                                                    option === question.correct_answer
                                                        ? 'text-green-800'
                                                        : option === selectedAnswers[index] && option !== question.correct_answer
                                                        ? 'text-red-800'
                                                        : 'text-gray-700'
                                                }`}>
                                                    {option}
                                                    {option === question.correct_answer && ' ✓'}
                                                    {option === selectedAnswers[index] && option !== question.correct_answer && ' ✗'}
                                                </span>
                                            </div>
                                        ))}
                                    </div>
                                    
                                    <div className="bg-blue-50 border-l-4 border-blue-400 p-4">
                                        <p className="text-blue-800">
                                            <strong>Explanation:</strong> {question.explanation}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="flex justify-center space-x-4">
                            <button
                                onClick={handleResetQuiz}
                                className="px-8 py-3 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-lg font-medium hover:from-indigo-600 hover:to-purple-600 transition-all"
                            >
                                Generate New Quiz
                            </button>
                        </div>
                    </div>
                </div>
            </div>
        );
    }

    // Default upload form
    return (
        <div className="min-h-screen bg-gradient-to-br from-purple-100 to-blue-100 py-12 px-4 sm:px-6 lg:px-8">
            <div className="max-w-2xl mx-auto bg-white rounded-2xl shadow-xl overflow-hidden">
                <div className="bg-gradient-to-r from-indigo-500 via-purple-500 to-pink-500 py-6 px-8">
                    <h2 className="text-3xl font-bold text-white text-center" id="text">
                        Upload Content to Generate a Quiz
                    </h2>
                </div>
                
                <div className="p-8">
                    <div className="flex flex-wrap gap-2 mb-6">
                        <button 
                            className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                                contentType === "pdf" 
                                    ? "bg-indigo-600 text-white shadow-md" 
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                            onClick={() => handleContentTypeChange("pdf")}
                        >
                            Document
                        </button>
                        <button 
                            className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                                contentType === "youtube" 
                                    ? "bg-red-500 text-white shadow-md" 
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                            onClick={() => handleContentTypeChange("youtube")}
                        >
                            YouTube Video
                        </button>
                        <button 
                            className={`px-4 py-2 rounded-full font-medium transition-all duration-200 ${
                                contentType === "audio" 
                                    ? "bg-green-500 text-white shadow-md" 
                                    : "bg-gray-100 text-gray-700 hover:bg-gray-200"
                            }`}
                            onClick={() => handleContentTypeChange("audio")}
                        >
                            Audio File
                        </button>
                    </div>

                    {contentType === "youtube" ? (
                        <div className="mb-6">
                            <label className="block text-gray-700 font-medium mb-2">YouTube Video URL:</label>
                            <input
                                type="text"
                                value={youtubeUrl}
                                onChange={(e) => setYoutubeUrl(e.target.value)}
                                placeholder="Enter YouTube URL (e.g., https://www.youtube.com/watch?v=..."
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-red-500"
                            />
                        </div>
                    ) : (
                        <>
                            <div 
                                {...getRootProps()} 
                                className={`border-2 border-dashed rounded-lg p-8 mb-4 text-center cursor-pointer transition-all ${
                                    isDragActive 
                                        ? "border-blue-500 bg-blue-50" 
                                        : "border-gray-300 hover:border-blue-400 hover:bg-blue-50"
                                }`}
                            >
                                <input {...getInputProps()} />
                                <div className="flex flex-col items-center">
                                <svg 
    className={`w-8 h-6 mb-2 ${contentType === "pdf" ? "text-indigo-500" : "text-green-500"}`} 
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
                                        <p className="text-blue-500 font-medium">Drop the file here...</p>
                                    ) : (
                                        <p className="text-gray-500">
                                            {contentType === "pdf" 
                                                ? "Drag & drop a PDF document here, or click to select one" 
                                                : "Drag & drop an audio file here, or click to select one"}
                                        </p>
                                    )}
                                </div>
                            </div>
                            {file && (
                                <div className="mb-6 p-3 bg-green-50 border border-green-200 rounded-lg flex items-center">
                                    <svg className="w-5 h-5 text-green-500 mr-2" fill="currentColor" viewBox="0 0 20 20" xmlns="http://www.w3.org/2000/svg">
                                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                                    </svg>
                                    <span className="text-green-700">
                                        Selected File: {file.name} ({contentType === "pdf" ? "PDF Document" : "Audio File"})
                                    </span>
                                </div>
                            )}
                        </>
                    )}

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

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Enter Class Name:</label>
                            <input
                                type="text"
                                value={className}
                                onChange={(e) => setClassName(e.target.value)}
                                placeholder="Enter class name (e.g., AIML B)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>

                        <div>
                            <label className="block text-gray-700 font-medium mb-2">Enter Year:</label>
                            <input
                                type="number"
                                value={year}
                                onChange={(e) => setYear(e.target.value)}
                                placeholder="Enter year (e.g., 2025)"
                                className="w-full px-4 py-2 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-purple-500"
                            />
                        </div>
                    </div>

                    <button 
                        onClick={submitForm} 
                        disabled={loading}
                        className={`w-full py-3 px-6 text-white font-medium rounded-lg shadow-md transition-all duration-300 ${
                            loading 
                                ? "bg-gray-400 cursor-not-allowed" 
                                : "bg-gradient-to-r from-blue-500 to-purple-600 hover:from-blue-600 hover:to-purple-700 transform hover:-translate-y-1"
                        }`}
                    >
                        {loading ? (
                            <span className="flex items-center justify-center bg-blue">
                                <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-black" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                </svg>
                                Generating Quiz...
                            </span>
                        ) : (
                            "Generate Quiz"
                        )}
                    </button>
                </div>
            </div>
        </div>
    );
};

export default UploadPage;