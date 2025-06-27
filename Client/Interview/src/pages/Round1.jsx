import React from 'react';
import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles } from 'lucide-react';

const AptitudeSuccess = () => {
  const navigate = useNavigate();

  const handleNext = () => {
    navigate('/coding');
  };

  return (
    <div className="min-h-screen flex items-center justify-center bg-white p-4 relative overflow-hidden">
      {/* Floating sparkles */}
      <div className="absolute top-10 left-1/4 animate-float">
        <Sparkles className="w-6 h-6 text-yellow-400" />
      </div>
      <div className="absolute bottom-20 right-1/3 animate-float delay-200">
        <Sparkles className="w-6 h-6 text-blue-400" />
      </div>
      <div className="absolute top-1/3 right-20 animate-float delay-300">
        <Sparkles className="w-6 h-6 text-pink-400" />
      </div>
      
      {/* Main card */}
      <div className="bg-white rounded-2xl shadow-xl p-8 max-w-md w-full relative border-2 border-blue-100 transform transition-all duration-500 hover:shadow-2xl hover:-translate-y-1">
        {/* Confetti burst effect */}
        <div className="absolute -top-2 -right-2 w-4 h-4 bg-yellow-400 rounded-full animate-ping"></div>
        <div className="absolute -bottom-2 -left-2 w-4 h-4 bg-pink-400 rounded-full animate-ping delay-100"></div>
        
        <div className="flex flex-col items-center text-center space-y-6">
          <div className="relative">
            {/* Animated checkmark with glow */}
            <div className="absolute inset-0 bg-green-100 rounded-full animate-pulse opacity-30"></div>
            <div className="relative z-10 bg-green-100 p-4 rounded-full">
              <svg
                className="w-12 h-12 text-green-600"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
                xmlns="http://www.w3.org/2000/svg"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth="3"
                  d="M5 13l4 4L19 7"
                />
              </svg>
            </div>
          </div>
          
          <h1 className="text-3xl font-bold text-gray-800 bg-gradient-to-r from-blue-600 to-purple-600 bg-clip-text text-transparent">
            Congratulations!
          </h1>
          
          <p className="text-gray-600 text-base leading-relaxed">
            You have successfully completed the Aptitude round! Click the Next button to proceed to the Coding round.
          </p>
          
          <button
            onClick={handleNext}
            className="relative overflow-hidden flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-blue-600 to-purple-600 text-white font-semibold rounded-lg shadow-md hover:shadow-lg hover:brightness-110 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:ring-offset-2 transition-all duration-300 group"
          >
            <span className="relative z-10">Next</span>
            <ArrowRight className="w-5 h-5 relative z-10 group-hover:translate-x-1 transition-transform" />
            <span className="absolute inset-0 bg-gradient-to-r from-purple-600 to-blue-600 opacity-0 group-hover:opacity-100 transition-opacity duration-300"></span>
          </button>
        </div>
      </div>
      
      {/* Add some CSS for the floating animation */}
      <style jsx>{`
        @keyframes float {
          0%, 100% { transform: translateY(0); }
          50% { transform: translateY(-10px); }
        }
        .animate-float {
          animation: float 3s ease-in-out infinite;
        }
        .delay-200 {
          animation-delay: 0.2s;
        }
        .delay-300 {
          animation-delay: 0.3s;
        }
      `}</style>
    </div>
  );
};

export default AptitudeSuccess;