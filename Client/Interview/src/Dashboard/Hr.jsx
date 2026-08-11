// src/Dashboard/Hr.jsx

import React, { useState, useEffect, useContext, useRef } from 'react';
import { User, Plus, Calendar, Settings, Eye, Trash2, Edit3, Users, X, Award, Clock, Mail, User as UserIcon, ShieldCheck, AlertTriangle, Camera, CheckCircle2, Image as ImageIcon, RefreshCw, Layers, ChevronDown, ChevronRight, Search, UserPlus, Tag, Check } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import * as faceapi from 'face-api.js';

// ================================================================================================
// Group color presets
// ================================================================================================
const GROUP_COLOR_PRESETS = [
  { name: 'Emerald', value: '#10B981' },
  { name: 'Blue', value: '#3B82F6' },
  { name: 'Amber', value: '#F59E0B' },
  { name: 'Rose', value: '#F43F5E' },
  { name: 'Violet', value: '#8B5CF6' },
  { name: 'Cyan', value: '#06B6D4' },
  { name: 'Orange', value: '#F97316' },
  { name: 'Pink', value: '#EC4899' },
];

// ================================================================================================
// Main HR Dashboard Component
// ================================================================================================
export default function HRDashboard() {
  // --- STATE MANAGEMENT ---

  // State for UI control (which tab is active, form visibility)
  const [activeTab, setActiveTab] = useState('dashboard');
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [showResultsModal, setShowResultsModal] = useState(false);
  const [selectedRole, setSelectedRole] = useState(null);
  const [testResults, setTestResults] = useState([]);
  const [loadingResults, setLoadingResults] = useState(false);

  // State for data fetched from the backend
  const [roles, setRoles] = useState([]);
  const [students, setStudents] = useState([]);
  const [studentGroups, setStudentGroups] = useState([]);
  
  // Biometric / Face Embedding States
  const [modelsLoaded, setModelsLoaded] = useState(false);
  const [isExtractingFace, setIsExtractingFace] = useState(false);
  const [faceExtractionStatus, setFaceExtractionStatus] = useState(null); // 'SUCCESS', 'FAILED', null
  const [idCardPreview, setIdCardPreview] = useState(null);
  const [croppedFacePreview, setCroppedFacePreview] = useState(null);
  const [successMsg, setSuccessMsg] = useState('');

  // State for managing form inputs
  const [newRole, setNewRole] = useState({
    title: '', description: '', date: '', duration: '60', maxStudents: '20', seatsAvailable: '20', package: '',
    assignedStudents: [], assignedGroups: []
  });
  const [newStudent, setNewStudent] = useState({
    name: '', email: '', rollNo: '', role: '', password: '',
    faceDescriptor: [],
    idCardPhoto: '',
    groupIds: []
  });

  // Sidebar students panel state
  const [sidebarSearch, setSidebarSearch] = useState('');
  const [expandedGroups, setExpandedGroups] = useState({});

  // State for handling errors
  const [error, setError] = useState('');

  // --- HOOKS ---

  // Get authentication state and functions from the context
  const { isHRAuthenticated, hrData, handleHRLogout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Load face-api.js AI models once on component mount
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

  // Effect to fetch data specific to the logged-in HR user
  useEffect(() => {
    // Only fetch if the user is authenticated and their data (especially email) is available
    if (isHRAuthenticated && hrData?.email) {
      const fetchData = async () => {
        try {
          setError('');
          const userEmail = hrData.email;

          // Fetch roles, passing hrEmail as a query parameter for filtering on the backend
          const rolesResponse = await fetch(`http://localhost:5000/api/roles?hrEmail=${encodeURIComponent(userEmail)}`);
          if (!rolesResponse.ok) throw new Error('Failed to fetch interview roles');
          const rolesData = await rolesResponse.json();
          setRoles(rolesData);

          // Fetch students, also filtered by hrEmail
          const studentsResponse = await fetch(`http://localhost:5000/api/students?hrEmail=${encodeURIComponent(userEmail)}`);
          if (!studentsResponse.ok) throw new Error('Failed to fetch students');
          const studentsData = await studentsResponse.json();
          setStudents(studentsData);

          // Fetch student groups
          const groupsResponse = await fetch(`http://localhost:5000/api/student-groups?hrEmail=${encodeURIComponent(userEmail)}`);
          if (!groupsResponse.ok) throw new Error('Failed to fetch student groups');
          const groupsData = await groupsResponse.json();
          setStudentGroups(groupsData);

        } catch (err) {
          setError(err.message);
          console.error("Data fetching error:", err);
        }
      };
      fetchData();
    }
  }, [isHRAuthenticated, hrData]); // Re-run this effect if the auth state or user data changes

  // --- REFETCH HELPERS ---
  const refetchStudents = async () => {
    if (!hrData?.email) return;
    try {
      const response = await fetch(`http://localhost:5000/api/students?hrEmail=${encodeURIComponent(hrData.email)}`);
      if (response.ok) {
        const data = await response.json();
        setStudents(data);
      }
    } catch (err) { console.error(err); }
  };

  const refetchGroups = async () => {
    if (!hrData?.email) return;
    try {
      const response = await fetch(`http://localhost:5000/api/student-groups?hrEmail=${encodeURIComponent(hrData.email)}`);
      if (response.ok) {
        const data = await response.json();
        setStudentGroups(data);
      }
    } catch (err) { console.error(err); }
  };

  // --- EVENT HANDLERS ---

  // Handler to create a new interview role
  const handleCreateRole = async (e) => {
    e.preventDefault();
    if (!hrData?.email) {
      setError("Cannot create role: User identity not found.");
      return;
    }
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newRole, hrEmail: hrData.email }) // Add hrEmail to the payload
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create role');
      }
      const createdRole = await response.json();
      setRoles([...roles, createdRole]);
      setNewRole({ title: '', description: '', date: '', duration: '60', maxStudents: '20', seatsAvailable: '20', package: '', assignedStudents: [], assignedGroups: [] });
      setShowCreateRole(false);
      setSuccessMsg('Interview role created successfully!');
    } catch (err) {
      setError(err.message);
    }
  };

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

  // Handler to add a new student
  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!hrData?.email) {
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
          hrEmail: hrData.email,
          faceDescriptor: newStudent.faceDescriptor,
          idCardPhoto: newStudent.idCardPhoto,
          groupIds: newStudent.groupIds
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
      setNewStudent({ name: '', email: '', rollNo: '', role: '', password: '', faceDescriptor: [], idCardPhoto: '', groupIds: [] });
      setIdCardPreview(null);
      setCroppedFacePreview(null);
      setFaceExtractionStatus(null);
      // Refetch groups to update counts
      refetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  // Handler to view test results for a specific role
  const handleViewResults = async (role) => {
    setSelectedRole(role);
    setShowResultsModal(true);
    setLoadingResults(true);
    setTestResults([]);

    try {
      // Fetch test results for this specific role. The backend now aggregates the data.
      const response = await fetch(
        `http://localhost:5000/api/test-results?role=${encodeURIComponent(role.title)}`
      );
      
      if (!response.ok) {
        throw new Error('Failed to fetch test results');
      }
      
      const results = await response.json();
      setTestResults(results);
    } catch (err) {
      setError(err.message);
      console.error("Test results fetching error:", err);
    } finally {
      setLoadingResults(false);
    }
  };

  // Handler for logging out the user
  const onLogout = () => {
    handleHRLogout();
    navigate('/hr/login', { replace: true });
  };

  // Handler to close results modal
  const closeResultsModal = () => {
    setShowResultsModal(false);
    setSelectedRole(null);
    setTestResults([]);
  };

  // --- Student Group Handlers ---
  const handleCreateGroup = async (name, color) => {
    if (!hrData?.email) return;
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/student-groups', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ hrEmail: hrData.email, name, color })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to create group');
      }
      const createdGroup = await response.json();
      setStudentGroups([...studentGroups, createdGroup]);
      setSuccessMsg(`Group "${name}" created successfully!`);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleDeleteGroup = async (groupId) => {
    try {
      setError('');
      const response = await fetch(`http://localhost:5000/api/student-groups/${groupId}`, {
        method: 'DELETE'
      });
      if (!response.ok) throw new Error('Failed to delete group');
      setStudentGroups(studentGroups.filter(g => g._id !== groupId));
      setSuccessMsg('Group deleted successfully!');
      refetchStudents();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleUpdateStudentGroups = async (studentId, groupIds) => {
    try {
      setError('');
      const response = await fetch(`http://localhost:5000/api/students/${studentId}/groups`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ groupIds })
      });
      if (!response.ok) throw new Error('Failed to update student groups');
      refetchStudents();
      refetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  const handleBulkAssign = async (studentIds, groupId, action = 'add') => {
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/students/bulk-group', {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ studentIds, groupId, action })
      });
      if (!response.ok) throw new Error('Failed to bulk assign students');
      const result = await response.json();
      setSuccessMsg(result.message);
      refetchStudents();
      refetchGroups();
    } catch (err) {
      setError(err.message);
    }
  };

  // --- SIDEBAR HELPERS ---
  const getGroupColor = (groupId) => {
    const group = studentGroups.find(g => g._id === groupId);
    return group?.color || '#94A3B8';
  };

  const getStudentsByGroup = () => {
    const grouped = {};
    // Create a bucket for each group
    studentGroups.forEach(group => {
      grouped[group._id] = {
        group,
        students: []
      };
    });
    // Add an "Unassigned" bucket
    grouped['unassigned'] = {
      group: { _id: 'unassigned', name: 'Unassigned', color: '#94A3B8' },
      students: []
    };

    const filteredStudents = students.filter(s =>
      !sidebarSearch ||
      s.name?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      s.rollNo?.toLowerCase().includes(sidebarSearch.toLowerCase()) ||
      s.email?.toLowerCase().includes(sidebarSearch.toLowerCase())
    );

    filteredStudents.forEach(student => {
      const studentGroupIds = student.groupIds || [];
      if (studentGroupIds.length === 0) {
        grouped['unassigned'].students.push(student);
      } else {
        studentGroupIds.forEach(gid => {
          if (grouped[gid]) {
            grouped[gid].students.push(student);
          }
        });
      }
    });

    return grouped;
  };

  const toggleGroupExpand = (groupId) => {
    setExpandedGroups(prev => ({ ...prev, [groupId]: !prev[groupId] }));
  };

  // --- RENDER ---

  const SidebarButton = ({ tabName, icon, children }) => (
    <button
      onClick={() => setActiveTab(tabName)}
      className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
        activeTab === tabName
          ? 'bg-blue-50 text-blue-700 font-semibold'
          : 'text-gray-600 hover:bg-gray-100 hover:text-gray-900'
      }`}
    >
      {icon}
      {children}
    </button>
  );

  const groupedStudents = getStudentsByGroup();

  return (
    <div className="min-h-screen bg-gray-50 flex flex-col">
      {/* Header with proper alignment */}
      <header className="bg-white shadow-sm border-b sticky top-0 z-10">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                <User className="w-6 h-6 text-white" />
              </div>
              <div>
                <h1 className="text-xl font-bold text-gray-900">Multi-Agent Assessment Platform</h1>
                <p className="text-sm text-gray-500">Faculty Management Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">Faculty Evaluator</p>
                <p className="text-xs text-gray-500">{hrData?.email || 'Loading...'}</p>
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
        {/* Left Sidebar — Navigation + Students Database */}
        <aside className="w-72 bg-white h-full shadow-sm border-r flex flex-col" style={{ minHeight: 'calc(100vh - 73px)' }}>
          {/* Navigation Tabs */}
          <nav className="px-4 pt-4 pb-2">
            <div className="space-y-1">
              <SidebarButton tabName="dashboard" icon={<Settings className="w-5 h-5 mr-3" />}>Dashboard</SidebarButton>
              <SidebarButton tabName="roles" icon={<Calendar className="w-5 h-5 mr-3" />}>Interview Roles</SidebarButton>
              <SidebarButton tabName="students" icon={<Users className="w-5 h-5 mr-3" />}>Student Management</SidebarButton>
              <SidebarButton tabName="groups" icon={<Layers className="w-5 h-5 mr-3" />}>Student Groups</SidebarButton>
            </div>
          </nav>

          {/* Divider */}
          <div className="px-4 py-2">
            <div className="border-t border-gray-200"></div>
          </div>

          {/* Students Database Panel */}
          <div className="flex-1 overflow-hidden flex flex-col px-4 pb-4">
            <div className="flex items-center justify-between mb-2">
              <h3 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">Students Database</h3>
              <span className="text-xs bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full font-medium">{students.length}</span>
            </div>

            {/* Search */}
            <div className="relative mb-3">
              <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-gray-400" />
              <input
                type="text"
                placeholder="Search students..."
                value={sidebarSearch}
                onChange={(e) => setSidebarSearch(e.target.value)}
                className="w-full pl-8 pr-3 py-1.5 text-xs border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400 focus:border-blue-400"
              />
            </div>

            {/* Grouped Student List */}
            <div className="flex-1 overflow-y-auto space-y-1" style={{ maxHeight: 'calc(100vh - 340px)' }}>
              {Object.entries(groupedStudents).map(([groupId, { group, students: groupStudents }]) => {
                if (groupStudents.length === 0 && groupId !== 'unassigned') return null;
                const isExpanded = expandedGroups[groupId] !== false; // Default expanded

                return (
                  <div key={groupId} className="rounded-lg overflow-hidden">
                    {/* Group Header */}
                    <button
                      onClick={() => toggleGroupExpand(groupId)}
                      className="w-full flex items-center justify-between px-2.5 py-2 text-left hover:bg-gray-50 rounded-lg transition-colors"
                    >
                      <div className="flex items-center space-x-2 min-w-0">
                        {isExpanded ? (
                          <ChevronDown className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        ) : (
                          <ChevronRight className="w-3.5 h-3.5 text-gray-400 flex-shrink-0" />
                        )}
                        <span
                          className="w-2.5 h-2.5 rounded-full flex-shrink-0"
                          style={{ backgroundColor: group.color }}
                        ></span>
                        <span className="text-xs font-semibold text-gray-700 truncate">{group.name}</span>
                      </div>
                      <span className="text-[10px] bg-gray-100 text-gray-500 px-1.5 py-0.5 rounded-full font-medium flex-shrink-0">
                        {groupStudents.length}
                      </span>
                    </button>

                    {/* Students in Group */}
                    {isExpanded && (
                      <div className="pl-4 space-y-0.5 pb-1">
                        {groupStudents.length === 0 ? (
                          <p className="text-[10px] text-gray-400 py-1 pl-4">No students</p>
                        ) : (
                          groupStudents.map(student => (
                            <div
                              key={`${groupId}-${student._id}`}
                              className="flex items-center space-x-2 px-2 py-1.5 rounded-md hover:bg-gray-50 transition-colors cursor-default group"
                            >
                              {student.idCardPhoto ? (
                                <img src={student.idCardPhoto} alt="" className="w-6 h-6 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                              ) : (
                                <div className="w-6 h-6 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                                  <span className="text-[10px] text-white font-bold">{student.name?.charAt(0)?.toUpperCase() || '?'}</span>
                                </div>
                              )}
                              <div className="min-w-0 flex-1">
                                <p className="text-[11px] font-medium text-gray-800 truncate">{student.name}</p>
                                <p className="text-[10px] text-gray-400 truncate">{student.rollNo}</p>
                              </div>
                              {/* Group badges for multi-group */}
                              {(student.groupNames || []).length > 1 && (
                                <div className="flex -space-x-1">
                                  {(student.groupIds || []).slice(0, 3).map(gid => (
                                    <span
                                      key={gid}
                                      className="w-2 h-2 rounded-full border border-white"
                                      style={{ backgroundColor: getGroupColor(gid) }}
                                      title={studentGroups.find(g => g._id === gid)?.name}
                                    ></span>
                                  ))}
                                </div>
                              )}
                            </div>
                          ))
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          </div>
        </aside>

        <main className="flex-1 p-6 lg:p-8 overflow-y-auto">
          {error && (
            <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
              <strong className="font-bold">Error: </strong>
              <span className="block sm:inline">{error}</span>
              <button onClick={() => setError('')} className="absolute top-3 right-3 text-red-500 hover:text-red-700"><X className="w-4 h-4" /></button>
            </div>
          )}
          {successMsg && (
            <div className="bg-green-100 border border-green-400 text-green-700 px-4 py-3 rounded-lg relative mb-6" role="alert">
              <CheckCircle2 className="inline w-5 h-5 mr-2" />
              <span className="block sm:inline">{successMsg}</span>
              <button onClick={() => setSuccessMsg('')} className="absolute top-3 right-3 text-green-500 hover:text-green-700"><X className="w-4 h-4" /></button>
            </div>
          )}
          {activeTab === 'dashboard' && <DashboardContent roles={roles} students={students} studentGroups={studentGroups} />}
          {activeTab === 'roles' && (
            <RolesContent 
              roles={roles} 
              showCreateRole={showCreateRole} 
              setShowCreateRole={setShowCreateRole} 
              newRole={newRole} 
              setNewRole={setNewRole} 
              handleCreateRole={handleCreateRole}
              handleViewResults={handleViewResults}
              students={students}
              studentGroups={studentGroups}
            />
          )}
          {activeTab === 'students' && <StudentsContent students={students} roles={roles} newStudent={newStudent} setNewStudent={setNewStudent} handleAddStudent={handleAddStudent} handleIdCardUpload={handleIdCardUpload} modelsLoaded={modelsLoaded} isExtractingFace={isExtractingFace} faceExtractionStatus={faceExtractionStatus} idCardPreview={idCardPreview} croppedFacePreview={croppedFacePreview} studentGroups={studentGroups} />}
          {activeTab === 'groups' && (
            <StudentGroupsContent
              studentGroups={studentGroups}
              students={students}
              onCreateGroup={handleCreateGroup}
              onDeleteGroup={handleDeleteGroup}
              onUpdateStudentGroups={handleUpdateStudentGroups}
              onBulkAssign={handleBulkAssign}
            />
          )}
        </main>
      </div>

      {/* Test Results Modal */}
      {showResultsModal && (
        <TestResultsModal
          role={selectedRole}
          results={testResults}
          loading={loadingResults}
          onClose={closeResultsModal}
        />
      )}
    </div>
  );
}

// ================================================================================================
// RE-DESIGNED Test Results Modal Component (AGGREGATED VIEW)
// ================================================================================================
const TestResultsModal = ({ role, results, loading, onClose }) => {
  
  // --- Summary Card Data Calculation ---
  const totalParticipants = results.length;
  const totalPossibleScore = 145; // 15 (Round 1) + 30 (Round 2) + 50 (Round 3) + 50 (Round 4)
  
  const averageTotalScore = totalParticipants > 0
    ? results.reduce((sum, r) => sum + (r.total_score || 0), 0) / totalParticipants
    : 0;

  const averagePercentage = totalPossibleScore > 0
    ? Math.round((averageTotalScore / totalPossibleScore) * 100)
    : 0;
  
  const maxCompletedRound = totalParticipants > 0
    ? Math.max(...results.map(r => r.max_round || 0))
    : 0;

  // Placed if total score >= 70 (approx 48% of total score)
  const placedStudents = results.filter(r => (r.total_score || 0) >= 70).length; 

  // --- Event Handler for Email Button ---
  const handleEmailStudent = (studentEmail) => {
    const subject = "Update Regarding Your Assessment Results";
    const body = "Dear Candidate,\n\nCongratulations!\n\nWe are pleased to inform you that you have successfully cleared the placement assessment rounds. \n\nFor further details regarding your results and next steps, please await communication from the Faculty & Placement Cell.\n\nBest Regards,\nThe Faculty & Placement Team";
    
    // Create a mailto link and trigger it
    const mailtoLink = `mailto:${studentEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    window.location.href = mailtoLink;
  };

  return (
    <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
      <div className="bg-white rounded-xl shadow-2xl max-w-6xl w-full max-h-[90vh] overflow-hidden flex flex-col">
        {/* Modal Header */}
        <div className="bg-gradient-to-r from-blue-500 to-purple-600 text-white p-6 flex items-center justify-between flex-shrink-0">
          <div>
            <h2 className="text-2xl font-bold">Test Results</h2>
            <p className="text-blue-100 mt-1">Role: {role?.title}</p>
          </div>
          <button onClick={onClose} className="text-white hover:bg-white hover:bg-opacity-20 rounded-lg p-2 transition-colors">
            <X className="w-6 h-6" />
          </button>
        </div>

        {/* Modal Content */}
        <div className="p-6 overflow-y-auto">
          {loading ? (
            <div className="flex items-center justify-center py-12">
              <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-blue-600"></div>
              <span className="ml-4 text-gray-600">Loading test results...</span>
            </div>
          ) : results.length === 0 ? (
            <div className="text-center py-12">
              <Award className="w-16 h-16 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900 mb-2">No Test Results Found</h3>
              <p className="text-gray-500">No students have taken the test for this role yet.</p>
            </div>
          ) : (
            <div className="space-y-6">
              {/* Summary Cards */}
              <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
                 <div className="bg-blue-50 p-4 rounded-lg border border-blue-200">
                    <p className="text-sm font-medium text-blue-600">Total Participants</p>
                    <p className="text-3xl font-bold text-blue-900">{totalParticipants}</p>
                 </div>
                 <div className="bg-green-50 p-4 rounded-lg border border-green-200">
                    <p className="text-sm font-medium text-green-600">Average Score</p>
                    <p className="text-3xl font-bold text-green-900">{averagePercentage}%</p>
                 </div>
                 <div className="bg-purple-50 p-4 rounded-lg border border-purple-200">
                    <p className="text-sm font-medium text-purple-600">Max Rounds Taken</p>
                    <p className="text-3xl font-bold text-purple-900">{maxCompletedRound}</p>
                 </div>
                 <div className="bg-orange-50 p-4 rounded-lg border border-orange-200">
                    <p className="text-sm font-medium text-orange-600">Placed Students</p>
                    <p className="text-3xl font-bold text-orange-900">{placedStudents}</p>
                 </div>
              </div>

              {/* Results Table */}
              <div className="bg-white border border-gray-200 rounded-lg overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Round 1</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Round 2</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Round 3</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Round 4</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Total Score</th>
                        <th className="px-6 py-3 text-center text-xs font-medium text-gray-500 uppercase">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {results.map((result) => (
                        <tr key={result.email} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex-shrink-0 flex items-center justify-center">
                                <span className="text-white font-medium text-sm">{result.email.charAt(0).toUpperCase()}</span>
                              </div>
                              <div className="ml-4 font-medium text-gray-900">{result.email}</div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{result.rollNo || 'N/A'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{result.round1_score !== null ? `${result.round1_score}/15` : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{result.round2_score !== null ? `${result.round2_score}/30` : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{result.round3_score !== null ? `${result.round3_score}/50` : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{result.round4_score !== null ? `${result.round4_score}/50` : '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-lg text-blue-600">{result.total_score}/145</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center">
                            <button
                              onClick={() => handleEmailStudent(result.email)}
                              className="inline-flex items-center px-3 py-1.5 border border-transparent text-xs font-medium rounded-md shadow-sm text-white bg-green-600 hover:bg-green-700 focus:outline-none"
                              title={`Email ${result.email}`}
                            >
                              <Mail className="w-4 h-4 mr-1.5" />
                              Email
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ================================================================================================
// Sub-components for Each Tab
// ================================================================================================

// ---- Dashboard Content ----
const DashboardContent = ({ roles, students, studentGroups }) => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
      <p className="text-gray-600 mb-6">Comprehensive view of assessment drives, candidate readiness, and multi-agent interview analytics.</p>
      <div className="grid grid-cols-1 md:grid-cols-4 gap-6 mb-8">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Interview Drives</p>
              <p className="text-3xl font-bold text-gray-900">{roles.length}</p>
            </div>
            <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-blue-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Enrolled Students</p>
              <p className="text-3xl font-bold text-gray-900">{students.length}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Users className="w-6 h-6 text-green-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Active Rounds</p>
              <p className="text-3xl font-bold text-gray-900">{roles.filter(r => new Date(r.date) >= new Date()).length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Student Groups</p>
              <p className="text-3xl font-bold text-gray-900">{studentGroups.length}</p>
            </div>
            <div className="w-12 h-12 bg-amber-100 rounded-lg flex items-center justify-center">
              <Layers className="w-6 h-6 text-amber-600" />
            </div>
          </div>
        </div>
      </div>

      {/* Group Distribution */}
      {studentGroups.length > 0 && (
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Group Distribution</h3>
          <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
            {studentGroups.map(group => (
              <div key={group._id} className="flex items-center space-x-3 p-3 rounded-lg border" style={{ borderColor: group.color + '40', backgroundColor: group.color + '08' }}>
                <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: group.color + '20' }}>
                  <Tag className="w-5 h-5" style={{ color: group.color }} />
                </div>
                <div>
                  <p className="text-sm font-semibold text-gray-800">{group.name}</p>
                  <p className="text-xs text-gray-500">{group.studentCount || 0} students</p>
                </div>
              </div>
            ))}
            <div className="flex items-center space-x-3 p-3 rounded-lg border border-gray-200 bg-gray-50">
              <div className="w-10 h-10 rounded-lg flex items-center justify-center bg-gray-200">
                <Users className="w-5 h-5 text-gray-500" />
              </div>
              <div>
                <p className="text-sm font-semibold text-gray-800">Unassigned</p>
                <p className="text-xs text-gray-500">{students.filter(s => !s.groupIds || s.groupIds.length === 0).length} students</p>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
);

// ---- Roles Content (with Student/Group Assignment) ----
const RolesContent = ({ roles, showCreateRole, setShowCreateRole, newRole, setNewRole, handleCreateRole, handleViewResults, students, studentGroups }) => {
  const [studentSearchQuery, setStudentSearchQuery] = useState('');

  const filteredStudentsForRole = students.filter(s =>
    !studentSearchQuery ||
    s.name?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    s.email?.toLowerCase().includes(studentSearchQuery.toLowerCase()) ||
    s.rollNo?.toLowerCase().includes(studentSearchQuery.toLowerCase())
  );

  const toggleStudentForRole = (studentId) => {
    const current = newRole.assignedStudents || [];
    if (current.includes(studentId)) {
      setNewRole({ ...newRole, assignedStudents: current.filter(id => id !== studentId) });
    } else {
      setNewRole({ ...newRole, assignedStudents: [...current, studentId] });
    }
  };

  const toggleGroupForRole = (groupId) => {
    const current = newRole.assignedGroups || [];
    if (current.includes(groupId)) {
      setNewRole({ ...newRole, assignedGroups: current.filter(id => id !== groupId) });
    } else {
      setNewRole({ ...newRole, assignedGroups: [...current, groupId] });
    }
  };

  // Calculate total assigned student count
  const getAssignedCount = () => {
    const individualIds = new Set(newRole.assignedStudents || []);
    (newRole.assignedGroups || []).forEach(groupId => {
      students.forEach(s => {
        if ((s.groupIds || []).includes(groupId)) {
          individualIds.add(s._id);
        }
      });
    });
    return individualIds.size;
  };

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Interview Drives & Roles</h2>
          <p className="text-gray-600">Create and manage candidate assessment rounds and placement drives.</p>
        </div>
        <button 
          onClick={() => setShowCreateRole(!showCreateRole)} 
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>{showCreateRole ? 'Cancel' : 'Create New Role'}</span>
        </button>
      </div>
  
      {showCreateRole && (
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Interview Role Details</h3>
          <form onSubmit={handleCreateRole} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Role Title</label>
                <input
                  type="text"
                  placeholder="Enter role title"
                  value={newRole.title}
                  onChange={(e) => setNewRole({ ...newRole, title: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Interview Date</label>
                <input
                  type="date"
                  value={newRole.date}
                  onChange={(e) => setNewRole({ ...newRole, date: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>
            
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role Description</label>
              <textarea
                placeholder="Describe the role and requirements"
                value={newRole.description}
                onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                rows={3}
                required
              />
            </div>
  
            <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Duration (minutes)</label>
                <input
                  type="number"
                  placeholder="60"
                  value={newRole.duration}
                  onChange={(e) => setNewRole({ ...newRole, duration: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Max Students</label>
                <input
                  type="number"
                  placeholder="20"
                  value={newRole.maxStudents}
                  onChange={(e) => setNewRole({ ...newRole, maxStudents: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Seats Available</label>
                <input
                  type="number"
                  placeholder="20"
                  value={newRole.seatsAvailable}
                  onChange={(e) => setNewRole({ ...newRole, seatsAvailable: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  min="1"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Package</label>
                <input
                  type="text"
                  placeholder="e.g., 6 LPA"
                  value={newRole.package}
                  onChange={(e) => setNewRole({ ...newRole, package: e.target.value })}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                  required
                />
              </div>
            </div>

            {/* ===== Assign Students Section ===== */}
            <div className="border-t pt-4 mt-2">
              <h4 className="text-sm font-semibold text-gray-800 mb-3 flex items-center gap-2">
                <UserPlus className="w-4 h-4 text-blue-600" />
                Assign Students to this Role
                {getAssignedCount() > 0 && (
                  <span className="bg-blue-100 text-blue-700 px-2 py-0.5 rounded-full text-xs font-medium">
                    {getAssignedCount()} students selected
                  </span>
                )}
              </h4>
              
              {/* By Group */}
              {studentGroups.length > 0 && (
                <div className="mb-4">
                  <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Select by Group</p>
                  <div className="flex flex-wrap gap-2">
                    {studentGroups.map(group => {
                      const isSelected = (newRole.assignedGroups || []).includes(group._id);
                      return (
                        <button
                          key={group._id}
                          type="button"
                          onClick={() => toggleGroupForRole(group._id)}
                          className={`inline-flex items-center px-3 py-1.5 rounded-full text-xs font-medium border transition-all duration-150 ${
                            isSelected
                              ? 'text-white shadow-sm'
                              : 'bg-white hover:shadow-sm'
                          }`}
                          style={isSelected ? { backgroundColor: group.color, borderColor: group.color } : { borderColor: group.color + '60', color: group.color }}
                        >
                          {isSelected && <Check className="w-3 h-3 mr-1" />}
                          {group.name} ({group.studentCount || 0})
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* By Individual Student */}
              <div>
                <p className="text-xs font-medium text-gray-500 mb-2 uppercase tracking-wider">Select Individual Students</p>
                <div className="relative mb-2">
                  <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                  <input
                    type="text"
                    placeholder="Search by name, email, or roll no..."
                    value={studentSearchQuery}
                    onChange={(e) => setStudentSearchQuery(e.target.value)}
                    className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                  />
                </div>
                <div className="max-h-40 overflow-y-auto border border-gray-200 rounded-lg divide-y divide-gray-100">
                  {filteredStudentsForRole.length === 0 ? (
                    <p className="text-xs text-gray-400 p-3 text-center">No students found</p>
                  ) : (
                    filteredStudentsForRole.map(student => {
                      const isSelected = (newRole.assignedStudents || []).includes(student._id);
                      return (
                        <label
                          key={student._id}
                          className={`flex items-center px-3 py-2 cursor-pointer hover:bg-gray-50 transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                        >
                          <input
                            type="checkbox"
                            checked={isSelected}
                            onChange={() => toggleStudentForRole(student._id)}
                            className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                          />
                          <div className="flex items-center flex-1 min-w-0">
                            {student.idCardPhoto ? (
                              <img src={student.idCardPhoto} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200 mr-2 flex-shrink-0" />
                            ) : (
                              <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mr-2 flex-shrink-0">
                                <span className="text-[10px] text-white font-bold">{student.name?.charAt(0)?.toUpperCase()}</span>
                              </div>
                            )}
                            <div className="min-w-0">
                              <p className="text-sm font-medium text-gray-800 truncate">{student.name}</p>
                              <p className="text-[11px] text-gray-400 truncate">{student.rollNo} · {student.email}</p>
                            </div>
                          </div>
                          {/* Group badges */}
                          <div className="flex gap-1 ml-2 flex-shrink-0">
                            {(student.groupNames || []).map((gn, i) => (
                              <span key={i} className="text-[10px] px-1.5 py-0.5 rounded-full bg-gray-100 text-gray-600">{gn}</span>
                            ))}
                          </div>
                        </label>
                      );
                    })
                  )}
                </div>
              </div>
            </div>
  
            <div className="flex space-x-4 pt-4">
              <button
                type="submit"
                className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2"
              >
                <Plus className="w-4 h-4" />
                <span>Create Role</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCreateRole(false)}
                className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200"
              >
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}
  
      <div className="bg-white rounded-xl shadow-sm border">
        <div className="p-4">
          {roles.length > 0 ? (
            <div className="space-y-4">
              {roles.map((role) => (
                <div key={role._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors duration-200">
                  <div className="flex flex-col md:flex-row items-start md:items-center justify-between">
                    {/* Left Side: Role Info */}
                    <div className="flex-1 mb-4 md:mb-0 md:pr-4">
                      <h3 className="text-lg font-semibold text-gray-900">{role.title}</h3>
                      <p className="text-gray-600 text-sm mt-1 max-w-2xl">{role.description}</p>
                      <div className="flex items-center flex-wrap gap-x-6 gap-y-2 mt-3 text-sm text-gray-500">
                        <span className="flex items-center">
                          <Calendar className="w-4 h-4 mr-1.5 text-gray-400" />
                          Date: <span className="font-medium text-gray-700 ml-1">{new Date(role.date).toLocaleDateString()}</span>
                        </span>
                        <span className="flex items-center">
                          <Users className="w-4 h-4 mr-1.5 text-gray-400" />
                          Seats: <span className="font-medium text-gray-700 ml-1">{role.seatsAvailable}/{role.maxStudents}</span>
                        </span>
                        <span className="flex items-center">
                          <Clock className="w-4 h-4 mr-1.5 text-gray-400" />
                          Duration: <span className="font-medium text-gray-700 ml-1">{role.duration} min</span>
                        </span>
                        <span className="flex items-center">
                          <Award className="w-4 h-4 mr-1.5 text-gray-400" />
                          Package: <span className="font-medium text-gray-700 ml-1">{role.package}</span>
                        </span>
                        {((role.assignedGroups || []).length > 0 || (role.assignedStudents || []).length > 0) && (
                          <span className="flex items-center">
                            <Layers className="w-4 h-4 mr-1.5 text-blue-400" />
                            <span className="font-medium text-blue-600 ml-1">
                              {(role.assignedGroups || []).length} groups, {(role.assignedStudents || []).length} individuals
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                    
                    {/* Right Side: Action Buttons */}
                    <div className="flex-shrink-0 flex items-center space-x-2 self-start md:self-center">
                      <button
                        onClick={() => handleViewResults(role)}
                        className="flex items-center px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500"
                      >
                        <Eye className="w-4 h-4 mr-2" />
                        View Results
                      </button>
                      <button className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors" title="Edit Role">
                        <Edit3 className="w-4 h-4" />
                      </button>
                      <button className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors" title="Delete Role">
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-10">
              <Calendar className="w-12 h-12 text-gray-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-gray-900">No Roles Created Yet</h3>
              <p className="text-gray-500 mt-1">Click "Create New Role" to get started.</p>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

// ---- Students Content ----
const StudentsContent = ({ students, roles, newStudent, setNewStudent, handleAddStudent, handleIdCardUpload, modelsLoaded, isExtractingFace, faceExtractionStatus, idCardPreview, croppedFacePreview, studentGroups }) => (
      <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Management</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h3>
                      <form onSubmit={handleAddStudent} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                              <input type="text" placeholder="Full Name" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                              <input type="email" placeholder="student@example.com" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                              <input type="text" placeholder="e.g., 20BCE1234" value={newStudent.rollNo} onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Role</label>
                              <select value={newStudent.role} onChange={(e) => setNewStudent({ ...newStudent, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required>
                                  <option value="">Select a Role</option>
                                  {roles.map(role => <option key={role._id} value={role.title}>{role.title}</option>)}
                              </select>
                          </div>

                          {/* Optional Group Assignment */}
                          {studentGroups.length > 0 && (
                            <div>
                              <label className="block text-sm font-medium text-gray-700 mb-2">
                                <Tag className="inline w-4 h-4 mr-1 text-blue-500" />
                                Assign to Groups <span className="text-gray-400 font-normal">(optional)</span>
                              </label>
                              <div className="flex flex-wrap gap-2">
                                {studentGroups.map(group => {
                                  const isSelected = (newStudent.groupIds || []).includes(group._id);
                                  return (
                                    <button
                                      key={group._id}
                                      type="button"
                                      onClick={() => {
                                        const current = newStudent.groupIds || [];
                                        if (isSelected) {
                                          setNewStudent({ ...newStudent, groupIds: current.filter(id => id !== group._id) });
                                        } else {
                                          setNewStudent({ ...newStudent, groupIds: [...current, group._id] });
                                        }
                                      }}
                                      className={`inline-flex items-center px-2.5 py-1 rounded-full text-xs font-medium border transition-all duration-150 ${
                                        isSelected ? 'text-white shadow-sm' : 'bg-white hover:shadow-sm'
                                      }`}
                                      style={isSelected ? { backgroundColor: group.color, borderColor: group.color } : { borderColor: group.color + '60', color: group.color }}
                                    >
                                      {isSelected && <Check className="w-3 h-3 mr-1" />}
                                      {group.name}
                                    </button>
                                  );
                                })}
                              </div>
                            </div>
                          )}

                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
                              <input type="password" placeholder="Create a strong password" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500" required />
                          </div>

                          {/* ===== ID Card Photo Upload & Biometric Extraction ===== */}
                          <div className="border-t pt-4 mt-4">
                            <label className="block text-sm font-medium text-gray-700 mb-2">
                              <Camera className="inline w-4 h-4 mr-1.5 text-blue-600" />
                              Student ID Card / Photo (Face Biometric)
                            </label>
                            <div className="border-2 border-dashed border-gray-300 rounded-lg p-4 text-center hover:border-blue-400 transition-colors">
                              <input
                                type="file"
                                accept="image/*"
                                onChange={handleIdCardUpload}
                                className="hidden"
                                id="hr-id-card-upload"
                              />
                              <label htmlFor="hr-id-card-upload" className="cursor-pointer">
                                {isExtractingFace ? (
                                  <div className="flex flex-col items-center">
                                    <RefreshCw className="w-8 h-8 text-blue-500 animate-spin mb-2" />
                                    <span className="text-sm text-blue-600 font-medium">Detecting face & extracting embedding...</span>
                                  </div>
                                ) : idCardPreview ? (
                                  <div className="flex flex-col items-center space-y-2">
                                    <div className="flex items-center space-x-3">
                                      {croppedFacePreview && (
                                        <img src={croppedFacePreview} alt="Cropped Face" className="w-16 h-16 rounded-full object-cover border-2 border-green-400 shadow-md" />
                                      )}
                                      <img src={idCardPreview} alt="ID Card" className="max-h-20 rounded-md border shadow-sm" />
                                    </div>
                                    {faceExtractionStatus === 'SUCCESS' && (
                                      <span className="text-xs font-semibold text-green-600 flex items-center">
                                        <ShieldCheck className="w-4 h-4 mr-1" /> Face Embedding Extracted (128-D) ✅
                                      </span>
                                    )}
                                    {faceExtractionStatus === 'FAILED' && (
                                      <span className="text-xs font-semibold text-red-600 flex items-center">
                                        <AlertTriangle className="w-4 h-4 mr-1" /> No face found. Try another image.
                                      </span>
                                    )}
                                    <span className="text-xs text-gray-400">Click to upload a different image</span>
                                  </div>
                                ) : (
                                  <div className="flex flex-col items-center">
                                    <ImageIcon className="w-8 h-8 text-gray-400 mb-2" />
                                    <span className="text-sm text-gray-500">Click to upload student ID card or photo</span>
                                    <span className="text-xs text-gray-400 mt-1">Face will be auto-detected & embedding extracted</span>
                                    {!modelsLoaded && <span className="text-xs text-amber-500 mt-1">⏳ AI models loading...</span>}
                                  </div>
                                )}
                              </label>
                            </div>
                          </div>

                          <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2.5 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-md">Add Student</button>
                      </form>
                  </div>
              </div>
              <div className="lg:col-span-2">
                  <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                      <table className="min-w-full divide-y divide-gray-200">
                          <thead className="bg-gray-50">
                              <tr>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Name</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Roll No</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Assigned Role</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Groups</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">ID Biometrics</th>
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {students.length > 0 ? students.map(student => (
                                  <tr key={student._id}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex items-center">
                                            {student.idCardPhoto ? (
                                              <img src={student.idCardPhoto} alt="Face" className="w-10 h-10 rounded-full object-cover border-2 border-green-400 mr-3 shadow-sm" />
                                            ) : (
                                              <div className="w-10 h-10 rounded-full bg-gray-200 flex items-center justify-center mr-3">
                                                <User className="w-5 h-5 text-gray-400" />
                                              </div>
                                            )}
                                            <div>
                                              <div className="font-medium text-gray-900">{student.name}</div>
                                              <div className="text-sm text-gray-500">{student.email}</div>
                                            </div>
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNo}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{student.role}</span>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="flex flex-wrap gap-1">
                                            {(student.groupNames || []).length > 0 ? (
                                              student.groupNames.map((gn, i) => {
                                                const gid = (student.groupIds || [])[i];
                                                const group = studentGroups.find(g => g._id === gid);
                                                return (
                                                  <span
                                                    key={i}
                                                    className="inline-flex items-center px-2 py-0.5 rounded-full text-[10px] font-semibold text-white"
                                                    style={{ backgroundColor: group?.color || '#94A3B8' }}
                                                  >
                                                    {gn}
                                                  </span>
                                                );
                                              })
                                            ) : (
                                              <span className="text-xs text-gray-400">Unassigned</span>
                                            )}
                                          </div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          {student.hasFaceRegistered ? (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-emerald-100 text-emerald-800">
                                              <ShieldCheck className="w-3.5 h-3.5 mr-1" /> Verified (128-D) 🛡️
                                            </span>
                                          ) : (
                                            <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium bg-amber-100 text-amber-800">
                                              <AlertTriangle className="w-3.5 h-3.5 mr-1" /> No ID Photo ⚠️
                                            </span>
                                          )}
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                                          <div className="flex space-x-2">
                                              <button className="p-2 text-gray-500 hover:bg-gray-200 rounded-full"><Edit3 className="w-4 h-4" /></button>
                                              <button className="p-2 text-red-500 hover:bg-red-100 rounded-full"><Trash2 className="w-4 h-4" /></button>
                                          </div>
                                      </td>
                                  </tr>
                              )) : (
                                  <tr>
                                      <td colSpan="6" className="text-center py-10 text-gray-500">
                                          No students added yet.
                                      </td>
                                  </tr>
                              )}
                          </tbody>
                      </table>
                  </div>
              </div>
          </div>
      </div>
);

// ================================================================================================
// Student Groups Management Tab
// ================================================================================================
const StudentGroupsContent = ({ studentGroups, students, onCreateGroup, onDeleteGroup, onUpdateStudentGroups, onBulkAssign }) => {
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [newGroupName, setNewGroupName] = useState('');
  const [newGroupColor, setNewGroupColor] = useState('#3B82F6');
  const [selectedGroupForAssign, setSelectedGroupForAssign] = useState(null);
  const [bulkSelectStudents, setBulkSelectStudents] = useState([]);
  const [assignSearch, setAssignSearch] = useState('');

  const handleSubmitGroup = (e) => {
    e.preventDefault();
    if (!newGroupName.trim()) return;
    onCreateGroup(newGroupName.trim(), newGroupColor);
    setNewGroupName('');
    setNewGroupColor('#3B82F6');
    setShowCreateForm(false);
  };

  const openBulkAssign = (group) => {
    setSelectedGroupForAssign(group);
    // Pre-select students already in this group
    const alreadyInGroup = students.filter(s => (s.groupIds || []).includes(group._id)).map(s => s._id);
    setBulkSelectStudents(alreadyInGroup);
    setAssignSearch('');
  };

  const closeBulkAssign = () => {
    setSelectedGroupForAssign(null);
    setBulkSelectStudents([]);
    setAssignSearch('');
  };

  const toggleBulkStudent = (studentId) => {
    if (bulkSelectStudents.includes(studentId)) {
      setBulkSelectStudents(bulkSelectStudents.filter(id => id !== studentId));
    } else {
      setBulkSelectStudents([...bulkSelectStudents, studentId]);
    }
  };

  const handleSaveBulkAssign = async () => {
    if (!selectedGroupForAssign) return;
    const groupId = selectedGroupForAssign._id;

    // Students currently in the group
    const currentInGroup = students.filter(s => (s.groupIds || []).includes(groupId)).map(s => s._id);

    // Students to add (selected but not currently in group)
    const toAdd = bulkSelectStudents.filter(id => !currentInGroup.includes(id));
    // Students to remove (currently in group but not selected)
    const toRemove = currentInGroup.filter(id => !bulkSelectStudents.includes(id));

    if (toAdd.length > 0) {
      await onBulkAssign(toAdd, groupId, 'add');
    }
    if (toRemove.length > 0) {
      await onBulkAssign(toRemove, groupId, 'remove');
    }

    closeBulkAssign();
  };

  const filteredStudentsForAssign = students.filter(s =>
    !assignSearch ||
    s.name?.toLowerCase().includes(assignSearch.toLowerCase()) ||
    s.email?.toLowerCase().includes(assignSearch.toLowerCase()) ||
    s.rollNo?.toLowerCase().includes(assignSearch.toLowerCase())
  );

  return (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Student Groups</h2>
          <p className="text-gray-600">Create and manage performance-based student groups (Topper, Average, Slow Learner, etc.)</p>
        </div>
        <button
          onClick={() => setShowCreateForm(!showCreateForm)}
          className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-5 py-2.5 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
        >
          <Plus className="w-5 h-5" />
          <span>{showCreateForm ? 'Cancel' : 'Create Group'}</span>
        </button>
      </div>

      {/* Create Group Form */}
      {showCreateForm && (
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">New Student Group</h3>
          <form onSubmit={handleSubmitGroup} className="space-y-4">
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Name</label>
                <input
                  type="text"
                  placeholder="e.g., Toppers, Average, Slow Learners"
                  value={newGroupName}
                  onChange={(e) => setNewGroupName(e.target.value)}
                  className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500"
                  required
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">Group Color</label>
                <div className="flex items-center gap-2 flex-wrap">
                  {GROUP_COLOR_PRESETS.map(preset => (
                    <button
                      key={preset.value}
                      type="button"
                      onClick={() => setNewGroupColor(preset.value)}
                      className={`w-8 h-8 rounded-full border-2 transition-all ${newGroupColor === preset.value ? 'border-gray-800 scale-110 shadow-md' : 'border-transparent hover:scale-105'}`}
                      style={{ backgroundColor: preset.value }}
                      title={preset.name}
                    />
                  ))}
                </div>
              </div>
            </div>
            <div className="flex space-x-4">
              <button type="submit" className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center space-x-2">
                <Plus className="w-4 h-4" />
                <span>Create Group</span>
              </button>
              <button type="button" onClick={() => setShowCreateForm(false)} className="px-6 py-2 border border-gray-300 text-gray-700 rounded-lg font-medium hover:bg-gray-50 transition-colors duration-200">
                Cancel
              </button>
            </div>
          </form>
        </div>
      )}

      {/* Groups List */}
      {studentGroups.length === 0 ? (
        <div className="bg-white rounded-xl shadow-sm border p-12 text-center">
          <Layers className="w-16 h-16 text-gray-300 mx-auto mb-4" />
          <h3 className="text-lg font-medium text-gray-900 mb-2">No Groups Created Yet</h3>
          <p className="text-gray-500">Create groups like "Toppers", "Average", "Slow Learners" to organize your students.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {studentGroups.map(group => {
            const groupStudents = students.filter(s => (s.groupIds || []).includes(group._id));
            return (
              <div key={group._id} className="bg-white rounded-xl shadow-sm border overflow-hidden hover:shadow-md transition-shadow">
                {/* Group Header */}
                <div className="p-4 border-b" style={{ borderBottomColor: group.color + '30' }}>
                  <div className="flex items-center justify-between">
                    <div className="flex items-center space-x-3">
                      <div className="w-10 h-10 rounded-lg flex items-center justify-center" style={{ backgroundColor: group.color + '20' }}>
                        <Tag className="w-5 h-5" style={{ color: group.color }} />
                      </div>
                      <div>
                        <h3 className="text-base font-bold text-gray-900">{group.name}</h3>
                        <p className="text-xs text-gray-500">{group.studentCount || 0} students</p>
                      </div>
                    </div>
                    <div className="flex items-center space-x-1">
                      <button
                        onClick={() => openBulkAssign(group)}
                        className="p-1.5 text-blue-500 hover:bg-blue-50 rounded-lg transition-colors"
                        title="Manage students in this group"
                      >
                        <UserPlus className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => onDeleteGroup(group._id)}
                        className="p-1.5 text-red-500 hover:bg-red-50 rounded-lg transition-colors"
                        title="Delete group"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                </div>

                {/* Students in Group */}
                <div className="p-3 max-h-48 overflow-y-auto">
                  {groupStudents.length === 0 ? (
                    <p className="text-xs text-gray-400 text-center py-4">No students assigned yet.<br/>Click <UserPlus className="w-3 h-3 inline" /> to add students.</p>
                  ) : (
                    <div className="space-y-1.5">
                      {groupStudents.map(student => (
                        <div key={student._id} className="flex items-center space-x-2 px-2 py-1.5 rounded-lg hover:bg-gray-50">
                          {student.idCardPhoto ? (
                            <img src={student.idCardPhoto} alt="" className="w-7 h-7 rounded-full object-cover border border-gray-200 flex-shrink-0" />
                          ) : (
                            <div className="w-7 h-7 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center flex-shrink-0">
                              <span className="text-[10px] text-white font-bold">{student.name?.charAt(0)?.toUpperCase()}</span>
                            </div>
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="text-xs font-medium text-gray-800 truncate">{student.name}</p>
                            <p className="text-[10px] text-gray-400 truncate">{student.rollNo}</p>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Bulk Assign Modal */}
      {selectedGroupForAssign && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl shadow-2xl max-w-lg w-full max-h-[80vh] overflow-hidden flex flex-col">
            <div className="p-5 border-b flex items-center justify-between flex-shrink-0">
              <div className="flex items-center space-x-3">
                <div className="w-8 h-8 rounded-lg flex items-center justify-center" style={{ backgroundColor: selectedGroupForAssign.color + '20' }}>
                  <Tag className="w-4 h-4" style={{ color: selectedGroupForAssign.color }} />
                </div>
                <div>
                  <h3 className="text-lg font-bold text-gray-900">Manage "{selectedGroupForAssign.name}"</h3>
                  <p className="text-xs text-gray-500">{bulkSelectStudents.length} students selected</p>
                </div>
              </div>
              <button onClick={closeBulkAssign} className="text-gray-400 hover:text-gray-600 p-1">
                <X className="w-5 h-5" />
              </button>
            </div>

            {/* Search */}
            <div className="px-5 pt-4">
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-gray-400" />
                <input
                  type="text"
                  placeholder="Search students..."
                  value={assignSearch}
                  onChange={(e) => setAssignSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2 text-sm border border-gray-200 rounded-lg focus:outline-none focus:ring-1 focus:ring-blue-400"
                />
              </div>
            </div>

            {/* Student List */}
            <div className="flex-1 overflow-y-auto px-5 py-3">
              <div className="divide-y divide-gray-100">
                {filteredStudentsForAssign.map(student => {
                  const isSelected = bulkSelectStudents.includes(student._id);
                  return (
                    <label
                      key={student._id}
                      className={`flex items-center px-3 py-2.5 cursor-pointer hover:bg-gray-50 rounded-lg transition-colors ${isSelected ? 'bg-blue-50' : ''}`}
                    >
                      <input
                        type="checkbox"
                        checked={isSelected}
                        onChange={() => toggleBulkStudent(student._id)}
                        className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded mr-3"
                      />
                      <div className="flex items-center flex-1 min-w-0">
                        {student.idCardPhoto ? (
                          <img src={student.idCardPhoto} alt="" className="w-8 h-8 rounded-full object-cover border border-gray-200 mr-3 flex-shrink-0" />
                        ) : (
                          <div className="w-8 h-8 rounded-full bg-gradient-to-br from-blue-400 to-purple-500 flex items-center justify-center mr-3 flex-shrink-0">
                            <span className="text-xs text-white font-bold">{student.name?.charAt(0)?.toUpperCase()}</span>
                          </div>
                        )}
                        <div className="min-w-0">
                          <p className="text-sm font-medium text-gray-800 truncate">{student.name}</p>
                          <p className="text-xs text-gray-400 truncate">{student.rollNo} · {student.email}</p>
                        </div>
                      </div>
                      {/* Existing group badges */}
                      <div className="flex gap-1 ml-2 flex-shrink-0">
                        {(student.groupNames || []).map((gn, i) => {
                          const gid = (student.groupIds || [])[i];
                          const g = studentGroups.find(sg => sg._id === gid);
                          return (
                            <span
                              key={i}
                              className="text-[9px] px-1.5 py-0.5 rounded-full text-white"
                              style={{ backgroundColor: g?.color || '#94A3B8' }}
                            >
                              {gn}
                            </span>
                          );
                        })}
                      </div>
                    </label>
                  );
                })}
              </div>
            </div>

            {/* Footer */}
            <div className="p-5 border-t flex items-center justify-between flex-shrink-0 bg-gray-50">
              <p className="text-sm text-gray-500">{bulkSelectStudents.length} student(s) selected</p>
              <div className="flex space-x-3">
                <button onClick={closeBulkAssign} className="px-4 py-2 text-sm border border-gray-300 text-gray-700 rounded-lg hover:bg-gray-100 transition-colors">
                  Cancel
                </button>
                <button
                  onClick={handleSaveBulkAssign}
                  className="px-4 py-2 text-sm text-white rounded-lg font-medium transition-all shadow-sm"
                  style={{ backgroundColor: selectedGroupForAssign.color }}
                >
                  Save Changes
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};