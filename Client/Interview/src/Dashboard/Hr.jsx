// src/Dashboard/Hr.jsx

import React, { useState, useEffect, useContext } from 'react';
import { User, Plus, Calendar, Settings, Eye, Trash2, Edit3, Users, X, Award, Clock, Mail, User as UserIcon } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext'; // Ensure this path is correct

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
  
  // State for managing form inputs
  const [newRole, setNewRole] = useState({
    title: '', description: '', date: '', duration: '60', maxStudents: '20', seatsAvailable: '20', package: ''
  });
  const [newStudent, setNewStudent] = useState({
    name: '', email: '', rollNo: '', role: '', password: ''
  });

  // State for handling errors
  const [error, setError] = useState('');

  // --- HOOKS ---

  // Get authentication state and functions from the context
  const { isHRAuthenticated, hrData, handleHRLogout } = useContext(AuthContext);
  const navigate = useNavigate();

  // Effect to fetch data specific to the logged-in HR user
  useEffect(() => {
    // Only fetch if the user is authenticated and their data (especially email) is available
    if (isHRAuthenticated && hrData?.email) {
      const fetchData = async () => {
        try {
          setError('');
          const userEmail = hrData.email;

          // Fetch roles, passing hrEmail as a query parameter for filtering on the backend
          const rolesResponse = await fetch(`https://mock-interview-befx.onrender.com/api/roles?hrEmail=${encodeURIComponent(userEmail)}`);
          if (!rolesResponse.ok) throw new Error('Failed to fetch interview roles');
          const rolesData = await rolesResponse.json();
          setRoles(rolesData);

          // Fetch students, also filtered by hrEmail
          const studentsResponse = await fetch(`https://mock-interview-befx.onrender.com/api/students?hrEmail=${encodeURIComponent(userEmail)}`);
          if (!studentsResponse.ok) throw new Error('Failed to fetch students');
          const studentsData = await studentsResponse.json();
          setStudents(studentsData);

        } catch (err) {
          setError(err.message);
          console.error("Data fetching error:", err);
        }
      };
      fetchData();
    }
  }, [isHRAuthenticated, hrData]); // Re-run this effect if the auth state or user data changes

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
      const response = await fetch('https://mock-interview-befx.onrender.com/api/roles', {
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
      setNewRole({ title: '', description: '', date: '', duration: '60', maxStudents: '20', seatsAvailable: '20', package: '' });
      setShowCreateRole(false);
    } catch (err) {
      setError(err.message);
    }
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
      const response = await fetch('https://mock-interview-befx.onrender.com/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ ...newStudent, hrEmail: hrData.email }) // Add hrEmail to the payload
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to add student');
      }
      const createdStudent = await response.json();
      setStudents([...students, createdStudent]);
      setNewStudent({ name: '', email: '', rollNo: '', role: '', password: '' });
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
        `https://mock-interview-befx.onrender.com/api/test-results?role=${encodeURIComponent(role.title)}`
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
                <h1 className="text-xl font-bold text-gray-900">AI Mock Interview</h1>
                <p className="text-sm text-gray-500">HR Management Portal</p>
              </div>
            </div>
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">HR Manager</p>
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
        <aside className="w-64 bg-white h-full shadow-sm border-r">
          <nav className="mt-6 px-4">
            <div className="space-y-2">
              <SidebarButton tabName="dashboard" icon={<Settings className="w-5 h-5 mr-3" />}>Dashboard</SidebarButton>
              <SidebarButton tabName="roles" icon={<Calendar className="w-5 h-5 mr-3" />}>Interview Roles</SidebarButton>
              <SidebarButton tabName="students" icon={<Users className="w-5 h-5 mr-3" />}>Student Management</SidebarButton>
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
          {activeTab === 'dashboard' && <DashboardContent roles={roles} students={students} />}
          {activeTab === 'roles' && (
            <RolesContent 
              roles={roles} 
              showCreateRole={showCreateRole} 
              setShowCreateRole={setShowCreateRole} 
              newRole={newRole} 
              setNewRole={setNewRole} 
              handleCreateRole={handleCreateRole}
              handleViewResults={handleViewResults}
            />
          )}
          {activeTab === 'students' && <StudentsContent students={students} roles={roles} newStudent={newStudent} setNewStudent={setNewStudent} handleAddStudent={handleAddStudent} />}
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
  const totalPossibleScore = 15; // Assuming 5 points per round (5+5+5)
  
  const averageTotalScore = totalParticipants > 0
    ? results.reduce((sum, r) => sum + (r.total_score || 0), 0) / totalParticipants
    : 0;

  const averagePercentage = totalPossibleScore > 0
    ? Math.round((averageTotalScore / totalPossibleScore) * 100)
    : 0;
  
  const maxCompletedRound = totalParticipants > 0
    ? Math.max(...results.map(r => r.max_round || 0))
    : 0;

  // Example: Placed if total score >= 7
  const placedStudents = results.filter(r => (r.total_score || 0) >= 7).length; 

  // --- Event Handler for Email Button ---
  const handleEmailStudent = (studentEmail) => {
    const subject = "Update Regarding Your Application at Sab Labs";
    const body = "Dear Candidate,\n\nCongratulations!\n\nWe are pleased to inform you that you have been successfully placed at Sab Labs following your performance in the recent interview rounds. \n\nFor further details regarding your offer and onboarding process, we encourage you to visit our company's career portal or await communication from our HR team.\n\nBest Regards,\nThe HR Team\nSab Labs";
    
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
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{result.round1_score ?? '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{result.round2_score ?? '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center text-gray-700">{result.round3_score ?? '—'}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-center font-bold text-lg text-blue-600">{result.total_score}</td>
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

const DashboardContent = ({ roles, students }) => (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
      <p className="text-gray-600 mb-6">Your personal overview of interviews and candidates.</p>
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <div className="flex items-center justify-between">
            <div>
              <p className="text-sm font-medium text-gray-600">Your Roles Created</p>
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
              <p className="text-sm font-medium text-gray-600">Your Students Added</p>
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
              <p className="text-sm font-medium text-gray-600">Your Active Interviews</p>
              <p className="text-3xl font-bold text-gray-900">{roles.filter(r => new Date(r.date) >= new Date()).length}</p>
            </div>
            <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
              <Eye className="w-6 h-6 text-purple-600" />
            </div>
          </div>
        </div>
      </div>
    </div>
);
  
const RolesContent = ({ roles, showCreateRole, setShowCreateRole, newRole, setNewRole, handleCreateRole, handleViewResults }) => (
    <div>
      <div className="flex items-center justify-between mb-6">
        <div>
          <h2 className="text-2xl font-bold text-gray-900">Interview Roles</h2>
          <p className="text-gray-600">Create and manage your interview assessments.</p>
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
  
const StudentsContent = ({ students, roles, newStudent, setNewStudent, handleAddStudent }) => (
      <div>
          <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Management</h2>
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
              <div className="lg:col-span-1">
                  <div className="bg-white p-6 rounded-xl shadow-sm border">
                      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h3>
                      <form onSubmit={handleAddStudent} className="space-y-4">
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
                              <input type="text" placeholder="Full Name" value={newStudent.name} onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Email Address</label>
                              <input type="email" placeholder="student@example.com" value={newStudent.email} onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
                              <input type="text" placeholder="e.g., 20BCE1234" value={newStudent.rollNo} onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Assign to Role</label>
                              <select value={newStudent.role} onChange={(e) => setNewStudent({ ...newStudent, role: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required>
                                  <option value="">Select a Role</option>
                                  {roles.map(role => <option key={role._id} value={role.title}>{role.title}</option>)}
                              </select>
                          </div>
                          <div>
                              <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
                              <input type="password" placeholder="Create a strong password" value={newStudent.password} onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })} className="w-full px-3 py-2 border border-gray-300 rounded-md" required />
                          </div>
                          <button type="submit" className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-2.5 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700">Add Student</button>
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
                                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase">Actions</th>
                              </tr>
                          </thead>
                          <tbody className="bg-white divide-y divide-gray-200">
                              {students.length > 0 ? students.map(student => (
                                  <tr key={student._id}>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <div className="font-medium text-gray-900">{student.name}</div>
                                          <div className="text-sm text-gray-500">{student.email}</div>
                                      </td>
                                      <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-500">{student.rollNo}</td>
                                      <td className="px-6 py-4 whitespace-nowrap">
                                          <span className="px-2 inline-flex text-xs leading-5 font-semibold rounded-full bg-green-100 text-green-800">{student.role}</span>
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
                                      <td colSpan="4" className="text-center py-10 text-gray-500">
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