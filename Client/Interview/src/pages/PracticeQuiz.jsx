import React, { useState, useCallback } from "react";
import { useNavigate } from "react-router-dom";
import { useDropzone } from "react-dropzone";
import {
    FileText,
    Youtube,
    Music,
    Check,
    X,
    ChevronRight,
    ChevronLeft,
    RefreshCw,
    Upload,
    BookOpen,
    Layers,
    Clock,
    Award,
    Brain,
    Sparkles,
    Zap,
    Trophy
} from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

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

        setLoading(true);

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
            setLoading(false);
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

    // Quiz UI
    if (quiz && !showResults) {
        const currentQ = quiz[currentQuestion];
        return (
            <div className="h-screen w-full flex overflow-hidden bg-white">
                {/* Left Panel - Progress */}
                <div className="hidden lg:flex lg:w-2/5 relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 items-center justify-center overflow-hidden">
                    {/* Soft gradient overlay */}
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    <div className="relative z-10 text-center px-12">
                        <motion.div
                            initial={{ scale: 0 }}
                            animate={{ scale: 1 }}
                            className="w-20 h-20 mx-auto mb-6 bg-white/20 backdrop-blur-xl rounded-2xl flex items-center justify-center"
                        >
                            <Brain className="w-10 h-10 text-white" />
                        </motion.div>
                        <h2 className="text-4xl font-black text-white mb-4">Question {currentQuestion + 1}</h2>
                        <p className="text-white/70 text-lg mb-8">of {quiz.length} questions</p>

                        {/* Progress Ring */}
                        <div className="relative w-36 h-36 mx-auto">
                            <svg className="w-full h-full transform -rotate-90">
                                <circle cx="72" cy="72" r="64" stroke="rgba(255,255,255,0.2)" strokeWidth="10" fill="none" />
                                <motion.circle
                                    cx="72" cy="72" r="64"
                                    stroke="white"
                                    strokeWidth="10"
                                    fill="none"
                                    strokeLinecap="round"
                                    initial={{ strokeDasharray: "0 402" }}
                                    animate={{ strokeDasharray: `${((currentQuestion + 1) / quiz.length) * 402} 402` }}
                                    transition={{ duration: 0.5 }}
                                />
                            </svg>
                            <div className="absolute inset-0 flex items-center justify-center">
                                <span className="text-4xl font-black text-white">{Math.round(((currentQuestion + 1) / quiz.length) * 100)}%</span>
                            </div>
                        </div>

                        <div className="mt-8 inline-block px-4 py-2 bg-white/20 backdrop-blur-md rounded-full">
                            <span className="text-white font-bold">{difficulty.toUpperCase()} MODE</span>
                        </div>
                    </div>
                </div>

                {/* Right Panel - Quiz */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-6 border-b border-gray-100 lg:hidden">
                        <div className="flex items-center justify-between">
                            <span className="px-4 py-1.5 rounded-full text-sm font-bold text-white bg-gradient-to-r from-violet-600 to-fuchsia-600">
                                {difficulty.toUpperCase()}
                            </span>
                            <span className="text-gray-500 font-medium">Q {currentQuestion + 1}/{quiz.length}</span>
                        </div>
                    </div>

                    <div className="flex-1 p-8 overflow-y-auto">
                        <motion.div
                            key={currentQuestion}
                            initial={{ opacity: 0, x: 20 }}
                            animate={{ opacity: 1, x: 0 }}
                        >
                            <h3 className="text-2xl font-bold text-gray-900 mb-8 leading-relaxed">
                                {currentQ.question}
                            </h3>

                            <div className="space-y-4">
                                {currentQ.options.map((option, index) => (
                                    <motion.label
                                        key={index}
                                        whileHover={{ scale: 1.01 }}
                                        whileTap={{ scale: 0.99 }}
                                        className={`block p-5 rounded-2xl cursor-pointer transition-all duration-300 border-2 ${selectedAnswers[currentQuestion] === option
                                            ? 'border-violet-500 bg-violet-50 shadow-lg shadow-violet-100'
                                            : 'border-gray-100 hover:border-violet-200 hover:bg-gray-50'
                                            }`}
                                    >
                                        <div className="flex items-center">
                                            <div className={`w-6 h-6 rounded-full border-2 mr-4 flex items-center justify-center transition-all ${selectedAnswers[currentQuestion] === option
                                                ? 'border-violet-500 bg-violet-500'
                                                : 'border-gray-300'
                                                }`}>
                                                {selectedAnswers[currentQuestion] === option && (
                                                    <Check className="w-3 h-3 text-white" />
                                                )}
                                            </div>
                                            <input
                                                type="radio"
                                                name={`question-${currentQuestion}`}
                                                value={option}
                                                checked={selectedAnswers[currentQuestion] === option}
                                                onChange={() => handleAnswerSelect(currentQuestion, option)}
                                                className="sr-only"
                                            />
                                            <span className="font-medium text-gray-700">{option}</span>
                                        </div>
                                    </motion.label>
                                ))}
                            </div>
                        </motion.div>
                    </div>

                    <div className="p-6 border-t border-gray-100 flex justify-between bg-white">
                        <button
                            onClick={handlePreviousQuestion}
                            disabled={currentQuestion === 0}
                            className={`flex items-center gap-2 px-6 py-3 rounded-xl font-bold transition-all ${currentQuestion === 0
                                ? 'text-gray-300 cursor-not-allowed'
                                : 'text-gray-600 hover:bg-gray-100'
                                }`}
                        >
                            <ChevronLeft className="w-5 h-5" />
                            Previous
                        </button>

                        {currentQuestion === quiz.length - 1 ? (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleSubmitQuiz}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-bold shadow-lg"
                            >
                                Submit Quiz
                                <Check className="w-5 h-5" />
                            </motion.button>
                        ) : (
                            <motion.button
                                whileHover={{ scale: 1.02 }}
                                whileTap={{ scale: 0.98 }}
                                onClick={handleNextQuestion}
                                className="flex items-center gap-2 px-8 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg"
                            >
                                Next Question
                                <ChevronRight className="w-5 h-5" />
                            </motion.button>
                        )}
                    </div>
                </div>
            </div>
        );
    }

    // Results UI
    if (quiz && showResults) {
        const percentage = Math.round((score / quiz.length) * 100);

        return (
            <div className="h-screen w-full flex overflow-hidden bg-white">
                {/* Left Panel */}
                <div className="hidden lg:flex lg:w-2/5 relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 items-center justify-center overflow-hidden">
                    <div className="absolute inset-0 bg-gradient-to-t from-black/20 to-transparent" />

                    <div className="relative z-10 text-center px-12">
                        <motion.div
                            initial={{ scale: 0, rotate: -180 }}
                            animate={{ scale: 1, rotate: 0 }}
                            transition={{ type: "spring", duration: 1 }}
                            className="w-28 h-28 mx-auto mb-8 bg-white/20 backdrop-blur-xl rounded-full flex items-center justify-center"
                        >
                            {percentage === 100 ? <Trophy className="w-14 h-14 text-yellow-300" /> :
                                percentage >= 70 ? <Award className="w-14 h-14 text-white" /> :
                                    <Brain className="w-14 h-14 text-white" />}
                        </motion.div>
                        <h2 className="text-6xl font-black text-white mb-3">{percentage}%</h2>
                        <p className="text-white/70 text-xl mb-4">{score} of {quiz.length} correct</p>
                        <p className="text-2xl font-bold text-white">
                            {percentage === 100 ? '🎉 Perfect Score!' : percentage >= 70 ? '👏 Great Job!' : '💪 Keep Learning!'}
                        </p>
                    </div>
                </div>

                {/* Right Panel */}
                <div className="flex-1 flex flex-col bg-white">
                    <div className="p-6 border-b border-gray-100">
                        <h2 className="text-2xl font-bold text-gray-900">Quiz Review</h2>
                    </div>

                    <div className="flex-1 p-6 overflow-y-auto space-y-4">
                        {quiz.map((question, index) => (
                            <div key={index} className="p-5 rounded-2xl border border-gray-100 bg-gray-50/50">
                                <div className="flex gap-4">
                                    <div className={`w-8 h-8 rounded-lg flex items-center justify-center text-sm font-bold flex-shrink-0 ${selectedAnswers[index] === question.correct_answer
                                        ? 'bg-emerald-100 text-emerald-700'
                                        : 'bg-red-100 text-red-700'
                                        }`}>
                                        {index + 1}
                                    </div>
                                    <div className="flex-1">
                                        <p className="font-semibold text-gray-800 mb-3">{question.question}</p>
                                        <div className="space-y-2">
                                            {question.options.map((opt, i) => (
                                                <div
                                                    key={i}
                                                    className={`p-3 rounded-xl text-sm font-medium ${opt === question.correct_answer
                                                        ? 'bg-emerald-100 text-emerald-800 border border-emerald-200'
                                                        : opt === selectedAnswers[index]
                                                            ? 'bg-red-100 text-red-800 border border-red-200'
                                                            : 'bg-white text-gray-500 border border-gray-100'
                                                        }`}
                                                >
                                                    {opt}
                                                </div>
                                            ))}
                                        </div>
                                        <div className="mt-3 p-3 bg-violet-50 rounded-xl text-sm text-violet-800">
                                            <strong>💡</strong> {question.explanation}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ))}
                    </div>

                    <div className="p-6 border-t border-gray-100 bg-white">
                        <motion.button
                            whileHover={{ scale: 1.02 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={handleResetQuiz}
                            className="w-full flex items-center justify-center gap-2 px-8 py-4 bg-gradient-to-r from-violet-600 to-fuchsia-600 text-white rounded-xl font-bold shadow-lg"
                        >
                            <RefreshCw className="w-5 h-5" />
                            Generate New Quiz
                        </motion.button>
                    </div>
                </div>
            </div>
        );
    }

    // Upload UI - Clean White Background
    return (
        <div className="h-screen w-full flex overflow-hidden bg-white">
            {/* Left Panel - Decorative Hero */}
            <div className="hidden lg:flex lg:w-1/2 relative bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 items-center justify-center overflow-hidden">
                {/* Soft gradient overlay */}
                <div className="absolute inset-0 bg-gradient-to-t from-black/10 to-transparent" />

                {/* Floating Icons */}
                <div className="absolute inset-0 overflow-hidden pointer-events-none">
                    <motion.div
                        animate={{ y: [0, -20, 0] }}
                        transition={{ duration: 4, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[15%] left-[15%]"
                    >
                        <div className="w-14 h-14 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                            <FileText className="w-7 h-7 text-white/70" />
                        </div>
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, 15, 0] }}
                        transition={{ duration: 5, repeat: Infinity, delay: 1, ease: "easeInOut" }}
                        className="absolute top-[25%] right-[20%]"
                    >
                        <div className="w-12 h-12 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                            <Youtube className="w-6 h-6 text-red-300" />
                        </div>
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, -15, 0], x: [0, 10, 0] }}
                        transition={{ duration: 6, repeat: Infinity, delay: 0.5, ease: "easeInOut" }}
                        className="absolute bottom-[30%] left-[20%]"
                    >
                        <div className="w-16 h-16 bg-white/10 backdrop-blur-md rounded-2xl flex items-center justify-center border border-white/20 shadow-lg">
                            <Brain className="w-8 h-8 text-violet-200" />
                        </div>
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, 20, 0] }}
                        transition={{ duration: 4.5, repeat: Infinity, delay: 2, ease: "easeInOut" }}
                        className="absolute bottom-[20%] right-[15%]"
                    >
                        <div className="w-10 h-10 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                            <Music className="w-5 h-5 text-emerald-300" />
                        </div>
                    </motion.div>
                    <motion.div
                        animate={{ scale: [1, 1.1, 1], rotate: [0, 5, 0] }}
                        transition={{ duration: 3, repeat: Infinity, ease: "easeInOut" }}
                        className="absolute top-[50%] left-[10%]"
                    >
                        <div className="w-8 h-8 bg-yellow-400/20 backdrop-blur-md rounded-lg flex items-center justify-center shadow-lg">
                            <Sparkles className="w-4 h-4 text-yellow-300" />
                        </div>
                    </motion.div>
                    <motion.div
                        animate={{ y: [0, -10, 0], rotate: [0, -5, 0] }}
                        transition={{ duration: 5, repeat: Infinity, delay: 1.5, ease: "easeInOut" }}
                        className="absolute top-[60%] right-[25%]"
                    >
                        <div className="w-11 h-11 bg-white/10 backdrop-blur-md rounded-xl flex items-center justify-center border border-white/20 shadow-lg">
                            <BookOpen className="w-6 h-6 text-cyan-200" />
                        </div>
                    </motion.div>
                </div>

                {/* Hero Content */}
                <div className="relative z-10 text-center px-12">
                    <motion.div
                        initial={{ opacity: 0, y: 30 }}
                        animate={{ opacity: 1, y: 0 }}
                        transition={{ delay: 0.2 }}
                    >
                        <div className="inline-flex items-center gap-2 px-5 py-2.5 bg-white/20 backdrop-blur-md rounded-full mb-8">
                            <Zap className="w-4 h-4 text-yellow-300 fill-yellow-300" />
                            <span className="text-white text-sm font-semibold">AI-Powered Learning</span>
                        </div>

                        <h1 className="text-5xl lg:text-6xl font-black text-white mb-6 leading-tight">
                            Transform
                            <span className="block text-transparent bg-clip-text bg-gradient-to-r from-pink-200 via-purple-200 to-cyan-200">
                                Any Content
                            </span>
                            Into a Quiz
                        </h1>

                        <p className="text-white/80 text-lg max-w-md mx-auto leading-relaxed">
                            Upload PDFs, paste YouTube links, or add audio files. Our AI generates personalized quizzes instantly.
                        </p>

                        {/* Stats */}
                        <div className="flex justify-center gap-10 mt-12">
                            <div className="text-center">
                                <div className="text-3xl font-black text-white">10K+</div>
                                <div className="text-white/60 text-sm mt-1">Quizzes Created</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-black text-white">50K+</div>
                                <div className="text-white/60 text-sm mt-1">Questions</div>
                            </div>
                            <div className="text-center">
                                <div className="text-3xl font-black text-white">98%</div>
                                <div className="text-white/60 text-sm mt-1">Accuracy</div>
                            </div>
                        </div>
                    </motion.div>
                </div>
            </div>

            {/* Right Panel - Form */}
            <div className="flex-1 bg-white flex flex-col overflow-hidden">
                <div className="flex-1 flex items-center justify-center p-6 lg:p-10">
                    <motion.div
                        initial={{ opacity: 0, x: 30 }}
                        animate={{ opacity: 1, x: 0 }}
                        className="w-full max-w-lg"
                    >
                        <div className="mb-8">
                            <h2 className="text-3xl font-black text-gray-900 mb-2">Create Your Quiz</h2>
                            <p className="text-gray-500">Select your content source and customize settings</p>
                        </div>

                        {/* Content Type Tabs */}
                        <div className="flex gap-2 p-1.5 bg-gray-100 rounded-2xl mb-6">
                            {[
                                { type: 'pdf', icon: FileText, label: 'Document', color: 'from-blue-500 to-cyan-500' },
                                { type: 'youtube', icon: Youtube, label: 'YouTube', color: 'from-red-500 to-pink-500' },
                                { type: 'audio', icon: Music, label: 'Audio', color: 'from-emerald-500 to-teal-500' }
                            ].map(tab => (
                                <button
                                    key={tab.type}
                                    onClick={() => handleContentTypeChange(tab.type)}
                                    className={`flex-1 flex items-center justify-center gap-2 py-3 rounded-xl font-semibold transition-all ${contentType === tab.type
                                        ? `bg-gradient-to-r ${tab.color} text-white shadow-lg`
                                        : 'text-gray-500 hover:text-gray-700 hover:bg-white'
                                        }`}
                                >
                                    <tab.icon className="w-4 h-4" />
                                    <span className="text-sm">{tab.label}</span>
                                </button>
                            ))}
                        </div>

                        {/* Upload Area */}
                        <AnimatePresence mode="wait">
                            <motion.div
                                key={contentType}
                                initial={{ opacity: 0, y: 10 }}
                                animate={{ opacity: 1, y: 0 }}
                                exit={{ opacity: 0, y: -10 }}
                                className="mb-6"
                            >
                                {contentType === "youtube" ? (
                                    <div className="relative">
                                        <Youtube className="absolute left-4 top-1/2 -translate-y-1/2 w-5 h-5 text-gray-400" />
                                        <input
                                            type="text"
                                            value={youtubeUrl}
                                            onChange={(e) => setYoutubeUrl(e.target.value)}
                                            placeholder="Paste YouTube URL here..."
                                            className="w-full pl-12 pr-4 py-4 bg-gray-50 border-2 border-gray-200 rounded-2xl focus:outline-none focus:border-red-500 focus:bg-white font-medium text-gray-800 placeholder-gray-400 transition-all"
                                        />
                                    </div>
                                ) : (
                                    <div
                                        {...getRootProps()}
                                        className={`border-2 border-dashed rounded-2xl p-8 text-center cursor-pointer transition-all ${isDragActive
                                            ? 'border-violet-500 bg-violet-50'
                                            : 'border-gray-200 hover:border-violet-300 hover:bg-gray-50'
                                            }`}
                                    >
                                        <input {...getInputProps()} />
                                        <div className={`w-16 h-16 mx-auto mb-4 rounded-2xl flex items-center justify-center ${isDragActive ? 'bg-violet-500' : 'bg-gradient-to-r from-violet-500 to-fuchsia-500'
                                            }`}>
                                            {contentType === "pdf" ? <FileText className="w-8 h-8 text-white" /> : <Music className="w-8 h-8 text-white" />}
                                        </div>
                                        <p className="font-bold text-gray-800 mb-1">
                                            {isDragActive ? "Drop it here!" : "Drag & drop or click to upload"}
                                        </p>
                                        <p className="text-gray-400 text-sm">
                                            {contentType === "pdf" ? "PDF files only" : "MP3, WAV, OGG files"}
                                        </p>
                                    </div>
                                )}
                            </motion.div>
                        </AnimatePresence>

                        {/* File Selected */}
                        {file && (
                            <motion.div
                                initial={{ opacity: 0, height: 0 }}
                                animate={{ opacity: 1, height: 'auto' }}
                                className="flex items-center gap-3 p-3 bg-emerald-50 border border-emerald-200 rounded-xl mb-6"
                            >
                                <Check className="w-5 h-5 text-emerald-600" />
                                <span className="text-sm font-medium text-emerald-800 flex-1 truncate">{file.name}</span>
                                <button onClick={() => setFile(null)} className="p-1 hover:bg-emerald-100 rounded-lg">
                                    <X className="w-4 h-4 text-emerald-600" />
                                </button>
                            </motion.div>
                        )}

                        {/* Settings Grid */}
                        <div className="grid grid-cols-2 gap-4 mb-6">
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Difficulty</label>
                                <select
                                    value={difficulty}
                                    onChange={(e) => setDifficulty(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white font-semibold text-gray-700 transition-all"
                                >
                                    <option value="easy">Easy</option>
                                    <option value="medium">Medium</option>
                                    <option value="hard">Hard</option>
                                </select>
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Questions</label>
                                <input
                                    type="number"
                                    value={numQuestions}
                                    min="1"
                                    onChange={(e) => setNumQuestions(e.target.value)}
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white font-semibold text-gray-700 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Class Name</label>
                                <input
                                    type="text"
                                    value={className}
                                    onChange={(e) => setClassName(e.target.value)}
                                    placeholder="e.g. AIML B"
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white font-semibold text-gray-700 placeholder-gray-400 transition-all"
                                />
                            </div>
                            <div>
                                <label className="block text-xs font-bold text-gray-500 uppercase tracking-wide mb-2">Year</label>
                                <input
                                    type="number"
                                    value={year}
                                    onChange={(e) => setYear(e.target.value)}
                                    placeholder="e.g. 2025"
                                    className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-violet-500 focus:bg-white font-semibold text-gray-700 placeholder-gray-400 transition-all"
                                />
                            </div>
                        </div>

                        {/* Submit Button */}
                        <motion.button
                            whileHover={{ scale: 1.02, y: -2 }}
                            whileTap={{ scale: 0.98 }}
                            onClick={submitForm}
                            disabled={loading}
                            className={`w-full py-4 rounded-2xl font-bold text-white text-lg shadow-xl transition-all ${loading
                                ? 'bg-gray-400 cursor-not-allowed'
                                : 'bg-gradient-to-r from-violet-600 via-fuchsia-600 to-pink-600 hover:shadow-violet-500/30'
                                }`}
                        >
                            {loading ? (
                                <span className="flex items-center justify-center gap-3">
                                    <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                                    Generating Quiz...
                                </span>
                            ) : (
                                <span className="flex items-center justify-center gap-2">
                                    <Sparkles className="w-5 h-5" />
                                    Generate Quiz
                                </span>
                            )}
                        </motion.button>
                    </motion.div>
                </div>
            </div>
        </div>
    );
};

export default UploadPage;