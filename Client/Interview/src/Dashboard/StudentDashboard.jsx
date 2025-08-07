import React, { useState, useEffect, useContext } from 'react';
import { useNavigate } from 'react-router-dom';
import { Code, BookOpen, Video, Trophy, Lock, CheckCircle } from 'lucide-react';
import { AuthContext } from '../context/AuthContext';

export default function StudentDashboard() {
  const [studentRounds, setStudentRounds] = useState(null);
  const [completedRounds, setCompletedRounds] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const { isStudentAuthenticated, studentData } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isStudentAuthenticated && studentData?.email) {
      fetchStudentRounds();
      fetchCompletedRounds();
    }
  }, [isStudentAuthenticated, studentData]);

  const fetchStudentRounds = async () => {
    try {
      const response = await fetch(`http://localhost:5000/api/student/rounds?email=${encodeURIComponent(studentData.email)}`);
      if (!response.ok) throw new Error('Failed to fetch student rounds');
      const data = await response.json();
      setStudentRounds(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const fetchCompletedRounds = async () => {
    try {
      // Fetch quiz results to determine completed rounds
      const response = await fetch(`http://localhost:5000/api/test-results?role=${encodeURIComponent(studentData.role)}`);
      if (response.ok) {
        const results = await response.json();
        const studentResults = results.find(result => result.email === studentData.email);
        if (studentResults) {
          const completed = [];
          if (studentResults.round1_score !== null) completed.push(1);
          if (studentResults.round2_score !== null) completed.push(2);
          if (studentResults.round3_score !== null) completed.push(3);
          setCompletedRounds(completed);
        }
      }
    } catch (err) {
      console.error('Error fetching completed rounds:', err);
    }
  };

  const handleRoundClick = async (roundNumber) => {
    if (!studentRounds) return;

    // Check if round is allowed
    const roundMap = {1: "coding", 2: "aptitude", 3: "interview"};
    const roundName = roundMap[roundNumber];
    
    if (studentRounds.restrictRounds && !studentRounds.allowedRounds.includes(roundName)) {
      alert("You are not assigned to this round. Please contact your teacher.");
      return;
    }

    // Check if round is already completed
    if (completedRounds.includes(roundNumber)) {
      alert("You have already completed this round.");
      return;
    }

    // For teacher-assigned students, check sequential completion
    if (studentRounds.restrictRounds && studentRounds.assignedBy === "teacher") {
      const allowedRounds = studentRounds.allowedRounds;
      
      // Check if previous rounds are completed (only for assigned rounds)
      if (roundNumber === 2 && allowedRounds.includes("coding") && !completedRounds.includes(1)) {
        alert("Please complete the Coding round first.");
        return;
      }
      if (roundNumber === 3 && allowedRounds.includes("aptitude") && !completedRounds.includes(2)) {
        alert("Please complete the Aptitude round first.");
        return;
      }
      if (roundNumber === 3 && allowedRounds.includes("coding") && !allowedRounds.includes("aptitude") && !completedRounds.includes(1)) {
        alert("Please complete the Coding round first.");
        return;
      }
    }

    // Navigate to appropriate round
    switch (roundNumber) {
      case 1:
        navigate('/student/coding-test');
        break;
      case 2:
        navigate('/student/aptitude-test');
        break;
      case 3:
        navigate('/student/interview');
        break;
      default:
        break;
    }
  };

  const getRoundStatus = (roundNumber) => {
    if (!studentRounds) return 'loading';
    
    const roundMap = {1: "coding", 2: "aptitude", 3: "interview"};
    const roundName = roundMap[roundNumber];
    
    // If round is completed
    if (completedRounds.includes(roundNumber)) {
      return 'completed';
    }
    
    // If round is not allowed for teacher-assigned students
    if (studentRounds.restrictRounds && !studentRounds.allowedRounds.includes(roundName)) {
      return 'restricted';
    }
    
    // For teacher-assigned students, check if previous rounds are completed
    if (studentRounds.restrictRounds && studentRounds.assignedBy === "teacher") {
      const allowedRounds = studentRounds.allowedRounds;
      
      if (roundNumber === 2 && allowedRounds.includes("coding") && !completedRounds.includes(1)) {
        return 'locked';
      }
      if (roundNumber === 3 && allowedRounds.includes("aptitude") && !completedRounds.includes(2)) {
        return 'locked';
      }
      if (roundNumber === 3 && allowedRounds.includes("coding") && !allowedRounds.includes("aptitude") && !completedRounds.includes(1)) {
        return 'locked';
      }
    }
    
    return 'available';
  };

  const getRoundIcon = (roundNumber, status) => {
    const iconClass = "w-8 h-8";
    
    if (status === 'completed') {
      return <CheckCircle className={`${iconClass} text-green-600`} />;
    }
    if (status === 'restricted' || status === 'locked') {
      return <Lock className={`${iconClass} text-gray-400`} />;
    }
    
    switch (roundNumber) {
      case 1:
        return <Code className={`${iconClass} text-blue-600`} />;
      case 2:
        return <BookOpen className={`${iconClass} text-purple-600`} />;
      case 3:
        return <Video className={`${iconClass} text-orange-600`} />;
      default:
        return null;
    }
  };

  const getRoundButtonClass = (status) => {
    const baseClass = "p-6 rounded-xl border transition-all duration-200 cursor-pointer";
    
    switch (status) {
      case 'completed':
        return `${baseClass} bg-green-50 border-green-200 hover:bg-green-100`;
      case 'available':
        return `${baseClass} bg-white border-gray-200 hover:bg-gray-50 hover:border-gray-300 hover:shadow-md`;
      case 'restricted':
      case 'locked':
        return `${baseClass} bg-gray-50 border-gray-200 cursor-not-allowed opacity-60`;
      default:
        return `${baseClass} bg-gray-50 border-gray-200`;
    }
  };

  const getStatusText = (status) => {
    switch (status) {
      case 'completed':
        return 'Completed';
      case 'available':
        return 'Start Round';
      case 'restricted':
        return 'Not Assigned';
      case 'locked':
        return 'Complete Previous Round';
      default:
        return 'Loading...';
    }
  };

  const getAllRoundsCompleted = () => {
    if (!studentRounds) return false;
    
    if (studentRounds.restrictRounds) {
      // For teacher-assigned students, check if all assigned rounds are completed
      const assignedRoundNumbers = studentRounds.allowedRounds.map(round => {
        switch(round) {
          case 'coding': return 1;
          case 'aptitude': return 2;
          case 'interview': return 3;
          default: return null;
        }
      }).filter(Boolean);
      
      return assignedRoundNumbers.every(roundNum => completedRounds.includes(roundNum));
    } else {
      // For HR-assigned students, check all 3 rounds
      return completedRounds.length === 3;
    }
  };

  if (loading) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <div className="animate-spin rounded-full h-32 w-32 border-b-2 border-blue-600 mx-auto"></div>
          <p className="mt-4 text-gray-600">Loading your dashboard...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gray-50 flex items-center justify-center">
        <div className="text-center">
          <p className="text-red-600 mb-4">Error: {error}</p>
          <button 
            onClick={() => window.location.reload()} 
            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700"
          >
            Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Header */}
        <div className="mb-8">
          <h1 className="text-3xl font-bold text-gray-900">Student Dashboard</h1>
          <p className="text-gray-600 mt-2">
            Welcome back, {studentData?.name}! 
            {studentRounds && (
              <span className="ml-2 px-2 py-1 text-xs bg-blue-100 text-blue-800 rounded-full">
                {studentRounds.assignedBy === 'hr' ? 'HR Assigned' : 'Teacher Assigned'}
              </span>
            )}
          </p>
          {studentRounds?.restrictRounds && (
            <p className="text-sm text-blue-600 mt-1">
              Assigned rounds: {studentRounds.allowedRounds.map(r => r.charAt(0).toUpperCase() + r.slice(1)).join(', ')}
            </p>
          )}
        </div>

        {/* Progress Overview */}
        {studentRounds && (
          <div className="bg-white rounded-xl shadow-sm border p-6 mb-8">
            <h2 className="text-lg font-semibold text-gray-900 mb-4">Progress Overview</h2>
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm text-gray-600">Completed Rounds</p>
                <p className="text-2xl font-bold text-gray-900">
                  {completedRounds.length} / {studentRounds.restrictRounds ? studentRounds.allowedRounds.length : 3}
                </p>
              </div>
              {getAllRoundsCompleted() && (
                <div className="flex items-center text-green-600">
                  <Trophy className="w-6 h-6 mr-2" />
                  <span className="font-semibold">All Rounds Completed!</span>
                </div>
              )}
            </div>
          </div>
        )}

        {/* Rounds Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {/* Round 1: Coding */}
          <div 
            className={getRoundButtonClass(getRoundStatus(1))}
            onClick={() => handleRoundClick(1)}
          >
            <div className="flex items-center justify-between mb-4">
              {getRoundIcon(1, getRoundStatus(1))}
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                getRoundStatus(1) === 'completed' ? 'bg-green-100 text-green-800' :
                getRoundStatus(1) === 'available' ? 'bg-blue-100 text-blue-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                Round 1
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Coding Round</h3>
            <p className="text-gray-600 text-sm mb-4">
              Test your programming skills with algorithmic problems
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Duration: 60 mins</span>
              <span className={`text-sm font-medium ${
                getRoundStatus(1) === 'completed' ? 'text-green-600' :
                getRoundStatus(1) === 'available' ? 'text-blue-600' :
                'text-gray-500'
              }`}>
                {getStatusText(getRoundStatus(1))}
              </span>
            </div>
          </div>

          {/* Round 2: Aptitude */}
          <div 
            className={getRoundButtonClass(getRoundStatus(2))}
            onClick={() => handleRoundClick(2)}
          >
            <div className="flex items-center justify-between mb-4">
              {getRoundIcon(2, getRoundStatus(2))}
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                getRoundStatus(2) === 'completed' ? 'bg-green-100 text-green-800' :
                getRoundStatus(2) === 'available' ? 'bg-purple-100 text-purple-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                Round 2
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">Aptitude Test</h3>
            <p className="text-gray-600 text-sm mb-4">
              Assess your logical reasoning and quantitative abilities
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Duration: 45 mins</span>
              <span className={`text-sm font-medium ${
                getRoundStatus(2) === 'completed' ? 'text-green-600' :
                getRoundStatus(2) === 'available' ? 'text-purple-600' :
                'text-gray-500'
              }`}>
                {getStatusText(getRoundStatus(2))}
              </span>
            </div>
          </div>

          {/* Round 3: Interview */}
          <div 
            className={getRoundButtonClass(getRoundStatus(3))}
            onClick={() => handleRoundClick(3)}
          >
            <div className="flex items-center justify-between mb-4">
              {getRoundIcon(3, getRoundStatus(3))}
              <span className={`text-sm font-medium px-2 py-1 rounded-full ${
                getRoundStatus(3) === 'completed' ? 'bg-green-100 text-green-800' :
                getRoundStatus(3) === 'available' ? 'bg-orange-100 text-orange-800' :
                'bg-gray-100 text-gray-600'
              }`}>
                Round 3
              </span>
            </div>
            <h3 className="text-xl font-semibold text-gray-900 mb-2">AI Interview</h3>
            <p className="text-gray-600 text-sm mb-4">
              Face an AI-powered technical interview simulation
            </p>
            <div className="flex items-center justify-between">
              <span className="text-sm text-gray-500">Duration: 30 mins</span>
              <span className={`text-sm font-medium ${
                getRoundStatus(3) === 'completed' ? 'text-green-600' :
                getRoundStatus(3) === 'available' ? 'text-orange-600' :
                'text-gray-500'
              }`}>
                {getStatusText(getRoundStatus(3))}
              </span>
            </div>
          </div>
        </div>

        {/* Instructions */}
        <div className="mt-8 bg-blue-50 border border-blue-200 rounded-xl p-6">
          <h3 className="text-lg font-semibold text-blue-900 mb-3">Instructions</h3>
          <ul className="text-blue-800 text-sm space-y-2">
            {studentRounds?.restrictRounds ? (
              <>
                <li>• You are assigned to specific rounds by your teacher</li>
                <li>• Complete rounds in the order they become available</li>
                <li>• You cannot access rounds that are not assigned to you</li>
                <li>• Your test will end automatically after completing all assigned rounds</li>
              </>
            ) : (
              <>
                <li>• Complete all three rounds to finish the assessment</li>
                <li>• You can take rounds in any order, but sequential completion is recommended</li>
                <li>• Each round can only be attempted once</li>
                <li>• Make sure you have a stable internet connection</li>
              </>
            )}
            <li>• Ensure your webcam and microphone are working for proctoring</li>
            <li>• Do not close the browser or navigate away during tests</li>
          </ul>
        </div>
      </div>
    </div>
  );
}