import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, User } from 'lucide-react';

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-4xl space-y-12">
          {/* Title Skeleton */}
          <div className="text-center mb-12 space-y-4">
            <div className="h-12 bg-gray-200 rounded-full w-3/4 mx-auto animate-pulse"></div>
            <div className="h-4 bg-gray-100 rounded-full w-1/3 mx-auto animate-pulse"></div>
          </div>
          
          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
            {[1, 2].map((item) => (
              <div key={item} className="bg-white p-8 rounded-xl border border-gray-100">
                <div className="flex flex-col items-center text-center space-y-6">
                  <div className="h-20 w-20 bg-gray-200 rounded-full animate-pulse"></div>
                  <div className="h-8 bg-gray-200 rounded-full w-3/4 animate-pulse"></div>
                  <div className="w-full space-y-2">
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse"></div>
                    <div className="h-4 bg-gray-100 rounded-full animate-pulse"></div>
                    <div className="h-4 bg-gray-100 rounded-full w-5/6 animate-pulse"></div>
                  </div>
                  <div className="h-12 bg-gray-200 rounded-lg w-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-white flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12 animate-fade-in">
        <h1 className="text-5xl font-extrabold text-gray-900 mb-4">
          <span className="bg-clip-text text-transparent bg-gradient-to-r from-blue-600 to-purple-600">
            AI Mock Interview Platform
          </span>
        </h1>
        <p className="text-gray-500 text-lg relative inline-block">
          <span className="relative z-10">Choose your portal to get started</span>
          <span className="absolute bottom-0 left-0 w-full h-1 bg-gradient-to-r from-blue-200 to-purple-200 opacity-70 -z-0"></span>
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* HR Portal Card */}
        <Link
          to="/hr/login"
          className="bg-white p-8 rounded-xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-15px_rgba(124,58,237,0.3)] transform hover:-translate-y-2 transition-all duration-500 group border border-gray-100 hover:border-purple-100 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-purple-50 to-blue-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
          <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-purple-100 group-hover:opacity-30 transition-all duration-500 pointer-events-none"></div>
          
          <div className="flex flex-col items-center text-center relative z-20">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-500">
              <Briefcase className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 relative">
              For HR & Recruiters
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/4 h-0.5 bg-gradient-to-r from-blue-500 to-purple-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </h2>
            <p className="text-gray-600 mt-2 mb-6">
              Manage job roles, review interviews, and analyze candidate performance with powerful AI insights.
            </p>
            <span className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium group-hover:from-blue-600 group-hover:to-purple-700 transition-all duration-300 shadow-md group-hover:shadow-lg relative overflow-hidden">
              <span className="relative z-10">HR Portal</span>
              <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </span>
          </div>
        </Link>

        {/* Candidate Portal Card */}
        <Link
          to="/candidate/login"
          className="bg-white p-8 rounded-xl shadow-[0_10px_30px_-15px_rgba(0,0,0,0.1)] hover:shadow-[0_20px_40px_-15px_rgba(56,182,255,0.3)] transform hover:-translate-y-2 transition-all duration-500 group border border-gray-100 hover:border-blue-100 relative overflow-hidden"
        >
          <div className="absolute inset-0 bg-gradient-to-br from-blue-50 to-teal-50 opacity-0 group-hover:opacity-100 transition-opacity duration-500 -z-10"></div>
          <div className="absolute inset-0 rounded-xl border-2 border-transparent group-hover:border-blue-100 group-hover:opacity-30 transition-all duration-500 pointer-events-none"></div>
          
          <div className="flex flex-col items-center text-center relative z-20">
            <div className="bg-gradient-to-r from-teal-400 to-blue-500 p-4 rounded-full mb-4 shadow-lg group-hover:shadow-xl group-hover:scale-110 transition-all duration-500">
              <User className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800 mb-2 relative">
              For Candidates
              <span className="absolute bottom-0 left-1/2 transform -translate-x-1/2 w-1/4 h-0.5 bg-gradient-to-r from-teal-400 to-blue-500 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </h2>
            <p className="text-gray-600 mt-2 mb-6">
              Practice for your interview with our AI, get instant feedback, and land your dream job.
            </p>
            <span className="w-full bg-gradient-to-r from-teal-400 to-blue-500 text-white py-3 px-4 rounded-lg font-medium group-hover:from-teal-500 group-hover:to-blue-600 transition-all duration-300 shadow-md group-hover:shadow-lg relative overflow-hidden">
              <span className="relative z-10">Candidate Portal</span>
              <span className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}