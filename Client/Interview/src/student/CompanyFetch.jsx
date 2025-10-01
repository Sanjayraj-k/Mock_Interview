import React, { useState } from 'react';
// Import new icons: User for Founder, MapPin for Headquarters
import { Search, Building2, Target, Users, Award, Clock, DollarSign, Briefcase, Calendar, Globe, Loader2, CheckCircle, ArrowRight, ExternalLink, User, MapPin } from 'lucide-react';

const CompanyProfileFetcher = () => {
  const [companyName, setCompanyName] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const fetchCompanyProfile = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }
    setLoading(true);
    setError('');
    setProfile(null);
    try {
      const response = await fetch('http://localhost:5000/companyscrap/api/company-profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ company_name: companyName.trim() }),
      });
      const data = await response.json();
      if (data.success) {
        setProfile(data.data);
      } else {
        setError(data.error || 'Failed to fetch company profile');
      }
    } catch (err) {
      setError('Failed to connect to server. Make sure the backend is running on port 5000.');
      console.error('Error:', err);
    } finally {
      setLoading(false);
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchCompanyProfile();
  };

  const InfoCard = ({ icon: Icon, title, content, className = "", gradient = "from-blue-500 to-blue-600" }) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return null;
    return (
      <div className={`bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1 ${className}`}>
        <div className="flex items-center mb-6">
          <div className={`bg-gradient-to-r ${gradient} p-3 rounded-xl mr-4 shadow-lg`}>
            <Icon className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">{title}</h3>
        </div>
        <div className="text-gray-700">
          {Array.isArray(content) ? (
            <ul className="space-y-3">
              {content.map((item, index) => (
                <li key={index} className="flex items-start group">
                  <span className="text-blue-500 mr-3 mt-1 text-lg font-bold group-hover:scale-110 transition-transform">•</span>
                  <span className="leading-relaxed text-base">{item}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="leading-relaxed text-base">{content}</p>
          )}
        </div>
      </div>
    );
  };

  // Enhanced KeyDetailsCard with better UI
  const KeyDetailsCard = ({ profile }) => {
    const details = [
      { icon: User, label: "Founder(s)", value: profile.founder, gradient: "from-purple-500 to-purple-600" },
      { icon: MapPin, label: "Headquarters", value: profile.headquarters, gradient: "from-green-500 to-green-600" },
      { icon: Users, label: "Employees", value: profile.employees, gradient: "from-orange-500 to-orange-600" },
    ].filter(d => d.value && !d.value.toLowerCase().includes('not available'));

    if (details.length === 0) return null;

    return (
      <div className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100 hover:shadow-2xl transition-all duration-300 transform hover:-translate-y-1">
        <div className="flex items-center mb-6">
          <div className="bg-gradient-to-r from-indigo-500 to-indigo-600 p-3 rounded-xl mr-4 shadow-lg">
            <Briefcase className="h-6 w-6 text-white" />
          </div>
          <h3 className="text-xl font-bold text-gray-800">Key Details</h3>
        </div>
        <div className="space-y-5">
          {details.map((detail, index) => (
            <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
              <div className="flex items-center text-gray-700">
                <div className={`bg-gradient-to-r ${detail.gradient} p-2 rounded-lg mr-3 shadow-md`}>
                  <detail.icon className="h-4 w-4 text-white" />
                </div>
                <span className="font-semibold text-gray-800">{detail.label}</span>
              </div>
              <span className="text-gray-700 text-right ml-4 font-medium">{detail.value}</span>
            </div>
          ))}
        </div>
      </div>
    );
  };

  const CompanyHeader = ({ profile }) => {
    if (!profile) return null;
    return (
      <div className="bg-gradient-to-r from-blue-600 via-purple-600 to-indigo-600 rounded-3xl shadow-2xl text-white p-10 mb-10 relative overflow-hidden">
        <div className="absolute inset-0 bg-black opacity-10"></div>
        <div className="relative z-10">
          <div className="flex flex-col lg:flex-row lg:items-center lg:justify-between">
            <div className="mb-6 lg:mb-0">
              <h2 className="text-5xl font-bold mb-3 text-shadow-lg">{profile.full_company_name || profile.original_input}</h2>
              {profile.original_input !== profile.full_company_name && (
                <p className="text-blue-100 text-lg mb-3 opacity-90">Originally searched: {profile.original_input}</p>
              )}
            </div>
            {profile.wikipedia_source && (
              <a href={profile.wikipedia_source} target="_blank" rel="noopener noreferrer" className="bg-white bg-opacity-20 hover:bg-opacity-30 px-6 py-3 rounded-xl flex items-center text-base font-semibold transition-all duration-300 hover:scale-105 backdrop-blur-sm">
                <ExternalLink className="h-5 w-5 mr-2" /> View on Wikipedia
              </a>
            )}
          </div>
        </div>
      </div>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 via-indigo-50 to-purple-50">
      <div className="bg-white shadow-lg border-b">
        <div className="max-w-7xl mx-auto px-6 py-8">
          <h1 className="text-4xl font-bold text-gray-900 flex items-center">
            <div className="bg-gradient-to-r from-blue-600 to-purple-600 p-3 rounded-xl mr-4 shadow-lg">
              <Building2 className="h-10 w-10 text-white" />
            </div>
            AI-Powered Company Analyzer
          </h1>
        </div>
      </div>
      <div className="max-w-7xl mx-auto px-6 py-10">
        {/* Enhanced Search Form */}
        <div className="bg-white rounded-3xl shadow-2xl p-10 mb-10 border border-gray-100">
          <div className="flex gap-6">
            <input
              type="text" 
              value={companyName} 
              onChange={(e) => setCompanyName(e.target.value)}
              placeholder="Enter company name (e.g., Apple, Microsoft)"
              className="flex-1 px-6 py-4 border-2 border-gray-200 rounded-xl focus:ring-4 focus:ring-blue-500 focus:border-transparent outline-none text-gray-700 text-lg transition-all duration-300 hover:border-gray-300"
              disabled={loading} 
              onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
            />
            <button 
              onClick={handleSubmit} 
              disabled={loading}
              className="px-10 py-4 bg-gradient-to-r from-blue-600 to-purple-600 text-white rounded-xl hover:from-blue-700 hover:to-purple-700 focus:ring-4 focus:ring-blue-500 focus:ring-offset-2 disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-3 font-semibold transition-all duration-300 hover:scale-105 shadow-lg"
            >
              {loading ? (
                <>
                  <Loader2 className="h-6 w-6 animate-spin" /> 
                  Analyzing...
                </>
              ) : (
                <>
                  <Search className="h-6 w-6" /> 
                  Analyze Company
                </>
              )}
            </button>
          </div>
          {error && (
            <div className="mt-6 p-5 bg-red-50 border-2 border-red-200 rounded-xl">
              <p className="text-red-700 flex items-center text-lg">
                <span className="text-red-500 mr-3 text-2xl">⚠️</span>
                {error}
              </p>
            </div>
          )}
        </div>
        
        {loading && (
          <div className="text-center p-16">
            <div className="bg-white rounded-3xl shadow-2xl p-12 inline-block">
              <Loader2 className="h-16 w-16 animate-spin text-blue-600 mx-auto mb-4" />
              <p className="text-xl text-gray-600 font-medium">Analyzing company data...</p>
            </div>
          </div>
        )}

        {profile && !loading && (
          <div className="space-y-10">
            <CompanyHeader profile={profile} />
            
            <div className="grid grid-cols-1 lg:grid-cols-2 gap-10">
              <KeyDetailsCard profile={profile} />
              <InfoCard icon={Target} title="Vision Statement" content={profile.vision} gradient="from-emerald-500 to-emerald-600" />
              <InfoCard icon={Briefcase} title="Mission Statement" content={profile.mission} gradient="from-cyan-500 to-cyan-600" />
              <InfoCard icon={Calendar} title="Founding Information" content={profile.founding_info} gradient="from-amber-500 to-amber-600" />
              <InfoCard icon={DollarSign} title="Financial Information" content={profile.financial_info} gradient="from-rose-500 to-rose-600" />
            </div>

            <div className="space-y-8">
              <InfoCard 
                icon={Briefcase} 
                title="Products & Services" 
                content={profile.products_services} 
                className="col-span-full" 
                gradient="from-violet-500 to-violet-600"
              />
              <InfoCard 
                icon={Award} 
                title="Recent Achievements" 
                content={profile.recent_achievements} 
                className="col-span-full" 
                gradient="from-pink-500 to-pink-600"
              />
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default CompanyProfileFetcher;