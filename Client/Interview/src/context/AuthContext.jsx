import React, { createContext, useState, useEffect } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isHRAuthenticated, setIsHRAuthenticated] = useState(false);
  const [hrData, setHRData] = useState(null);
  const [isCandidateAuthenticated, setIsCandidateAuthenticated] = useState(false);
  const [candidateData, setCandidateData] = useState(null);

  // HR Login Logic
  const handleHRLogin = (data) => {
    console.log('Handling HR login with data:', data); // Debug
    setIsHRAuthenticated(true);
    setHRData(data);
    console.log('Auth state updated:', { isHRAuthenticated: true, hrData: data }); // Debug
  };

  const handleHRLogout = () => {
    console.log('Handling HR logout'); // Debug
    setIsHRAuthenticated(false);
    setHRData(null);
  };

  // Candidate Login Logic
  const handleCandidateLogin = (data) => {
    console.log('Handling Candidate login with data:', data); // Debug
    setIsCandidateAuthenticated(true);
    setCandidateData(data);
    console.log('Auth state updated:', { isCandidateAuthenticated: true, candidateData: data }); // Debug
  };

  const handleCandidateLogout = () => {
    console.log('Handling Candidate logout'); // Debug
    setIsCandidateAuthenticated(false);
    setCandidateData(null);
  };

  // Sync with localStorage
  useEffect(() => {
    const storedHRUser = localStorage.getItem('hr') ? JSON.parse(localStorage.getItem('hr')) : null;
    const storedCandidate = localStorage.getItem('candidate') ? JSON.parse(localStorage.getItem('candidate')) : null;

    if (storedHRUser) {
      setIsHRAuthenticated(true);
      setHRData(storedHRUser);
    }
    if (storedCandidate) {
      setIsCandidateAuthenticated(true);
      setCandidateData(storedCandidate);
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
    }}>
      {children}
    </AuthContext.Provider>
  );
};