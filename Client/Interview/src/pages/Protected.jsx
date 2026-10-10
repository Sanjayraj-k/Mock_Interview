import React, { useEffect, useState } from "react";
import { Link, useNavigate } from "react-router-dom";

function Protected() {
  const [account, setAccount] = useState(null);
  const navigate = useNavigate();

  useEffect(() => {
    let userAccount = null;
    const faceAuthStr = localStorage.getItem("faceAuth");
    if (faceAuthStr) {
      try {
        const parsed = JSON.parse(faceAuthStr);
        userAccount = parsed.account;
      } catch (e) {
        console.error("Error reading faceAuth:", e);
      }
    }

    if (!userAccount) {
      const candidateStr = localStorage.getItem("candidate");
      if (candidateStr) {
        try {
          userAccount = JSON.parse(candidateStr);
        } catch (e) {
          console.error("Error reading candidate:", e);
        }
      }
    }

    if (!userAccount) {
      navigate("/candidate/login", { replace: true });
      return;
    }

    setAccount(userAccount);
  }, [navigate]);

  if (!account) {
    return null;
  }

  const photoUrl = account.idCardPhoto || account.picture || "";
  const displayName = account.fullName || account.name || "Candidate";

  return (
    <>
      <div className="min-h-screen bg-gradient-to-b from-slate-50 via-white to-slate-50 py-12 px-4 flex flex-col justify-center items-center">
        <div className="mx-auto max-w-4xl w-full">
          {/* Success Banner Badge */}
          <div className="text-center mb-8">
            <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-emerald-50 border border-emerald-200 text-emerald-700 text-sm font-semibold mb-4 shadow-sm">
              <svg className="w-4 h-4 text-emerald-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M5 13l4 4L19 7" />
              </svg>
              Biometric Authentication Complete
            </div>
            <h1 className="text-center text-3xl font-extrabold tracking-tight text-slate-900 sm:text-4xl">
              You have successfully verified!
            </h1>
          </div>

          <div className="text-center mb-10">
            {/* Candidate Photo */}
            {photoUrl ? (
              <div className="relative mx-auto mb-6 w-40 h-40 sm:w-48 sm:h-48 rounded-full p-1.5 bg-gradient-to-tr from-indigo-500 to-purple-500 shadow-xl shadow-indigo-100 flex items-center justify-center">
                <img
                  className="w-full h-full object-cover rounded-full border-4 border-white bg-white"
                  src={
                    photoUrl.startsWith("data:") || photoUrl.startsWith("http") || photoUrl.startsWith("/")
                      ? photoUrl
                      : account?.type === "CUSTOM"
                        ? photoUrl
                        : `/temp-accounts/${photoUrl}`
                  }
                  alt={displayName}
                  onError={(e) => {
                    e.currentTarget.style.display = "none";
                    const fallback = e.currentTarget.parentElement?.querySelector(".img-fallback");
                    if (fallback) fallback.style.display = "flex";
                  }}
                />
                <div
                  className="img-fallback w-full h-full rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 items-center justify-center text-white text-4xl sm:text-5xl font-extrabold border-4 border-white"
                  style={{ display: "none" }}
                >
                  {displayName.charAt(0).toUpperCase()}
                </div>
              </div>
            ) : (
              <div className="mx-auto mb-6 w-40 h-40 sm:w-48 sm:h-48 rounded-full bg-gradient-to-tr from-indigo-600 to-purple-600 flex items-center justify-center text-white text-4xl sm:text-5xl font-extrabold shadow-xl shadow-indigo-100 border-4 border-white">
                {displayName.charAt(0).toUpperCase()}
              </div>
            )}
            
            {/* Welcome message */}
            <h2 className="text-2xl font-bold text-slate-900 mb-1">
              Welcome, {displayName}!
            </h2>
            {account.rollNo && (
              <p className="text-xs font-mono font-bold text-indigo-600 bg-indigo-50 border border-indigo-100 px-3 py-1 rounded-full inline-block mb-3">
                Roll No: {account.rollNo}
              </p>
            )}
            <p className="text-slate-600 mb-8 max-w-md mx-auto text-sm leading-relaxed">
              Your biometric face profile has been verified against your student ID card. You are now ready to proceed with the assessment rounds.
            </p>
            
            {/* Test rounds information */}
            <div className="bg-white rounded-2xl p-6 sm:p-8 mb-8 shadow-sm border border-slate-200/80 max-w-3xl mx-auto">
              <h3 className="text-xl font-bold text-slate-900 mb-2">
                Assessment Overview
              </h3>
              <p className="text-slate-600 text-sm mb-6">
                The assessment consists of three rounds designed to evaluate your skills comprehensively:
              </p>
              
              <div className="grid md:grid-cols-3 gap-5 text-left">
                {/* Round 1 */}
                <div className="bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center mb-3">
                      <div className="bg-blue-100 text-blue-600 rounded-lg p-2 mr-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Round 1</h4>
                    </div>
                    <h5 className="font-semibold text-blue-600 text-sm mb-1">Aptitude Test</h5>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Logical reasoning, quantitative ability, and analytical skills assessment.
                    </p>
                  </div>
                </div>
                
                {/* Round 2 */}
                <div className="bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center mb-3">
                      <div className="bg-emerald-100 text-emerald-600 rounded-lg p-2 mr-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Round 2</h4>
                    </div>
                    <h5 className="font-semibold text-emerald-600 text-sm mb-1">Coding Round</h5>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Programming skills evaluation with problem-solving challenges.
                    </p>
                  </div>
                </div>
                
                {/* Round 3 */}
                <div className="bg-slate-50/70 hover:bg-slate-50 transition-colors rounded-xl p-5 border border-slate-200 flex flex-col justify-between">
                  <div>
                    <div className="flex items-center mb-3">
                      <div className="bg-purple-100 text-purple-600 rounded-lg p-2 mr-3">
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                        </svg>
                      </div>
                      <h4 className="text-sm font-bold text-slate-900">Round 3</h4>
                    </div>
                    <h5 className="font-semibold text-purple-600 text-sm mb-1">HR Interview</h5>
                    <p className="text-slate-600 text-xs leading-relaxed">
                      Personal interview to assess communication skills and cultural fit.
                    </p>
                  </div>
                </div>
              </div>
              
              <div className="mt-6 p-4 bg-amber-50/70 border border-amber-200 rounded-xl text-left">
                <div className="flex items-start">
                  <svg className="w-5 h-5 text-amber-600 mt-0.5 mr-2 shrink-0" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <div>
                    <p className="text-xs font-bold text-amber-900">Important Note:</p>
                    <p className="text-xs text-amber-800 mt-0.5 leading-relaxed">
                      Please ensure you have a stable internet connection and are in a quiet, well-lit environment before starting the test.
                    </p>
                  </div>
                </div>
              </div>
            </div>

            <button
              onClick={() => {
                navigate("/googleform");
              }}
              className="inline-flex items-center gap-2.5 px-8 py-3.5 rounded-2xl bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white font-bold text-sm shadow-lg shadow-indigo-200 hover:shadow-indigo-300 transition-all duration-200 transform hover:scale-105 active:scale-95 cursor-pointer"
            >
              <span>Proceed to Assessment</span>
              <svg
                xmlns="http://www.w3.org/2000/svg"
                fill="none"
                viewBox="0 0 24 24"
                strokeWidth={2}
                stroke="currentColor"
                className="w-4 h-4"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M13.5 4.5L21 12m0 0l-7.5 7.5M21 12H3"
                />
              </svg>
            </button>
          </div>
        </div>
      </div>
    </>
  );
}

export default Protected;