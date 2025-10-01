import React, { useState, useEffect } from 'react';
import axios from 'axios';
import {
  Upload, FileText, Plus, Calendar, Building, Users, Eye, Loader2, X,
  CheckCircle, AlertCircle, Download, Sparkles, MessageCircle, User,
  Github, Linkedin, Phone, Globe, Send, Image, Heart, MessageSquare,
  UserPlus, ExternalLink, LogOut
} from 'lucide-react';

// Base URL for the Flask backend
const API_URL = 'http://localhost:5000/domainforum/api';

const CommunityForum = () => {
  const [currentUser, setCurrentUser] = useState(null);
  const [showRegistration, setShowRegistration] = useState(false);
  const [showLogin, setShowLogin] = useState(false);
  const [isLoginMode, setIsLoginMode] = useState(true);
  const [activeTab, setActiveTab] = useState('discussions');
  const [discussions, setDiscussions] = useState([]);
  const [questions, setQuestions] = useState([]);
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showContributeForm, setShowContributeForm] = useState(false);
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [selectedProfile, setSelectedProfile] = useState(null);
  const [notification, setNotification] = useState(null);

  // Registration form state
  const [registrationData, setRegistrationData] = useState({
    name: '',
    email: '',
    domain: '',
    linkedinId: '',
    githubId: '',
    mobileNumber: ''
  });

  // Login form state
  const [loginData, setLoginData] = useState({
    email: '',
    domain: ''
  });

  // Discussion form state
  const [discussionForm, setDiscussionForm] = useState({
    title: '',
    content: '',
    attachments: []
  });

  // Question form state
  const [questionForm, setQuestionForm] = useState({
    company: '',
    round: '',
    questionType: 'text',
    textContent: '',
    pdfFile: null
  });

  const domains = [
    'Software Developer', 'AI Developer', 'Full Stack Developer', 'Flutter Developer',
    'Frontend Developer', 'Backend Developer', 'DevOps Engineer', 'Data Scientist',
    'Machine Learning Engineer', 'Mobile Developer', 'UI/UX Designer', 'Product Manager',
    'System Administrator', 'Cybersecurity Specialist', 'Database Administrator',
    'QA Engineer', 'Cloud Architect', 'Blockchain Developer', 'Game Developer',
    'Network Engineer', 'Business Analyst', 'Digital Marketing', 'Other'
  ];

  useEffect(() => {
    // Check if user is already logged in
    const storedUser = JSON.parse(localStorage.getItem('forumUser') || 'null');
    if (storedUser && storedUser._id) {
      setCurrentUser(storedUser);
      fetchData(storedUser.domain);
    } else {
      setShowLogin(true);
      setLoading(false);
    }
  }, []);

  const fetchData = async (domain) => {
    try {
      console.log('Fetching data for domain:', domain);
      setLoading(true);
      setError(null);

      // Fetch discussions for the user's domain
      console.log('Fetching discussions...');
      const discussionsResponse = await axios.get(`${API_URL}/discussions/domain/${domain}`);
      console.log('Discussions response:', discussionsResponse.data);
      if (discussionsResponse.data.success) {
        setDiscussions(discussionsResponse.data.data);
      } else {
        console.error('Failed to fetch discussions:', discussionsResponse.data.message);
        setDiscussions([]);
      }

      // Fetch questions for the user's domain
      console.log('Fetching questions...');
      const questionsResponse = await axios.get(`${API_URL}/questions/domain/${domain}`);
      console.log('Questions response:', questionsResponse.data);
      if (questionsResponse.data.success) {
        setQuestions(questionsResponse.data.data);
      } else {
        console.error('Failed to fetch questions:', questionsResponse.data.message);
        setQuestions([]);
      }

      // Fetch users for the user's domain
      console.log('Fetching users...');
      const usersResponse = await axios.get(`${API_URL}/users/domain/${domain}`);
      console.log('Users response:', usersResponse.data);
      if (usersResponse.data.success) {
        setUsers(usersResponse.data.data);
      } else {
        console.error('Failed to fetch users:', usersResponse.data.message);
        setUsers([]);
      }
      
      console.log('Data fetching completed successfully');
    } catch (err) {
      console.error('Error fetching data:', err);
      setError(err.response?.data?.message || 'Failed to load data');
      // Set empty arrays to prevent undefined errors
      setDiscussions([]);
      setQuestions([]);
      setUsers([]);
    } finally {
      setLoading(false);
    }
  };

  const showNotification = (message, type = 'success') => {
    setNotification({ message, type });
    setTimeout(() => setNotification(null), 4000);
  };

  const handleLogin = async (e) => {
    e.preventDefault();

    if (!loginData.email || !loginData.domain) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(loginData.email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    try {
      setLoading(true);
      
      // First, get users by domain to find the user
      const usersResponse = await axios.get(`${API_URL}/users/domain/${loginData.domain}`);
      
      if (!usersResponse.data.success) {
        showNotification(usersResponse.data.message || 'Failed to fetch users', 'error');
        return;
      }
      
      const users = usersResponse.data.data;
      
      // Find user by email
      const user = users.find(u => u.email.toLowerCase() === loginData.email.toLowerCase());
      
      if (!user) {
        showNotification('User not found. Please check your email and domain, or register first.', 'error');
        return;
      }

      // Store in localStorage
      localStorage.setItem('forumUser', JSON.stringify(user));
      setCurrentUser(user);
      setShowLogin(false);
      setShowRegistration(false);
      await fetchData(user.domain);
      showNotification('Welcome back!');
    } catch (error) {
      console.error('Login error:', error);
      showNotification(
        error.response?.data?.message || 'Login failed. Please try again.',
        'error'
      );
    } finally {
      setLoading(false);
    }
  };

  const handleRegistration = async (e) => {
    e.preventDefault();

    if (!registrationData.name || !registrationData.email || !registrationData.domain) {
      showNotification('Please fill in all required fields', 'error');
      return;
    }

    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(registrationData.email)) {
      showNotification('Please enter a valid email address', 'error');
      return;
    }

    try {
      setLoading(true);
      
      const response = await axios.post(`${API_URL}/users/register`, registrationData);
      
      if (!response.data.success) {
        showNotification(response.data.message || 'Registration failed', 'error');
        return;
      }
      
      const newUser = response.data.data;

      // Store in localStorage
      localStorage.setItem('forumUser', JSON.stringify(newUser));
      
      setCurrentUser(newUser);
      
      setShowRegistration(false);
      setShowLogin(false);
      
      await fetchData(newUser.domain);
      
      showNotification('Welcome to the community!');
    } catch (error) {
      console.error('Registration error:', error);
      console.error('Error response:', error.response?.data);
      
      // Handle specific error cases
      if (error.response?.status === 409) {
        const message = error.response?.data?.message || 'User already exists with this email. Switching to login...';
        showNotification(message, 'error');
        // Switch to login mode and pre-fill the email and domain
        setTimeout(() => {
          setIsLoginMode(true);
          clearForms();
          setLoginData({ email: registrationData.email, domain: registrationData.domain });
        }, 1500); // Small delay to let user see the message
      } else {
        const errorMessage = error.response?.data?.message || 'Registration failed. Please try again.';
        showNotification(errorMessage, 'error');
      }
    } finally {
      setLoading(false);
    }
  };

  const handleDiscussionSubmit = async (e) => {
    e.preventDefault();

    if (!discussionForm.title || !discussionForm.content) {
      showNotification('Please fill in title and content', 'error');
      return;
    }

    try {
      // First, upload any attachments
      let uploadedFiles = [];
      if (discussionForm.attachments.length > 0) {
        const formData = new FormData();
        discussionForm.attachments.forEach(file => formData.append('files', file));
        const uploadResponse = await axios.post(`${API_URL}/upload/discussion`, formData, {
          headers: { 'Content-Type': 'multipart/form-data' },
        });
        uploadedFiles = uploadResponse.data.data.map(file => file.path);
      }

      // Create discussion
      const discussionData = {
        title: discussionForm.title,
        content: discussionForm.content,
        authorId: currentUser._id,
        domain: currentUser.domain,
        attachments: uploadedFiles,
      };

      const response = await axios.post(`${API_URL}/discussions`, discussionData);
      setDiscussions(prev => [response.data.data, ...prev]);
      setDiscussionForm({ title: '', content: '', attachments: [] });
      showNotification('Discussion posted successfully!');
      setShowContributeForm(false);
    } catch (error) {
      showNotification(
        error.response?.data?.message || 'Failed to post discussion',
        'error'
      );
      console.error('Discussion submission error:', error);
    }
  };

  const handleQuestionSubmit = async (e) => {
    e.preventDefault();

    if (!questionForm.company || !questionForm.round) {
      showNotification('Please fill in company and round details', 'error');
      return;
    }

    if (questionForm.questionType === 'text' && !questionForm.textContent) {
      showNotification('Please enter the question text', 'error');
      return;
    }

    if (questionForm.questionType === 'pdf' && !questionForm.pdfFile) {
      showNotification('Please upload a PDF file', 'error');
      return;
    }

    try {
      const formData = new FormData();
      formData.append('company', questionForm.company);
      formData.append('round', questionForm.round);
      formData.append('questionType', questionForm.questionType);
      formData.append('authorId', currentUser._id);
      formData.append('domain', currentUser.domain);
      if (questionForm.questionType === 'text') {
        formData.append('textContent', questionForm.textContent);
      } else {
        formData.append('pdfFile', questionForm.pdfFile);
      }

      const response = await axios.post(`${API_URL}/questions`, formData, {
        headers: { 'Content-Type': 'multipart/form-data' },
      });

      setQuestions(prev => [response.data.data, ...prev]);
      setQuestionForm({
        company: '',
        round: '',
        questionType: 'text',
        textContent: '',
        pdfFile: null,
      });
      setShowContributeForm(false);
      showNotification('Question contributed successfully!');
    } catch (error) {
      showNotification(
        error.response?.data?.message || 'Failed to submit question',
        'error'
      );
      console.error('Question submission error:', error);
    }
  };

  const handleFileUpload = (e, type) => {
    const files = Array.from(e.target.files);
    if (type === 'discussion') {
      setDiscussionForm(prev => ({
        ...prev,
        attachments: [...prev.attachments, ...files],
      }));
    } else if (type === 'question') {
      setQuestionForm(prev => ({
        ...prev,
        pdfFile: files[0],
      }));
    }
  };

  const formatDate = (dateString) => {
    const date = new Date(dateString);
    return date.toLocaleDateString('en-US', {
      year: 'numeric',
      month: 'short',
      day: 'numeric',
    });
  };

  const openProfile = async (user) => {
    try {
      const response = await axios.get(`${API_URL}/users/${user._id}`);
      setSelectedProfile(response.data.data);
      setShowProfileModal(true);
    } catch (error) {
      showNotification('Failed to load profile', 'error');
      console.error('Profile fetch error:', error);
    }
  };

  const openExternalLink = (url) => {
    window.open(url, '_blank');
  };

  const handleLike = async (id, type) => {
    try {
      const endpoint = type === 'discussion' ? `/discussions/${id}/like` : `/questions/${id}/like`;
      const response = await axios.patch(`${API_URL}${endpoint}`, { userId: currentUser._id });
      if (type === 'discussion') {
        setDiscussions(prev =>
          prev.map(disc =>
            disc._id === id ? { ...disc, likes: response.data.data.likes } : disc
          )
        );
      } else {
        setQuestions(prev =>
          prev.map(q => (q._id === id ? { ...q, likes: response.data.data.likes } : q))
        );
      }
      showNotification(`Successfully ${response.data.data.action} ${type}`);
    } catch (error) {
      showNotification(
        error.response?.data?.message || `Failed to like ${type}`,
        'error'
      );
      console.error(`Like ${type} error:`, error);
    }
  };

  const handleLogout = () => {
    // Clear localStorage
    localStorage.removeItem('forumUser');
    // Reset currentUser and show login form
    setCurrentUser(null);
    setShowLogin(true);
    setShowRegistration(false);
    setIsLoginMode(true);
    // Clear data to prevent stale content
    setDiscussions([]);
    setQuestions([]);
    setUsers([]);
    showNotification('Logged out successfully!', 'success');
  };

  const clearForms = () => {
    setLoginData({ email: '', domain: '' });
    setRegistrationData({
      name: '',
      email: '',
      domain: '',
      linkedinId: '',
      githubId: '',
      mobileNumber: ''
    });
  };

  const toggleAuthMode = () => {
    setIsLoginMode(!isLoginMode);
    clearForms();
  };

  if (showLogin) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center p-4">
        <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 max-w-2xl w-full">
          <div className="text-center mb-8">
            <div className="p-4 bg-gradient-to-r from-blue-500 to-purple-500 rounded-2xl w-20 h-20 mx-auto mb-4 flex items-center justify-center">
              <Users className="text-white" size={32} />
            </div>
            <h1 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent mb-2">
              {isLoginMode ? 'Welcome Back' : 'Join Domain Community'}
            </h1>
            <p className="text-gray-600">
              {isLoginMode ? 'Sign in to your account' : 'Connect with professionals in your field'}
            </p>
          </div>

          {/* Toggle between Login and Registration */}
          <div className="flex bg-gray-100 rounded-xl p-1 mb-8">
            <button
              onClick={() => setIsLoginMode(true)}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
                isLoginMode
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Login
            </button>
            <button
              onClick={() => setIsLoginMode(false)}
              className={`flex-1 px-4 py-3 rounded-lg font-semibold transition-all duration-300 ${
                !isLoginMode
                  ? 'bg-white text-blue-600 shadow-md'
                  : 'text-gray-600 hover:text-gray-800'
              }`}
            >
              Register
            </button>
          </div>

          {isLoginMode ? (
            // Login Form
            <form onSubmit={handleLogin} className="space-y-6">
              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Email Address *
                </label>
                <input
                  type="email"
                  value={loginData.email}
                  onChange={(e) => setLoginData(prev => ({ ...prev, email: e.target.value }))}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="Enter your email"
                  required
                />
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Domain/Specialization *
                </label>
                <select
                  value={loginData.domain}
                  onChange={(e) => setLoginData(prev => ({ ...prev, domain: e.target.value }))}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select your domain</option>
                  {domains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Signing In...
                  </>
                ) : (
                  <>
                    <User size={20} />
                    Sign In
                  </>
                )}
              </button>
            </form>
          ) : (
            // Registration Form
            <form onSubmit={handleRegistration} className="space-y-6">
              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Full Name *
                  </label>
                  <input
                    type="text"
                    value={registrationData.name}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, name: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your full name"
                    required
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    Email Address *
                  </label>
                  <input
                    type="email"
                    value={registrationData.email}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, email: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="Enter your email"
                    required
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Domain/Specialization *
                </label>
                <select
                  value={registrationData.domain}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, domain: e.target.value }))}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  required
                >
                  <option value="">Select your domain</option>
                  {domains.map(domain => (
                    <option key={domain} value={domain}>{domain}</option>
                  ))}
                </select>
              </div>

              <div className="grid md:grid-cols-2 gap-4">
                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    LinkedIn ID <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={registrationData.linkedinId}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, linkedinId: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="your-linkedin-username"
                  />
                </div>

                <div className="space-y-2">
                  <label className="block text-sm font-semibold text-gray-700">
                    GitHub ID <span className="text-gray-400">(Optional)</span>
                  </label>
                  <input
                    type="text"
                    value={registrationData.githubId}
                    onChange={(e) => setRegistrationData(prev => ({ ...prev, githubId: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="your-github-username"
                  />
                </div>
              </div>

              <div className="space-y-2">
                <label className="block text-sm font-semibold text-gray-700">
                  Mobile Number <span className="text-gray-400">(Optional)</span>
                </label>
                <input
                  type="tel"
                  value={registrationData.mobileNumber}
                  onChange={(e) => setRegistrationData(prev => ({ ...prev, mobileNumber: e.target.value }))}
                  className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                  placeholder="+1 (555) 123-4567"
                />
              </div>

              <button
                type="submit"
                disabled={loading}
                className="w-full px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center justify-center gap-3 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
              >
                {loading ? (
                  <>
                    <Loader2 size={20} className="animate-spin" />
                    Joining Community...
                  </>
                ) : (
                  <>
                    <UserPlus size={20} />
                    Join Community
                  </>
                )}
              </button>
            </form>
          )}
        </div>
      </div>
    );
  }

  if (loading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="flex flex-col items-center gap-4">
          <div className="relative">
            <div className="w-16 h-16 border-4 border-blue-200 rounded-full animate-spin"></div>
            <div className="absolute top-0 left-0 w-16 h-16 border-4 border-blue-600 rounded-full animate-spin border-t-transparent"></div>
          </div>
          <p className="text-gray-600 font-medium">Loading {currentUser?.domain} community...</p>
        </div>
      </div>
    );
  }

  if (error) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 flex items-center justify-center">
        <div className="text-center">
          <AlertCircle className="text-red-500 mx-auto mb-4" size={48} />
          <h3 className="text-xl font-semibold text-gray-600 mb-2">Error</h3>
          <p className="text-gray-500">{error}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-blue-50 to-purple-50 relative overflow-hidden">
      {/* Notification */}
      {notification && (
        <div className={`fixed top-6 right-6 z-50 p-4 rounded-xl shadow-2xl backdrop-blur-sm border transform transition-all duration-500 ease-out ${
          notification.type === 'success' 
            ? 'bg-green-50/90 border-green-200 text-green-800' 
            : 'bg-red-50/90 border-red-200 text-red-800'
        } animate-in slide-in-from-right-full`}>
          <div className="flex items-center gap-3">
            {notification.type === 'success' ? (
              <CheckCircle className="text-green-600" size={20} />
            ) : (
              <AlertCircle className="text-red-600" size={20} />
            )}
            <p className="font-medium">{notification.message}</p>
          </div>
        </div>
      )}

      <div className="relative z-10 p-6">
        <div className="max-w-6xl mx-auto">
          {/* Header */}
          <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 mb-8">
            <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4">
              <div className="space-y-2">
                <div className="flex items-center gap-3">
                  <div className="p-2 bg-gradient-to-r from-blue-500 to-purple-500 rounded-xl">
                    <Sparkles className="text-white" size={24} />
                  </div>
                  <div>
                    <h1 className="text-4xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                      {currentUser?.domain} Community
                    </h1>
                    <p className="text-gray-600">Connect with fellow {currentUser?.domain.toLowerCase()} professionals</p>
                  </div>
                </div>
              </div>
              
              <div className="flex items-center gap-4">
                <div className="flex items-center gap-3 px-4 py-2 bg-white/80 backdrop-blur-sm rounded-xl border border-white/20">
                  <div className="w-8 h-8 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-sm">
                    {currentUser?.avatar}
                  </div>
                  <div>
                    <p className="font-semibold text-gray-800">{currentUser?.name}</p>
                    <p className="text-sm text-gray-600">{currentUser?.domain}</p>
                  </div>
                </div>
                <button
                  onClick={() => {
                    setShowLogin(true);
                    setShowRegistration(false);
                    setIsLoginMode(true);
                    clearForms();
                  }}
                  className="px-4 py-2 bg-blue-100 text-blue-600 rounded-xl hover:bg-blue-200 hover:text-blue-700 font-semibold transition-all duration-200 flex items-center gap-2"
                  title="Switch account"
                >
                  <User size={18} />
                  <span>Switch Account</span>
                </button>
                <button
                  onClick={handleLogout}
                  className="px-4 py-2 bg-red-100 text-red-600 rounded-xl hover:bg-red-200 hover:text-red-700 font-semibold transition-all duration-200 flex items-center gap-2"
                  title="Log out"
                >
                  <LogOut size={18} />
                  <span>Logout</span>
                </button>
              </div>
            </div>
          </div>

          {/* Navigation Tabs */}
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-2 mb-8">
            <div className="flex gap-2">
              {[
                { id: 'discussions', label: 'Discussions', icon: MessageCircle },
                { id: 'questions', label: 'Questions', icon: FileText },
                { id: 'members', label: 'Members', icon: Users }
              ].map(tab => {
                const Icon = tab.icon;
                return (
                  <button
                    key={tab.id}
                    onClick={() => setActiveTab(tab.id)}
                    className={`flex-1 px-6 py-4 rounded-xl font-semibold transition-all duration-300 flex items-center justify-center gap-3 ${
                      activeTab === tab.id
                        ? 'bg-gradient-to-r from-blue-600 to-purple-600 text-white shadow-lg'
                        : 'text-gray-600 hover:bg-white/50'
                    }`}
                  >
                    <Icon size={20} />
                    {tab.label}
                  </button>
                );
              })}
            </div>
          </div>

          {/* Discussions Tab */}
          {activeTab === 'discussions' && (
            <div className="space-y-8">
              {/* New Discussion Form */}
              <div className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20 p-8">
                <h3 className="text-xl font-bold text-gray-800 mb-6 flex items-center gap-3">
                  <MessageCircle size={24} />
                  Start a Discussion in {currentUser?.domain}
                </h3>
                
                <form onSubmit={handleDiscussionSubmit} className="space-y-6">
                  <input
                    type="text"
                    value={discussionForm.title}
                    onChange={(e) => setDiscussionForm(prev => ({ ...prev, title: e.target.value }))}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    placeholder="What would you like to discuss?"
                    required
                  />
                  
                  <textarea
                    value={discussionForm.content}
                    onChange={(e) => setDiscussionForm(prev => ({ ...prev, content: e.target.value }))}
                    rows={4}
                    className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                    placeholder="Share your thoughts, ask questions, or start a conversation..."
                    required
                  />
                  
                  <div className="flex items-center justify-between">
                    <div className="flex gap-3">
                      <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all duration-200">
                        <Image size={18} />
                        <span className="text-sm font-medium">Images</span>
                        <input type="file" multiple accept="image/*" onChange={(e) => handleFileUpload(e, 'discussion')} className="hidden" />
                      </label>
                      <label className="flex items-center gap-2 px-4 py-2 bg-gray-50 hover:bg-gray-100 rounded-xl cursor-pointer transition-all duration-200">
                        <FileText size={18} />
                        <span className="text-sm font-medium">Files</span>
                        <input type="file" multiple accept=".pdf,.doc,.docx" onChange={(e) => handleFileUpload(e, 'discussion')} className="hidden" />
                      </label>
                    </div>
                    
                    <button
                      type="submit"
                      className="px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-2"
                    >
                      <Send size={18} />
                      Post Discussion
                    </button>
                  </div>

                  {discussionForm.attachments.length > 0 && (
                    <div className="mt-4 flex flex-wrap gap-2">
                      {discussionForm.attachments.map((file, idx) => (
                        <div key={idx} className="flex items-center gap-2 px-3 py-2 bg-green-50 rounded-lg border border-green-200">
                          <FileText size={16} />
                          <span className="text-sm">{file.name}</span>
                        </div>
                      ))}
                    </div>
                  )}
                </form>
              </div>

              {/* Discussions List */}
              <div className="space-y-6">
                {discussions.length === 0 ? (
                  <div className="text-center py-12 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
                    <MessageCircle size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No discussions yet</h3>
                    <p className="text-gray-500">Be the first to start a discussion in the {currentUser?.domain} community!</p>
                  </div>
                ) : (
                  discussions.map((discussion, index) => (
                    <div
                      key={discussion._id}
                      className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 border border-white/20 transform hover:scale-[1.01]"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div 
                          className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:scale-110 transition-transform duration-200"
                          onClick={() => openProfile(discussion.author)}
                        >
                          {discussion.author.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex items-center gap-3 mb-2">
                            <h4 
                              className="font-bold text-gray-800 cursor-pointer hover:text-blue-600 transition-colors duration-200"
                              onClick={() => openProfile(discussion.author)}
                            >
                              {discussion.author.name}
                            </h4>
                            <span className="bg-blue-100 text-blue-800 px-3 py-1 rounded-full text-sm font-medium">
                              {discussion.author.domain}
                            </span>
                            <span className="text-gray-500 text-sm">
                              {formatDate(discussion.createdAt)}
                            </span>
                          </div>
                          <h3 className="text-xl font-bold text-gray-800 mb-3">{discussion.title}</h3>
                          <p className="text-gray-700 leading-relaxed">{discussion.content}</p>
                          
                          {discussion.attachments.length > 0 && (
                            <div className="mt-4 flex flex-wrap gap-2">
                              {discussion.attachments.map((attachment, idx) => (
                                <a
                                  key={idx}
                                  href={`${API_URL}/files/discussions/${attachment.split('/')[1]}`}
                                  target="_blank"
                                  rel="noopener noreferrer"
                                  className="flex items-center gap-2 px-3 py-2 bg-gray-100 rounded-lg hover:bg-gray-200 transition-all duration-200"
                                >
                                  <FileText size={16} />
                                  <span className="text-sm">{attachment.split('/')[1]}</span>
                                  <Download size={16} />
                                </a>
                              ))}
                            </div>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleLike(discussion._id, 'discussion')}
                          className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors duration-200"
                        >
                          <Heart size={18} />
                          <span className="font-medium">{discussion.likes || 0}</span>
                        </button>
                        <button className="flex items-center gap-2 text-gray-600 hover:text-blue-500 transition-colors duration-200">
                          <MessageSquare size={18} />
                          <span className="font-medium">{discussion.replies || 0} replies</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Questions Tab */}
          {activeTab === 'questions' && (
            <div className="space-y-8">
              <div className="flex justify-between items-center">
                <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                  {currentUser?.domain} Interview Questions
                </h2>
                <button
                  onClick={() => setShowContributeForm(true)}
                  className="bg-gradient-to-r from-blue-600 to-purple-600 text-white px-6 py-3 rounded-xl font-semibold hover:from-blue-700 hover:to-purple-700 transition-all duration-300 shadow-lg hover:shadow-xl transform hover:scale-105 flex items-center gap-3"
                >
                  <Plus size={20} />
                  Add Question
                </button>
              </div>

              {/* Questions List */}
              <div className="grid gap-6">
                {questions.length === 0 ? (
                  <div className="text-center py-12 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
                    <FileText size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No questions yet</h3>
                    <p className="text-gray-500">Be the first to share an interview question for {currentUser?.domain}!</p>
                  </div>
                ) : (
                  questions.map((question, index) => (
                    <div
                      key={question._id}
                      className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-8 border border-white/20 transform hover:scale-[1.01]"
                    >
                      <div className="flex items-start gap-4 mb-4">
                        <div 
                          className="w-12 h-12 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold cursor-pointer hover:scale-110 transition-transform duration-200"
                          onClick={() => openProfile(question.author)}
                        >
                          {question.author.avatar}
                        </div>
                        <div className="flex-1">
                          <div className="flex flex-wrap items-center gap-3 mb-4">
                            <span className="bg-gradient-to-r from-blue-100 to-blue-50 text-blue-800 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                              <Building size={16} />
                              {question.company}
                            </span>
                            <span className="bg-gradient-to-r from-green-100 to-green-50 text-green-800 px-4 py-2 rounded-full text-sm font-semibold">
                              {question.round}
                            </span>
                            <span className="bg-gradient-to-r from-purple-100 to-purple-50 text-purple-800 px-4 py-2 rounded-full text-sm font-semibold flex items-center gap-2">
                              <FileText size={16} />
                              {question.questionType.toUpperCase()}
                            </span>
                          </div>

                          <div className="mb-4">
                            {question.questionType === 'pdf' ? (
                              <div className="flex items-center gap-4 p-6 bg-gradient-to-r from-gray-50 to-gray-100/50 rounded-xl border border-gray-200">
                                <div className="p-3 bg-red-100 rounded-xl">
                                  <FileText className="text-red-600" size={28} />
                                </div>
                                <div>
                                  <p className="font-semibold text-gray-800 text-lg">{question.content}</p>
                                  <a
                                    href={`${API_URL}/files/questions/${question.fileName}`}
                                    target="_blank"
                                    rel="noopener noreferrer"
                                    className="text-blue-600 hover:text-blue-800 font-medium flex items-center gap-2 mt-2"
                                  >
                                    <Download size={16} />
                                    Download PDF
                                  </a>
                                </div>
                              </div>
                            ) : (
                              <p className="text-gray-700 leading-relaxed text-lg font-medium">{question.content}</p>
                            )}
                          </div>

                          <div className="flex flex-wrap items-center gap-6 text-sm text-gray-500">
                            <div className="flex items-center gap-2">
                              <Users size={16} />
                              <span 
                                className="font-medium cursor-pointer hover:text-blue-600"
                                onClick={() => openProfile(question.author)}
                              >
                                By {question.author.name}
                              </span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Calendar size={16} />
                              <span>{formatDate(question.createdAt)}</span>
                            </div>
                            <div className="flex items-center gap-2">
                              <Eye size={16} />
                              <span className="font-medium">{question.views || 0} views</span>
                            </div>
                          </div>
                        </div>
                      </div>

                      <div className="flex items-center gap-6 pt-4 border-t border-gray-100">
                        <button
                          onClick={() => handleLike(question._id, 'question')}
                          className="flex items-center gap-2 text-gray-600 hover:text-red-500 transition-colors duration-200"
                        >
                          <Heart size={18} />
                          <span className="font-medium">{question.likes || 0}</span>
                        </button>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Members Tab */}
          {activeTab === 'members' && (
            <div className="space-y-8">
              <h2 className="text-3xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent">
                {currentUser?.domain} Community Members
              </h2>

              <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-6">
                {users.length === 0 ? (
                  <div className="col-span-full text-center py-12 bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg border border-white/20">
                    <Users size={48} className="text-gray-400 mx-auto mb-4" />
                    <h3 className="text-xl font-semibold text-gray-600 mb-2">No members yet</h3>
                    <p className="text-gray-500">You're among the first to join the {currentUser?.domain} community!</p>
                  </div>
                ) : (
                  users.map((user, index) => (
                    <div
                      key={user._id}
                      className="bg-white/80 backdrop-blur-xl rounded-2xl shadow-lg hover:shadow-2xl transition-all duration-500 p-6 border border-white/20 transform hover:scale-105 cursor-pointer"
                      onClick={() => openProfile(user)}
                      style={{ animationDelay: `${index * 100}ms` }}
                    >
                      <div className="text-center">
                        <div className="w-16 h-16 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-xl mx-auto mb-4">
                          {user.avatar}
                        </div>
                        <h3 className="text-xl font-bold text-gray-800 mb-2">{user.name}</h3>
                        <p className="text-blue-600 font-medium mb-3">{user.domain}</p>
                        <div className="flex justify-center gap-4 mb-4">
                          {user.linkedinId && (
                            <div className="p-2 bg-blue-100 rounded-lg">
                              <Linkedin className="text-blue-600" size={16} />
                            </div>
                          )}
                          {user.githubId && (
                            <div className="p-2 bg-gray-100 rounded-lg">
                              <Github className="text-gray-700" size={16} />
                            </div>
                          )}
                          {user.mobileNumber && (
                            <div className="p-2 bg-green-100 rounded-lg">
                              <Phone className="text-green-600" size={16} />
                            </div>
                          )}
                        </div>
                        <div className="text-sm text-gray-600">
                          <p>{user.contributions} contributions</p>
                          <p>Joined {formatDate(user.joinedAt)}</p>
                        </div>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}

          {/* Contribute Question Modal */}
          {showContributeForm && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 max-w-2xl w-full max-h-[90vh] overflow-y-auto">
                <div className="flex justify-between items-center mb-8">
                  <h2 className="text-2xl font-bold bg-gradient-to-r from-gray-800 to-gray-600 bg-clip-text text-transparent flex items-center gap-3">
                    <Plus size={24} />
                    Contribute {currentUser?.domain} Question
                  </h2>
                  <button
                    onClick={() => setShowContributeForm(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  >
                    <X size={24} />
                  </button>
                </div>

                <form onSubmit={handleQuestionSubmit} className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-4">
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Company Name *
                      </label>
                      <input
                        type="text"
                        value={questionForm.company}
                        onChange={(e) => setQuestionForm(prev => ({ ...prev, company: e.target.value }))}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., Google, Microsoft, Amazon"
                        required
                      />
                    </div>

                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Interview Round *
                      </label>
                      <input
                        type="text"
                        value={questionForm.round}
                        onChange={(e) => setQuestionForm(prev => ({ ...prev, round: e.target.value }))}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                        placeholder="e.g., Technical Round 1, System Design"
                        required
                      />
                    </div>
                  </div>

                  <div className="space-y-2">
                    <label className="block text-sm font-semibold text-gray-700">
                      Question Type
                    </label>
                    <select
                      value={questionForm.questionType}
                      onChange={(e) => setQuestionForm(prev => ({ ...prev, questionType: e.target.value }))}
                      className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200"
                    >
                      <option value="text">Text Question</option>
                      <option value="pdf">PDF Upload</option>
                    </select>
                  </div>

                  {questionForm.questionType === 'text' ? (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Question Content *
                      </label>
                      <textarea
                        value={questionForm.textContent}
                        onChange={(e) => setQuestionForm(prev => ({ ...prev, textContent: e.target.value }))}
                        rows={4}
                        className="w-full p-4 border border-gray-200 rounded-xl focus:ring-2 focus:ring-blue-500 focus:border-transparent transition-all duration-200 resize-none"
                        placeholder="Enter the interview question here..."
                        required={questionForm.questionType === 'text'}
                      />
                    </div>
                  ) : (
                    <div className="space-y-2">
                      <label className="block text-sm font-semibold text-gray-700">
                        Upload PDF *
                      </label>
                      <div className="border-2 border-dashed border-gray-300 rounded-xl p-8 text-center hover:border-blue-400 transition-all duration-300">
                        <Upload className="mx-auto mb-4 text-gray-400" size={48} />
                        <input
                          type="file"
                          accept=".pdf"
                          onChange={(e) => handleFileUpload(e, 'question')}
                          className="hidden"
                          id="pdf-upload"
                          required={questionForm.questionType === 'pdf'}
                        />
                        <label
                          htmlFor="pdf-upload"
                          className="cursor-pointer text-blue-600 hover:text-blue-700 font-semibold text-lg"
                        >
                          Click to upload PDF
                        </label>
                        <p className="text-gray-500 text-sm mt-2">Maximum file size: 10MB</p>
                        {questionForm.pdfFile && (
                          <div className="mt-4 p-3 bg-green-50 rounded-lg border border-green-200">
                            <p className="text-green-800 font-medium">
                              ✓ {questionForm.pdfFile.name}
                            </p>
                          </div>
                        )}
                      </div>
                    </div>
                  )}

                  <div className="flex gap-4 pt-6">
                    <button
                      type="button"
                      onClick={() => setShowContributeForm(false)}
                      className="flex-1 px-6 py-4 border border-gray-300 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200"
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="flex-1 px-6 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-3"
                    >
                      <Plus size={20} />
                      Submit Question
                    </button>
                  </div>
                </form>
              </div>
            </div>
          )}

          {/* Profile Modal */}
          {showProfileModal && selectedProfile && (
            <div className="fixed inset-0 bg-black/50 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-in fade-in duration-300">
              <div className="bg-white/95 backdrop-blur-xl rounded-3xl shadow-2xl border border-white/20 p-8 max-w-2xl w-full">
                <div className="flex justify-between items-start mb-8">
                  <div className="flex items-center gap-6">
                    <div className="w-20 h-20 bg-gradient-to-r from-blue-500 to-purple-500 rounded-full flex items-center justify-center text-white font-bold text-2xl">
                      {selectedProfile.avatar}
                    </div>
                    <div>
                      <h2 className="text-3xl font-bold text-gray-800">{selectedProfile.name}</h2>
                      <p className="text-xl text-blue-600 font-semibold">{selectedProfile.domain}</p>
                      <p className="text-gray-600 mt-1">Joined {formatDate(selectedProfile.joinedAt)}</p>
                    </div>
                  </div>
                  <button
                    onClick={() => setShowProfileModal(false)}
                    className="p-2 text-gray-400 hover:text-gray-600 hover:bg-gray-100 rounded-xl transition-all duration-200"
                  >
                    <X size={24} />
                  </button>
                </div>

                <div className="space-y-6">
                  <div className="grid md:grid-cols-2 gap-6">
                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <User size={20} />
                        Contact Information
                      </h3>
                      <div className="space-y-2 text-gray-600">
                        <p className="flex items-center gap-2">
                          <span className="font-medium">Email:</span>
                          <span>{selectedProfile.email}</span>
                        </p>
                        {selectedProfile.mobileNumber && (
                          <p className="flex items-center gap-2">
                            <Phone size={16} />
                            <span>{selectedProfile.mobileNumber}</span>
                          </p>
                        )}
                      </div>
                    </div>

                    <div className="space-y-3">
                      <h3 className="text-lg font-semibold text-gray-800 flex items-center gap-2">
                        <Globe size={20} />
                        Social Profiles
                      </h3>
                      <div className="space-y-2">
                        {selectedProfile.linkedinId && (
                          <button
                            onClick={() => openExternalLink(`${selectedProfile.linkedinId}`)}
                            className="flex items-center gap-3 p-3 bg-blue-50 hover:bg-blue-100 rounded-xl w-full text-left transition-all duration-200"
                          >
                            <Linkedin className="text-blue-600" size={20} />
                            <span className="text-blue-800 font-medium">LinkedIn Profile</span>
                            <ExternalLink size={16} className="ml-auto text-blue-600" />
                          </button>
                        )}
                        {selectedProfile.githubId && (
                          <button
                            onClick={() => openExternalLink(`${selectedProfile.githubId}`)}
                            className="flex items-center gap-3 p-3 bg-gray-50 hover:bg-gray-100 rounded-xl w-full text-left transition-all duration-200"
                          >
                            <Github className="text-gray-700" size={20} />
                            <span className="text-gray-800 font-medium">GitHub Profile</span>
                            <ExternalLink size={16} className="ml-auto text-gray-600" />
                          </button>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="bg-gradient-to-r from-blue-50 to-purple-50 rounded-xl p-6">
                    <h3 className="text-lg font-semibold text-gray-800 mb-3 flex items-center gap-2">
                      <Sparkles size={20} />
                      Community Stats
                    </h3>
                    <div className="grid grid-cols-3 gap-4 text-center">
                      <div>
                        <p className="text-2xl font-bold text-blue-600">{selectedProfile.contributions || 0}</p>
                        <p className="text-sm text-gray-600">Contributions</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-green-600">4.8</p>
                        <p className="text-sm text-gray-600">Rating</p>
                      </div>
                      <div>
                        <p className="text-2xl font-bold text-purple-600">{selectedProfile.connections || 0}</p>
                        <p className="text-sm text-gray-600">Connections</p>
                      </div>
                    </div>
                  </div>

                  <div className="flex gap-4 pt-4">
                    <button className="flex-1 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 font-semibold transition-all duration-300 shadow-lg hover:shadow-xl flex items-center justify-center gap-2">
                      <MessageCircle size={18} />
                      Send Message
                    </button>
                    <button className="flex-1 px-6 py-3 border-2 border-gray-200 text-gray-700 rounded-xl hover:bg-gray-50 font-semibold transition-all duration-200 flex items-center justify-center gap-2">
                      <UserPlus size={18} />
                      Connect
                    </button>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default CommunityForum;