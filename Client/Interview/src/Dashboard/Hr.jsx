import React, { useState, useEffect } from 'react';
import { User, Plus, Calendar, Settings, Eye, Trash2, Edit3, Users } from 'lucide-react';
import { useNavigate } from 'react-router-dom';

export default function HRDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [email, setEmail] = useState(localStorage.getItem('email') || '');
  const [isLoggedIn, setIsLoggedIn] = useState(localStorage.getItem('isLoggedIn') === 'true');
  const [showCreateRole, setShowCreateRole] = useState(false);
  const [roles, setRoles] = useState([]);
  const [students, setStudents] = useState([]);
  const [newRole, setNewRole] = useState({
    title: '',
    description: '',
    date: '',
    duration: '60',
    maxStudents: '20',
    seatsAvailable: '20',
    package: ''
  });
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    rollNo: '',
    role: '',
    password: ''
  });
  const [error, setError] = useState('');
  const navigate = useNavigate();

  // Redirect to login if not logged in
  useEffect(() => {
    if (!isLoggedIn) {
      navigate('/login');
    }
  }, [isLoggedIn, navigate]);

  // Fetch initial data from backend
  useEffect(() => {
    if (isLoggedIn) {
      const fetchData = async () => {
        try {
          setError('');
          const rolesResponse = await fetch('http://localhost:5000/api/roles');
          if (!rolesResponse.ok) throw new Error('Failed to fetch roles');
          const rolesData = await rolesResponse.json();
          setRoles(rolesData);

          const studentsResponse = await fetch('http://localhost:5000/api/students');
          if (!studentsResponse.ok) throw new Error('Failed to fetch students');
          const studentsData = await studentsResponse.json();
          setStudents(studentsData);
        } catch (err) {
          setError(err.message);
        }
      };
      fetchData();
    }
  }, [isLoggedIn]);

  const handleCreateRole = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/roles', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          title: newRole.title,
          description: newRole.description,
          date: newRole.date,
          duration: newRole.duration,
          maxStudents: newRole.maxStudents,
          seatsAvailable: newRole.seatsAvailable,
          package: newRole.package
        })
      });
      if (!response.ok) throw new Error('Failed to create role');
      const newRoleData = await response.json();
      setRoles([...roles, newRoleData]);
      setNewRole({
        title: '',
        description: '',
        date: '',
        duration: '60',
        maxStudents: '20',
        seatsAvailable: '20',
        package: ''
      });
      setShowCreateRole(false);
    } catch (err) {
      setError(err.message);
    }
  };

  const handleAddStudent = async (e) => {
    e.preventDefault();
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name: newStudent.name,
          email: newStudent.email,
          rollNo: newStudent.rollNo,
          role: newStudent.role,
          password: newStudent.password
        })
      });
      if (!response.ok) throw new Error('Failed to add student');
      const newStudentData = await response.json();
      setStudents([...students, newStudentData]);
      setNewStudent({ name: '', email: '', rollNo: '', role: '', password: '' });
    } catch (err) {
      setError(err.message);
    }
  };

  const handleLogout = () => {
    localStorage.removeItem('email');
    localStorage.removeItem('isLoggedIn');
    setIsLoggedIn(false);
    navigate('/login');
  };

  return (
    <div className="min-h-screen bg-gray-50">
      {/* Header */}
      <header className="bg-white shadow-sm border-b">
        <div className="px-6 py-4">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-4">
              <div className="flex items-center space-x-3">
                <div className="w-10 h-10 bg-gradient-to-r from-blue-500 to-purple-600 rounded-xl flex items-center justify-center">
                  <User className="w-6 h-6 text-white" />
                </div>
                <div>
                  <h1 className="text-xl font-bold text-gray-900">AI Mock Interview</h1>
                  <p className="text-sm text-gray-500">HR Management Portal</p>
                </div>
              </div>
            </div>
            
            <div className="flex items-center space-x-4">
              <div className="text-right">
                <p className="text-sm font-medium text-gray-900">HR Manager</p>
                <p className="text-xs text-gray-500">{email}</p>
              </div>
              <button
                onClick={handleLogout}
                className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 border border-gray-300 rounded-lg hover:bg-gray-50"
              >
                Sign Out
              </button>
            </div>
          </div>
        </div>
      </header>

      <div className="flex">
        {/* Sidebar */}
        <div className="w-64 bg-white h-screen shadow-sm">
          <nav className="mt-6 px-4">
            <div className="space-y-2">
              <button
                onClick={() => setActiveTab('dashboard')}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'dashboard'
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Settings className="w-5 h-5 mr-3" />
                Dashboard
              </button>
              
              <button
                onClick={() => setActiveTab('roles')}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'roles'
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Calendar className="w-5 h-5 mr-3" />
                Interview Roles
              </button>
              
              <button
                onClick={() => setActiveTab('students')}
                className={`w-full flex items-center px-4 py-3 text-left rounded-lg transition-colors ${
                  activeTab === 'students'
                    ? 'bg-blue-50 text-blue-700 border-r-2 border-blue-700'
                    : 'text-gray-600 hover:bg-gray-50'
                }`}
              >
                <Users className="w-5 h-5 mr-3" />
                Student Management
              </button>
            </div>
          </nav>
        </div>

        {/* Main Content */}
        <div className="flex-1 p-6">
          {error && <p className="text-red-600 text-sm mb-4">{error}</p>}
          {activeTab === 'dashboard' && (
            <div>
              <div className="mb-6">
                <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
                <p className="text-gray-600">Manage AI mock interviews and student assessments</p>
              </div>
              
              <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Total Roles</p>
                      <p className="text-2xl font-bold text-gray-900">{roles.length}</p>
                    </div>
                    <div className="w-12 h-12 bg-blue-100 rounded-lg flex items-center justify-center">
                      <Calendar className="w-6 h-6 text-blue-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Eligible Students</p>
                      <p className="text-2xl font-bold text-gray-900">{students.filter(s => s.status === 'Eligible').length}</p>
                    </div>
                    <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
                      <Users className="w-6 h-6 text-green-600" />
                    </div>
                  </div>
                </div>
                
                <div className="bg-white p-6 rounded-xl shadow-sm border">
                  <div className="flex items-center justify-between">
                    <div>
                      <p className="text-sm font-medium text-gray-600">Active Interviews</p>
                      <p className="text-2xl font-bold text-gray-900">{roles.filter(r => r.status === 'Active').length}</p>
                    </div>
                    <div className="w-12 h-12 bg-purple-100 rounded-lg flex items-center justify-center">
                      <Eye className="w-6 h-6 text-purple-600" />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          )}

          {activeTab === 'roles' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Interview Roles</h2>
                  <p className="text-gray-600">Create and manage interview assessments</p>
                </div>
                <button
                  onClick={() => setShowCreateRole(true)}
                  className="bg-gradient-to-r from-blue-500 to-purple-600 text-white px-6 py-3 rounded-lg font-medium hover:from-blue-600 hover:to-purple-700 transition-all duration-200 shadow-lg flex items-center space-x-2"
                >
                  <Plus className="w-5 h-5" />
                  <span>Create New Role</span>
                </button>
              </div>

              {showCreateRole && (
                <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
                  <h3 className="text-lg font-semibold text-gray-900 mb-4">Create New Interview Role</h3>
                  <form onSubmit={handleCreateRole} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                    <input
                      type="text"
                      placeholder="Role Title"
                      value={newRole.title}
                      onChange={(e) => setNewRole({ ...newRole, title: e.target.value })}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="date"
                      value={newRole.date}
                      onChange={(e) => setNewRole({ ...newRole, date: e.target.value })}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <textarea
                      placeholder="Role Description"
                      value={newRole.description}
                      onChange={(e) => setNewRole({ ...newRole, description: e.target.value })}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 md:col-span-2"
                      rows={3}
                      required
                    />
                    <input
                      type="number"
                      placeholder="Duration (minutes)"
                      value={newRole.duration}
                      onChange={(e) => setNewRole({ ...newRole, duration: e.target.value })}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    />
                    <input
                      type="number"
                      placeholder="Max Students"
                      value={newRole.maxStudents}
                      onChange={(e) => setNewRole({ ...newRole, maxStudents: e.target.value })}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="number"
                      placeholder="Seats Available"
                      value={newRole.seatsAvailable}
                      onChange={(e) => setNewRole({ ...newRole, seatsAvailable: e.target.value })}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <input
                      type="text"
                      placeholder="Package (e.g., 6 LPA)"
                      value={newRole.package}
                      onChange={(e) => setNewRole({ ...newRole, package: e.target.value })}
                      className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                      required
                    />
                    <div className="md:col-span-2 flex space-x-4">
                      <button
                        type="submit"
                        className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center space-x-2"
                      >
                        <Plus className="w-4 h-4" />
                        <span>Create Role</span>
                      </button>
                      <button
                        type="button"
                        onClick={() => setShowCreateRole(false)}
                        className="bg-gray-300 text-gray-700 px-6 py-3 rounded-lg hover:bg-gray-400"
                      >
                        Cancel
                      </button>
                    </div>
                  </form>
                </div>
              )}

              <div className="bg-white rounded-xl shadow-sm border">
                <div className="space-y-4 p-6">
                  {roles.map((role) => (
                    <div key={role.id} className="border border-gray-200 rounded-lg p-4 hover:bg-gray-50 transition-colors">
                      <div className="flex items-center justify-between">
                        <div className="flex-1">
                          <h3 className="text-lg font-semibold text-gray-900">{role.title}</h3>
                          <p className="text-gray-600 text-sm mt-1">{role.description}</p>
                          <div className="flex items-center space-x-4 mt-3 text-sm text-gray-500">
                            <span className="flex items-center">
                              <Users className="w-4 h-4 mr-1.5" />
                              {role.studentsCount} students
                            </span>
                            <span className="flex items-center">
                              <Calendar className="w-4 h-4 mr-1.5" />
                              {role.date}
                            </span>
                            <span className="flex items-center">
                              Seats: {role.seatsAvailable}/{role.maxStudents}
                            </span>
                            <span className="flex items-center">
                              Package: {role.package}
                            </span>
                            <span
                              className={`px-2 py-1 rounded-full text-xs font-medium ${
                                role.status === 'Active' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
                              {role.status}
                            </span>
                          </div>
                        </div>
                        <div className="flex space-x-2">
                          <button className="p-2 text-gray-400 hover:text-blue-600 rounded-md">
                            <Edit3 className="w-4 h-4" />
                          </button>
                          <button className="p-2 text-gray-400 hover:text-red-600 rounded-md">
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          )}

          {activeTab === 'students' && (
            <div>
              <div className="flex items-center justify-between mb-6">
                <div>
                  <h2 className="text-2xl font-bold text-gray-900 mb-2">Student Management</h2>
                  <p className="text-gray-600">Manage student access and eligibility</p>
                </div>
              </div>

              <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
                <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h3>
                <form onSubmit={handleAddStudent} className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 items-center">
                  <input
                    type="text"
                    placeholder="Student Name"
                    value={newStudent.name}
                    onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="email"
                    placeholder="Email Address"
                    value={newStudent.email}
                    onChange={(e) => setNewStudent({ ...newStudent, email: e.target.value })}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <input
                    type="text"
                    placeholder="Roll Number"
                    value={newStudent.rollNo}
                    onChange={(e) => setNewStudent({ ...newStudent, rollNo: e.target.value })}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <select
                    value={newStudent.role}
                    onChange={(e) => setNewStudent({ ...newStudent, role: e.target.value })}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500 bg-white"
                    required
                  >
                    <option value="">Select Role</option>
                    {roles.map((role) => (
                      <option key={role.id} value={role.title}>
                        {role.title}
                      </option>
                    ))}
                  </select>
                  <input
                    type="password"
                    placeholder="Password"
                    value={newStudent.password}
                    onChange={(e) => setNewStudent({ ...newStudent, password: e.target.value })}
                    className="px-4 py-3 border border-gray-300 rounded-lg focus:ring-2 focus:ring-blue-500"
                    required
                  />
                  <button
                    type="submit"
                    className="bg-blue-600 text-white px-6 py-3 rounded-lg hover:bg-blue-700 flex items-center justify-center space-x-2"
                  >
                    <Plus className="w-4 h-4" />
                    <span>Add Student</span>
                  </button>
                </form>
              </div>

              <div className="bg-white rounded-xl shadow-sm border overflow-hidden">
                <div className="overflow-x-auto">
                  <table className="w-full text-sm">
                    <thead className="bg-gray-50">
                      <tr>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Student</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Email</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Role</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Status</th>
                        <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="bg-white divide-y divide-gray-200">
                      {students.map((student) => (
                        <tr key={student.id} className="hover:bg-gray-50">
                          <td className="px-6 py-4 whitespace-nowrap">
                            <div className="flex items-center">
                              <div className="w-10 h-10 bg-gradient-to-r from-blue-400 to-purple-500 rounded-full flex-shrink-0 flex items-center justify-center">
                                <span className="text-white font-medium text-sm">{student.name.charAt(0)}</span>
                              </div>
                              <div className="ml-4">
                                <div className="font-medium text-gray-900">{student.name}</div>
                                <div className="text-gray-500">{student.email}</div>
                              </div>
                            </div>
                          </td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-500">{student.email}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-900">{student.rollNo}</td>
                          <td className="px-6 py-4 whitespace-nowrap text-gray-600">{student.role}</td>
                          <td className="px-6 py-4 whitespace-nowrap">
                            <span
                              className={`px-2 inline-flex text-xs leading-5 font-semibold rounded-full ${
                                student.status === 'Eligible' ? 'bg-green-100 text-green-800' : 'bg-yellow-100 text-yellow-800'
                              }`}
                            >
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
}