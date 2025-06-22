import React from 'react';
import { Link } from 'react-router-dom';
import { Briefcase, User } from 'lucide-react';

export default function LandingPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-600 via-purple-600 to-blue-800 flex flex-col items-center justify-center p-4">
      <div className="text-center mb-12">
        <h1 className="text-5xl font-extrabold text-white shadow-lg">
          AI Mock Interview Platform
        </h1>
        <p className="text-blue-200 mt-4 text-lg">
          Choose your portal to get started.
        </p>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-8 w-full max-w-4xl">
        {/* HR Portal Card */}
        <Link
          to="/hr/login"
          className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl hover:shadow-purple-400/50 transform hover:-translate-y-2 transition-all duration-300 group"
        >
          <div className="flex flex-col items-center text-center">
            <div className="bg-gradient-to-r from-blue-500 to-purple-600 p-4 rounded-full mb-4">
              <Briefcase className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">For HR & Recruiters</h2>
            <p className="text-gray-600 mt-2 mb-6">
              Manage job roles, review interviews, and analyze candidate performance with powerful AI insights.
            </p>
            <span className="w-full bg-gradient-to-r from-blue-500 to-purple-600 text-white py-3 px-4 rounded-lg font-medium group-hover:from-blue-600 group-hover:to-purple-700 transition-all duration-200 shadow-lg">
              HR Portal
            </span>
          </div>
        </Link>

        {/* Candidate Portal Card */}
        <Link
          to="/candidate/login"
          className="bg-white/90 backdrop-blur-sm p-8 rounded-2xl shadow-2xl hover:shadow-blue-400/50 transform hover:-translate-y-2 transition-all duration-300 group"
        >
          <div className="flex flex-col items-center text-center">
            <div className="bg-gradient-to-r from-teal-400 to-blue-500 p-4 rounded-full mb-4">
              <User className="w-12 h-12 text-white" />
            </div>
            <h2 className="text-2xl font-bold text-gray-800">For Candidates</h2>
            <p className="text-gray-600 mt-2 mb-6">
              Practice for your interview with our AI, get instant feedback, and land your dream job.
            </p>
            <span className="w-full bg-gradient-to-r from-teal-400 to-blue-500 text-white py-3 px-4 rounded-lg font-medium group-hover:from-teal-500 group-hover:to-blue-600 transition-all duration-200 shadow-lg">
              Candidate Portal
            </span>
          </div>
        </Link>
      </div>
    </div>
  );
}