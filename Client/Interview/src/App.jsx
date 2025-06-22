import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext.jsx';

// Import all your pages
import LandingPage from './Auth/Landingpage'; // The new landing page
import Login from './Dashboard/login'; // HR Login
import Signup from './Dashboard/signup'; // HR Signup
import HRDashboard from './Dashboard/Hr'; // HR Dashboard
import Logins from './Auth/login'; // Candidate Login (Assuming this is the correct component)

// This protected route is essential and correctly implemented.
const ProtectedHRRoute = ({ children }) => {
  const { isHRAuthenticated } = useContext(AuthContext);
  // While loading or on initial check, you might want a loading spinner here
  return isHRAuthenticated ? children : <Navigate to="/hr/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* 1. Landing Page Route - This is the main entry point */}
            <Route path="/" element={<LandingPage />} />

            {/* 2. HR Routes - The flow starts from the landing page link */}
            <Route path="/hr">
              <Route index element={<Navigate to="/hr/login" replace />} />
              <Route path="login" element={<Login />} />
              <Route path="signup" element={<Signup />} />
              <Route
                path="dashboard"
                element={
                  <ProtectedHRRoute>
                    <HRDashboard />
                  </ProtectedHRRoute>
                }
              />
            </Route>

            {/* 3. Candidate Routes */}
            <Route path="/candidate">
              <Route index element={<Navigate to="/candidate/login" replace />} />
              <Route path="login" element={<Logins />} />
              {/* Add candidate signup and dashboard routes here later */}
            </Route>

            {/* 4. Fallback Route - Redirects any unknown URL to the landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;