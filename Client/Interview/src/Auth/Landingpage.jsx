import React, { useState, useEffect } from 'react';
import { Star, ArrowRight } from 'lucide-react';
import teacher from '../images/teacher.png';

import candidate from '../images/candidate.png';

export default function LandingPage() {
  const [isLoading, setIsLoading] = useState(true);

  useEffect(() => {
    const timer = setTimeout(() => setIsLoading(false), 1500);
    return () => clearTimeout(timer);
  }, []);

  if (isLoading) {
    return (
      <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex flex-col items-center justify-center p-4">
        <div className="w-full max-w-6xl space-y-16">
          {/* Title Skeleton */}
          <div className="text-center mb-16 space-y-6">
            <div className="h-16 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl w-4/5 mx-auto animate-pulse"></div>
            <div className="h-6 bg-gradient-to-r from-gray-100 to-gray-200 rounded-xl w-2/5 mx-auto animate-pulse"></div>
          </div>

          {/* Cards Skeleton */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
            {[1, 2].map((item) => (
              <div key={item} className="bg-white p-10 rounded-3xl shadow-lg">
                <div className="flex flex-col items-center text-center space-y-8">
                  <div className="h-32 w-32 bg-gradient-to-br from-gray-200 to-gray-300 rounded-3xl animate-pulse"></div>
                  <div className="h-10 bg-gray-200 rounded-2xl w-4/5 animate-pulse"></div>
                  <div className="w-full space-y-3">
                    <div className="h-5 bg-gray-100 rounded-xl animate-pulse"></div>
                    <div className="h-5 bg-gray-100 rounded-xl animate-pulse"></div>
                    <div className="h-5 bg-gray-100 rounded-xl w-5/6 animate-pulse"></div>
                  </div>
                  <div className="h-14 bg-gradient-to-r from-gray-200 to-gray-300 rounded-2xl w-full animate-pulse"></div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 relative overflow-hidden">
      {/* Background Decorations */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-gradient-to-br from-purple-200/30 to-blue-200/30 rounded-full blur-3xl"></div>
        <div className="absolute -bottom-40 -left-40 w-80 h-80 bg-gradient-to-tr from-indigo-200/30 to-teal-200/30 rounded-full blur-3xl"></div>
        <div className="absolute top-1/2 left-1/2 transform -translate-x-1/2 -translate-y-1/2 w-96 h-96 bg-gradient-to-r from-pink-100/20 to-purple-100/20 rounded-full blur-3xl"></div>
      </div>

      <div className="relative z-10 flex flex-col items-center justify-center min-h-screen p-6">
        {/* Header Section */}
        <div className="text-center mb-16 animate-fade-in">
          <div className="inline-flex items-center gap-2 bg-white/80 backdrop-blur-sm px-6 py-3 rounded-full shadow-lg mb-8 border border-white/20">
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
            <span className="text-sm font-medium text-gray-700">AI-Powered Interview Excellence</span>
            <Star className="w-5 h-5 text-yellow-500 fill-current" />
          </div>

          <h1 className="text-3xl lg:text-5xl font-black text-gray-900 mb-6 leading-tight">
            <span className="bg-clip-text text-transparent bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 animate-pulse">
              AI Mock Interview
            </span>
            <br />
            <span className="text-gray-800">Platform</span>
          </h1>


          <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed relative">
            Transform your interview experience with cutting-edge AI technology
            <span className="absolute -bottom-2 left-1/2 transform -translate-x-1/2 w-24 h-1 bg-gradient-to-r from-indigo-400 to-purple-400 rounded-full"></span>
          </p>
        </div>
        {/* Portal Cards */}
        <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 w-full max-w-5xl">
          {/* HR Portal Card */}
          <button
            onClick={() => window.location.href = '/hr/login'}
            className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-3 transition-all duration-700 border border-white/20 hover:border-purple-200/50 overflow-hidden w-full"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-purple-500/5 via-indigo-500/5 to-blue-500/5 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-purple-500/10 to-indigo-500/10 opacity-0 group-hover:opacity-100 transition-all duration-1000 delay-300"></div>

            {/* Floating Particles Effect */}
            <div className="absolute top-4 right-4 w-2 h-2 bg-purple-400 rounded-full opacity-0 group-hover:opacity-100 animate-bounce transition-opacity duration-500 delay-200"></div>
            <div className="absolute top-8 right-8 w-1 h-1 bg-indigo-400 rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-500 delay-400"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Large Image Container */}
              <div className="relative mb-8 group-hover:scale-110 transition-transform duration-500">
                <div className="w-32 h-32 bg-gradient-to-br from-purple-500/10 to-indigo-600/10 rounded-3xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500 p-4">
                  <img src={teacher} alt="HR & Recruiters" className="w-24 h-24 object-contain" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-purple-400/20 to-indigo-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              </div>

              <h2 className="text-3xl font-bold text-gray-800 mb-4 relative">
                HR
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-purple-500 to-indigo-600 group-hover:w-full transition-all duration-500"></span>
              </h2>

              <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                Manage job roles, review interviews, and analyze Student performance with powerful AI insights and analytics.
              </p>

              <div className="w-full bg-gradient-to-r from-purple-500 to-indigo-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg group-hover:from-purple-600 group-hover:to-indigo-700 transition-all duration-500 shadow-lg group-hover:shadow-xl relative overflow-hidden">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  HR Portal
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
          </button>


          {/* Candidate Portal Card */}
          <button
            onClick={() => window.location.href = '/candidate/login'}
            className="group relative bg-white/80 backdrop-blur-sm p-8 rounded-3xl shadow-xl hover:shadow-2xl transform hover:-translate-y-3 transition-all duration-700 border border-white/20 hover:border-orange-200/50 overflow-hidden w-full"
          >
            {/* Animated Background */}
            <div className="absolute inset-0 bg-gradient-to-br from-orange-500/5 via-pink-500/5 to-red-500/5 opacity-0 group-hover:opacity-100 transition-all duration-700"></div>
            <div className="absolute inset-0 bg-gradient-to-r from-orange-500/10 to-pink-500/10 opacity-0 group-hover:opacity-100 transition-all duration-1000 delay-300"></div>

            {/* Floating Particles Effect */}
            <div className="absolute top-4 right-4 w-2 h-2 bg-orange-400 rounded-full opacity-0 group-hover:opacity-100 animate-bounce transition-opacity duration-500 delay-200"></div>
            <div className="absolute top-8 right-8 w-1 h-1 bg-pink-400 rounded-full opacity-0 group-hover:opacity-100 animate-ping transition-opacity duration-500 delay-400"></div>

            <div className="relative z-10 flex flex-col items-center text-center">
              {/* Large Image Container */}
              <div className="relative mb-8 group-hover:scale-110 transition-transform duration-500">
                <div className="w-32 h-32 bg-gradient-to-br from-orange-500/10 to-pink-600/10 rounded-3xl flex items-center justify-center shadow-lg group-hover:shadow-xl transition-all duration-500 p-4">
                  <img src={candidate} alt="Candidates" className="w-24 h-24 object-contain" />
                </div>
                <div className="absolute inset-0 bg-gradient-to-br from-orange-400/20 to-pink-500/20 rounded-3xl blur-lg opacity-0 group-hover:opacity-50 transition-opacity duration-500"></div>
              </div>

              <h2 className="text-3xl font-bold text-gray-800 mb-4 relative">
                Student Test
                <span className="absolute -bottom-1 left-1/2 transform -translate-x-1/2 w-0 h-0.5 bg-gradient-to-r from-orange-500 to-pink-600 group-hover:w-full transition-all duration-500"></span>
              </h2>

              <p className="text-gray-600 mb-8 leading-relaxed text-lg">
                Practice interviews with AI, receive instant feedback, and boost your confidence to land your dream job.
              </p>

              <div className="w-full bg-gradient-to-r from-orange-500 to-pink-600 text-white py-4 px-6 rounded-2xl font-semibold text-lg group-hover:from-orange-600 group-hover:to-pink-700 transition-all duration-500 shadow-lg group-hover:shadow-xl relative overflow-hidden">
                <span className="relative z-10 flex items-center justify-center gap-2">
                  Candidate Portal
                  <ArrowRight className="w-5 h-5 transform group-hover:translate-x-1 transition-transform duration-300" />
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/10 to-white/20 opacity-0 group-hover:opacity-100 transition-opacity duration-500"></div>
              </div>
            </div>
          </button>
        </div>

        {/* Bottom CTA */}
        <div className="mt-16 text-center">
          <p className="text-gray-600 text-lg mb-4">Ready to revolutionize your interview experience?</p>
          <div className="flex items-center justify-center gap-2">
            <div className="w-2 h-2 bg-indigo-400 rounded-full animate-pulse"></div>
            <div className="w-2 h-2 bg-purple-400 rounded-full animate-pulse delay-100"></div>
            <div className="w-2 h-2 bg-pink-400 rounded-full animate-pulse delay-200"></div>
          </div>
        </div>
      </div>
    </div>
  );
}