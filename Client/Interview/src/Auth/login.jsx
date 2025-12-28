import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Hash, UserCheck, Eye, EyeOff, ArrowRight, Book, GraduationCap, Brain, Target, Award, Sparkles } from "lucide-react";
import Lottie from "lottie-react";
import { motion } from "framer-motion";
import { AuthContext } from "../context/AuthContext";
import studentImage from '../assets/stud.png';

function StudentLogin() {
  const [form, setForm] = useState({
    email: "",
    password: "",
    role: "",
    rollNo: ""
  });

  const [loading, setLoading] = useState(false);
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState("");

  const navigate = useNavigate();
  const { handleCandidateLogin } = useContext(AuthContext);

  // Lottie animation URL for the hero section
  const interviewAnimationUrl = "https://assets9.lottiefiles.com/packages/lf20_3rwasyjy.json";
  const [animationData, setAnimationData] = useState(null);

  React.useEffect(() => {
    fetch(interviewAnimationUrl)
      .then(response => response.json())
      .then(data => setAnimationData(data))
      .catch(err => console.error("Failed to load animation:", err));
  }, []);

  const handleChange = (e) => {
    setForm({ ...form, [e.target.name]: e.target.value });
    if (error) setError("");
  };

  const handleLogin = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError("");

    try {
      const res = await axios.post("http://localhost:5000/api/candidate/login", {
        email: form.email,
        password: form.password,
        rollNo: form.rollNo,
        role: form.role
      });

      const candidateData = {
        id: res.data.student.id,
        email: res.data.student.email,
        role: res.data.student.role,
        rollNo: res.data.student.rollNo,
        status: res.data.student.status,
        token: res.data.token
      };
      localStorage.setItem("candidate", JSON.stringify(candidateData));

      handleCandidateLogin(candidateData);
      navigate("/user-select");
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen w-full flex bg-white overflow-hidden">
      {/* Left Side - Hero Animation & Background */}
      <div className="hidden lg:flex lg:w-1/2 relative items-center justify-center bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 overflow-hidden">

        {/* Dynamic Animated Background - Now confined to left side */}
        <div className="absolute inset-0 w-full h-full overflow-hidden z-0">
          <motion.div
            animate={{
              x: [0, 100, 0],
              y: [0, -50, 0],
              scale: [1, 1.2, 1]
            }}
            transition={{ duration: 20, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-300/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, -100, 0],
              y: [0, 100, 0],
              scale: [1, 1.5, 1]
            }}
            transition={{ duration: 25, repeat: Infinity, ease: "easeInOut" }}
            className="absolute bottom-[-10%] right-[-10%] w-[600px] h-[600px] bg-indigo-300/30 rounded-full blur-[120px]"
          />
          <motion.div
            animate={{
              x: [0, 50, 0],
              y: [0, 50, 0],
              opacity: [0.3, 0.6, 0.3]
            }}
            transition={{ duration: 15, repeat: Infinity, ease: "easeInOut" }}
            className="absolute top-[40%] left-[30%] w-[300px] h-[300px] bg-pink-300/20 rounded-full blur-[100px]"
          />

          {/* Floating Icons */}
          <div className="absolute inset-0 pointer-events-none">
            <motion.div animate={{ y: [0, -20, 0], rotate: [0, 10, 0] }} transition={{ duration: 5, repeat: Infinity }} className="absolute top-20 left-[10%] text-indigo-400/40">
              <Book className="w-16 h-16" />
            </motion.div>
            <motion.div animate={{ y: [0, 20, 0], rotate: [0, -10, 0] }} transition={{ duration: 6, repeat: Infinity, delay: 1 }} className="absolute top-40 right-[10%] text-purple-400/40">
              <GraduationCap className="w-20 h-20" />
            </motion.div>
            <motion.div animate={{ y: [0, -15, 0], rotate: [0, 5, 0] }} transition={{ duration: 7, repeat: Infinity, delay: 2 }} className="absolute bottom-32 left-[15%] text-pink-400/40">
              <Brain className="w-14 h-14" />
            </motion.div>
            <motion.div animate={{ y: [0, 25, 0], rotate: [0, -5, 0] }} transition={{ duration: 8, repeat: Infinity, delay: 0.5 }} className="absolute bottom-20 right-[20%] text-blue-400/40">
              <Target className="w-12 h-12" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.1, 1], rotate: [0, 15, 0] }} transition={{ duration: 4, repeat: Infinity, delay: 1.5 }} className="absolute top-1/2 left-[5%] text-yellow-400/40">
              <Award className="w-10 h-10" />
            </motion.div>
            <motion.div animate={{ scale: [1, 1.2, 1], opacity: [0.3, 0.6, 0.3] }} transition={{ duration: 3, repeat: Infinity }} className="absolute top-1/3 right-[25%] text-indigo-400/40">
              <Sparkles className="w-8 h-8" />
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
                <div className="h-64 w-64 bg-indigo-100/50 rounded-full"></div>
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
              Unlock Your Potential
            </h2>
            <p className="text-lg text-gray-600 max-w-md mx-auto leading-relaxed">
              Experience the future of interview preparation with our AI-driven insights.
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
              className="inline-flex p-4 rounded-3xl bg-gradient-to-br from-indigo-600 to-purple-700 shadow-xl shadow-indigo-500/20 mb-6"
            >
              <img src={studentImage} alt="Student Portal" className="w-12 h-12 object-contain" />
            </motion.div>
            <h1 className="text-4xl font-black text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 mb-3 tracking-tight">
              Welcome Back
            </h1>
            <p className="text-gray-500 text-lg">
              Please sign in to continue your journey
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
                  <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
                </div>
                <input
                  name="email"
                  type="email"
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 hover:bg-white focus:bg-white shadow-sm hover:shadow-md"
                  placeholder="Email Address"
                  value={form.email}
                  onChange={handleChange}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.6 }}
                className="relative group"
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Hash className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
                </div>
                <input
                  name="rollNo"
                  type="text"
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 hover:bg-white focus:bg-white shadow-sm hover:shadow-md"
                  placeholder="Roll Number"
                  value={form.rollNo}
                  onChange={handleChange}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.7 }}
                className="relative group"
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <UserCheck className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
                </div>
                <input
                  name="role"
                  type="text"
                  required
                  className="block w-full pl-12 pr-4 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 hover:bg-white focus:bg-white shadow-sm hover:shadow-md"
                  placeholder="Target Role"
                  value={form.role}
                  onChange={handleChange}
                />
              </motion.div>

              <motion.div
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.8 }}
                className="relative group"
              >
                <div className="absolute inset-y-0 left-0 pl-4 flex items-center pointer-events-none z-10">
                  <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-indigo-600 transition-colors duration-300" />
                </div>
                <input
                  name="password"
                  type={showPassword ? "text" : "password"}
                  required
                  className="block w-full pl-12 pr-12 py-4 bg-gray-50/50 border border-gray-200 rounded-2xl text-gray-900 placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-indigo-500/20 focus:border-indigo-500 transition-all duration-300 hover:bg-white focus:bg-white shadow-sm hover:shadow-md"
                  placeholder="Password"
                  value={form.password}
                  onChange={handleChange}
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
              disabled={loading}
              className="w-full relative overflow-hidden flex justify-center items-center py-4 px-4 rounded-2xl shadow-lg shadow-indigo-500/30 text-sm font-bold text-white bg-gradient-to-r from-indigo-600 via-purple-600 to-indigo-600 bg-[length:200%_auto] hover:bg-right transition-all duration-500 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500 disabled:opacity-70 disabled:cursor-not-allowed mt-8"
            >
              {loading ? (
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
              <button className="font-semibold text-indigo-600 hover:text-purple-600 transition-colors hover:underline">
                Contact Administrator
              </button>
            </p>
          </motion.div>
        </motion.div>
      </div>
    </div>
  );
}

export default StudentLogin;