// src/Dashboard/Hr.jsx

import React, { useState, useEffect, useContext } from 'react';
import { User, Plus, Calendar, Settings, Eye, Trash2, Edit3, Users } from 'lucide-react';
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
          const rolesResponse = await fetch(`http://localhost:5000/api/roles?hrEmail=${encodeURIComponent(userEmail)}`);
          if (!rolesResponse.ok) throw new Error('Failed to fetch interview roles');
          const rolesData = await rolesResponse.json();
          setRoles(rolesData);

          // Fetch students, also filtered by hrEmail
          const studentsResponse = await fetch(`http://localhost:5000/api/students?hrEmail=${encodeURIComponent(userEmail)}`);
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
      const response = await fetch('http://localhost:5000/api/students', {
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

  // Handler for logging out the user
  const onLogout = () => {
    handleHRLogout();
    navigate('/hr/login', { replace: true });
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
          {activeTab === 'roles' && <RolesContent roles={roles} showCreateRole={showCreateRole} setShowCreateRole={setShowCreateRole} newRole={newRole} setNewRole={setNewRole} handleCreateRole={handleCreateRole} />}
          {activeTab === 'students' && <StudentsContent students={students} roles={roles} newStudent={newStudent} setNewStudent={setNewStudent} handleAddStudent={handleAddStudent} />}
        </main>
      </div>
    </div>
  );
}

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
            <p className="text-3xl font-bold text-gray-900">{roles.filter(r => r.status === 'Active').length}</p>
          </div>
          <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
            <Eye className="w-6 h-6 text-purple-600" />
          </div>
        </div>
      </div>
    </div>
  </div>
);

const RolesContent = ({ roles, showCreateRole, setShowCreateRole, newRole, setNewRole, handleCreateRole }) => (
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
      <div className="space-y-4 p-4">
        {roles.length > 0 ? roles.map((role) => (
          <div key={role._id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50">
            <div className="flex items-center justify-between">
              <div className="flex-1">
                <h3 className="text-lg font-semibold text-gray-900">{role.title}</h3>
                <p className="text-gray-600 text-sm mt-1">{role.description}</p>
                <div className="flex items-center flex-wrap gap-x-4 gap-y-2 mt-3 text-sm text-gray-500">
                  <span className="flex items-center">
                    <Users className="w-4 h-4 mr-1.5" />
                    {role.studentsCount || 0} students
                  </span>
                  <span className="flex items-center">
                    <Calendar className="w-4 h-4 mr-1.5" />
                    {new Date(role.date).toLocaleDateString()}
                  </span>
                  <span>Seats: {role.seatsAvailable}/{role.maxStudents}</span>
                  <span>Package: {role.package}</span>
                  <span className={`px-2 py-1 rounded-full text-xs font-medium ${
                    role.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {role.status}
                  </span>
                </div>
              </div>
              <div className="flex space-x-2 ml-4">
                <button className="p-2 text-gray-400 hover:text-blue-600 rounded-md">
                  <Edit3 className="w-4 h-4" />
                </button>
                <button className="p-2 text-gray-400 hover:text-red-600 rounded-md">
                  <Trash2 className="w-4 h-4" />
                </button>
              </div>
            </div>
          </div>
        )) : (
          <p className="text-center text-gray-500 py-8">No roles created yet. Click "Create New Role" to begin.</p>
        )}
      </div>
    </div>
  </div>
);

const StudentsContent = ({ students, roles, newStudent, setNewStudent, handleAddStudent }) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Management</h2>
    <p className="text-gray-600 mb-6">Add students and assign them to your interview roles.</p>
    
    <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
      <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h3>
      <form onSubmit={handleAddStudent} className="space-y-4">
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
            <input
              type="text"
              placeholder="Enter student name"
              value={newStudent.name}
              onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
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
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Roll Number</label>
            <input
              type="text"
              placeholder="Enter roll number"
              value={newStudent.rollNo}
              onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Assign Role</label>
            <select
              value={newStudent.role}
              onChange={(e) => setNewStudent({ ...newStudent, role: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent bg-white"
              required
            >
              <option value="">Select Role</option>
              {roles.map((role) => (
                <option key={role._id} value={role.title}>{role.title}</option>
              ))}
            </select>
          </div>
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-1">Set Password</label>
            <input
              type="password"
              placeholder="Enter password"
              value={newStudent.password}
              onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
              className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              required
            />
          </div>
          <div className="flex items-end">
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white px-4 py-2 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </button>
          </div>
        </div>
      </form>
    </div>

    <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
      <div className="overflow-x-auto">
        <table className="w-full text-sm">
          <thead className="bg-gray-50">
            <tr>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Role</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
              <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
            </tr>
          </thead>
          <tbody className="bg-white divide-y divide-gray-200">
            {students.length > 0 ? students.map((student) => (
              <tr key={student._id} className="hover:bg-gray-50">
                <td className="px-6 py-4 whitespace-nowrap">
                  <div className="flex items-center">
                    <div className="w-10 h-10 bg-gradient-to-r from-teal-400 to-blue-500 rounded-full flex-shrink-0 flex items-center justify-center">
                      <span className="text-white font-medium text-sm">{student.name.charAt(0)}</span>
                    </div>
                    <div className="ml-4">
                      <div className="font-medium text-gray-900">{student.name}</div>
                      <div className="text-gray-500">{student.email}</div>
                    </div>
                  </div>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-900">{student.rollNo}</td>
                <td className="px-6 py-4 whitespace-nowrap text-gray-600">{student.role}</td>
                <td className="px-6 py-4 whitespace-nowrap">
                  <span className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                    student.status === 'Eligible' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                  }`}>
                    {student.status}
                  </span>
                </td>
                <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                  <div className="flex space-x-2">
                    <button className="text-blue-600 hover:text-blue-900">
                      <Edit3 className="w-4 h-4" />
                    </button>
                    <button className="text-red-600 hover:text-red-900">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            )) : (
              <tr>
                <td colSpan="5" className="text-center text-gray-500 py-8">
                  No students have been added for your roles yet.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  </div>
);