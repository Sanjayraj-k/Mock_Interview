import React from 'react';
import { motion } from 'framer-motion';
import { useNavigate } from 'react-router-dom';

const StudentLandingPage = () => {
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    document.body.classList.add('fade-out');
    setTimeout(() => navigate(path), 300);
  };

  return (
    <div className="min-h-screen bg-gray-50 font-sans">
      {/* Header */}
      <header className="bg-gradient-to-r from-blue-500 to-purple-600 text-white text-center py-8 px-4 rounded-b-3xl shadow-lg mb-8">
        <h1 className="text-3xl md:text-4xl font-bold mb-2">
          AI-Powered Interview Success
        </h1>
        <p className="text-lg mb-4">
          Practice with AI, get instant feedback, and land your dream job
        </p>
      </header>

      {/* Main Content - Stacked Layout */}
      <main className="max-w-6xl mx-auto px-4 space-y-6">
        {/* ATS Box */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavigation('/student/ats')}
          className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer transition-all w-full"
        >
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">📄✨</div>
            <h2 className="text-3xl font-bold mb-2">Check Your ATS</h2>
            <p className="text-gray-600 mb-4 max-w-2xl">
              Optimize your resume for Applicant Tracking Systems and increase your chances of getting past automated screening
            </p>
            <div className="text-blue-500 font-semibold flex items-center">
              Get Started <span className="ml-2">→</span>
            </div>
          </div>
        </motion.div>

        {/* Question Bank Box */}
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavigation('/student/questionbank')}
          className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer transition-all w-full"
        >
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">❓💡</div>
            <h2 className="text-3xl font-bold mb-2">Interview Question Bank</h2>
            <p className="text-gray-600 mb-4 max-w-2xl">
              Practice common interview questions with AI feedback and improve your interview skills
            </p>
            <div className="text-blue-500 font-semibold flex items-center">
              Get Started <span className="ml-2">→</span>
            </div>
          </div>
        </motion.div>
        <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavigation('/student/questionforum')}
          className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer transition-all w-full"
        >
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">❓💡</div>
            <h2 className="text-3xl font-bold mb-2">Question form</h2>
            <p className="text-gray-600 mb-4 max-w-2xl">
              
            </p>
            <div className="text-blue-500 font-semibold flex items-center">
              Get Started <span className="ml-2">→</span>
            </div>
          </div>
        </motion.div>
         <motion.div 
          whileHover={{ scale: 1.02 }}
          whileTap={{ scale: 0.98 }}
          onClick={() => handleNavigation('/student/upload')}
          className="bg-white rounded-2xl shadow-xl p-8 cursor-pointer transition-all w-full"
        >
          <div className="flex flex-col items-center text-center">
            <div className="text-5xl mb-4">❓💡</div>
            <h2 className="text-3xl font-bold mb-2">Quiz</h2>
            <p className="text-gray-600 mb-4 max-w-2xl">
              
            </p>
            <div className="text-blue-500 font-semibold flex items-center">
              Quiz <span className="ml-2">→</span>
            </div>
          </div>
        </motion.div>
      </main>


      {/* Footer */}
      <footer className="bg-gray-100 text-center py-8 px-4 rounded-t-3xl mt-16">
        <p className="text-lg font-semibold text-gray-700 mb-2">Start your journey to interview success today</p>
        <p className="text-sm text-gray-500">© 2024 AI Interview Platform. All rights reserved.</p>
      </footer>
    </div>
  );
};

export default StudentLandingPage;