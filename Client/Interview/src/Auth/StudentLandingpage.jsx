import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';

const StudentLandingPage = () => {
  const [hoveredCard, setHoveredCard] = useState(null);
  const navigate = useNavigate();

  const handleNavigation = (path) => {
    console.log(`Navigating to: ${path}`);
    navigate(path); // Navigate to the specified path
  };

  const cards = [
    {
      id: 'ats',
      title: 'Check Your ATS',
      description: 'Optimize your resume for Applicant Tracking Systems and increase your chances of getting past automated screening',
      icon: '📄✨',
      color: 'from-blue-400 to-purple-500',
      path: '/student/ats'
    },
    {
      id: 'questionbank',
      title: 'Interview Question Bank',
      description: 'Practice common interview questions with AI feedback and improve your interview skills',
      icon: '❓💡',
      color: 'from-green-400 to-teal-500',
      path: '/student/questionbank'
    },
    {
      id: 'questionform',
      title: 'Question Forum',
      description: 'Connect with peers and discuss challenging interview questions in our community forum',
      icon: '💬🤝',
      color: 'from-orange-400 to-red-500',
      path: '/student/questionforum'
    },
    {
      id: 'quiz',
      title: 'AI Mock Quiz',
      description: 'Take comprehensive quizzes to test your knowledge and get instant AI-powered feedback',
      icon: '🧠⚡',
      color: 'from-purple-400 to-pink-500',
      path: '/student/upload'
    },
    {
      id: 'practicequiz',
      title: 'Practice Quiz Generator',
      description: 'Generate custom quizzes from PDFs, YouTube videos, or audio files using AI',
      icon: '📚🤖',
      color: 'from-emerald-400 to-cyan-500',
      path: '/student/practicequiz'
    },
    {
      id: 'Assistant',
      title: 'AI Assistant',
      description: 'Get personalized Answers for your Questions',
      icon: '🤖💬',
      color: 'from-yellow-400 to-amber-500',
      path: '/student/Assistant'
    },
    {
      id: 'Domainforum',
      title: 'DomainForum',
      description: ' Get Link with Your Domain members',
      icon: '🤖💬',
      color: 'from-yellow-400 to-amber-500',
      path: '/student/domain'
    },
    {
      id: 'companyscrap',
      title: 'Company Research',
      description: 'Research company profiles, vision, mission, and key information to prepare for interviews',
      icon: '🏢🔍',
      color: 'from-indigo-400 to-blue-500',
      path: '/student/companyscrap'
    },
    {
      id: 'placementpaper',
      title: 'Placement Paper Finder',
      description: 'Generate and practice with AI-generated placement papers for top companies',
      icon: '📝🔍',
      color: 'from-pink-400 to-rose-500',
      path: '/student/placement-paper'
    }
  ];

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-50 via-blue-50 to-purple-50">
      {/* Header Section */}
      <div className="text-center pt-16 pb-12 px-4">
        <div className="inline-flex items-center bg-white rounded-full px-6 py-2 shadow-lg border border-yellow-200 mb-8">
          <span className="text-yellow-500 mr-2">⭐</span>
          <span className="text-sm font-semibold text-gray-700">AI-Powered Interview Excellence</span>
          <span className="text-yellow-500 ml-2">⭐</span>
        </div>
        <h1 className="text-5xl md:text-6xl font-bold mb-6 bg-gradient-to-r from-purple-600 via-blue-600 to-teal-600 bg-clip-text text-transparent">
          Student Practice
          <br />
          <span className="text-gray-800">Platform</span>
        </h1>
        <p className="text-xl text-gray-600 max-w-2xl mx-auto leading-relaxed">
          Transform your interview experience with cutting-edge AI technology
        </p>
      </div>

      {/* Cards Grid */}
      <div className="max-w-7xl mx-auto px-4 pb-20">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-8 lg:gap-12">
          {cards.map((card) => (
            <div
              key={card.id}
              className={`group relative overflow-hidden rounded-3xl shadow-xl transition-all duration-500 cursor-pointer ${hoveredCard === card.id ? 'scale-105 shadow-2xl' : 'hover:scale-102'
                }`}
              onMouseEnter={() => setHoveredCard(card.id)}
              onMouseLeave={() => setHoveredCard(null)}
              onClick={() => handleNavigation(card.path)}
            >
              <div className={`absolute inset-0 bg-gradient-to-br ${card.color} opacity-5 group-hover:opacity-10 transition-opacity duration-500`}></div>
              <div className="relative bg-white p-8 lg:p-12 h-full flex flex-col items-center text-center">
                <div className="mb-6 relative">
                  <div className={`w-20 h-20 lg:w-24 lg:h-24 rounded-2xl bg-gradient-to-br ${card.color} flex items-center justify-center shadow-lg group-hover:scale-110 transition-transform duration-300`}>
                    <span className="text-3xl lg:text-4xl filter drop-shadow-sm">
                      {card.icon}
                    </span>
                  </div>
                </div>
                <h3 className="text-2xl lg:text-3xl font-bold text-gray-800 mb-4 group-hover:text-gray-900 transition-colors duration-300">
                  {card.title}
                </h3>
                <p className="text-gray-600 mb-8 leading-relaxed flex-grow text-base lg:text-lg max-w-md">
                  {card.description}
                </p>
                <div className={`inline-flex items-center px-6 py-3 rounded-full bg-gradient-to-r ${card.color} text-white font-semibold shadow-lg group-hover:shadow-xl transform group-hover:-translate-y-1 transition-all duration-300`}>
                  <span className="mr-2">Get Started</span>
                  <span className="transform group-hover:translate-x-1 transition-transform duration-300">→</span>
                </div >
              </div >
              <div className="absolute top-4 right-4 w-16 h-16 bg-white bg-opacity-20 rounded-full blur-xl group-hover:bg-opacity-30 transition-all duration-500"></div>
              <div className="absolute bottom-4 left-4 w-12 h-12 bg-white bg-opacity-10 rounded-full blur-lg group-hover:bg-opacity-20 transition-all duration-500"></div>
            </div >
          ))}
        </div >
      </div >

      {/* Footer */}
      < footer className="bg-white bg-opacity-80 backdrop-blur-lg border-t border-gray-200 text-center py-12 px-4 mt-16" >
        <div className="max-w-4xl mx-auto">
          <h3 className="text-2xl font-bold text-gray-800 mb-3">
            Start your journey to interview success today
          </h3>
          <p className="text-gray-600 mb-6">
            Join thousands of students who have improved their interview skills with our AI platform
          </p>
          <p className="text-sm text-gray-500">
            © 2024 AI Interview Platform. All rights reserved.
          </p>
        </div>
      </footer >
    </div >
  );
};

export default StudentLandingPage;
