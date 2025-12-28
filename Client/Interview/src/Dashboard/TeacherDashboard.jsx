import React, { useState, useEffect, useContext } from 'react';
import { Book, Plus, Calendar, Settings, Users, Upload, Mail, Trash2, Edit3 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';

export default function TeacherDashboard() {
  const [activeTab, setActiveTab] = useState('dashboard');
  const [students, setStudents] = useState([]);
  const [selectedFile, setSelectedFile] = useState(null);
  const [newStudent, setNewStudent] = useState({
    name: '',
    email: '',
    rollNo: '',
    role: 'Student', // Default role
    password: '',
    assignedRounds: ['coding'] // Default to coding only
  });
  const [error, setError] = useState('');
  const { isTeacherAuthenticated, teacherData, handleTeacherLogout } = useContext(AuthContext);
  const navigate = useNavigate();

  useEffect(() => {
    if (isTeacherAuthenticated && teacherData?.email) {
      const fetchStudents = async () => {
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
      fetchStudents();
    }
  }, [isTeacherAuthenticated, teacherData]);

  const handleAddStudent = async (e) => {
    e.preventDefault();
    if (!teacherData?.email) {
      setError("Cannot add student: User identity not found.");
      return;
    }
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/students', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          ...newStudent,
          teacherEmail: teacherData.email,
          // Convert round selection to array format
          assignedRounds: newStudent.assignedRounds
        })
      });
      if (!response.ok) {
        const errData = await response.json();
        throw new Error(errData.error || 'Failed to add student');
      }
      const createdStudent = await response.json();
      setStudents([...students, createdStudent]);
      setNewStudent({
        name: '',
        email: '',
        rollNo: '',
        role: 'Student',
        password: '',
        assignedRounds: ['coding']
      });
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

    // Ensure at least one round is selected
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
      switch (round) {
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

  return (
    <div>
      <h2 className="text-2xl font-bold text-gray-900 mb-2">Dashboard Overview</h2>
      <p className="text-gray-600 mb-6">Your personal overview of students and their assigned rounds.</p>

      <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
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
              <p className="text-sm font-medium text-gray-600">Coding Only</p>
              <p className="text-3xl font-bold text-gray-900">{codingOnlyStudents}</p>
            </div>
            <div className="w-12 h-12 bg-green-100 rounded-lg flex items-center justify-center">
              <Calendar className="w-6 h-6 text-green-600" />
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
  getRoundDisplayText
}) => (
  <div>
    <h2 className="text-2xl font-bold text-gray-900 mb-6">Student Management</h2>

    <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
      {/* Add Student Form */}
      <div className="lg:col-span-1">
        <div className="bg-white p-6 rounded-xl shadow-sm border mb-6">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Add New Student</h3>
          <form onSubmit={handleAddStudent} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Student Name</label>
              <input
                type="text"
                placeholder="Full Name"
                value={newStudent.name}
                onChange={(e) => setNewStudent({ ...newStudent, name: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Role</label>
              <select
                value={newStudent.role}
                onChange={(e) => setNewStudent({ ...newStudent, role: e.target.value })}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
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
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
            </div>

            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-2.5 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 flex items-center justify-center space-x-2"
            >
              <Plus className="w-4 h-4" />
              <span>Add Student</span>
            </button>
          </form>
        </div>

        {/* Excel Upload */}
        <div className="bg-white p-6 rounded-xl shadow-sm border">
          <h3 className="text-lg font-semibold text-gray-900 mb-4">Upload Excel File</h3>
          <form onSubmit={handleFileUpload} className="space-y-4">
            <div>
              <label className="block text-sm font-medium text-gray-700 mb-1">Select Excel File</label>
              <input
                type="file"
                accept=".xlsx, .xls"
                onChange={(e) => setSelectedFile(e.target.files[0])}
                className="w-full px-3 py-2 border border-gray-300 rounded-md focus:outline-none focus:ring-2 focus:ring-yellow-500 focus:border-transparent"
                required
              />
              <p className="text-sm text-gray-500 mt-1">
                Excel should contain: name, email, rollNo (optional), rounds (optional)
              </p>
            </div>
            <button
              type="submit"
              className="w-full bg-gradient-to-r from-yellow-500 to-orange-600 text-white py-2.5 rounded-lg font-medium hover:from-yellow-600 hover:to-orange-700 transition-all duration-200 flex items-center justify-center space-x-2"
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
          <div className="px-6 py-4 border-b border-gray-200">
            <h3 className="text-lg font-semibold text-gray-900">Students List</h3>
          </div>

          <div className="overflow-x-auto">
            <table className="min-w-full divide-y divide-gray-200">
              <thead className="bg-gray-50">
                <tr>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Name</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Roll No</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Assigned Rounds</th>
                  <th className="px-6 py-3 text-left text-xs font-medium text-gray-500 uppercase tracking-wider">Actions</th>
                </tr>
              </thead>
              <tbody className="bg-white divide-y divide-gray-200">
                {students.length > 0 ? students.map(student => (
                  <tr key={student._id} className="hover:bg-gray-50">
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex items-center">
                        <div className="w-10 h-10 bg-gradient-to-r from-yellow-400 to-orange-500 rounded-full flex-shrink-0 flex items-center justify-center">
                          <span className="text-white font-medium text-sm">
                            {student.name?.charAt(0)?.toUpperCase() || 'S'}
                          </span>
                        </div>
                        <div className="ml-4">
                          <div className="text-sm font-medium text-gray-900">{student.name}</div>
                          <div className="text-sm text-gray-500">{student.email}</div>
                        </div>
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm text-gray-900">{student.rollNo}</td>
                    <td className="px-6 py-4 whitespace-nowrap">
                      <div className="flex flex-wrap gap-1">
                        {student.assignedRounds?.map(round => (
                          <span key={round} className="px-2 py-1 text-xs font-medium rounded-full bg-yellow-100 text-yellow-800">
                            {round.charAt(0).toUpperCase() + round.slice(1)}
                          </span>
                        )) || (
                            <span className="px-2 py-1 text-xs font-medium rounded-full bg-gray-100 text-gray-800">
                              No rounds assigned
                            </span>
                          )}
                      </div>
                    </td>
                    <td className="px-6 py-4 whitespace-nowrap text-sm font-medium">
                      <div className="flex space-x-2">
                        <button
                          className="p-2 text-gray-500 hover:bg-gray-200 rounded-full transition-colors"
                          title="Edit Student"
                        >
                          <Edit3 className="w-4 h-4" />
                        </button>
                        <button
                          className="p-2 text-red-500 hover:bg-red-100 rounded-full transition-colors"
                          title="Delete Student"
                        >
                          <Trash2 className="w-4 h-4" />
                        </button>
                      </div>
                    </td>
                  </tr>
                )) : (
                  <tr>
                    <td colSpan="4" className="text-center py-10 text-gray-500">
                      <Users className="w-12 h-12 text-gray-300 mx-auto mb-4" />
                      <p>No students added yet.</p>
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