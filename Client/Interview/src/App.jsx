import React, { useContext } from 'react';

import { BrowserRouter as Router, Routes, Route, Navigate } from 'react-router-dom';

import { AuthContext, AuthProvider } from './context/AuthContext';

import Login from './Dashboard/login';
import StudentLandingpage from './Auth/StudentLandingpage.jsx';
import Signup from './Dashboard/Signup';

import HRDashboard from './Dashboard/Hr';

import LandingPage from './Auth/LandingPage';

import StudentLogin from './Auth/login'; // Renamed from Logins for clarity

import TeacherLogin from './Dashboard/TeacherLogin';

import TeacherSignup from './Dashboard/TeacherSignup'; // New signup component

import TeacherDashboard from './Dashboard/TeacherDashboard';

import UserSelect from './pages/UserSelect.jsx';

import FaceDetection from './pages/FaceDetection.jsx';

import Protected from './pages/Protected.jsx';

import GoogleFormWithWebcam from './pages/GoogleForm.jsx';

import WebCam from './pages/webCam.jsx';

import Result from './pages/Result.jsx';

import Coding from './pages/Coding.jsx';

import Round1 from './pages/Round1.jsx';

import Round2 from './pages/Hrround.jsx';

import Interview from './pages/Interview.jsx';

import Assistant from './pages/Assistant.jsx';

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



// Protected Route for Teachers

const ProtectedTeacherRoute = ({ children }) => {

  const { isTeacherAuthenticated } = useContext(AuthContext);

  console.log('ProtectedTeacherRoute: isTeacherAuthenticated =', isTeacherAuthenticated); // Debug

  return isTeacherAuthenticated ? children : <Navigate to="/teacher/login" replace />;

};



function App() {

  return (

    <AuthProvider>

      <Router>

        <div className="App">

          <Routes>

            {/* 1. Landing Page Route - Main entry point */}

            <Route path="/" element={<LandingPage />} />
            <Route

path="assistant"

element={


    <Assistant />
}

/>


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
          

            {/* 3. Candidate Routes */}

            <Route path="/candidate">

              <Route index element={<Navigate to="/candidate/login" replace />} />

              <Route path="login" element={<StudentLogin />} />

            </Route>


            <Route path="/student">
              
              <Route path="landing" element={<StudentLandingpage/>} />
              
            </Route>
            {/* 4. Teacher Routes */}

            <Route path="/teacher">

              <Route index element={<Navigate to="/teacher/login" replace />} />

              <Route path="login" element={<TeacherLogin />} />

              <Route path="signup" element={<TeacherSignup />} /> {/* New signup route */}

              <Route

                path="dashboard"

                element={

                  <ProtectedTeacherRoute>

                    <TeacherDashboard />

                  </ProtectedTeacherRoute>

                }

              />

            </Route>



            {/* 5. Protected Candidate Pages */}

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

            <Route

              path="/coding"

              element={

                <ProtectedCandidateRoute>

                  <Coding />

                </ProtectedCandidateRoute>

              }

            />

            <Route

              path="/result"

              element={

                <ProtectedCandidateRoute>

                  <Result />

                </ProtectedCandidateRoute>

              }

            />

            <Route

              path="/round1"

              element={

                <ProtectedCandidateRoute>

                  <Round1 />

                </ProtectedCandidateRoute>

              }

            />

            <Route

              path="/round2"

              element={

                <ProtectedCandidateRoute>

                  <Round2 />

                </ProtectedCandidateRoute>

              }

            />

            <Route

              path="/interview"

              element={

                <ProtectedCandidateRoute>

                  <Interview />

                </ProtectedCandidateRoute>

              }

            />



            {/* 6. Fallback Route - Redirects any unknown URL to the landing page */}

            <Route path="*" element={<Navigate to="/" replace />} />

          </Routes>

        </div>

      </Router>

    </AuthProvider>

  );

}



export default App;