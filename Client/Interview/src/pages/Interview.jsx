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
  X 
} from 'lucide-react';


// ====================================================================
//  WebCam Proctoring Component (Moved outside the main component)
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
      
      // Call start exam API
      const startResponse = await fetch(`${apiUrl}/start-exam`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
      });

      if (!startResponse.ok) {
        throw new Error(`Failed to start exam session: ${startResponse.statusText}`);
      }
      
      // Get camera stream
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: 640, height: 480 },
        audio: false, // Audio is handled by the speech recognition part
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
      stopProctoring(); // Clean up if start fails
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
    
    // NOTE: The /end-exam API call is now handled by the parent component's `finishExam` function
    // to ensure answers are submitted with the final call.

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
    }, 500); // Process frames every 500ms for better responsiveness
  };

  const sendFrameToServer = async (imageData) => {
    try {
      const response = await fetch(`${apiUrl}/process-frame`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: imageData.split(',')[1] }), // Send only base64 data
      });

      if (!response.ok) {
        throw new Error(`Server error: ${response.statusText}`);
      }

      const data = await response.json();
      setProctorData(prev => ({ ...prev, ...data }));
    } catch (err) {
      console.error('Error processing frame:', err);
      // Don't set a persistent error for transient frame processing issues
    }
  };

  // This useEffect hook runs once on mount to start proctoring,
  // and its cleanup function runs on unmount to stop it.
  useEffect(() => {
    startProctoring();
    return () => {
      stopProctoring();
    };
  }, []);

  const getStatusIcon = () => {
    if (proctorData.violation_detected) {
      return <AlertCircle size={24} className="text-red-500" />;
    }
    if (!proctorData.face_detected) {
      return <AlertTriangle size={24} className="text-yellow-500" />;
    }
    if (proctorData.looking_at_screen) {
      return <CheckCircle size={24} className="text-green-500" />;
    }
    return <AlertTriangle size={24} className="text-yellow-500" />;
  };

  const getStatusColorClass = () => {
    if (proctorData.violation_detected) return "text-red-500";
    if (!proctorData.face_detected) return "text-yellow-500";
    if (proctorData.looking_at_screen) return "text-green-500";
    return "text-yellow-500";
  };
  
  return (
    <div className="w-full max-w-3xl mx-auto p-4 bg-gray-50 rounded-lg shadow-md">
      <h2 className="text-xl font-bold mb-4 flex justify-between items-center">
        Exam Proctoring Monitor
      </h2>

      {error && (
        <div className="mb-4 p-3 bg-red-100 text-red-800 rounded-md">
          <p className="flex items-center">
            <AlertCircle className="mr-2" size={16} />
            {error}
          </p>
        </div>
      )}

      <div className="flex flex-col gap-4">
        <div className="relative w-full">
          <div className={`relative aspect-video bg-gray-900 rounded-lg overflow-hidden ${proctorData.violation_detected ? 'border-4 border-red-500 animate-pulse' : 'border-2 border-gray-300'}`}>
            <video
              ref={videoRef}
              className="w-full h-full object-cover"
              autoPlay
              playsInline
              muted
            />
            {proctorData.violation_detected && (
              <div className="absolute inset-0 bg-red-500 bg-opacity-30 flex items-center justify-center">
                <p className="text-white text-xl font-bold">VIOLATION DETECTED</p>
              </div>
            )}
            {!isActive && !error && (
              <div className="absolute inset-0 bg-black bg-opacity-70 flex items-center justify-center flex-col gap-2">
                <Camera size={48} className="text-white opacity-50" />
                <p className="text-white opacity-80">Initializing Proctoring...</p>
              </div>
            )}
          </div>
          <canvas ref={canvasRef} className="hidden" />
        </div>

        <div className="w-full bg-white p-4 rounded-lg shadow">
          <h3 className="text-lg font-semibold mb-3 flex items-center">
            {getStatusIcon()}
            <span className="ml-2">Proctor Status</span>
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
             <div className="flex justify-between p-2 border-b">
                <span className="font-medium">Face Detected:</span>
                <span className={proctorData.face_detected ? "text-green-500" : "text-red-500"}>
                    {proctorData.face_detected ? 'Yes' : 'No'}
                </span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="font-medium">Looking at Screen:</span>
                <span className={getStatusColorClass()}>{proctorData.looking_at_screen ? 'Yes' : 'No'}</span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="font-medium">Warnings:</span>
                <span className={proctorData.warnings > 0 ? "text-yellow-500" : "text-green-500"}>
                    {proctorData.warnings} / {proctorData.max_warnings}
                </span>
              </div>
              <div className="flex justify-between p-2 border-b">
                <span className="font-medium">Long Eye Closures:</span>
                <span className={proctorData.long_blink_count > 0 ? "text-yellow-500" : "text-green-500"}>
                  {proctorData.long_blink_count}
                </span>
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
  
  const recognitionRef = useRef(null);

  const questions = [
    { id: 1, title: "Question #1", content: "Describe your experience with React.js, highlighting any specific projects or components you've developed." },
    { id: 2, title: "Question #2", content: "How do you handle state management in complex React applications?" },
    { id: 3, title: "Question #3", content: "Explain your approach to testing React components and applications." },
    { id: 4, title: "Question #4", content: "What strategies do you use for optimizing React application performance?" },
    { id: 5, title: "Question #5", content: "How do you ensure accessibility in your React applications?" },
  ];

  // Text-to-Speech function
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

  // Speech Recognition setup
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
      // Update transcript state with final part and show interim part separately for clarity
      setTranscript(prev => (prev + finalTranscript).replace(/\[.*?\]/g, '') + ` ${interimTranscript}`);
    };

    recognition.onerror = (event) => {
      console.error('Speech recognition error:', event.error);
      setIsListening(false);
    };

    recognition.onend = () => {
      setIsListening(false);
       // Clean up any lingering interim text indicators
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
    
    // Save answer locally
    setAnswers(prev => ({
      ...prev,
      [activeQuestion]: finalTranscript
    }));
    
    // Simulate async operation
    await new Promise(resolve => setTimeout(resolve, 500)); 
    
    if (activeQuestion < questions.length) {
      setActiveQuestion(activeQuestion + 1);
      setTranscript(''); // Clear transcript for next question
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
      // The WebCam component will unmount, triggering its cleanup.
      // We send the final submission data here.
      const response = await fetch('http://localhost:4000/end-exam', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answers, totalQuestions: questions.length })
      });
      
      if (response.ok) {
        setExamFinished(true);
        // Stop any active speech recognition or synthesis
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

  // Cleanup effect for speech synthesis on component unmount
  useEffect(() => {
    return () => {
      window.speechSynthesis.cancel();
    };
  }, []);

  if (examFinished) {
    return (
      <div className="min-h-screen bg-gray-100 flex items-center justify-center p-4">
        <div className="bg-white rounded-xl shadow-lg p-8 text-center max-w-md">
          <CheckCircle className="w-16 h-16 text-green-600 mx-auto mb-4" />
          <h2 className="text-2xl font-bold text-gray-900 mb-2">Exam Completed!</h2>
          <p className="text-gray-600 mb-4">
            Your exam has been submitted successfully. You can now close this window.
          </p>
          <div className="text-sm text-gray-500">
            Questions Answered: {Object.keys(answers).length}/{questions.length}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-100 flex flex-col lg:flex-row">
      {/* Left Panel - Questions and Speech Input */}
      <div className="w-full lg:w-1/2 p-6 flex flex-col">
        <div className="bg-white rounded-xl shadow-sm border p-6 mb-4">
          <div className="flex flex-wrap gap-2 mb-6">
            {questions.map((q) => (
              <button
                key={q.id}
                onClick={() => setActiveQuestion(q.id)}
                disabled={!answers[q.id - 1] && q.id > activeQuestion}
                className={`px-4 py-2 rounded-full text-sm font-medium transition-colors relative ${
                  activeQuestion === q.id
                    ? 'bg-indigo-600 text-white shadow-md'
                    : answers[q.id]
                    ? 'bg-green-100 text-green-800 hover:bg-green-200'
                    : 'bg-gray-100 text-gray-500 cursor-not-allowed'
                }`}
              >
                {`Q${q.id}`}
                {answers[q.id] && (
                  <CheckCircle className="w-4 h-4 absolute -top-1 -right-1 text-green-600 bg-white rounded-full" />
                )}
              </button>
            ))}
          </div>

          <div className="mb-6">
            <div className="flex items-start justify-between mb-4">
              <h2 className="text-lg font-semibold text-gray-900 flex-1">
                {questions.find(q => q.id === activeQuestion)?.content}
              </h2>
              <button
                onClick={speakQuestion}
                disabled={isSpeaking}
                className={`ml-4 p-2 rounded-full transition-colors ${
                  isSpeaking 
                    ? 'bg-green-100 text-green-600' 
                    : 'bg-gray-100 hover:bg-gray-200 text-gray-600'
                }`}
                title="Read question aloud"
              >
                <Volume2 className={`w-5 h-5 ${isSpeaking ? 'animate-pulse' : ''}`} />
              </button>
            </div>
            <p className="text-gray-600 text-sm">
              Question {activeQuestion} of {questions.length}
            </p>
          </div>
        </div>

        <div className="bg-white rounded-xl shadow-sm border p-6 flex-1 flex flex-col">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-lg font-semibold text-gray-900">Your Answer</h3>
            <div className="flex gap-2">
              <button
                onClick={toggleSpeechRecognition}
                disabled={examFinished}
                className={`flex items-center gap-2 px-4 py-2 rounded-lg transition-colors text-white ${
                  isListening 
                    ? 'bg-red-600 hover:bg-red-700' 
                    : 'bg-blue-600 hover:bg-blue-700'
                }`}
              >
                {isListening ? <MicOff className="w-4 h-4" /> : <Mic className="w-4 h-4" />}
                {isListening ? 'Stop' : 'Record'}
              </button>
              <button
                onClick={clearTranscript}
                disabled={examFinished || !transcript}
                className="px-4 py-2 bg-gray-500 hover:bg-gray-600 text-white rounded-lg transition-colors disabled:bg-gray-300"
              >
                Clear
              </button>
            </div>
          </div>

          <div className="flex-1 border-2 border-dashed border-gray-300 rounded-lg p-4 min-h-[150px] mb-4 overflow-y-auto">
            {transcript ? (
              <p className="text-gray-900 whitespace-pre-wrap">{transcript.replace(/\[.*?\]/g, '')}<span className="text-gray-400">{transcript.match(/\[.*?\]/)?.[0]}</span></p>
            ) : (
              <div className="text-center text-gray-500 flex flex-col items-center justify-center h-full">
                <Mic className="w-12 h-12 mx-auto mb-4 opacity-30" />
                <p>Click "Record" to start speaking</p>
                <p className="text-sm mt-1">Your speech will appear here as text</p>
              </div>
            )}
          </div>

          {isListening && (
            <div className="mb-4 flex items-center gap-2 text-red-600">
              <div className="w-3 h-3 bg-red-600 rounded-full animate-pulse"></div>
              <span className="text-sm font-medium">Listening...</span>
            </div>
          )}

          <div className="flex gap-3">
            <button
              onClick={submitAnswer}
              disabled={isSubmitting || examFinished || !transcript.trim().replace(/\[.*?\]/g, '')}
              className="flex-1 flex items-center justify-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors bg-green-600 hover:bg-green-700 text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <CheckCircle className="w-5 h-5" />
              {isSubmitting ? 'Submitting...' : `Submit Answer ${activeQuestion < questions.length ? '& Next' : ''}`}
            </button>
            
            <button
              onClick={finishExam}
              disabled={isSubmitting || examFinished}
              className="flex items-center gap-2 px-6 py-3 rounded-lg font-medium transition-colors bg-red-600 hover:bg-red-700 text-white disabled:bg-gray-300 disabled:text-gray-500 disabled:cursor-not-allowed"
            >
              <Flag className="w-5 h-5" />
              Finish Exam
            </button>
          </div>
        </div>
      </div>

      {/* Right Panel - Webcam Monitor */}
      <div className="w-full lg:w-1/2 p-6 flex items-center justify-center">
        <WebCam />
      </div>
    </div>
  );
}