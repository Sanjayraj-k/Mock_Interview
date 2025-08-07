import React, { useState, useContext } from "react";
import axios from "axios";
import { useNavigate } from "react-router-dom";
import { Mail, Lock, Hash, UserCheck, Eye, EyeOff } from "lucide-react";
import { AuthContext } from "../context/AuthContext"; // Adjust path as needed
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
      
      // Store user details in localStorage
      const candidateData = {
        id: res.data.student.id,
        email: res.data.student.email,
        role: res.data.student.role,
        rollNo: res.data.student.rollNo,
        status: res.data.student.status,
        token: res.data.token
      };
      localStorage.setItem("candidate", JSON.stringify(candidateData));
      
      // Update AuthContext
      handleCandidateLogin(candidateData);
      
      // Navigate to user-select page after successful login
      navigate("/user-select");
      console.log("Login successful:", res.data);
    } catch (err) {
      setError(err.response?.data?.message || "Login failed. Please check your credentials.");
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-50 to-indigo-100">
      <div className="bg-white p-8 rounded-2xl shadow-xl w-full max-w-md">
        <div className="text-center mb-8">
          
        <div className="inline-flex items-center justify-center w-25 h-25 mb-4">
        <img src={studentImage} alt="HR Portal" className="w-28 h-28 object-contain rounded-2xl shadow" />
          </div>
          <h2 className="text-3xl font-bold text-gray-800">Candidate Login</h2>
          <p className="text-gray-600 mt-2">Enter your credentials to access the portal</p>
        </div>

        {error && (
          <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg mb-6">
            <span className="text-sm">{error}</span>
          </div>
        )}

        <form onSubmit={handleLogin} className="space-y-4">
          <div className="relative">
            <Mail className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              name="email"
              type="email"
              placeholder="Email Address"
              onChange={handleChange}
              value={form.email}
              required
            />
          </div>

          <div className="relative">
            <Hash className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              name="rollNo"
              placeholder="Roll Number"
              onChange={handleChange}
              value={form.rollNo}
              required
            />
          </div>

          <div className="relative">
            <UserCheck className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              className="w-full pl-10 pr-4 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              name="role"
              placeholder="Role (e.g., Data Analytics)"
              onChange={handleChange}
              value={form.role}
              required
            />
          </div>

          <div className="relative">
            <Lock className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-400 w-5 h-5" />
            <input
              className="w-full pl-10 pr-12 py-3 border border-gray-300 rounded-lg focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
              name="password"
              type={showPassword ? "text" : "password"}
              placeholder="Password"
              onChange={handleChange}
              value={form.password}
              required
            />
            <button
              type="button"
              className="absolute right-3 top-1/2 transform -translate-y-1/2 text-gray-400 hover:text-gray-600"
              onClick={() => setShowPassword(!showPassword)}
            >
              {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
            </button>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full py-3 px-4 bg-gradient-to-r from-blue-600 to-indigo-600 text-white font-semibold rounded-lg hover:from-blue-700 hover:to-indigo-700 transition duration-300 ease-in-out transform hover:scale-105 disabled:opacity-50 disabled:cursor-not-allowed disabled:transform-none"
          >
            {loading ? (
              <div className="flex items-center justify-center">
                <div className="animate-spin rounded-full h-5 w-5 border-b-2 border-white mr-2"></div>
                Logging in...
              </div>
            ) : (
              "Login"
            )}
          </button>
        </form>

        <div className="mt-6 text-center">
          <p className="text-sm text-gray-600">
            Having trouble logging in?{" "}
            <button className="text-blue-600 hover:text-blue-800 font-medium">
              Contact HR
            </button>
          </p>
        </div>
      </div>
    </div>
  );
}

export default StudentLogin;