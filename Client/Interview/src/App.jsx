import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './Dashboard/login';
import Signup from './Dashboard/Signup';
import HRDashboard from './Dashboard/Hr';
import LandingPage from './Auth/LandingPage';
import StudentLogin from './Auth/login'; // Renamed from Logins for clarity
import UserSelect from './pages/UserSelect.jsx';
import FaceDetection from './pages/FaceDetection.jsx';
import Protected from './pages/Protected.jsx'; // Added assuming it exists
import GoogleFormWithWebcam from './pages/GoogleForm.jsx';
import WebCam from './pages/webCam.jsx'; // Adjusted extension for consistency

// Protected Route for HR
const ProtectedHRRoute = ({ children }) => {
  const { isHRAuthenticated } = useContext(AuthContext);
  console.log('ProtectedHRRoute: isHRAuthenticated =', isHRAuthenticated); // Debug
  return isHRAuthenticated ? children : <Navigate to="/hr/login" replace />;
};

function App() {
  return (
    <AuthProvider>
      <Router>
        <div className="App">
          <Routes>
            {/* 1. Landing Page Route - Main entry point */}
            <Route path="/" element={<LandingPage />} />

            {/* 2. HR Routes */}
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

            {/* 3. Candidate Route */}
            <Route path="/candidate">
              <Route index element={<Navigate to="/candidate/login" replace />} />
              <Route path="login" element={<StudentLogin />} />
            </Route>

            {/* 4. Candidate Pages (No Protection) */}
            <Route path="/user-select" element={<UserSelect />} />
            <Route path="/face" element={<FaceDetection />} />
            <Route path="/protected" element={<Protected />} />
            <Route path="/googleform" element={<GoogleFormWithWebcam />} />
            <Route path="/web" element={<WebCam />} />

            {/* 5. Fallback Route - Redirects any unknown URL to the landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>
        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;