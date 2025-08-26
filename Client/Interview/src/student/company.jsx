// client/src/CompanyProfile.js

import React, { useState } from 'react';
// No need to import a separate CSS file anymore!

const CompanyProfile = () => {
    const [companyName, setCompanyName] = useState("");
    const [profile, setProfile] = useState(null);
    const [isLoading, setIsLoading] = useState(false);
    const [error, setError] = useState(null);

    const handleFetchProfile = async (e) => {
        e.preventDefault();
        if (!companyName.trim()) {
            setError("Please enter a company name.");
            return;
        }
        setIsLoading(true);
        setError(null);
        setProfile(null);
        try {
            const response = await fetch(`http://localhost:3002/api/profile?companyName=${encodeURIComponent(companyName)}`);
            if (!response.ok) throw new Error('Network response was not ok. The server might be down or busy.');
            const data = await response.json();
            setProfile(data);
        } catch (err) {
            setError(err.message);
        } finally {
            setIsLoading(false);
        }
    };

    return (
        <div className="bg-slate-50 min-h-screen font-sans p-4 sm:p-6">
            <div className="max-w-3xl mx-auto">

                {/* --- Header --- */}
                <header className="text-center my-8">
                    <h1 className="text-3xl sm:text-5xl font-bold text-slate-800">Enhanced Company Profile Fetcher</h1>
                    <p className="text-slate-500 mt-2">Enter a company name to get a comprehensive, AI-enhanced profile.</p>
                </header>

                {/* --- Search Form --- */}
                <form onSubmit={handleFetchProfile} className="flex gap-2 mb-8">
                    <input
                        type="text"
                        value={companyName}
                        onChange={(e) => setCompanyName(e.target.value)}
                        placeholder="e.g., 'Microsoft' or 'Tata Consultancy Services'"
                        className="flex-grow p-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 focus:outline-none transition"
                    />
                    <button type="submit" disabled={isLoading} className="bg-blue-600 text-white font-semibold px-6 py-3 rounded-lg hover:bg-blue-700 transition disabled:bg-blue-300 disabled:cursor-not-allowed">
                        {isLoading ? 'Fetching...' : 'Get Profile'}
                    </button>
                </form>

                {/* --- Error Message --- */}
                {error && <div className="bg-red-100 border border-red-400 text-red-700 px-4 py-3 rounded-lg text-center mb-6">{error}</div>}
                
                {/* --- Loading Spinner --- */}
                {isLoading && (
                    <div className="text-center p-10">
                        <div className="w-12 h-12 border-4 border-t-blue-500 border-slate-200 rounded-full animate-spin mx-auto mb-4"></div>
                        <p className="text-slate-600">Scouring the web... this might take a moment.</p>
                    </div>
                )}

                {/* --- Profile Card --- */}
                {profile && (
                    <div className="bg-white shadow-lg rounded-xl p-6 sm:p-8">
                        <h2 className="text-center text-3xl font-bold text-slate-800 mb-6 pb-4 border-b border-slate-200">
                            {profile.company_name.toUpperCase()}
                        </h2>

                        {/* A reusable component for profile sections */}
                        <ProfileSection title="📋 Basic Information">
                            <p><strong>Founded:</strong> {profile.founding_year || 'Not found'}</p>
                            <p><strong>Employees:</strong> {profile.employee_count || 'Not found'}</p>
                            <p><strong>Business Type:</strong> {profile.business_type || 'Not determined'}</p>
                        </ProfileSection>

                        {profile.vision && <ProfileSection title="🎯 Vision"><p>{profile.vision}</p></ProfileSection>}
                        {profile.mission && <ProfileSection title="🚀 Mission"><p>{profile.mission}</p></ProfileSection>}
                        
                        {profile.working_culture?.length > 0 && (
                            <ProfileSection title="🏢 Working Culture">
                                <ul className="list-disc list-inside space-y-2">
                                    {profile.working_culture.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </ProfileSection>
                        )}
                        
                        {profile.recent_achievements?.length > 0 && (
                            <ProfileSection title="🏆 Recent Achievements">
                                <ul className="list-disc list-inside space-y-2">
                                    {profile.recent_achievements.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </ProfileSection>
                        )}

                        {profile.products_services?.length > 0 && (
                            <ProfileSection title="💼 Products & Services">
                                <ul className="list-disc list-inside space-y-2">
                                    {profile.products_services.map((item, i) => <li key={i}>{item}</li>)}
                                </ul>
                            </ProfileSection>
                        )}
                        
                        <ProfileSection title="📚 Sources Used">
                            <ul className="text-xs text-slate-500 list-disc list-inside space-y-1">
                                {profile.sources_used.map((src, i) => <li key={i} className="break-words">{src}</li>)}
                            </ul>
                        </ProfileSection>
                    </div>
                )}
            </div>
        </div>
    );
};

// A small helper component to avoid repetition
const ProfileSection = ({ title, children }) => (
    <div className="mb-6">
        <h3 className="text-xl font-semibold text-blue-700 mb-3 pb-2 border-b border-slate-100">{title}</h3>
        <div className="text-slate-700 leading-relaxed">
            {children}
        </div>
    </div>
);

export default CompanyProfile;