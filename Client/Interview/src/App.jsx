import React, { useContext } from 'react';
import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';
import { AuthContext, AuthProvider } from './context/AuthContext';
import Login from './Dashboard/login';
import Signup from './Dashboard/Signup';
import HRDashboard from './Dashboard/Hr';
import LandingPage from './Auth/Landingpage';
import StudentLogin from './Auth/login'; // Renamed from Logins for clarity
import UserSelect from './pages/UserSelect.jsx';
import FaceDetection from './pages/FaceDetection.jsx';
import Protected from './pages/Protected.jsx'; // Added assuming it exists
import GoogleFormWithWebcam from './pages/GoogleForm.jsx';
import WebCam from './pages/webCam.jsx'; // Adjusted extension for consistency
import Round1 from './pages/Round1.jsx';
import Interview from './pages/Interview.jsx'; // Assuming this is the interview page
import Uploadpage from './pages/UploadPage.jsx'; // Assuming this is the upload page
import Ats from './pages/Ats.jsx';
import Upload from './student/Upload.jsx'
import PracticeQuiz from './pages/PracticeQuiz.jsx';
import CodingPage from './pages/Coding.jsx';
import StudentLandingpage from './Auth/StudentLandingpage.jsx'; // Assuming this is the landing page for students
import QuestionBank from './pages/QuestionBank.jsx';
import QuestionForum from './pages/QuestionForum.jsx'; // Assuming this is the question forum page
import Assistant from './pages/Assistant.jsx';
import CompanyProfileFetcher from './student/CompanyFetch.jsx';
import Domain from './pages/Domainforum.jsx';
import Int from './pages/int.jsx';
// Assuming this is the question bank page
// Assuming this is the ATS page
// Adjusted import for clarity
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
            <Route path="scrap" element={<CompanyProfileFetcher />} />
            {/* 3. Candidate Route */}
            <Route path="/candidate">
              <Route index element={<Navigate to="/candidate/login" replace />} />
              <Route path="login" element={<StudentLogin />} />
            </Route>
            <Route path="/student">

              <Route path="landing" element={<StudentLandingpage />} />
              <Route path="questionBank" element={<QuestionBank />} />
              <Route path="ats" element={<Ats />} />
              <Route path="questionforum" element={<QuestionForum />} />
              <Route path="upload" element={<Upload />} />
              <Route path="practicequiz" element={<PracticeQuiz />} />
              <Route path="Assistant" element={<Assistant />} />
              <Route path="domain" element={<Domain />} />
              <Route path="companyscrap" element={<CompanyProfileFetcher />} />
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
            {/* Alias route in case older code navigates here after ID upload */}
            <Route
              path="/uploadface"
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
                <Round1 />
              </ProtectedCandidateRoute>
            } />
            <Route path="/coding" element={
              <ProtectedCandidateRoute>
                <CodingPage />
              </ProtectedCandidateRoute>
            } />

            <Route path="/interview" element={
              <ProtectedCandidateRoute>
                <Interview />
              </ProtectedCandidateRoute>

            } />
            <Route path="/int" element={<Int />} />

            {/* 5. Fallback Route - Redirects any unknown URL to the landing page */}
            <Route path="*" element={<Navigate to="/" replace />} />
          </Routes>

        </div>
      </Router>
    </AuthProvider>
  );
}

export default App;