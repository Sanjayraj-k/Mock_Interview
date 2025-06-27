import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Protected() {
  const [account, setAccount] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (!localStorage.getItem("faceAuth")) {
      navigate("/login");
    }

    const { account } = JSON.parse(localStorage.getItem("faceAuth"));
    setAccount(account);
  }, []);

  if (!account) {
    return null;
  }

  return (
    <>
      <div className="bg-white pt-40 md:pt-60">
        <div className="mx-auto max-w-7xl px-4">
          <h2 className="text-center text-3xl font-extrabold tracking-tight text-gray-900 sm:text-4xl mb-12">
            You have successfully verified !
          </h2>
          <div className="text-center mb-12">
            <img
              className="mx-auto mb-8 object-cover h-48 w-48 rounded-full"
              src={
                account?.type === "CUSTOM"
                  ? account.picture
                  : `/temp-accounts/${account.picture}`
              }
              alt={account.fullName}
            />
            
            {/* Welcome message */}
            <h3 className="text-xl font-semibold text-gray-800 mb-2">
              Welcome, {account.fullName}!
            </h3>
            <p className="text-gray-600 mb-8">
              You are now ready to proceed with the assessment rounds.
            </p>
            
            {/* Test rounds information */}
            <div className="bg-gray-50 rounded-lg p-8 mb-8 max-w-4xl mx-auto">
              <h3 className="text-2xl font-bold text-gray-900 mb-6">
                Assessment Overview
              </h3>
              <p className="text-gray-700 mb-6">
                The assessment consists of three rounds designed to evaluate your skills comprehensively:
              </p>
              
              <div className="grid md:grid-cols-3 gap-6 text-left">
                {/* Round 1 */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="bg-blue-100 rounded-full p-2 mr-3">
                      <svg className="w-6 h-6 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Round 1</h4>
                  </div>
                  <h5 className="font-medium text-blue-600 mb-2">Aptitude Test</h5>
                  <p className="text-gray-600 text-sm">
                    Logical reasoning, quantitative ability, and analytical skills assessment.
                  </p>
                </div>
                
                {/* Round 2 */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="bg-green-100 rounded-full p-2 mr-3">
                      <svg className="w-6 h-6 text-green-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Round 2</h4>
                  </div>
                  <h5 className="font-medium text-green-600 mb-2">Coding Round</h5>
                  <p className="text-gray-600 text-sm">
                    Programming skills evaluation with problem-solving challenges.
                  </p>
                </div>
                
                {/* Round 3 */}
                <div className="bg-white rounded-lg p-6 shadow-sm border border-gray-200">
                  <div className="flex items-center mb-4">
                    <div className="bg-purple-100 rounded-full p-2 mr-3">
                      <svg className="w-6 h-6 text-purple-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                      </svg>
                    </div>
                    <h4 className="text-lg font-semibold text-gray-900">Round 3</h4>
                  </div>
                  <h5 className="font-medium text-purple-600 mb-2">HR Interview</h5>
                  <p className="text-gray-600 text-sm">
                    Personal interview to assess communication skills and cultural fit.
                  </p>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-yellow-50 border border-yellow-200 rounded-lg">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-yellow-600 mt-0.5 mr-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-sm font-medium text-yellow-800">Important Note:</p>
                    <p className="text-sm text-yellow-700">
                      Please ensure you have a stable internet connection and are in a quiet environment before starting the test.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <div
              onClick={() => {
                localStorage.removeItem("faceAuth");
                navigate("/googleform");
              }}
              className="flex gap-2 mt-8 w-fit mx-auto cursor-pointer z-10 py-3 px-6 rounded-full bg-gradient-to-r from-red-400 to-red-600 hover:from-red-500 hover:to-red-700 transition-all duration-200 transform hover:scale-105"
            >
              <span className="text-white font-medium">Go To Test</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={1.5}
                stroke="white"
                className="w-6 h-6"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M15.75 9V5.25A2.25 2.25 0 0013.5 3h-6a2.25 2.25 0 00-2.25 2.25v13.5A2.25 2.25 0 007.5 21h6a2.25 2.25 0 002.25-2.25V15m3 0l3-3m0 0l-3-3m3 3H9"
                />
              </svg>
            </div>
          </div>
        </div>
      </div>
    </>
  );
}

export default Protected;