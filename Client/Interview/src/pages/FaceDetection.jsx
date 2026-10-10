import React, { useEffect, useRef, useState } from "react";
import * as faceapi from "face-api.js";
import { Navigate, useLocation, useNavigate } from "react-router-dom";
import { ShieldCheck, ShieldAlert, Camera, CheckCircle2, AlertTriangle, RefreshCw, ArrowRight, UserCheck, Lock } from "lucide-react";
import { motion, AnimatePresence } from "framer-motion";

function FaceDetection() {
  const location = useLocation();
  const navigate = useNavigate();

  const [account, setAccount] = useState(null);
  const [localUserStream, setLocalUserStream] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [labeledFaceMatcher, setLabeledFaceMatcher] = useState(null);
  const [loginResult, setLoginResult] = useState("IDLE"); // 'IDLE', 'SCANNING', 'MATCHED', 'MISMATCH'
  const [matchScore, setMatchScore] = useState(0);
  const [matchDistance, setMatchDistance] = useState(1.0);
  const [counter, setCounter] = useState(3);
  const [errorMessage, setErrorMessage] = useState("");
  const [isCameraActive, setIsCameraActive] = useState(false);

  const videoRef = useRef(null);
  const canvasRef = useRef(null);
  const scanIntervalRef = useRef(null);
  const counterIntervalRef = useRef(null);

  const videoWidth = 640;
  const videoHeight = 480;

  // Retrieve candidate account from state or localStorage
  useEffect(() => {
    let candidate = location?.state?.account;
    if (!candidate) {
      const stored = localStorage.getItem("candidate");
      if (stored) {
        try {
          candidate = JSON.parse(stored);
        } catch (e) {
          console.error(e);
        }
      }
    }

    if (!candidate) {
      navigate("/candidate/login", { replace: true });
      return;
    }

    setAccount(candidate);
  }, [location, navigate]);

  // Load Face-AI models
  useEffect(() => {
    const loadModels = async () => {
      try {
        const uri = "/Face_AI_Models";
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(uri),
          faceapi.nets.faceLandmark68Net.loadFromUri(uri),
          faceapi.nets.faceRecognitionNet.loadFromUri(uri)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error("Error loading face-api models:", err);
        setErrorMessage("Failed to load Face-AI models. Please refresh the page.");
      }
    };
    loadModels();
  }, []);

  // Initialize FaceMatcher with stored ID Card face descriptor
  useEffect(() => {
    if (!account || !modelsLoaded) return;

    const setupFaceMatcher = async () => {
      try {
        let descriptor = null;

        // 1. Direct Face Descriptor Array from Database (ID Card)
        if (account.faceDescriptor && Array.isArray(account.faceDescriptor) && account.faceDescriptor.length === 128) {
          descriptor = new Float32Array(account.faceDescriptor);
        } 
        // 2. Fallback: Extract from stored ID Card photo if descriptor not pre-calculated
        else if (account.idCardPhoto || account.picture) {
          const photoUrl = account.idCardPhoto || account.picture;
          const img = await faceapi.fetchImage(photoUrl);
          const detection = await faceapi
            .detectSingleFace(img)
            .withFaceLandmarks()
            .withFaceDescriptor();

          if (detection) {
            descriptor = detection.descriptor;
          }
        }

        if (descriptor) {
          const studentId = account.rollNo || account.email || account.id || "registered_student";
          const labeledDescriptor = new faceapi.LabeledFaceDescriptors(studentId, [descriptor]);
          // Strict threshold: 0.55 for reliable identification
          const matcher = new faceapi.FaceMatcher(labeledDescriptor, 0.55);
          setLabeledFaceMatcher(matcher);
        } else {
          setErrorMessage("No biometric face embedding found for this student. Please contact faculty to register your ID card.");
        }
      } catch (err) {
        console.error("Error creating FaceMatcher:", err);
        setErrorMessage("Error initializing biometric matcher: " + err.message);
      }
    };

    setupFaceMatcher();
  }, [account, modelsLoaded]);

  // Start webcam video feed
  const startCamera = async () => {
    try {
      setErrorMessage("");
      const stream = await navigator.mediaDevices.getUserMedia({
        video: { width: videoWidth, height: videoHeight, facingMode: "user" },
        audio: false
      });
      if (videoRef.current) {
        videoRef.current.srcObject = stream;
        setLocalUserStream(stream);
        setIsCameraActive(true);
      }
    } catch (err) {
      console.error("Camera access error:", err);
      setErrorMessage("Could not access webcam. Please allow camera permissions in your browser.");
    }
  };

  // Stop camera helper
  const stopCamera = () => {
    if (localUserStream) {
      localUserStream.getTracks().forEach(track => track.stop());
      setLocalUserStream(null);
    }
    if (scanIntervalRef.current) {
      clearInterval(scanIntervalRef.current);
    }
    if (counterIntervalRef.current) {
      clearInterval(counterIntervalRef.current);
    }
    setIsCameraActive(false);
  };

  // Cleanup on unmount
  useEffect(() => {
    return () => {
      stopCamera();
    };
  }, []);

  // Verification Success Countdown
  useEffect(() => {
    if (loginResult === "MATCHED") {
      counterIntervalRef.current = setInterval(() => {
        setCounter(prev => {
          if (prev <= 1) {
            clearInterval(counterIntervalRef.current);
            stopCamera();
            localStorage.setItem(
              "faceAuth",
              JSON.stringify({ 
                status: true, 
                account: {
                  ...account,
                  fullName: account.fullName || account.name || "Student",
                  name: account.name || account.fullName || "Student",
                  picture: account.idCardPhoto || account.picture || '',
                  idCardPhoto: account.idCardPhoto || account.picture || ''
                }, 
                verifiedAt: new Date().toISOString() 
              })
            );
            navigate("/protected", { replace: true });
            return 0;
          }
          return prev - 1;
        });
      }, 1000);

      return () => clearInterval(counterIntervalRef.current);
    } else {
      setCounter(3);
      if (counterIntervalRef.current) {
        clearInterval(counterIntervalRef.current);
      }
    }
  }, [loginResult, account, navigate]);

  // Real-time Face Scanning & Verification Loop
  const handleVideoPlay = () => {
    if (!canvasRef.current || !videoRef.current) return;

    faceapi.matchDimensions(canvasRef.current, { width: videoWidth, height: videoHeight });

    scanIntervalRef.current = setInterval(async () => {
      if (!videoRef.current || videoRef.current.paused || videoRef.current.ended) return;

      try {
        const detections = await faceapi
          .detectAllFaces(videoRef.current)
          .withFaceLandmarks()
          .withFaceDescriptors();

        const resizedDetections = faceapi.resizeResults(detections, {
          width: videoWidth,
          height: videoHeight
        });

        const ctx = canvasRef.current.getContext("2d");
        ctx.clearRect(0, 0, videoWidth, videoHeight);

        if (resizedDetections.length === 0) {
          setLoginResult("SCANNING");
          setMatchScore(0);
          return;
        }

        // Draw bounding box and landmarks
        faceapi.draw.drawDetections(canvasRef.current, resizedDetections);
        faceapi.draw.drawFaceLandmarks(canvasRef.current, resizedDetections);

        if (labeledFaceMatcher && resizedDetections.length > 0) {
          const liveDescriptor = resizedDetections[0].descriptor;
          const bestMatch = labeledFaceMatcher.findBestMatch(liveDescriptor);
          
          const distance = bestMatch.distance;
          setMatchDistance(distance);

          // Calculate similarity score percentage (0-100%)
          const similarity = Math.max(0, Math.min(100, Math.round((1.0 - (distance / 1.0)) * 100)));
          setMatchScore(similarity);

          const studentId = account.rollNo || account.email || account.id || "registered_student";
          if (bestMatch.label === studentId || distance < 0.55) {
            setLoginResult("MATCHED");
          } else {
            setLoginResult("MISMATCH");
          }
        }
      } catch (err) {
        console.error("Frame processing error:", err);
      }
    }, 150);
  };

  return (
    <div className="min-h-screen w-full bg-slate-50 text-slate-800 flex flex-col justify-between p-6 bg-[radial-gradient(ellipse_at_top,_var(--tw-gradient-stops))] from-indigo-50/70 via-slate-50 to-white">
      {/* Header */}
      <header className="max-w-6xl w-full mx-auto flex items-center justify-between py-4 border-b border-slate-200">
        <div className="flex items-center gap-3">
          <div className="w-10 h-10 rounded-xl bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center shadow-md shadow-indigo-100">
            <ShieldCheck className="w-6 h-6 text-white" />
          </div>
          <div>
            <h1 className="text-lg font-bold tracking-tight text-slate-900">AI Biometric Proctoring</h1>
            <p className="text-xs text-slate-500 font-medium">Identity Verification Engine</p>
          </div>
        </div>

        {account && (
          <div className="flex items-center gap-3 bg-white border border-slate-200 shadow-sm px-4 py-2 rounded-xl">
            {(account.idCardPhoto || account.picture) ? (
              <img 
                src={account.idCardPhoto || account.picture} 
                alt={account.name || account.fullName} 
                className="w-9 h-9 rounded-full object-cover border border-indigo-200 shadow-sm" 
              />
            ) : (
              <div className="w-9 h-9 rounded-full bg-indigo-600 text-white flex items-center justify-center font-bold text-xs shadow-sm">
                {(account.name || account.fullName)?.charAt(0) || 'S'}
              </div>
            )}
            <div className="text-right">
              <p className="text-xs font-bold text-slate-800">{account.name || account.fullName}</p>
              <p className="text-[11px] text-indigo-600 font-mono font-medium">{account.rollNo}</p>
            </div>
          </div>
        )}
      </header>

      {/* Main Content Area */}
      <main className="max-w-4xl w-full mx-auto my-auto flex flex-col items-center py-6">
        {/* Status Heading Banner */}
        <div className="text-center mb-6">
          <AnimatePresence mode="wait">
            {!isCameraActive ? (
              <motion.div key="idle" initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} exit={{ opacity: 0 }}>
                <h2 className="text-2xl sm:text-3xl font-extrabold text-slate-900 mb-2">
                  Facial Biometric Verification
                </h2>
                <p className="text-sm text-slate-600 max-w-md mx-auto">
                  Position your face clearly in front of the camera to verify your identity against your registered student ID card.
                </p>
              </motion.div>
            ) : loginResult === "MATCHED" ? (
              <motion.div key="matched" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold mb-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-600" /> Identity Verified ({matchScore}% Match)
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Hold still for <span className="text-emerald-600 font-mono text-4xl font-black">{counter}</span> seconds...
                </h2>
              </motion.div>
            ) : loginResult === "MISMATCH" ? (
              <motion.div key="mismatch" initial={{ opacity: 0, scale: 0.9 }} animate={{ opacity: 1, scale: 1 }} exit={{ opacity: 0 }}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-rose-50 border border-rose-200 text-rose-700 text-sm font-semibold mb-2">
                  <AlertTriangle className="w-4 h-4 text-rose-600" /> Biometric Mismatch
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-rose-600">
                  Face does not match registered ID card
                </h2>
              </motion.div>
            ) : (
              <motion.div key="scanning" initial={{ opacity: 0 }} animate={{ opacity: 1 }} exit={{ opacity: 0 }}>
                <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-indigo-50 border border-indigo-200 text-indigo-700 text-sm font-semibold mb-2">
                  <RefreshCw className="w-4 h-4 animate-spin text-indigo-600" /> Scanning Live Facial Features...
                </div>
                <h2 className="text-2xl sm:text-3xl font-bold text-slate-900">
                  Align your face inside the frame
                </h2>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Error Alert */}
        {errorMessage && (
          <div className="w-full max-w-lg mb-6 p-4 rounded-xl bg-rose-50 border border-rose-200 text-rose-700 text-sm flex items-center gap-3">
            <AlertTriangle className="w-5 h-5 shrink-0 text-rose-600" />
            <span>{errorMessage}</span>
          </div>
        )}

        {/* Video / Camera Box */}
        <div className="relative w-full max-w-[640px] aspect-[4/3] bg-white rounded-3xl overflow-hidden border-2 border-slate-200 shadow-xl shadow-slate-200/80 flex items-center justify-center">
          {/* Scanning Grid Overlay Effect */}
          {isCameraActive && (
            <div className="absolute inset-0 pointer-events-none z-10">
              <div className="w-full h-full border-4 border-indigo-500/20 rounded-3xl" />
              <div className={`w-full h-1 bg-gradient-to-r from-transparent ${loginResult === 'MATCHED' ? 'via-emerald-400' : loginResult === 'MISMATCH' ? 'via-rose-500' : 'via-indigo-500'} to-transparent animate-pulse`} style={{ animationDuration: '2s' }} />
            </div>
          )}

          {/* Live Video Element */}
          <video
            ref={videoRef}
            autoPlay
            muted
            playsInline
            onPlay={handleVideoPlay}
            width={videoWidth}
            height={videoHeight}
            className={`w-full h-full object-cover transform -scale-x-100 ${isCameraActive ? 'block' : 'hidden'}`}
          />

          {/* Canvas for Landmark Overlay */}
          <canvas
            ref={canvasRef}
            width={videoWidth}
            height={videoHeight}
            className={`absolute inset-0 w-full h-full object-cover transform -scale-x-100 z-10 ${isCameraActive ? 'block' : 'hidden'}`}
          />

          {/* Camera Inactive Placeholder */}
          {!isCameraActive && (
            <div className="flex flex-col items-center p-8 text-center">
              <div className="w-20 h-20 rounded-2xl bg-indigo-50 border border-indigo-100 flex items-center justify-center mb-5 shadow-sm text-indigo-600">
                <Camera className="w-10 h-10 text-indigo-600" />
              </div>
              <h3 className="text-xl font-bold text-slate-900 mb-2">Camera Ready for Verification</h3>
              <p className="text-sm text-slate-500 max-w-sm mb-6 leading-relaxed">
                Ensure adequate room lighting and face the camera directly without sunglasses or heavy occlusion.
              </p>
              <button
                onClick={startCamera}
                disabled={!modelsLoaded || !labeledFaceMatcher}
                className="px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 transition-all transform hover:scale-105 active:scale-95 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {!modelsLoaded ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Loading AI Models...</span>
                  </>
                ) : (
                  <>
                    <Camera className="w-4 h-4" />
                    <span>Start Biometric Scan</span>
                  </>
                )}
              </button>
            </div>
          )}

          {/* Live Confidence Badge in corner */}
          {isCameraActive && (
            <div className="absolute bottom-4 left-4 z-20 bg-white/95 backdrop-blur-md border border-slate-200 shadow-md text-slate-800 px-3.5 py-1.5 rounded-xl flex items-center gap-2 text-xs font-mono">
              <span className={`w-2.5 h-2.5 rounded-full ${loginResult === 'MATCHED' ? 'bg-emerald-500 animate-pulse' : loginResult === 'MISMATCH' ? 'bg-rose-500' : 'bg-amber-500 animate-ping'}`} />
              <span className="text-slate-900 font-bold">{matchScore}% Match Confidence</span>
            </div>
          )}
        </div>
      </main>

      {/* Footer Info */}
      <footer className="max-w-4xl w-full mx-auto flex items-center justify-between text-xs text-slate-500 pt-4 border-t border-slate-200">
        <div className="flex items-center gap-2">
          <Lock className="w-3.5 h-3.5 text-indigo-600" />
          <span>Encrypted 128-D Euclidean Vector Comparison</span>
        </div>
        <span className="font-medium">AI Mock Interview Proctoring System</span>
      </footer>
    </div>
  );
}

export default FaceDetection;