import { useState, useEffect, useRef } from 'react';
import { 
  Camera, 
  Monitor, 
  Volume2, 
  Mic, 
  MicOff, 
  Play, 
  CheckCircle, 
  Flag,
  AlertCircle,
  AlertTriangle,
  X,
  Clock,
  Zap,
  Shield
} from 'lucide-react';

// ====================================================================
//  WebCam Proctoring Component
// ====================================================================

const WebCam = () => {
  const [isActive, setIsActive] = useState(false);
  const [proctorData, setProctorData] = useState({
    face_detected: false,
    looking_at_screen: false,
    warnings: 0,
    max_warnings: 3,
    violation_detected: false,
    look_direction: 'Unknown',
    eyes_closed: false,
    blink_duration: 0,
    long_blink_count: 0,
    head_pose: [0, 0, 0],
    ear: 0,
  });
  const [error, setError] = useState(null);
  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const streamRef = useRef(null);
  const intervalRef = useRef(null);
  const apiUrl = 'http://localhost:4000';

  const startProctoring = async () => {
    try {
      setError(null);
      
      const startResponse = await fetch(`${apiUrl}/start-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!startResponse.ok) {
        throw new Error(`Failed to start exam session: ${startResponse.statusText}`);
      }
      
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false,
      });
      streamRef.current = stream;

      if (videoRef.current) {
        videoRef.current.srcObject = stream;
      }
      
      startFrameProcessing();
      setIsActive(true);
    } catch (err) {
      const errorMessage = `Proctoring failed to start: ${err.message}. Check camera permissions and ensure the proctoring server is running.`;
      setError(errorMessage);
      console.error('Error in startProctoring:', err);
      stopProctoring();
    }
  };

  const stopProctoring = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
      intervalRef.current = null;
    }

    if (streamRef.current) {
      streamRef.current.getTracks().forEach(track => track.stop());
      streamRef.current = null;
    }

    setIsActive(false);
  };

  const startFrameProcessing = () => {
    if (intervalRef.current) {
      clearInterval(intervalRef.current);
    }

    intervalRef.current = setInterval(() => {
      if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
        const canvas = canvasRef.current;
        const context = canvas.getContext('2d');
        
        canvas.width = videoRef.current.videoWidth;
        canvas.height = videoRef.current.videoHeight;
        
        context.drawImage(videoRef.current, 0, 0, canvas.width, canvas.height);
        
        const imageData = canvas.toDataURL('image/jpeg', 0.7);
        
        sendFrameToServer(imageData);
      }
    }, 500);
  };

  const sendFrameToServer = async (imageData) => {
    try {
      const response = await fetch(`${apiUrl}/process-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData.split(',')[1] }),
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      setProctorData(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Error processing frame:', err);
    }
  };

  useEffect(() => {
    startProctoring();
    return () => {
      stopProctoring();
    };
  }, []);

  const getStatusIcon = () => {
    if (proctorData.violation_detected) {
      return <AlertCircle size={20} className="text-red-400" />;
    }
    if (!proctorData.face_detected) {
      return <AlertTriangle size={20} className="text-amber-400" />;
    }
    if (proctorData.looking_at_screen) {
      return <CheckCircle size={20} className="text-emerald-400" />;
    }
    return <AlertTriangle size={20} className="text-amber-400" />;
  };

  const getStatusColorClass = () => {
    if (proctorData.violation_detected) return "text-red-400";
    if (!proctorData.face_detected) return "text-amber-400";
    if (proctorData.looking_at_screen) return "text-emerald-400";
    return "text-amber-400";
  };
  
  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent">
            Proctoring Monitor
          </h2>
          <div className="flex items-center gap-2">
            <Shield className="w-5 h-5 text-indigo-600" />
            <span className="text-sm font-medium text-gray-600">AI Protected</span>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl">
            <div className="flex items-center text-red-700">
              <AlertCircle className="mr-3 w-5 h-5" />
              <p className="text-sm">{error}</p>
            </div>
          </div>
        )}

        <div className="space-y-4">
          <div className="relative">
            <div className={`relative aspect-video bg-gray-900 rounded-xl overflow-hidden transition-all duration-300 ${
              proctorData.violation_detected 
                ? 'ring-4 ring-red-400 ring-opacity-50 shadow-lg shadow-red-400/20' 
                : 'ring-2 ring-indigo-200 ring-opacity-30'
            }`}>
              <video
                ref={videoRef}
                className="w-full h-full object-cover"
                autoPlay
                playsInline
                muted
              />
              {proctorData.violation_detected && (
                <div className="absolute inset-0 bg-gradient-to-t from-red-600/60 to-transparent flex items-center justify-center">
                  <div className="text-center">
                    <AlertCircle className="w-12 h-12 text-white mx-auto mb-2 animate-pulse" />
                    <p className="text-white font-bold text-lg">VIOLATION DETECTED</p>
                  </div>
                </div>
              )}
              {!isActive && !error && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 to-purple-900/80 flex items-center justify-center">
                  <div className="text-center">
                    <div className="relative">
                      <Camera size={48} className="text-white/70 mx-auto mb-3" />
                      <div className="absolute inset-0 animate-ping">
                        <Camera size={48} className="text-white/30 mx-auto" />
                      </div>
                    </div>
                    <p className="text-white/90 font-medium">Initializing AI Monitor...</p>
                  </div>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>

          <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">
                {getStatusIcon()}
                <span>Security Status</span>
              </h3>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${
                proctorData.violation_detected 
                  ? 'bg-red-100 text-red-700' 
                  : proctorData.looking_at_screen 
                    ? 'bg-emerald-100 text-emerald-700'
                    : 'bg-amber-100 text-amber-700'
              }`}>
                {proctorData.violation_detected ? 'Alert' : proctorData.looking_at_screen ? 'Secure' : 'Monitor'}
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-gray-600">Face Detected</span>
                <div className={`w-2 h-2 rounded-full ${proctorData.face_detected ? 'bg-emerald-400' : 'bg-red-400'}`}></div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-gray-600">Screen Focus</span>
                <div className={`w-2 h-2 rounded-full ${proctorData.looking_at_screen ? 'bg-emerald-400' : 'bg-amber-400'}`}></div>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-gray-600">Warnings</span>
                <span className={`font-medium ${proctorData.warnings > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {proctorData.warnings}/{proctorData.max_warnings}
                </span>
              </div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100">
                <span className="text-gray-600">Eye Closure</span>
                <span className={`font-medium ${proctorData.long_blink_count > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>
                  {proctorData.long_blink_count}
                </span>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ====================================================================
//  Main SpeechToTextDashboard Component
// ====================================================================

export default function SpeechToTextDashboard() {
  const [activeQuestion, setActiveQuestion] = useState(1);
  const [isListening, setIsListening] = useState(false);
  const [transcript, setTranscript] = useState('');
  const [isSpeaking, setIsSpeaking] = useState(false);
  const [answers, setAnswers] = useState({});
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [examFinished, setExamFinished] = useState(false);
  const [timeElapsed, setTimeElapsed] = useState(0);
  
  const recognitionRef = useRef(null);

  const questions = [
    { id: 1, title: "Question #1", content: "Describe your experience with React.js, highlighting any specific projects or components you've developed." },
    { id: 2, title: "Question #2", content: "How do you handle state management in complex React applications?" },
    { id: 3, title: "Question #3", content: "Explain your approach to testing React components and applications." },
    { id: 4, title: "Question #4", content: "What strategies do you use for optimizing React application performance?" },
    { id: 5, title: "Question #5", content: "How do you ensure accessibility in your React applications?" },
  ];

  // Timer effect
  useEffect(() => {
    const timer = setInterval(() => {
      setTimeElapsed(prev => prev + 1);
    }, 1000);
    return () => clearInterval(timer);
  }, []);

  const formatTime = (seconds) => {
    const mins = Math.floor(seconds / 60);
    const secs = seconds % 60;
    return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
  };

  const speakQuestion = () => {
    if ('speechSynthesis' in window) {
      const currentQuestion = questions.find(q => q.id === activeQuestion);
      if (currentQuestion && !isSpeaking) {
        setIsSpeaking(true);
        const utterance = new SpeechSynthesisUtterance(currentQuestion.content);
        utterance.rate = 0.9;
        utterance.pitch = 1;
        utterance.volume = 1;
        
        utterance.onend = () => setIsSpeaking(false);
        utterance.onerror = () => setIsSpeaking(false);
        
        window.speechSynthesis.speak(utterance);
      } else if (isSpeaking) {
        window.speechSynthesis.cancel();
        setIsSpeaking(false);
      }
    } else {
      alert('Speech synthesis not supported in this browser.');
    }
  };

  useEffect(() => {
    if (!('webkitSpeechRecognition' in window) && !('SpeechRecognition' in window)) {
      alert('Speech recognition not supported in this browser. Please use Chrome or another supported browser.');
      return;
    }

    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition;
    recognitionRef.current = new SpeechRecognition();
    const recognition = recognitionRef.current;
      
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-US';

    recognition.onresult = (event) => {
      let finalTranscript = '';
      let interimTranscript = '';

      for (let i = event.resultIndex; i < event.results.length; i++) {
        const transcriptPart = event.results[i][0].transcript;
        if (event.results[i].isFinal) {
          finalTranscript += transcriptPart + ' ';
        } else {
          interimTranscript += transcriptPart;
        }
      }
      setTranscript(prev => (prev + finalTranscript).replace(/\[.*?\]/g, '') + ` ${interimTranscript}`);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
      setTranscript(prev => prev.replace(/\[.*?\]/g, '').trim());
    };

    return () => {
      recognition.stop();
    };
  }, []);

  const toggleSpeechRecognition = () => {
    if (isListening) {
      recognitionRef.current?.stop();
    } else {
      recognitionRef.current?.start();
      setIsListening(true);
    }
  };

  const submitAnswer = async () => {
    const finalTranscript = transcript.replace(/\[.*?\]/g, '').trim();
    if (!finalTranscript) {
      alert('Please provide an answer before submitting.');
      return;
    }

    setIsSubmitting(true);
    
    setAnswers(prev => ({
      ...prev,
      [activeQuestion]: finalTranscript
    }));
    
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    if (activeQuestion < questions.length) {
      setActiveQuestion(activeQuestion + 1);
      setTranscript('');
    } else {
      alert('All questions completed! Click "Finish Exam" to submit your exam.');
    }
    
    setIsSubmitting(false);
  };

  const finishExam = async () => {
    const answeredCount = Object.keys(answers).length;
    if (answeredCount < questions.length) {
      const unanswered = questions.length - answeredCount;
      if (!confirm(`You have ${unanswered} unanswered question(s). Are you sure you want to finish the exam?`)) {
        return;
      }
    }

    if (!confirm('Are you sure you want to finish and submit your exam? This action cannot be undone.')) {
      return;
    }

    setIsSubmitting(true);
    
    try {
      const response = await fetch('http://localhost:4000/end-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, totalQuestions: questions.length })
      });
      
      if (response.ok) {
        setExamFinished(true);
        recognitionRef.current?.stop();
        window.speechSynthesis.cancel();
        alert('Exam submitted successfully!');
      } else {
        throw new Error('Failed to submit exam to the server.');
      }
    } catch (error) {
      console.error('Error finishing exam:', error);
      alert('Error submitting exam. Please try again.');
    } finally {
      setIsSubmitting(false);
    }
  };

  const clearTranscript = () => {
    setTranscript('');
  };

  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  if (examFinished) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 text-center max-w-md border border-white/20">
          <div className="relative">
            <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6" />
            <div className="absolute inset-0 animate-ping">
              <CheckCircle className="w-20 h-20 text-emerald-300 mx-auto opacity-30" />
            </div>
          </div>
          <h2 className="text-3xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">
            Exam Completed!
          </h2>
          <p className="text-gray-600 mb-6 leading-relaxed">
            Your exam has been submitted successfully. You can now close this window.
          </p>
          <div className="bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl p-4 border border-emerald-100">
            <div className="text-emerald-700 font-semibold">
              Questions Answered: {Object.keys(answers).length}/{questions.length}
            </div>
            <div className="text-emerald-600 text-sm mt-1">
              Time Taken: {formatTime(timeElapsed)}
            </div>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-10">
        <div className="max-w-7xl mx-auto px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center gap-4">
              <div className="flex items-center gap-2">
                <Zap className="w-8 h-8 text-indigo-600" />
                <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent">
                  Voice Exam
                </h1>
              </div>
              <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full">
                <Clock className="w-4 h-4 text-indigo-600" />
                <span className="text-sm font-medium text-indigo-700">{formatTime(timeElapsed)}</span>
              </div>
            </div>
            <div className="flex items-center gap-3">
              <div className="text-sm text-gray-600">
                {Object.keys(answers).length}/{questions.length} Completed
              </div>
              <div className="w-32 bg-gray-200 rounded-full h-2">
                <div 
                  className="bg-gradient-to-r from-indigo-500 to-purple-500 h-2 rounded-full transition-all duration-300"
                  style={{ width: `${(Object.keys(answers).length / questions.length) * 100}%` }}
                ></div>
              </div>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Main Content */}
          <div className="lg:col-span-2 space-y-6">
            {/* Question Navigation */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
              <div className="flex flex-wrap gap-3 mb-6">
                {questions.map((q) => (
                  <button
                    key={q.id}
                    onClick={() => setActiveQuestion(q.id)}
                    disabled={!answers[q.id - 1] && q.id > activeQuestion}
                    className={`relative px-4 py-2 rounded-xl text-sm font-medium transition-all duration-200 ${
                      activeQuestion === q.id
                        ? 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 scale-105'
                        : answers[q.id]
                        ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-700 hover:from-emerald-200 hover:to-teal-200'
                        : 'bg-gray-100 text-gray-400 cursor-not-allowed'
                    }`}
                  >
                    {`Q${q.id}`}
                    {answers[q.id] && (
                      <CheckCircle className="w-4 h-4 absolute -top-1 -right-1 text-emerald-500 bg-white rounded-full" />
                    )}
                  </button>
                ))}
              </div>

              {/* Current Question */}
              <div className="bg-gradient-to-r from-indigo-50 to-purple-50 rounded-xl p-6 border border-indigo-100">
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <div className="flex items-center gap-2 mb-2">
                      <span className="text-sm font-medium text-indigo-600">Question {activeQuestion}</span>
                      <span className="text-xs text-gray-500">of {questions.length}</span>
                    </div>
                    <h2 className="text-lg font-semibold text-gray-900 leading-relaxed">
                      {questions.find(q => q.id === activeQuestion)?.content}
                    </h2>
                  </div>
                  <button
                    onClick={speakQuestion}
                    disabled={isSpeaking}
                    className={`ml-4 p-3 rounded-xl transition-all duration-200 ${
                      isSpeaking 
                        ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-600 scale-105' 
                        : 'bg-white hover:bg-gray-50 text-gray-600 hover:scale-105'
                    } shadow-md border border-gray-200`}
                    title="Read question aloud"
                  >
                    <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
                  </button>
                </div>
              </div>
            </div>

            {/* Answer Section */}
            <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center justify-between mb-6">
                <h3 className="text-lg font-semibold text-gray-900">Your Answer</h3>
                <div className="flex gap-3">
                  <button
                    onClick={toggleSpeechRecognition}
                    disabled={examFinished}
                    className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-white font-medium ${
                      isListening 
                        ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/25 scale-105' 
                        : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:scale-105 shadow-lg shadow-blue-500/25'
                    }`}
                  >
                    {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                    {isListening ? 'Stop Recording' : 'Start Recording'}
                  </button>
                  <button
                    onClick={clearTranscript}
                    disabled={examFinished || !transcript}
                    className="px-4 py-2 bg-gradient-to-r from-gray-400 to-gray-500 hover:from-gray-500 hover:to-gray-600 text-white rounded-xl transition-all duration-200 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 shadow-md"
                  >
                    Clear
                  </button>
                </div>
              </div>

              {/* Transcript Area */}
              <div className="relative">
                <div className="min-h-[200px] bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 border-dashed border-gray-200 overflow-y-auto">
                  {transcript ? (
                    <div className="space-y-2">
                      <p className="text-gray-900 whitespace-pre-wrap leading-relaxed">
                        {transcript.replace(/\[.*?\]/g, '')}
                        <span className="text-gray-400 italic">{transcript.match(/\[.*?\]/)?.[0]}</span>
                      </p>
                      <div className="text-xs text-gray-500 mt-4">
                        Word count: {transcript.replace(/\[.*?\]/g, '').trim().split(/\s+/).filter(word => word).length}
                      </div>
                    </div>
                  ) : (
                    <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
                      <div className="relative mb-4">
                        <Mic className="w-16 h-16 mx-auto text-gray-300" />
                        {isListening && (
                          <div className="absolute inset-0 animate-ping">
                            <Mic className="w-16 h-16 mx-auto text-indigo-300 opacity-50" />
                          </div>
                        )}
                      </div>
                      <p className="text-lg font-medium mb-2">Ready to record your answer</p>
                      <p className="text-sm">Click "Start Recording" and speak clearly</p>
                    </div>
                  )}
                </div>

                {isListening && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium">
                    <div className="w-2 h-2 bg-white rounded-full animate-pulse"></div>
                    Recording...
                  </div>
                )}
              </div>

              {/* Action Buttons */}
              <div className="flex gap-4 mt-6">
                <button
                  onClick={submitAnswer}
                  disabled={isSubmitting || examFinished || !transcript.trim().replace(/\[.*?\]/g, '')}
                  className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 bg-gradient-to-r from-emerald-500 to-teal-500 hover:from-emerald-600 hover:to-teal-600 text-white shadow-lg shadow-emerald-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
                >
                  <CheckCircle className="w-5 h-5" />
                  {isSubmitting ? 'Submitting...' : `Submit Answer${activeQuestion < questions.length ? ' & Next' : ''}`}
                </button>
                
                <button
                  onClick={finishExam}
                  disabled={isSubmitting || examFinished}
                  className="flex items-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 bg-gradient-to-r from-red-500 to-pink-500 hover:from-red-600 hover:to-pink-600 text-white shadow-lg shadow-red-500/25 disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
                >
                  <Flag className="w-5 h-5" />
                  Finish Exam
                </button>
              </div>
            </div>
          </div>

          {/* Right Sidebar - Proctoring */}
          <div className="lg:col-span-1 space-y-6">
            <div className="sticky top-24">
              {/* Proctoring Monitor */}
              <WebCam />

              {/* Exam Stats */}
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
                <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
                  <Monitor className="w-5 h-5 text-indigo-600" />
                  Exam Progress
                </h3>
                
                <div className="space-y-4">
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-blue-50 to-indigo-50 rounded-xl border border-blue-100">
                    <span className="text-gray-700 font-medium">Current Question</span>
                    <span className="text-indigo-700 font-bold">{activeQuestion}/{questions.length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-emerald-50 to-teal-50 rounded-xl border border-emerald-100">
                    <span className="text-gray-700 font-medium">Completed</span>
                    <span className="text-emerald-700 font-bold">{Object.keys(answers).length}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-purple-50 to-pink-50 rounded-xl border border-purple-100">
                    <span className="text-gray-700 font-medium">Time Elapsed</span>
                    <span className="text-purple-700 font-bold">{formatTime(timeElapsed)}</span>
                  </div>
                  
                  <div className="flex items-center justify-between p-3 bg-gradient-to-r from-amber-50 to-orange-50 rounded-xl border border-amber-100">
                    <span className="text-gray-700 font-medium">Remaining</span>
                    <span className="text-amber-700 font-bold">{questions.length - Object.keys(answers).length}</span>
                  </div>
                </div>
                
                {/* Quick Actions */}
                <div className="mt-6 pt-4 border-t border-gray-200">
                  <h4 className="text-sm font-semibold text-gray-700 mb-3">Quick Actions</h4>
                  <div className="grid grid-cols-2 gap-2">
                    <button 
                      onClick={() => window.location.reload()}
                      className="text-xs px-3 py-2 bg-gray-100 hover:bg-gray-200 text-gray-700 rounded-lg transition-colors"
                    >
                      Refresh
                    </button>
                    <button 
                      onClick={speakQuestion}
                      disabled={isSpeaking}
                      className="text-xs px-3 py-2 bg-indigo-100 hover:bg-indigo-200 text-indigo-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      {isSpeaking ? 'Speaking...' : 'Read Q'}
                    </button>
                    <button 
                      onClick={clearTranscript}
                      disabled={!transcript}
                      className="text-xs px-3 py-2 bg-red-100 hover:bg-red-200 text-red-700 rounded-lg transition-colors disabled:opacity-50"
                    >
                      Clear Text  
                    </button>
                    <button 
                      onClick={toggleSpeechRecognition}
                      className={`text-xs px-3 py-2 rounded-lg transition-colors ${
                        isListening 
                          ? 'bg-red-100 hover:bg-red-200 text-red-700' 
                          : 'bg-green-100 hover:bg-green-200 text-green-700'
                      }`}
                    >
                      {isListening ? 'Stop Mic' : 'Start Mic'}
                    </button>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}