import React, { useState, useContext } from 'react';
import { Book, GraduationCap, PenTool, Brain, Users, School, Mail, Lock, Eye, EyeOff, ArrowRight } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import Lottie from "lottie-react";
import { motion } from "framer-motion";

export default function TeacherLogin() {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();
  const { handleTeacherLogin } = useContext(AuthContext);

  // Lottie animation URL for the hero section - Education/Teacher Theme
  const interviewAnimationUrl = "https://assets4.lottiefiles.com/packages/lf20_jh9gfdhx.json";
  const [animationData, setAnimationData] = useState(null);

  React.useEffect(() => {
    fetch(interviewAnimationUrl)
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error("Failed to load animation:", err));
  }, []);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/teacher/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to login');
      handleTeacherLogin({ name: data.user.name, email: loginForm.email, id: data.user.id });
      navigate('/teacher/dashboard');
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white overflow-hidden">
      {/* Left Side - Hero Animation & Background */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-gradient-to-br from-yellow-50 via-orange-50 to-red-50 overflow-hidden">

        {/* Dynamic Animated Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-yellow-300/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, 100, 0],
              scale: [1, 1.5, 1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-orange-300/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, 50, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-red-300/20 rounded-full blur-[100px]"
          />

          {/* Floating Teacher Icons */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-20 left-[10%] text-yellow-500/40">
              <Book className="w-16 h-16" />
            </motion.div>
            <motion.div animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }} className="absolute top-40 right-[10%] text-orange-500/40">
              <GraduationCap className="w-20 h-20" />
            </motion.div>
            <motion.div animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 2 }} className="absolute bottom-32 left-[15%] text-red-500/40">
              <PenTool className="w-14 h-14" />
            </motion.div>
            <motion.div animate={{ y: [0, 25, 0], rotate: [0, -5, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 0.5 }} className="absolute bottom-20 right-[20%] text-yellow-600/40">
              <Brain className="w-12 h-12" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 15, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1.5 }} className="absolute top-1/2 left-[5%] text-orange-400/40">
              <Users className="w-10 h-10" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-1/3 right-[25%] text-red-400/40">
              <School className="w-8 h-8" />
            </motion.div>
          </div>
        </div>

        {/* Content */}
        <div className="relative z-10 w-full max-w-lg p-12">
          {/* Decorative Circle behind Lottie */}
          <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[500px] h-[500px] bg-white/40 rounded-full blur-3xl -z-10"></div>

          <motion.div
            initial={{ scale: 0.8, opacity: 0 }}
            animate={{ scale: 1, opacity: 1 }}
            transition={{ delay: 0.2, duration: 0.8 }}
          >
            {animationData ? (
              <Lottie animationData={animationData} loop={true} className="drop-shadow-xl" />
            ) : (
              <div className="animate-pulse flex space-x-4 justify-center">
                <div className="h-64 w-64 bg-yellow-100/50 rounded-full"></div>
              </div>
            )}
          </motion.div>

          <motion.div
            initial={{ y: 20, opacity: 0 }}
            animate={{ y: 0, opacity: 1 }}
            transition={{ delay: 0.6, duration: 0.8 }}
            className="text-center mt-10"
          >
            <h2 className="text-4xl font-bold text-gray-800 mb-4 tracking-tight">
              Inspire the Next Generation
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
              Access tools to guide your students towards their dream careers.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Login Form */}
      <div className="w-full lg:w-1/2 flex items-center justify-center p-8 sm:p-12 lg:p-24 bg-white relative">
        <motion.div
          initial={{ opacity: 0, x: 20 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: 0.4, duration: 0.6 }}
          className="w-full max-w-md space-y-8"
        >
          <div className="text-center mb-10">
            <motion.div
              whileHover={{ rotate: 10, scale: 1.1 }}
              transition={{ type: "spring", stiffness: 300 }}
              className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-yellow-500 to-orange-600 shadow-xl shadow-orange-500/20 mb-6"
            >
              <Book className="w-12 h-12 text-white" />
            </motion.div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 via-orange-600 to-red-600 mb-3 tracking-tight">
              Teacher Portal
            </h1>
            <p className="text-gray-500 text-lg">
              Sign in to manage your classes
            </p>
          </div>

          {error && (
            <motion.div
              initial={{ opacity: 0, height: 0 }}
              animate={{ opacity: 1, height: "auto" }}
              className="bg-red-50 border border-red-100 text-red-600 px-4 py-3 rounded-xl flex items-center gap-3 text-sm font-medium"
            >
              <div className="w-1.5 h-1.5 rounded-full bg-red-500 shrink-0" />
              {error}
            </motion.div>
          )}

          <form onSubmit={handleLogin} className="space-y-5">
            <div className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="relative group"
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300" />
                </div>
                <input
                  type="email"
                  value={loginForm.email}
                  onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 hover:bg-white focus:bg-white shadow-sm hover:shadow-md"
                  placeholder="teacher@school.com"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="relative group"
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-orange-600 transition-colors duration-300" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={loginForm.password}
                  onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                  required
                  className="block w-full pl-12 pr-12 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-orange-500/20 focus:border-orange-500 transition-all duration-300 hover:bg-white focus:bg-white shadow-sm hover:shadow-md"
                  placeholder="Password"
                />
                <button
                  type="button"
                  className="absolute inset-y-0 right-0 pr-4 flex items-center text-gray-400 hover:text-gray-600 transition-colors cursor-pointer z-10"
                  onClick={() => setShowPassword(!showPassword)}
                >
                  {showPassword ? <EyeOff className="h-5 w-5" /> : <Eye className="h-5 w-5" />}
                </button>
              </motion.div>
            </div>

            <div className="flex items-center justify-between text-sm">
              <div className="flex items-center">
                <input
                  id="remember-me"
                  name="remember-me"
                  type="checkbox"
                  className="h-4 w-4 text-orange-600 focus:ring-orange-500 border-gray-300 rounded"
                />
                <label htmlFor="remember-me" className="ml-2 block text-gray-500">
                  Remember me
                </label>
              </div>
              <a href="#" className="font-medium text-orange-600 hover:text-orange-500 transition-colors">
                Forgot password?
              </a>
            </div>

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full relative overflow-hidden flex justify-center items-center py-4 px-4 rounded-2xl shadow-lg shadow-orange-500/30 text-sm font-bold text-white bg-gradient-to-r from-yellow-500 via-orange-600 to-red-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-orange-500 disabled:opacity-70 disabled:cursor-not-allowed mt-8"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing in...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Sign In to Dashboard</span>
                  <ArrowRight className="w-5 h-5" />
                </div>
              )}
            </motion.button>
          </form>

          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            transition={{ delay: 1 }}
            className="mt-8 text-center"
          >
            <p className="text-gray-500 text-sm">
              Don't have an account?{' '}
              <Link to="/teacher/signup" className="font-semibold text-orange-600 hover:text-red-600 transition-colors hover:underline">
                Sign Up
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}