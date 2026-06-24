import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isHRAuthenticated, setIsHRAuthenticated] = useState(() => {
    return !!localStorage.getItem('hr');
  });
  const [hrData, setHRData] = useState(() => {
    const stored = localStorage.getItem('hr');
    return stored ? JSON.parse(stored) : null;
  });
  const [isCandidateAuthenticated, setIsCandidateAuthenticated] = useState(() => {
    return !!localStorage.getItem('candidate');
  });
  const [candidateData, setCandidateData] = useState(() => {
    const stored = localStorage.getItem('candidate');
    return stored ? JSON.parse(stored) : null;
  });
  const [isTeacherAuthenticated, setIsTeacherAuthenticated] = useState(() => {
    return !!localStorage.getItem('teacher');
  });
  const [teacherData, setTeacherData] = useState(() => {
    const stored = localStorage.getItem('teacher');
    return stored ? JSON.parse(stored) : null;
  });

  // HR Login Logic
  const handleHRLogin = (data) => {
    console.log('Handling HR login with data:', data); // Debug
    setIsHRAuthenticated(true);
    setHRData(data);
    localStorage.setItem('hr', JSON.stringify(data)); // Sync with localStorage
    console.log('Auth state updated:', { isHRAuthenticated: true, hrData: data }); // Debug
  };

  const handleHRLogout = () => {
    console.log('Handling HR logout'); // Debug
    setIsHRAuthenticated(false);
    setHRData(null);
    localStorage.removeItem('hr'); // Clear from localStorage
  };

  // Candidate Login Logic
  const handleCandidateLogin = (data) => {
    console.log('Handling Candidate login with data:', data); // Debug
    setIsCandidateAuthenticated(true);
    setCandidateData(data);
    localStorage.setItem('candidate', JSON.stringify(data)); // Sync with localStorage
    console.log('Auth state updated:', { isCandidateAuthenticated: true, candidateData: data }); // Debug
  };

  const handleCandidateLogout = () => {
    console.log('Handling Candidate logout'); // Debug
    setIsCandidateAuthenticated(false);
    setCandidateData(null);
    localStorage.removeItem('candidate'); // Clear from localStorage
  };

  // Teacher Login Logic (New)
  const handleTeacherLogin = (data) => {
    console.log('Handling Teacher login with data:', data); // Debug
    setIsTeacherAuthenticated(true);
    setTeacherData(data);
    localStorage.setItem('teacher', JSON.stringify(data)); // Sync with localStorage
    console.log('Auth state updated:', { isTeacherAuthenticated: true, teacherData: data }); // Debug
  };

  // Teacher Logout Logic (New)
  const handleTeacherLogout = () => {
    console.log('Handling Teacher logout'); // Debug
    setIsTeacherAuthenticated(false);
    setTeacherData(null);
    localStorage.removeItem('teacher'); // Clear from localStorage
  };

  // Sync with localStorage
  useEffect(() => {
    const storedHRUser = localStorage.getItem('hr') ? JSON.parse(localStorage.getItem('hr')) : null;
    const storedCandidate = localStorage.getItem('candidate') ? JSON.parse(localStorage.getItem('candidate')) : null;
    const storedTeacher = localStorage.getItem('teacher') ? JSON.parse(localStorage.getItem('teacher')) : null; // New: Teacher sync

    if (storedHRUser) {
      setIsHRAuthenticated(true);
      setHRData(storedHRUser);
    }
    if (storedCandidate) {
      setIsCandidateAuthenticated(true);
      setCandidateData(storedCandidate);
    }
    if (storedTeacher) {
      setIsTeacherAuthenticated(true);
      setTeacherData(storedTeacher);
    }
  }, []);

  return (
    <AuthContext.Provider value={{
      isHRAuthenticated,
      hrData,
      handleHRLogin,
      handleHRLogout,
      isCandidateAuthenticated,
      candidateData,
      handleCandidateLogin,
      handleCandidateLogout,
      isTeacherAuthenticated, // New
      teacherData, // New
      handleTeacherLogin, // New
      handleTeacherLogout, // New
    }}>
      {children}
    </AuthContext.Provider>
  );
};