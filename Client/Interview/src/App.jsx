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
import CodingPage from './pages/Codingpage.jsx';
import Co from './pages/co.jsx'; 
import Round1 from './pages/Round1.jsx';
import Interview from './pages/Interview.jsx'; // Assuming this is the interview page
import Uploadpage from './pages/Uploadresumepage.jsx'; // Adjusted import for clarity
// Adjusted import for clarity
// Assuming this is the code editor page
// Protected Route for HR
const ProtectedHRRoute = ({ children }) => {
  const { isHRAuthenticated } = useContext(AuthContext);
  console.log('ProtectedHRRoute: isHRAuthenticated =', isHRAuthenticated); // Debug
  return isHRAuthenticated ? children : <Navigate to="/hr/login" replace />;
};

// Protected Route for Candidates
const ProtectedCandidateRoute = ({ children }) => {
  const { isCandidateAuthenticated } = useContext(AuthContext);
  console.log('ProtectedCandidateRoute: isCandidateAuthenticated =', isCandidateAuthenticated); // Debug
  return isCandidateAuthenticated ? children : <Navigate to="/candidate/login" replace />;
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

            {/* 4. Protected Candidate Pages */}
            <Route
              path="/user-select"
              element={
                <ProtectedCandidateRoute>
                  <UserSelect />
                </ProtectedCandidateRoute>
              }
            />
            <Route
              path="/face"
              element={
                <ProtectedCandidateRoute>
                  <FaceDetection />
                </ProtectedCandidateRoute>
              }
            />
            <Route
              path="/protected"
              element={
                <ProtectedCandidateRoute>
                  <Protected />
                </ProtectedCandidateRoute>
              }
            />
            <Route
              path="/googleform"
              element={
                <ProtectedCandidateRoute>
                  <GoogleFormWithWebcam />
                </ProtectedCandidateRoute>
              }
            />
            <Route
              path="/web"
              element={
                <ProtectedCandidateRoute>
                  <WebCam />
                </ProtectedCandidateRoute>
              }
            />
             <Route path="/round1" element={
              <ProtectedCandidateRoute>
              <Round1/>
              </ProtectedCandidateRoute>
            }/>
            <Route path="/coding" element={
              <ProtectedCandidateRoute>
              <CodingPage/>
              </ProtectedCandidateRoute>
            }/>
            <Route path="/interview" element={<Interview/>}/>
            <Route path="/resumeupload" element={<Uploadpage/>}/>
            {/* 5. Fallback Route - Redirects any unknown URL to the landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;