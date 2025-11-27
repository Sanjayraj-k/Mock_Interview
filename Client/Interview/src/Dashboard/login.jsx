import React, { useState, useContext } from 'react';
import { Mail, Lock, ArrowRight, UserCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';
import { AuthContext } from '../context/AuthContext';
import hrImage from '../assets/hr.png';

export default function Login() {
  const [loginForm, setLoginForm] = useState({ email: '', password: '' });
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();
  const { handleHRLogin } = useContext(AuthContext);

  const handleLogin = async (e) => {
    e.preventDefault();
    setIsLoading(true);
    try {
      setError('');
      const response = await fetch('http://localhost:5000/api/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(loginForm),
      });
      const data = await response.json();
      if (!response.ok) throw new Error(data.error || 'Failed to login');

      handleHRLogin({ email: loginForm.email, ...data });
      navigate('/hr/dashboard');
    } catch (err) {
      setError(err.message || 'Network error. Please try again.');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4 sm:p-6 lg:p-8">
      <div className="w-full max-w-md transform transition-all duration-300 hover:scale-[1.01]">
        <div className="bg-white/80 backdrop-blur-xl rounded-3xl shadow-[0_8px_30px_rgb(0,0,0,0.04)] border border-white/20 p-8 sm:p-10 relative overflow-hidden">

          {/* Decorative background elements */}
          <div className="absolute top-0 right-0 -mt-10 -mr-10 w-32 h-32 bg-gradient-to-br from-blue-500/10 to-purple-500/10 rounded-full blur-2xl"></div>
          <div className="absolute bottom-0 left-0 -mb-10 -ml-10 w-32 h-32 bg-gradient-to-tr from-indigo-500/10 to-pink-500/10 rounded-full blur-2xl"></div>

          <div className="relative z-10">
            <div className="text-center mb-10">
              <div className="inline-flex items-center justify-center w-24 h-24 mb-6 relative group">
                <div className="absolute inset-0 bg-gradient-to-tr from-blue-500 to-purple-600 rounded-2xl opacity-10 group-hover:opacity-20 transition-opacity duration-300 rotate-3"></div>
                <img
                  src={hrImage}
                  alt="HR Portal"
                  className="w-full h-full object-contain relative z-10 drop-shadow-lg transform transition-transform duration-300 group-hover:scale-105"
                />
              </div>
              <h1 className="text-3xl font-bold text-gray-900 mb-2 tracking-tight">Welcome Back</h1>
              <p className="text-gray-500 text-sm font-medium">Sign in to your HR Dashboard</p>
            </div>

            <form onSubmit={handleLogin} className="space-y-5">
              {error && (
                <div className="bg-red-50 border-l-4 border-red-500 p-4 rounded-r-lg animate-fade-in">
                  <div className="flex">
                    <div className="flex-shrink-0">
                      <svg className="h-5 w-5 text-red-400" viewBox="0 0 20 20" fill="currentColor">
                        <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zM8.707 7.293a1 1 0 00-1.414 1.414L8.586 10l-1.293 1.293a1 1 0 101.414 1.414L10 11.414l1.293 1.293a1 1 0 001.414-1.414L11.414 10l1.293-1.293a1 1 0 00-1.414-1.414L10 8.586 8.707 7.293z" clipRule="evenodd" />
                      </svg>
                    </div>
                    <div className="ml-3">
                      <p className="text-sm text-red-700">{error}</p>
                    </div>
                  </div>
                </div>
              )}

              <div className="space-y-4">
                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Email Address</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Mail className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                    </div>
                    <input
                      type="email"
                      value={loginForm.email}
                      onChange={(e) => setLoginForm({ ...loginForm, email: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 sm:text-sm"
                      placeholder="hr@company.com"
                      required
                    />
                  </div>
                </div>

                <div className="group">
                  <label className="block text-sm font-medium text-gray-700 mb-1.5 ml-1">Password</label>
                  <div className="relative">
                    <div className="absolute inset-y-0 left-0 pl-3 flex items-center pointer-events-none">
                      <Lock className="h-5 w-5 text-gray-400 group-focus-within:text-blue-500 transition-colors duration-200" />
                    </div>
                    <input
                      type="password"
                      value={loginForm.password}
                      onChange={(e) => setLoginForm({ ...loginForm, password: e.target.value })}
                      className="block w-full pl-10 pr-3 py-3 border border-gray-200 rounded-xl leading-5 bg-gray-50/50 text-gray-900 placeholder-gray-400 focus:outline-none focus:bg-white focus:ring-2 focus:ring-blue-500/20 focus:border-blue-500 transition-all duration-200 sm:text-sm"
                      placeholder="••••••••"
                      required
                    />
                  </div>
                </div>
              </div>

              <div className="flex items-center justify-between text-sm">
                <div className="flex items-center">
                  <input
                    id="remember-me"
                    name="remember-me"
                    type="checkbox"
                    className="h-4 w-4 text-blue-600 focus:ring-blue-500 border-gray-300 rounded"
                  />
                  <label htmlFor="remember-me" className="ml-2 block text-gray-500">
                    Remember me
                  </label>
                </div>
                <a href="#" className="font-medium text-blue-600 hover:text-blue-500 transition-colors">
                  Forgot password?
                </a>
              </div>

              <button
                type="submit"
                disabled={isLoading}
                className="w-full flex justify-center items-center py-3.5 px-4 border border-transparent rounded-xl shadow-lg shadow-blue-500/30 text-sm font-semibold text-white bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-blue-500 transform transition-all duration-200 hover:-translate-y-0.5 disabled:opacity-70 disabled:cursor-not-allowed"
              >
                {isLoading ? (
                  <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                ) : (
                  <>
                    Sign In
                    <ArrowRight className="ml-2 h-4 w-4" />
                  </>
                )}
              </button>
            </form>

            <div className="mt-8">
              <div className="relative">
                <div className="absolute inset-0 flex items-center">
                  <div className="w-full border-t border-gray-200"></div>
                </div>
                <div className="relative flex justify-center text-sm">
                  <span className="px-4 bg-white text-gray-500">New to the platform?</span>
                </div>
              </div>

              <div className="mt-6">
                <Link
                  to="/hr/signup"
                  className="w-full flex justify-center items-center py-3 px-4 border-2 border-gray-100 rounded-xl shadow-sm text-sm font-medium text-gray-700 bg-white hover:bg-gray-50 hover:border-gray-200 transition-all duration-200"
                >
                  <UserCheck className="h-4 w-4 mr-2 text-gray-400" />
                  Create an Account
                </Link>
              </div>
            </div>
          </div>
        </div>

        <p className="text-center text-xs text-gray-400 mt-8">
          &copy; {new Date().getFullYear()} AI Mock Interview. All rights reserved.
        </p>
      </div>
    </div>
  );
}