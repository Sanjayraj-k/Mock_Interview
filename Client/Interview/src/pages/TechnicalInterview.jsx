import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Upload, CheckCircle, AlertCircle, Send,
  Mic, MicOff, Volume2, Pause, Play,
  Star, Clock, BookOpen, XCircle,
  Award, Flag, Shield, Zap, Camera
} from 'lucide-react';

const API       = 'http://localhost:5000/api/v2';
const PROCTOR   = 'http://localhost:5000/interview/api';
const RESULTS   = 'http://localhost:5000/api';

const getCandidateData = () => {
  try { return JSON.parse(localStorage.getItem('candidate') || '{}'); }
  catch { return {}; }
};

const ScoreBadge = ({ score, max = 10 }) => {
  const pct = (score / max) * 100;
  const c = pct >= 70 ? 'bg-emerald-100 text-emerald-700' : pct >= 50 ? 'bg-amber-100 text-amber-700' : 'bg-red-100 text-red-700';
  return <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-xs font-semibold ${c}`}><Star size={10}/>{score}/{max}</span>;
};

// ═══════════════════════════════════════════════════════════════
// Proctoring WebCam — identical to Interview.jsx
// ═══════════════════════════════════════════════════════════════
const WebCam = () => {
  const [isActive, setIsActive]   = useState(false);
  const [error,    setError]      = useState(null);
  const [data,     setData]       = useState({
    face_detected: false, looking_at_screen: false,
    warnings: 0, max_warnings: 3, violation_detected: false,
    look_direction: 'Unknown', eyes_closed: false, long_blink_count: 0,
  });
  const videoRef    = useRef(null);
  const canvasRef   = useRef(null);
  const streamRef   = useRef(null);
  const intervalRef = useRef(null);

  const start = async () => {
    try {
      setError(null);
      const stream = await navigator.mediaDevices.getUserMedia({ video: { width: 640, height: 480 }, audio: false });
      streamRef.current = stream;
      if (videoRef.current) videoRef.current.srcObject = stream;
      intervalRef.current = setInterval(() => {
        if (videoRef.current && canvasRef.current && videoRef.current.readyState === 4) {
          const c = canvasRef.current;
          const ctx = c.getContext('2d');
          c.width  = videoRef.current.videoWidth;
          c.height = videoRef.current.videoHeight;
          ctx.drawImage(videoRef.current, 0, 0, c.width, c.height);
          sendFrame(c.toDataURL('image/jpeg', 0.7));
        }
      }, 500);
      setIsActive(true);
    } catch (err) { setError(`Camera failed: ${err.message}`); }
  };

  const stop = () => {
    clearInterval(intervalRef.current);
    streamRef.current?.getTracks().forEach(t => t.stop());
    streamRef.current = null;
    setIsActive(false);
  };

  const sendFrame = async (img) => {
    try {
      const res = await fetch(`${PROCTOR}/process-frame`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ image: img.split(',')[1] }),
      });
      if (res.ok) { const json = await res.json(); setData(prev => ({ ...prev, ...json })); }
    } catch {}
  };

  useEffect(() => { start(); return stop; }, []);

  const statusIcon = () => {
    if (data.violation_detected)  return <AlertCircle size={20} className="text-red-400" />;
    if (!data.face_detected)      return <AlertCircle size={20} className="text-amber-400" />;
    if (data.looking_at_screen)   return <CheckCircle size={20} className="text-emerald-400" />;
    return <AlertCircle size={20} className="text-amber-400" />;
  };

  return (
    <div className="w-full max-w-lg mx-auto">
      <div className="bg-white/80 backdrop-blur-sm border border-gray-200/50 rounded-2xl p-6 shadow-xl">
        <div className="flex items-center justify-between mb-6">
          <h2 className="text-xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent">Proctoring Monitor</h2>
          <div className="flex items-center gap-2"><Shield className="w-5 h-5 text-indigo-600"/><span className="text-sm font-medium text-gray-600">AI Protected</span></div>
        </div>
        {error && <div className="mb-4 p-3 bg-red-50 border border-red-200 rounded-xl text-red-700 text-sm flex items-center gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
        <div className="space-y-4">
          <div className="relative">
            <div className={`relative aspect-video bg-gray-900 rounded-xl overflow-hidden ${data.violation_detected ? 'ring-4 ring-red-400/50' : 'ring-2 ring-indigo-200/30'}`}>
              <video ref={videoRef} className="w-full h-full object-cover" autoPlay playsInline muted />
              {data.violation_detected && (
                <div className="absolute inset-0 bg-gradient-to-t from-red-600/60 to-transparent flex items-center justify-center">
                  <div className="text-center"><AlertCircle className="w-12 h-12 text-white mx-auto mb-2 animate-pulse"/><p className="text-white font-bold text-lg">VIOLATION DETECTED</p></div>
                </div>
              )}
              {!isActive && !error && (
                <div className="absolute inset-0 bg-gradient-to-br from-indigo-900/80 to-purple-900/80 flex items-center justify-center">
                  <div className="text-center"><Camera size={48} className="text-white/70 mx-auto mb-3"/><p className="text-white/90 font-medium">Initializing AI Monitor...</p></div>
                </div>
              )}
            </div>
            <canvas ref={canvasRef} className="hidden" />
          </div>
          <div className="bg-gradient-to-r from-gray-50 to-white rounded-xl p-4 border border-gray-100">
            <div className="flex items-center justify-between mb-4">
              <h3 className="font-semibold text-gray-900 flex items-center gap-2">{statusIcon()}<span>Security Status</span></h3>
              <div className={`px-3 py-1 rounded-full text-xs font-medium ${data.violation_detected ? 'bg-red-100 text-red-700' : data.looking_at_screen ? 'bg-emerald-100 text-emerald-700' : 'bg-amber-100 text-amber-700'}`}>
                {data.violation_detected ? 'Alert' : data.looking_at_screen ? 'Secure' : 'Monitor'}
              </div>
            </div>
            <div className="grid grid-cols-2 gap-3 text-sm">
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"><span className="text-gray-600">Face Detected</span><div className={`w-2 h-2 rounded-full ${data.face_detected ? 'bg-emerald-400' : 'bg-red-400'}`}/></div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"><span className="text-gray-600">Screen Focus</span><div className={`w-2 h-2 rounded-full ${data.looking_at_screen ? 'bg-emerald-400' : 'bg-amber-400'}`}/></div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"><span className="text-gray-600">Warnings</span><span className={`font-medium ${data.warnings > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{data.warnings}/{data.max_warnings}</span></div>
              <div className="flex items-center justify-between p-3 bg-white rounded-lg border border-gray-100"><span className="text-gray-600">Eye Closure</span><span className={`font-medium ${data.long_blink_count > 0 ? 'text-amber-600' : 'text-emerald-600'}`}>{data.long_blink_count}</span></div>
            </div>
            <div className="mt-3 p-3 bg-white rounded-lg border border-gray-100"><div className="flex items-center justify-between"><span className="text-gray-600 text-sm">Look Direction</span><span className="font-medium text-gray-900 text-sm">{data.look_direction}</span></div></div>
          </div>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 1 — Resume Upload (clean white design)
// ═══════════════════════════════════════════════════════════════
const ResumeUploadPage = ({ onResumeReady }) => {
  const [dragOver,    setDragOver]    = useState(false);
  const [file,        setFile]        = useState(null);
  const [uploading,   setUploading]   = useState(false);
  const [error,       setError]       = useState('');
  const [resumeText,  setResumeText]  = useState('');
  const [mode,        setMode]        = useState('file');
  const fileRef = useRef();

  const handleFile = (f) => {
    if (!f) return;
    if (!f.name.match(/\.(pdf|docx|txt)$/i)) { setError('Only PDF, DOCX, or TXT files are supported.'); return; }
    setFile(f); setError('');
  };

  const upload = async () => {
    setUploading(true); setError('');
    try {
      let body, headers = {};
      if (mode === 'file' && file) {
        const fd = new FormData(); fd.append('resume', file); body = fd;
      } else if (mode === 'text' && resumeText.trim()) {
        body = JSON.stringify({ resume_text: resumeText.trim() });
        headers['Content-Type'] = 'application/json';
      } else { setError('Please select a file or enter resume text.'); setUploading(false); return; }

      const res = await fetch(`${API}/upload-resume`, { method: 'POST', credentials: 'include', headers, body });
      const d   = await res.json();
      if (!res.ok) throw new Error(d.error || 'Upload failed');
      onResumeReady(d.candidate_name || 'Candidate');
    } catch (e) { setError(e.message); }
    finally { setUploading(false); }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-6">
      <div className="w-full max-w-2xl">
        {/* Header */}
        <div className="text-center mb-10">
          <div className="inline-flex items-center justify-center w-16 h-16 bg-indigo-100 rounded-2xl mb-4">
            <Zap className="w-8 h-8 text-indigo-600" />
          </div>
          <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent mb-2">
            Technical Interview — Round 3
          </h1>
          <p className="text-gray-500">Upload your resume so the AI can tailor 5 technical questions to your experience.</p>
        </div>

        {/* Info pills */}
        <div className="grid grid-cols-3 gap-4 mb-8">
          {[
            { icon: <BookOpen size={18}/>, label: '5 Questions', sub: 'Projects & CS topics' },
            { icon: <Star size={18}/>,     label: '50 Marks',    sub: '10 marks each' },
            { icon: <Clock size={18}/>,    label: '~20 min',     sub: 'Adaptive difficulty' },
          ].map(item => (
            <div key={item.label} className="bg-white/80 backdrop-blur-sm rounded-xl p-4 text-center border border-white/20 shadow-sm">
              <div className="inline-flex items-center justify-center w-9 h-9 bg-indigo-50 rounded-lg mb-2 text-indigo-600">{item.icon}</div>
              <p className="text-sm font-semibold text-gray-800">{item.label}</p>
              <p className="text-xs text-gray-400 mt-0.5">{item.sub}</p>
            </div>
          ))}
        </div>

        {/* Card */}
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 border border-white/20">
          {/* Mode toggle */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-6">
            {[['file', 'Upload File'], ['text', 'Paste Text']].map(([m, lbl]) => (
              <button key={m} onClick={() => setMode(m)}
                className={`flex-1 py-2 rounded-lg text-sm font-medium transition-all ${mode === m ? 'bg-white text-indigo-700 shadow-sm' : 'text-gray-500 hover:text-gray-700'}`}>
                {lbl}
              </button>
            ))}
          </div>

          {mode === 'file' ? (
            <div
              onDragOver={(e) => { e.preventDefault(); setDragOver(true); }}
              onDragLeave={() => setDragOver(false)}
              onDrop={(e) => { e.preventDefault(); setDragOver(false); handleFile(e.dataTransfer.files[0]); }}
              onClick={() => fileRef.current?.click()}
              className={`border-2 border-dashed rounded-2xl p-10 text-center cursor-pointer transition-all duration-200 mb-6 ${
                dragOver ? 'border-indigo-400 bg-indigo-50 scale-[1.01]'
                : file ? 'border-green-300 bg-green-50'
                : 'border-gray-200 bg-gray-50 hover:border-indigo-300 hover:bg-indigo-50/30'
              }`}>
              <input ref={fileRef} type="file" accept=".pdf,.docx,.txt" className="hidden" onChange={(e) => handleFile(e.target.files[0])} />
              {file ? (
                <div className="space-y-2">
                  <CheckCircle className="w-10 h-10 text-green-500 mx-auto" />
                  <p className="font-semibold text-green-700">{file.name}</p>
                  <p className="text-sm text-green-600">{(file.size / 1024).toFixed(0)} KB — Ready to upload</p>
                  <button onClick={(e) => { e.stopPropagation(); setFile(null); }} className="text-xs text-gray-400 underline mt-1">Remove</button>
                </div>
              ) : (
                <div className="space-y-3">
                  <div className="inline-flex items-center justify-center w-14 h-14 bg-white rounded-xl shadow-sm"><Upload className="w-6 h-6 text-gray-400" /></div>
                  <div><p className="font-semibold text-gray-700">Drag & drop your resume</p><p className="text-sm text-gray-400 mt-1">or click to browse</p></div>
                  <p className="text-xs text-gray-400">PDF, DOCX, or TXT · Max 10MB</p>
                </div>
              )}
            </div>
          ) : (
            <div className="mb-6 space-y-2">
              <label className="text-sm font-medium text-gray-700">Paste your resume text</label>
              <textarea value={resumeText} onChange={(e) => setResumeText(e.target.value)}
                placeholder="Paste your full resume here: name, skills, projects, experience, education..."
                rows={10} className="w-full border border-gray-200 rounded-xl p-4 text-sm text-gray-700 resize-none focus:outline-none focus:ring-2 focus:ring-indigo-300 bg-gray-50" />
              <p className="text-xs text-gray-400 text-right">{resumeText.length} characters</p>
            </div>
          )}

          {error && (
            <div className="flex items-start gap-2 p-3 bg-red-50 border border-red-200 rounded-xl mb-4 text-sm text-red-700">
              <AlertCircle size={16} className="mt-0.5 flex-shrink-0" /><span>{error}</span>
            </div>
          )}

          <button onClick={upload} disabled={uploading || (mode === 'file' ? !file : !resumeText.trim())}
            className={`w-full py-4 rounded-xl font-medium transition-all duration-200 flex items-center justify-center gap-2 ${
              uploading || (mode === 'file' ? !file : !resumeText.trim())
                ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-indigo-500 to-purple-500 text-white shadow-lg shadow-indigo-500/25 hover:scale-[1.01]'
            }`}>
            {uploading
              ? <><span className="animate-spin border-2 border-white border-t-transparent rounded-full w-5 h-5 inline-block" /> Analysing Resume...</>
              : <><Play size={18}/> Start Technical Interview</>
            }
          </button>
        </div>
      </div>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// STEP 2 — Interview Page  (exact Interview.jsx layout)
// ═══════════════════════════════════════════════════════════════
const InterviewPage = ({ candidateName, onComplete }) => {
  const [interviewStarted, setInterviewStarted] = useState(false);
  const [examFinished,     setExamFinished]     = useState(false);
  const [question,         setQuestion]         = useState('');
  const [questionStatus,   setQuestionStatus]   = useState('Introduction');
  const [questionNumber,   setQuestionNumber]   = useState(0);
  const [isFollowup,       setIsFollowup]       = useState(false);
  const [transcript,       setTranscript]       = useState('');
  const [isListening,      setIsListening]      = useState(false);
  const [isSpeaking,       setIsSpeaking]       = useState(false);
  const [isSubmitting,     setIsSubmitting]     = useState(false);
  const [isFinishing,      setIsFinishing]      = useState(false);
  const [error,            setError]            = useState('');
  const [timeElapsed,      setTimeElapsed]      = useState(0);
  const [scores,           setScores]           = useState([]);
  const [evaluation,       setEvaluation]       = useState('');
  const [totalMarks,       setTotalMarks]       = useState(0);
  const [finalScores,      setFinalScores]      = useState([]);

  const recognitionRef = useRef(null);

  // Timer
  useEffect(() => {
    let t;
    if (interviewStarted && !examFinished) t = setInterval(() => setTimeElapsed(s => s + 1), 1000);
    return () => clearInterval(t);
  }, [interviewStarted, examFinished]);

  const fmt = (s) => `${String(Math.floor(s / 60)).padStart(2,'0')}:${String(s % 60).padStart(2,'0')}`;

  // Speech recognition
  useEffect(() => {
    const SR = window.SpeechRecognition || window.webkitSpeechRecognition;
    if (!SR) { setError('Speech recognition not supported. Use Chrome.'); return; }
    const r = new SR(); r.continuous = true; r.interimResults = true; r.lang = 'en-US';
    r.onresult = (e) => {
      let fin = '', interim = '';
      for (let i = e.resultIndex; i < e.results.length; i++) {
        e.results[i].isFinal ? (fin += e.results[i][0].transcript) : (interim += e.results[i][0].transcript);
      }
      setTranscript(prev => {
        const base = prev.replace(/\[.*?\]\s*$/, '');
        return (base ? base + ' ' : '') + fin + (interim ? ` [${interim}]` : '');
      });
    };
    r.onerror = (e) => console.error('Speech error:', e.error);
    r.onend   = () => { setIsListening(false); setTranscript(prev => prev.replace(/\[.*?\]\s*$/, '').trim()); };
    recognitionRef.current = r;
    return () => r.stop();
  }, []);

  const toggleMic = () => {
    if (isListening) recognitionRef.current?.stop();
    else { recognitionRef.current?.start(); setIsListening(true); }
  };

  const speakText = (text) => {
    if (!window.speechSynthesis) return;
    if (isSpeaking) { window.speechSynthesis.cancel(); setIsSpeaking(false); return; }
    const u = new SpeechSynthesisUtterance(text);
    u.rate = 0.9; u.onend = () => setIsSpeaking(false); u.onerror = () => setIsSpeaking(false);
    setIsSpeaking(true); window.speechSynthesis.speak(u);
  };

  useEffect(() => () => window.speechSynthesis?.cancel(), []);

  const startInterview = async () => {
    setError('');
    try {
      const res = await fetch(`${API}/start`, { credentials: 'include' });
      if (!res.ok) throw new Error('Failed to start');
      const d = await res.json();
      setQuestion(d.question);
      setQuestionStatus(d.topic === 'project' ? 'Project Discussion' : 'Core Subject');
      setQuestionNumber(d.question_number);
      setIsFollowup(false);
      setInterviewStarted(true);
      speakText(d.question);
    } catch (e) { setError(e.message); }
  };

  const endExamSession = async (score) => {
    try {
      const c = getCandidateData();
      await fetch(`${RESULTS}/round3/results`, {
        method: 'POST', headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ candidateId: c.id || '', candidateEmail: c.email || '', candidateRoll: c.role || 'candidate', CandidateRollno: c.rollNo || '', submissionDate: new Date().toISOString(), score, totalScore: 50 }),
      });
    } catch (e) { console.warn('Could not save results:', e.message); }
  };

  const submitAnswer = async () => {
    const ans = transcript.replace(/\[.*?\]\s*$/, '').trim();
    if (!ans) return alert('Please provide an answer before submitting.');
    setIsSubmitting(true); setError('');
    try {
      const res = await fetch(`${API}/answer`, {
        method: 'POST', credentials: 'include',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ answer: ans }),
      });
      const d = await res.json();
      if (!res.ok) throw new Error(d.error);

      if (d.status === 'complete') {
        setEvaluation(d.final_report || '');
        setTotalMarks(d.total_marks || 0);
        setFinalScores(d.scores || []);
        setExamFinished(true);
        await endExamSession(d.total_marks || 0);
      } else {
        setScores(d.scores_so_far || []);
        setQuestion(d.question);
        setQuestionStatus(d.topic === 'project' ? 'Project Discussion' : 'Core Subject');
        setQuestionNumber(d.question_number);
        setIsFollowup(d.is_followup || false);
        setTranscript('');
        speakText(d.question);
      }
    } catch (e) { setError(e.message); }
    finally { setIsSubmitting(false); }
  };

  const finishInterview = async () => {
    if (!window.confirm('Are you sure you want to finish the interview? Your progress will be evaluated.')) return;
    setIsFinishing(true); setError('');
    try {
      const ans = transcript.replace(/\[.*?\]\s*$/, '').trim();
      if (ans) {
        const res = await fetch(`${API}/answer`, {
          method: 'POST', credentials: 'include',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ answer: ans }),
        });
        const d = await res.json();
        if (d.status === 'complete') {
          setEvaluation(d.final_report || '');
          setTotalMarks(d.total_marks || 0);
          setFinalScores(d.scores || []);
          setExamFinished(true);
          await endExamSession(d.total_marks || 0);
          return;
        }
      }
      setExamFinished(true);
    } catch (e) { setError(e.message); }
    finally { setIsFinishing(false); }
  };

  // ── Complete screen ─────────────────────────────────────────────────────
  if (examFinished) {
    const pct = Math.round((totalMarks / 50) * 100);
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-white/20 transition-all duration-500 hover:shadow-3xl hover:-translate-y-1">
          <div className="text-center mb-8">
            <div className="relative inline-block">
              <CheckCircle className="w-20 h-20 text-emerald-500 mx-auto mb-6 animate-bounce" />
              <div className="absolute inset-0 bg-emerald-100 rounded-full opacity-0 animate-[ping_1s_cubic-bezier(0,0,0.2,1)_forwards]" />
            </div>
            <h2 className="text-4xl font-bold bg-gradient-to-r from-emerald-600 to-teal-600 bg-clip-text text-transparent mb-3">Interview Completed!</h2>
            <div className="h-1 bg-gradient-to-r from-emerald-100 to-teal-100 rounded-full w-3/4 mx-auto mb-8" />
          </div>

          <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-100 shadow-inner transition-all duration-300 hover:shadow-md mb-4">
            <div className="flex items-center mb-3">
              <div className="bg-emerald-100 p-2 rounded-lg mr-4"><Flag className="w-6 h-6 text-emerald-600"/></div>
              <h3 className="text-xl font-semibold text-gray-800">Technical Round Score</h3>
              <span className="ml-auto text-2xl font-bold text-indigo-700">{totalMarks}/50</span>
            </div>
            <div className="w-full bg-gray-200 rounded-full h-3 mb-3">
              <div className={`h-3 rounded-full transition-all duration-1000 ${pct >= 70 ? 'bg-gradient-to-r from-emerald-400 to-teal-400' : pct >= 50 ? 'bg-gradient-to-r from-yellow-400 to-orange-400' : 'bg-gradient-to-r from-red-400 to-pink-400'}`} style={{ width: `${pct}%` }} />
            </div>
            <div className="flex gap-2 flex-wrap">
              {finalScores.map((s, i) => <ScoreBadge key={i} score={s} />)}
            </div>
          </div>

          {evaluation && (
            <div className="bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border border-gray-100 mb-6">
              <div className="flex items-center mb-3"><div className="bg-indigo-100 p-2 rounded-lg mr-3"><Award className="w-5 h-5 text-indigo-600"/></div><h3 className="font-semibold text-gray-800">AI Evaluation</h3></div>
              <div className="text-sm text-gray-700 leading-relaxed whitespace-pre-line max-h-48 overflow-y-auto">{evaluation}</div>
            </div>
          )}

          <div className="mt-8 text-center">
            <div className="inline-flex items-center bg-gradient-to-r from-indigo-100 to-purple-100 px-6 py-3 rounded-full shadow-sm mb-6">
              <Shield className="w-5 h-5 text-indigo-600 mr-2" />
              <span className="text-indigo-700 font-medium">Your session was securely proctored and recorded</span>
            </div>
            <div>
              <h4 className="text-2xl font-light text-gray-600 mb-4">Technical Round Complete!</h4>
              <p className="text-gray-500 max-w-md mx-auto mb-8">You have one more round — the HR Behavioral Interview. Click below to proceed.</p>
              <button onClick={() => onComplete && onComplete()}
                className="px-8 py-4 bg-gradient-to-r from-amber-500 to-orange-500 text-white rounded-xl font-semibold text-lg hover:scale-105 transition-all duration-200 shadow-lg shadow-amber-500/25">
                Proceed to HR Round →
              </button>
            </div>
          </div>
        </div>
      </div>
    );
  }

  // ── Pre-start screen ────────────────────────────────────────────────────
  if (!interviewStarted) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-2xl text-center border border-white/20">
          <div className="mb-6">
            <Zap className="w-16 h-16 text-indigo-600 mx-auto mb-4" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent mb-3">
              Welcome to your AI-Powered Technical Interview Session
            </h1>
            <p className="text-gray-600 leading-relaxed">
              Welcome, <strong>{candidateName}</strong>! Your resume has been analysed. The AI interviewer will ask 5 questions —
              2 based on your projects and 3 core CS subjects. The session is monitored in real time through proctoring tools.
            </p>
          </div>
          {error && <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl"><div className="flex items-center text-red-700 justify-center"><AlertCircle className="mr-3 w-5 h-5"/><p className="text-sm">{error}</p></div></div>}
          <div className="space-y-4 mb-6 text-left">
            <div className="flex items-center gap-2 text-gray-600"><Camera className="w-5 h-5"/><span>Camera access required for proctoring</span></div>
            <div className="flex items-center gap-2 text-gray-600"><Mic className="w-5 h-5"/><span>Microphone access for voice responses</span></div>
            <div className="flex items-center gap-2 text-gray-600"><Volume2 className="w-5 h-5"/><span>Audio enabled for question narration</span></div>
          </div>
          <button onClick={startInterview}
            className="px-8 py-4 bg-gradient-to-r from-indigo-500 to-purple-500 text-white rounded-xl font-medium hover:scale-105 transition-all duration-200 shadow-lg shadow-indigo-500/25 flex items-center gap-2 mx-auto">
            <Play className="w-5 h-5"/> Start Interview
          </button>
        </div>
      </div>
    );
  }

  // ── Active Interview (2-column: left Q+A, right proctoring) ────────────
  const cleanTranscript = transcript.replace(/\[.*?\]\s*$/, '');

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header — same as Interview.jsx */}
      <header className="bg-white/80 backdrop-blur-sm border-b border-gray-200/50 sticky top-0 z-20">
        <div className="max-w-7xl mx-auto px-6 py-4 flex items-center justify-between">
          <div className="flex items-center gap-4">
            <Zap className="w-8 h-8 text-indigo-600"/>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent">AI Interview</h1>
            <div className="hidden sm:flex items-center gap-2 px-3 py-1 bg-indigo-100 rounded-full">
              <Clock className="w-4 h-4 text-indigo-600"/>
              <span className="text-sm font-medium text-indigo-700 font-mono">{fmt(timeElapsed)}</span>
            </div>
          </div>
          <div className="flex items-center gap-3">
            <div className="text-sm text-gray-600">{isFollowup ? 'Follow-up' : questionStatus}</div>
            <div className="px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-sm font-medium">Question {questionNumber}</div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6">
        <div className="grid grid-cols-3 gap-8">

          {/* Left panel — Question + Answer */}
          <div className="col-span-2 space-y-6">

            {/* Question card */}
            <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-start justify-between mb-4">
                <div className="flex-1">
                  <div className="flex items-center gap-2 mb-2">
                    <span className="text-sm font-medium text-indigo-600">{isFollowup ? 'Follow-up Question' : questionStatus}</span>
                    <span className="text-xs text-gray-500">Question {questionNumber}</span>
                  </div>
                  <h2 className="text-lg font-semibold text-gray-900 leading-relaxed">{question}</h2>
                </div>
                <button onClick={() => speakText(question)} disabled={isSpeaking}
                  className={`ml-4 p-3 rounded-xl transition-all duration-200 ${isSpeaking ? 'bg-gradient-to-r from-emerald-100 to-teal-100 text-emerald-600 scale-105' : 'bg-white hover:bg-gray-50 text-gray-600 hover:scale-105'} shadow-md border border-gray-200`}
                  title="Read question aloud">
                  {isSpeaking ? <Pause className="w-5 h-5"/> : <Volume2 className="w-5 h-5"/>}
                </button>
              </div>
            </section>

            {/* Answer card */}
            <section className="bg-white/80 backdrop-blur-sm rounded-2xl p-6 border border-gray-200/50 shadow-lg">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-semibold text-gray-900">Your Answer</h3>
                <button onClick={toggleMic} disabled={isSubmitting || isFinishing}
                  className={`flex items-center gap-2 px-4 py-2 rounded-xl transition-all duration-200 text-white font-medium ${isListening ? 'bg-gradient-to-r from-red-500 to-pink-500 shadow-lg shadow-red-500/25 scale-105' : 'bg-gradient-to-r from-blue-500 to-indigo-500 hover:scale-105 shadow-lg shadow-blue-500/25'}`}>
                  {isListening ? <MicOff className="w-4 h-4"/> : <Mic className="w-4 h-4"/>}
                  {isListening ? 'Stop Recording' : 'Start Recording'}
                </button>
              </div>
              <div className="relative">
                <textarea value={cleanTranscript} onChange={(e) => setTranscript(e.target.value)}
                  placeholder="You can type your answer here, or use the voice recording button..."
                  className="w-full min-h-[250px] bg-gradient-to-br from-gray-50 to-white rounded-xl p-6 border-2 border-dashed border-gray-200 focus:ring-2 focus:ring-indigo-400 focus:border-transparent transition-all resize-none"
                  disabled={isSubmitting || isFinishing} />
                <div className="absolute bottom-4 right-4 text-xs text-gray-500">
                  Word count: {cleanTranscript.trim().split(/\s+/).filter(Boolean).length}
                </div>
                {isListening && (
                  <div className="absolute top-4 right-4 flex items-center gap-2 bg-red-500 text-white px-3 py-1 rounded-full text-sm font-medium animate-pulse">
                    <div className="w-2 h-2 bg-white rounded-full"/> Recording
                  </div>
                )}
              </div>
              {error && <div className="mt-3 p-3 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700 text-sm gap-2"><AlertCircle className="w-4 h-4"/>{error}</div>}
              <div className="flex justify-between items-center mt-6">
                <button onClick={finishInterview} disabled={isSubmitting || isFinishing}
                  className="flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-red-500 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 hover:scale-105 shadow-lg shadow-red-500/25">
                  <XCircle className="w-4 h-4"/>
                  {isFinishing ? 'Finishing...' : 'Finish Interview'}
                </button>
                <div className="flex gap-4">
                  <button onClick={() => setTranscript('')} disabled={!transcript || isSubmitting || isFinishing}
                    className="px-6 py-2 bg-gray-200 text-gray-700 rounded-xl font-medium transition-all duration-200 disabled:opacity-50 hover:bg-gray-300">
                    Clear
                  </button>
                  <button onClick={submitAnswer} disabled={!cleanTranscript || isSubmitting || isFinishing}
                    className="flex items-center gap-2 px-6 py-2 bg-gradient-to-r from-emerald-500 to-teal-500 text-white rounded-xl font-medium transition-all duration-200 disabled:opacity-50 hover:scale-105 shadow-lg shadow-emerald-500/25">
                    {isSubmitting ? 'Submitting...' : 'Submit & Next'}
                    <Send className="w-4 h-4"/>
                  </button>
                </div>
              </div>
            </section>

            {/* Scores so far */}
            {scores.length > 0 && (
              <div className="flex items-center gap-2">
                <span className="text-xs text-gray-400">Scores so far:</span>
                {scores.map((s, i) => <ScoreBadge key={i} score={s}/>)}
              </div>
            )}
          </div>

          {/* Right panel — Proctoring Monitor */}
          <aside className="col-span-1"><WebCam /></aside>
        </div>
      </main>
    </div>
  );
};

// ═══════════════════════════════════════════════════════════════
// Main Export
// ═══════════════════════════════════════════════════════════════
export default function TechnicalInterview() {
  const navigate = useNavigate();
  const [step,          setStep]          = useState('upload');
  const [candidateName, setCandidateName] = useState('');

  return step === 'upload'
    ? <ResumeUploadPage onResumeReady={(name) => { setCandidateName(name); setStep('interview'); }} />
    : <InterviewPage candidateName={candidateName} onComplete={() => navigate('/hrround')} />;
}
