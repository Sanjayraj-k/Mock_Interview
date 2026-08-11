import React, { useState, useEffect, useContext, useRef } from 'react';
import { Book, Plus, Calendar, Settings, Users, Upload, Mail, Trash2, Edit3, ShieldCheck, AlertTriangle, Camera, CheckCircle2, Image as ImageIcon, RefreshCw, Eye } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import * as faceapi from 'face-api.js';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isExtractingFace, setIsExtractingFace] = useState(false);
  const [faceExtractionStatus, setFaceExtractionStatus] = useState(null); // 'SUCCESS', 'FAILED', null
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [croppedFacePreview, setCroppedFacePreview] = useState(null);
  
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    rollNo: '',
    role: 'Student', // Default role
    password: '',
    assignedRounds: ['coding'], // Default to coding only
    faceDescriptor: [],
    idCardPhoto: ''
  });
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');
  const { isTeacherAuthenticated, teacherData, handleTeacherLogout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Load face-api AI models once on component mount
  useEffect(() => {
    const loadModels = async () => {
      try {
        const uri = '/Face_AI_Models';
        await Promise.all([
          faceapi.nets.ssdMobilenetv1.loadFromUri(uri),
          faceapi.nets.faceLandmark68Net.loadFromUri(uri),
          faceapi.nets.faceRecognitionNet.loadFromUri(uri)
        ]);
        setModelsLoaded(true);
      } catch (err) {
        console.error('Failed to load Face-AI models:', err);
      }
    };
    loadModels();
  }, []);

  const fetchStudents = async () => {
    if (!teacherData?.email) return;
    try {
      setError('');
      const response = await fetch(`http://localhost:5000/api/students?teacherEmail=${encodeURIComponent(teacherData.email)}`);
      if (!response.ok) throw new Error('Failed to fetch students');
      const data = await response.json();
      setStudents(data);
    } catch (err) {
      setError(err.message);
    }
  };

  useEffect(() => {
    if (isTeacherAuthenticated && teacherData?.email) {
      fetchStudents();
    }
  }, [isTeacherAuthenticated, teacherData]);

  // Handle ID Card file upload and face embedding extraction
  const handleIdCardUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    if (!modelsLoaded) {
      setError('AI Face Detection models are still initializing. Please wait a few seconds.');
      return;
    }

    setIsExtractingFace(true);
    setFaceExtractionStatus(null);
    setError('');

    const reader = new FileReader();
    reader.onload = async () => {
      const base64Data = reader.result;
      setIdCardPreview(base64Data);

      try {
        const img = await faceapi.fetchImage(base64Data);
        const detection = await faceapi
          .detectSingleFace(img)
          .withFaceLandmarks()
          .withFaceDescriptor();

        if (!detection) {
          setFaceExtractionStatus('FAILED');
          setCroppedFacePreview(null);
          setNewStudent(prev => ({ ...prev, faceDescriptor: [], idCardPhoto: '' }));
          setError('No clear face detected on the ID card. Please upload a clear photo or ID card image.');
        } else {
          const descriptorArray = Array.from(detection.descriptor);
          
          // Crop detected face to make a thumbnail preview
          const box = detection.detection.box;
          const canvas = document.createElement('canvas');
          const padding = Math.min(box.width, box.height) * 0.2;
          const cropX = Math.max(0, box.x - padding);
          const cropY = Math.max(0, box.y - padding);
          const cropW = Math.min(img.width - cropX, box.width + padding * 2);
          const cropH = Math.min(img.height - cropY, box.height + padding * 2);

          canvas.width = cropW;
          canvas.height = cropH;
          const ctx = canvas.getContext('2d');
          ctx.drawImage(img, cropX, cropY, cropW, cropH, 0, 0, cropW, cropH);
          const croppedFaceUrl = canvas.toDataURL('image/jpeg', 0.85);

          setCroppedFacePreview(croppedFaceUrl);
          setFaceExtractionStatus('SUCCESS');
          setNewStudent(prev => ({
            ...prev,
            faceDescriptor: descriptorArray,
            idCardPhoto: croppedFaceUrl
          }));
          setSuccessMsg('Face detected & 128-D biometric embedding vector extracted successfully!');
        }
      } catch (err) {
        console.error('Error processing ID card face:', err);
        setFaceExtractionStatus('FAILED');
        setError('Error extracting face embedding: ' + err.message);
      } finally {
        setIsExtractingFace(false);
      }
    };
    reader.readAsDataURL(file);
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!teacherData?.email) {
      setError("Cannot add student: User identity not found.");
      return;
    }
    try {
      setError('');
      setSuccessMsg('');
      const response = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ 
          ...newStudent, 
          teacherEmail: teacherData.email,
          assignedRounds: newStudent.assignedRounds,
          faceDescriptor: newStudent.faceDescriptor,
          idCardPhoto: newStudent.idCardPhoto
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to add student');
      }
      const createdStudent = await response.json();
      setStudents([...students, createdStudent]);
      setSuccessMsg(`Student "${newStudent.name}" added successfully with ${newStudent.faceDescriptor.length > 0 ? 'biometric face embedding' : 'standard profile'}!`);
      
      // Reset form
      setNewStudent({
        name: '',
        email: '',
        rollNo: '',
        role: 'Student',
        password: '',
        assignedRounds: ['coding'],
        faceDescriptor: [],
        idCardPhoto: ''
      });
      setIdCardPreview(null);
      setCroppedFacePreview(null);
      setFaceExtractionStatus(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleFileUpload = async (e) => {
    e.preventDefault();
    if (!selectedFile) {
      setError('Please select an Excel file.');
      return;
    }
    const formData = new FormData();
    formData.append('file', selectedFile);
    formData.append('teacherEmail', teacherData.email);

    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/assign-students-excel', {
        method: 'POST',
        body: formData
      });
      if (!response.ok) throw new Error('Failed to assign students from Excel');
      const data = await response.json();
      setStudents([...students, ...data.students]);
      setSelectedFile(null);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleRoundSelection = (roundType, isChecked) => {
    let updatedRounds = [...newStudent.assignedRounds];
    
    if (roundType === 'coding') {
      if (isChecked && !updatedRounds.includes('coding')) {
        updatedRounds.push('coding');
      } else if (!isChecked) {
        updatedRounds = updatedRounds.filter(r => r !== 'coding');
      }
    } else if (roundType === 'aptitude') {
      if (isChecked && !updatedRounds.includes('aptitude')) {
        updatedRounds.push('aptitude');
      } else if (!isChecked) {
        updatedRounds = updatedRounds.filter(r => r !== 'aptitude');
      }
    } else if (roundType === 'interview') {
      if (isChecked && !updatedRounds.includes('interview')) {
        updatedRounds.push('interview');
      } else if (!isChecked) {
        updatedRounds = updatedRounds.filter(r => r !== 'interview');
      }
    }

    if (updatedRounds.length === 0) {
      updatedRounds = ['coding'];
    }

    setNewStudent({ ...newStudent, assignedRounds: updatedRounds });
  };

  const onLogout = () => {
    handleTeacherLogout();
    navigate('/teacher/login', { replace: true });
  };

  const getRoundDisplayText = (rounds) => {
    if (!rounds || rounds.length === 0) return 'No rounds assigned';
    return rounds.map(round => {
      switch(round) {
        case 'coding': return 'Coding';
        case 'aptitude': return 'Aptitude';
        case 'interview': return 'Interview';
        default: return round;
      }
    }).join(', ');
  };

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center">
                <Book className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">AI Mock Interview</h1>
                <p className="text-sm text-gray-500">Teacher Management Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">{teacherData?.name || 'Teacher'}</p>
                <p className="text-xs text-gray-500">{teacherData?.email || 'Loading...'}</p>
              </div>
              <button
                onClick={onLogout}
                className="px-4 py-2 text-sm font-medium text-white bg-red-600 hover:bg-red-700 rounded-lg transition-colors duration-200 shadow-sm"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex flex-1">
        <aside className="w-64 bg-white h-full shadow-sm border-r">
          <nav className="mt-6 px-4">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'dashboard' ? 'bg-yellow-50 text-yellow-700 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <Settings className="w-5 h-5 mr-3" />Dashboard
              </button>
              <button
                onClick={() => setActiveTab('students')}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${activeTab === 'students' ? 'bg-yellow-50 text-yellow-700 font-semibold' : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'}`}
              >
                <Users className="w-5 h-5 mr-3" />Students
              </button>
            </div>
          </nav>
        </aside>

        <main className="flex-1 p-6 lg:p-8">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6 flex items-center gap-2" role="alert">
              <CheckCircle2 className="w-5 h-5 text-green-600 shrink-0" />
              <span>{successMsg}</span>
            </div>
          )}
          {activeTab === 'dashboard' && <DashboardContent students={students} />}
          {activeTab === 'students' && (
            <StudentsContent
              students={students}
              newStudent={newStudent}
              setNewStudent={setNewStudent}
              handleAddStudent={handleAddStudent}
              handleFileUpload={handleFileUpload}
              selectedFile={selectedFile}
              setSelectedFile={setSelectedFile}
              handleRoundSelection={handleRoundSelection}
              getRoundDisplayText={getRoundDisplayText}
              modelsLoaded={modelsLoaded}
              isExtractingFace={isExtractingFace}
              faceExtractionStatus={faceExtractionStatus}
              idCardPreview={idCardPreview}
              croppedFacePreview={croppedFacePreview}
              handleIdCardUpload={handleIdCardUpload}
            />
          )}
        </main>
      </div>
    </div>
  );
}

const DashboardContent = ({ students }) => {
  const totalStudents = students.length;
  const codingOnlyStudents = students.filter(s => 
    s.assignedRounds && s.assignedRounds.length === 1 && s.assignedRounds.includes('coding')
  ).length;
  const allRoundsStudents = students.filter(s => 
    s.assignedRounds && s.assignedRounds.length === 3
  ).length;
  const biometricVerifiedStudents = students.filter(s => 
    s.hasFaceRegistered || (s.faceDescriptor && s.faceDescriptor.length > 0)
  ).length;

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
      <p className="text-gray-600 mb-6">Your personal overview of students, assigned rounds, and biometric verification.</p>
      
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Total Students</p>
              <p className="text-3xl font-bold text-gray-900">{totalStudents}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Biometrics Verified</p>
              <p className="text-3xl font-bold text-green-600">{biometricVerifiedStudents}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <ShieldCheck className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Coding Only</p>
              <p className="text-3xl font-bold text-gray-900">{codingOnlyStudents}</p>
            </div>
            <div className="w-12 h-12 bg-yellow-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-yellow-600" />
            </div>
          </div>
        </div>
        
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">All Rounds</p>
              <p className="text-3xl font-bold text-gray-900">{allRoundsStudents}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Settings className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

const StudentsContent = ({ 
  students, 
  newStudent, 
  setNewStudent, 
  handleAddStudent, 
  handleFileUpload, 
  selectedFile, 
  setSelectedFile, 
  handleRoundSelection,
  getRoundDisplayText,
  modelsLoaded,
  isExtractingFace,
  faceExtractionStatus,
  idCardPreview,
  croppedFacePreview,
  handleIdCardUpload
}) => (
  <div>
    <div className="flex items-center justify-between mb-6">
      <div>
        <h2 className="text-2xl font-bold text-gray-900">Student & Biometric Management</h2>
        <p className="text-sm text-gray-500">Register students and extract 128-D face embeddings from ID cards for automated anti-impersonation proctoring.</p>
      </div>
      <div className="flex items-center gap-2 bg-indigo-50 border border-indigo-100 text-indigo-700 px-3 py-1.5 rounded-lg text-xs font-medium">
        <span className={`w-2 h-2 rounded-full ${modelsLoaded ? 'bg-green-500' : 'bg-yellow-500 animate-ping'}`} />
        {modelsLoaded ? 'Face-AI Engine Ready (128-D)' : 'Initializing Face-AI...'}
      </div>
    </div>
    
    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Add Student Form */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Plus className="w-5 h-5 text-yellow-600" />
            Add New Student
          </h3>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
              <input
                type="email"
                placeholder="student@example.com"
                value={newStudent.email}
                onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                required
              />
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
              <input
                type="text"
                placeholder="e.g., 20BCE1234"
                value={newStudent.rollNo}
                onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                required
              />
            </div>

            {/* Student ID Card / Biometric Photo Extraction */}
            <div className="bg-gray-50 p-4 rounded-xl border border-dashed border-gray-300">
              <label className="block text-sm font-semibold text-gray-800 mb-1 flex items-center justify-between">
                <span className="flex items-center gap-1.5">
                  <ShieldCheck className="w-4 h-4 text-indigo-600" />
                  Student ID Card / Face Photo
                </span>
                <span className="text-xs text-gray-500 font-normal">Extracts 128-D Vector</span>
              </label>
              <p className="text-xs text-gray-500 mb-3">
                Upload institutional ID card image. The system extracts the biometric face embedding for login verification.
              </p>

              <div className="space-y-3">
                <input
                  type="file"
                  accept="image/png, image/jpeg, image/jpg"
                  onChange={handleIdCardUpload}
                  className="block w-full text-xs text-gray-500 file:mr-2 file:py-2 file:px-3 file:rounded-md file:border-0 file:text-xs file:font-semibold file:bg-yellow-50 file:text-yellow-700 hover:file:bg-yellow-100 cursor-pointer"
                />

                {isExtractingFace && (
                  <div className="flex items-center gap-2 p-3 bg-blue-50 border border-blue-200 rounded-lg text-blue-700 text-xs font-medium animate-pulse">
                    <RefreshCw className="w-4 h-4 animate-spin text-blue-600" />
                    <span>Detecting face & computing 128-D embedding vector...</span>
                  </div>
                )}

                {faceExtractionStatus === 'SUCCESS' && croppedFacePreview && (
                  <div className="flex items-center gap-3 p-3 bg-green-50 border border-green-200 rounded-lg">
                    <img 
                      src={croppedFacePreview} 
                      alt="Extracted Face" 
                      className="w-12 h-12 rounded-full object-cover border-2 border-green-500 shadow-sm"
                    />
                    <div className="flex-1 min-w-0">
                      <p className="text-xs font-semibold text-green-800 flex items-center gap-1">
                        <CheckCircle2 className="w-3.5 h-3.5 text-green-600" />
                        Face Embedding Extracted!
                      </p>
                      <p className="text-[11px] text-green-700 truncate">
                        128-Dimensional vector ready for login verification
                      </p>
                    </div>
                  </div>
                )}

                {faceExtractionStatus === 'FAILED' && (
                  <div className="flex items-center gap-2 p-2.5 bg-red-50 border border-red-200 rounded-lg text-red-700 text-xs">
                    <AlertTriangle className="w-4 h-4 text-red-600 shrink-0" />
                    <span>No clear face found on ID card. Please upload a clearer image.</span>
                  </div>
                )}
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={newStudent.role}
                onChange={(e) => setNewStudent({ ...newStudent, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                required
              >
                <option value="Student">Student</option>
                <option value="MockInterview">Mock Interview</option>
              </select>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-2">Assign Rounds</label>
              <div className="space-y-2">
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newStudent.assignedRounds.includes('coding')}
                    onChange={(e) => handleRoundSelection('coding', e.target.checked)}
                    className="mr-2 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Coding Round</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newStudent.assignedRounds.includes('aptitude')}
                    onChange={(e) => handleRoundSelection('aptitude', e.target.checked)}
                    className="mr-2 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Aptitude Round</span>
                </label>
                
                <label className="flex items-center">
                  <input
                    type="checkbox"
                    checked={newStudent.assignedRounds.includes('interview')}
                    onChange={(e) => handleRoundSelection('interview', e.target.checked)}
                    className="mr-2 h-4 w-4 text-yellow-600 focus:ring-yellow-500 border-gray-300 rounded"
                  />
                  <span className="text-sm text-gray-700">Interview Round</span>
                </label>
              </div>
              <p className="text-xs text-gray-500 mt-1">
                Selected: {getRoundDisplayText(newStudent.assignedRounds)}
              </p>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
              <input
                type="password"
                placeholder="Create a strong password"
                value={newStudent.password}
                onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                required
              />
            </div>
            
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-2.5 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </button>
          </form>
        </div>

        {/* Excel Upload */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4 flex items-center gap-2">
            <Upload className="w-5 h-5 text-yellow-600" />
            Upload Excel File
          </h3>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Excel File</label>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent text-sm"
                required
              />
              <p className="text-xs text-gray-500 mt-1">
                Excel should contain: name, email, rollNo (optional), rounds (optional)
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-2.5 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 flex items-center justify-center space-x-2 shadow-sm"
            >
              <Upload className="w-4 h-4" />
              <span>Upload & Assign</span>
            </button>
          </form>
        </div>
      </div>

      {/* Students Table */}
      <div className="lg:col-span-2">
        <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
          <div className="px-6 py-4 border-b border-gray-200 flex items-center justify-between">
            <h3 className="text-lg font-semibold text-gray-900">Enrolled Students & Biometrics</h3>
            <span className="text-xs text-gray-500 bg-gray-100 px-2.5 py-1 rounded-full font-medium">
              Total: {students.length}
            </span>
          </div>
          
          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-5 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Rounds</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">ID Biometrics</th>
                  <th className="px-4 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.length > 0 ? students.map(student => {
                  const hasBiometrics = student.hasFaceRegistered || (student.faceDescriptor && student.faceDescriptor.length > 0);
                  return (
                    <tr key={student._id} className="hover:bg-gray-50 transition-colors">
                      <td className="px-5 py-4 whitespace-nowrap">
                        <div className="flex items-center">
                          {student.idCardPhoto ? (
                            <img 
                              src={student.idCardPhoto} 
                              alt={student.name} 
                              className="w-10 h-10 rounded-full object-cover border border-gray-200 shadow-sm"
                            />
                          ) : (
                            <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex-shrink-0 flex items-center justify-center shadow-sm">
                              <span className="text-white font-semibold text-sm">
                                {student.name?.charAt(0)?.toUpperCase() || 'S'}
                              </span>
                            </div>
                          )}
                          <div className="ml-3.5">
                            <div className="text-sm font-semibold text-gray-900">{student.name}</div>
                            <div className="text-xs text-gray-500">{student.email}</div>
                          </div>
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm text-gray-700 font-mono font-medium">{student.rollNo}</td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        <div className="flex flex-wrap gap-1">
                          {student.assignedRounds?.map(round => (
                            <span key={round} className="px-2 py-0.5 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                              {round.charAt(0).toUpperCase() + round.slice(1)}
                            </span>
                          )) || (
                            <span className="px-2 py-0.5 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              Coding
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap">
                        {hasBiometrics ? (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-semibold rounded-full bg-green-50 text-green-700 border border-green-200 shadow-sm">
                            <ShieldCheck className="w-3.5 h-3.5 text-green-600" />
                            Verified (128-D)
                          </span>
                        ) : (
                          <span className="inline-flex items-center gap-1 px-2.5 py-1 text-xs font-medium rounded-full bg-amber-50 text-amber-700 border border-amber-200">
                            <AlertTriangle className="w-3.5 h-3.5 text-amber-500" />
                            No ID Photo
                          </span>
                        )}
                      </td>
                      <td className="px-4 py-4 whitespace-nowrap text-sm font-medium">
                        <div className="flex space-x-1">
                          <button 
                            className="p-1.5 text-gray-500 hover:text-gray-700 hover:bg-gray-100 rounded-lg transition-colors"
                            title="Edit Student"
                          >
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button 
                            className="p-1.5 text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg transition-colors"
                            title="Delete Student"
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                }) : (
                  <tr>
                    <td colSpan="5" className="text-center py-12 text-gray-500">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-3" />
                      <p className="font-medium text-gray-700">No students registered yet</p>
                      <p className="text-xs text-gray-400 mt-1">Add a student using the form on the left with their ID card photo.</p>
                    </td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  </div>
);