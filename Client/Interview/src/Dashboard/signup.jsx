import React, { useState } from 'react';
import { Mail, Lock, ArrowRight, Users, Briefcase, Building, Globe, Award, TrendingUp, Eye, EyeOff } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import hrImage from '../assets/hr.png';
import Lottie from "lottie-react";
import { motion } from "framer-motion";

export default function Signup() {
  const [signupForm, setSignupForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const navigate = useNavigate();

  // Lottie animation URL for the hero section - HR Interview/Meeting Theme
  const interviewAnimationUrl = "https://assets10.lottiefiles.com/packages/lf20_w51pcehl.json";
  const [animationData, setAnimationData] = useState(null);

  React.useEffect(() => {
    fetch(interviewAnimationUrl)
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error("Failed to load animation:", err));
  }, []);

  const handleSignup = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/signup', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(signupForm)
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to signup');
      navigate('/hr/login');
    } catch (err) {
      setError(err.message);
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white overflow-hidden">
      {/* Left Side - Hero Animation & Background */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50 overflow-hidden">

        {/* Dynamic Animated Background */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-blue-300/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, 100, 0],
              scale: [1, 1.5, 1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-purple-300/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, 50, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-indigo-300/20 rounded-full blur-[100px]"
          />

          {/* Floating HR Icons */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-20 left-[10%] text-blue-400/40">
              <Users className="w-16 h-16" />
            </motion.div>
            <motion.div animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }} className="absolute top-40 right-[10%] text-purple-400/40">
              <Briefcase className="w-20 h-20" />
            </motion.div>
            <motion.div animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 2 }} className="absolute bottom-32 left-[15%] text-indigo-400/40">
              <Building className="w-14 h-14" />
            </motion.div>
            <motion.div animate={{ y: [0, 25, 0], rotate: [0, -5, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 0.5 }} className="absolute bottom-20 right-[20%] text-blue-400/40">
              <Globe className="w-12 h-12" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 15, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1.5 }} className="absolute top-1/2 left-[5%] text-yellow-400/40">
              <Award className="w-10 h-10" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-1/3 right-[25%] text-purple-400/40">
              <TrendingUp className="w-8 h-8" />
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
                <div className="h-64 w-64 bg-blue-100/50 rounded-full"></div>
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
              Join the Future
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
              Create your HR account and start transforming your hiring process today.
            </p>
          </motion.div>
        </div>
      </div>

      {/* Right Side - Signup Form */}
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
              className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-blue-600 to-purple-700 shadow-xl shadow-blue-500/20 mb-6"
            >
              <img src={hrImage} alt="HR Portal" className="w-12 h-12 object-contain" />
            </motion.div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 mb-3 tracking-tight">
              Create Account
            </h1>
            <p className="text-gray-500 text-lg">
              Start your journey with us
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

          <form onSubmit={handleSignup} className="space-y-5">
            <div className="space-y-5">
              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.5 }}
                className="relative group"
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors duration-300" />
                </div>
                <input
                  type="email"
                  value={signupForm.email}
                  onChange={(e) => setSignupForm({ ...signupForm, email: e.target.value })}
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 hover:bg-white focus:bg-white shadow-sm hover:shadow-md"
                  placeholder="hr@company.com"
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="relative group"
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-600 transition-colors duration-300" />
                </div>
                <input
                  type={showPassword ? "text" : "password"}
                  value={signupForm.password}
                  onChange={(e) => setSignupForm({ ...signupForm, password: e.target.value })}
                  required
                  className="block w-full pl-12 pr-12 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-300 hover:bg-white focus:bg-white shadow-sm hover:shadow-md"
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

            <motion.button
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              type="submit"
              disabled={isLoading}
              className="w-full relative overflow-hidden flex justify-center items-center py-4 px-4 rounded-2xl shadow-lg shadow-blue-500/30 text-sm font-bold text-white bg-gradient-to-r from-blue-600 via-purple-600 to-blue-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 disabled:opacity-70 disabled:cursor-not-allowed mt-8"
            >
              {isLoading ? (
                <div className="flex items-center gap-2">
                  <div className="w-5 h-5 border-2 border-white/30 border-t-white rounded-full animate-spin" />
                  <span>Signing up...</span>
                </div>
              ) : (
                <div className="flex items-center gap-2">
                  <span>Create Account</span>
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
              Already have an account?{' '}
              <Link to="/hr/login" className="font-semibold text-blue-600 hover:text-purple-600 transition-colors hover:underline">
                Sign In
              </Link>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}
