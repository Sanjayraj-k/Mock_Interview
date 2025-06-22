import React, { createContext, useState } from 'react';

export const AuthContext = createContext();

export const AuthProvider = ({ children }) => {
  const [isHRAuthenticated, setIsHRAuthenticated] = useState(false);
  const [hrData, setHRData] = useState(null);

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

  return (
    <AuthContext.Provider value={{ isHRAuthenticated, hrData, handleHRLogin, handleHRLogout }}>
      {children}
    </AuthContext.Provider>
  );
};