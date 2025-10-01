import React, { useState, useRef, useEffect } from 'react';
import { Search, Building2, Calendar, Users, Target, Rocket, Clock, Award, Package, Loader2, Download, Share2, Sparkles, Brain, Eye, BookOpen, Globe, ChevronDown, ChevronUp } from 'lucide-react';

const CompanyProfileFetcher = () => {
  const [companyName, setCompanyName] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);
  const [grokSummary, setGrokSummary] = useState(null);
  const [summarizing, setSummarizing] = useState(false);
  const [expandedSections, setExpandedSections] = useState({});
  const resultsRef = useRef(null);

  const sampleCompanies = [
    'Microsoft Corporation',
    'Google LLC',
    'Apple Inc.',
    'Amazon.com Inc.',
    'Tesla Inc.',
    'Meta Platforms',
    'Netflix Inc.',
    'Salesforce Inc.',
    'Adobe Inc.',
    'Nvidia Corporation'
  ];

  // Simulated company profile fetcher (replace with actual API call)
  const fetchCompanyProfile = async (name) => {
    // Simulate API delay
    await new Promise(resolve => setTimeout(resolve, 3000));
    
    // Mock data for demonstration
    const mockProfile = {
      company_name: name,
      vision: "To empower every person and every organization on the planet to achieve more through innovative technology solutions and digital transformation.",
      mission: "Our mission is to enable digital transformation for the era of an intelligent cloud and an intelligent edge by creating technology that helps people and businesses throughout the world realize their full potential.",
      founding_year: "1975",
      employee_count: "221,000",
      business_type: "Product-based",
      recent_achievements: [
        "Achieved $211.9 billion in revenue for fiscal year 2023, representing a 7% increase year-over-year",
        "Launched Microsoft Copilot, an AI-powered assistant integrated across Microsoft 365 applications",
        "Expanded Azure cloud services to 60+ regions worldwide, becoming the second-largest cloud provider globally",
        "Acquired Activision Blizzard for $68.7 billion, strengthening position in gaming industry",
        "Reached carbon negative status ahead of 2030 target, removing more carbon than emitted"
      ],
      working_culture: [
        "Growth mindset culture that encourages continuous learning, innovation, and embracing challenges as opportunities for development",
        "Inclusive workplace with employee resource groups, diversity initiatives, and commitment to creating psychological safety for all team members",
        "Flexible work arrangements including hybrid options, wellness programs, and comprehensive benefits supporting work-life balance"
      ],
      working_timings: "Standard business hours 9:00 AM - 5:00 PM with flexible scheduling options and hybrid work arrangements available",
      products_services: [
        "Microsoft 365 (Office Suite, Teams, SharePoint, OneDrive)",
        "Azure Cloud Computing Platform and Services",
        "Windows Operating System and Surface Devices",
        "Visual Studio Developer Tools and GitHub",
        "Xbox Gaming Console and Game Pass Subscription",
        "LinkedIn Professional Networking Platform",
        "Dynamics 365 Business Applications",
        "Power Platform (Power BI, Power Apps, Power Automate)",
        "Microsoft Teams Communication and Collaboration",
        "SQL Server Database Management System"
      ],
      sources_used: [
        "Wikipedia: https://en.wikipedia.org/wiki/Microsoft",
        "Web: https://www.microsoft.com/about",
        "Web: https://careers.microsoft.com/culture",
        "Web: https://news.microsoft.com"
      ]
    };

    return mockProfile;
  };

  // Simulated Grok AI summarization
  const generateGrokSummary = async (profileData) => {
    setSummarizing(true);
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    const summary = {
      executive_summary: `${profileData.company_name} is a ${profileData.business_type?.toLowerCase()} technology leader founded in ${profileData.founding_year} with ${profileData.employee_count} employees. The company demonstrates strong market position through recent achievements including significant revenue growth, AI innovation with Copilot, and strategic acquisitions. Their growth mindset culture and flexible work arrangements position them well for continued success in the evolving tech landscape.`,
      key_strengths: [
        "Market Leadership: Second-largest cloud provider with global reach",
        "Innovation Focus: Leading AI integration with Microsoft Copilot",
        "Financial Performance: $211.9B revenue with consistent growth",
        "Cultural Foundation: Growth mindset and inclusive workplace",
        "Sustainability: Achieved carbon negative status ahead of schedule"
      ],
      business_outlook: "Strong positioning in cloud computing, AI, and productivity software markets with diversified revenue streams and strategic acquisitions supporting long-term growth.",
      work_environment_rating: "9.2/10 - Excellent work-life balance, professional development opportunities, and inclusive culture",
      recommendation: "Highly recommended for professionals seeking career growth in technology, cloud computing, or AI sectors with a company that values innovation and employee development."
    };

    setGrokSummary(summary);
    setSummarizing(false);
  };

  const handleSearch = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }

    setLoading(true);
    setError(null);
    setProfile(null);
    setGrokSummary(null);

    try {
      const profileData = await fetchCompanyProfile(companyName);
      setProfile(profileData);
      
      // Auto-generate Grok summary after profile is fetched
      await generateGrokSummary(profileData);
      
      // Scroll to results
      setTimeout(() => {
        resultsRef.current?.scrollIntoView({ behavior: 'smooth' });
      }, 100);
    } catch (err) {
      setError('Failed to fetch company profile. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const downloadProfile = () => {
    if (!profile) return;
    
    const data = {
      ...profile,
      grok_summary: grokSummary,
      generated_at: new Date().toISOString()
    };
    
    const blob = new Blob([JSON.stringify(data, null, 2)], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${profile.company_name.replace(/\s+/g, '_')}_profile.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const shareProfile = async () => {
    if (!profile) return;
    
    const shareData = {
      title: `${profile.company_name} - Company Profile`,
      text: `Check out this comprehensive profile of ${profile.company_name}`,
      url: window.location.href
    };

    if (navigator.share) {
      try {
        await navigator.share(shareData);
      } catch (err) {
        console.log('Error sharing:', err);
      }
    } else {
      // Fallback: copy to clipboard
      navigator.clipboard.writeText(`${shareData.title}\n${shareData.text}\n${shareData.url}`);
      alert('Profile link copied to clipboard!');
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-900 via-purple-900 to-slate-900">
      {/* Header */}
      <div className="bg-black/20 backdrop-blur-sm border-b border-white/10">
        <div className="max-w-7xl mx-auto px-4 py-6">
          <div className="flex items-center justify-between">
            <div className="flex items-center space-x-3">
              <div className="p-2 bg-gradient-to-br from-blue-500 to-purple-600 rounded-lg">
                <Building2 className="h-8 w-8 text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-bold text-white">Company Profile Fetcher</h1>
                <p className="text-gray-300 text-sm">Powered by AI & Advanced Web Scraping</p>
              </div>
            </div>
            <div className="flex items-center space-x-2 text-sm text-gray-400">
              <Brain className="h-4 w-4" />
              <span>Grok AI Enhanced</span>
            </div>
          </div>
        </div>
      </div>

      <div className="max-w-7xl mx-auto px-4 py-8">
        {/* Search Section */}
        <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-8 mb-8">
          <div className="text-center mb-8">
            <h2 className="text-3xl font-bold text-white mb-2">
              Discover Company Insights
            </h2>
            <p className="text-gray-300">
              Get comprehensive company profiles with AI-powered analysis and summarization
            </p>
          </div>

          <div className="max-w-2xl mx-auto">
            <div className="flex space-x-4 mb-4">
              <div className="flex-1">
                <input
                  type="text"
                  value={companyName}
                  onChange={(e) => setCompanyName(e.target.value)}
                  onKeyPress={(e) => e.key === 'Enter' && handleSearch()}
                  placeholder="Enter company name (e.g., Microsoft Corporation)"
                  className="w-full px-4 py-3 bg-white/10 border border-white/20 rounded-lg text-white placeholder-gray-400 focus:outline-none focus:ring-2 focus:ring-blue-500 focus:border-transparent"
                />
              </div>
              <button
                onClick={handleSearch}
                disabled={loading}
                className="px-6 py-3 bg-gradient-to-r from-blue-500 to-purple-600 text-white rounded-lg hover:from-blue-600 hover:to-purple-700 disabled:opacity-50 disabled:cursor-not-allowed flex items-center space-x-2 transition-all duration-200"
              >
                {loading ? (
                  <>
                    <Loader2 className="h-5 w-5 animate-spin" />
                    <span>Fetching...</span>
                  </>
                ) : (
                  <>
                    <Search className="h-5 w-5" />
                    <span>Search</span>
                  </>
                )}
              </button>
            </div>

            {/* Sample Companies */}
            <div className="text-center">
              <p className="text-gray-400 text-sm mb-3">Try these popular companies:</p>
              <div className="flex flex-wrap justify-center gap-2">
                {sampleCompanies.slice(0, 5).map((company) => (
                  <button
                    key={company}
                    onClick={() => setCompanyName(company)}
                    className="px-3 py-1 bg-white/10 hover:bg-white/20 text-gray-300 text-sm rounded-full transition-all duration-200"
                  >
                    {company}
                  </button>
                ))}
              </div>
            </div>
          </div>

          {error && (
            <div className="max-w-2xl mx-auto mt-4 p-4 bg-red-500/20 border border-red-500/30 rounded-lg">
              <p className="text-red-300 text-center">{error}</p>
            </div>
          )}
        </div>

        {/* Results Section */}
        {profile && (
          <div ref={resultsRef} className="space-y-6">
            {/* Header with Actions */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-3xl font-bold text-white mb-2">{profile.company_name}</h2>
                  <div className="flex items-center space-x-6 text-sm text-gray-300">
                    <div className="flex items-center space-x-2">
                      <Calendar className="h-4 w-4" />
                      <span>Founded: {profile.founding_year || 'Not found'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Users className="h-4 w-4" />
                      <span>Employees: {profile.employee_count || 'Not found'}</span>
                    </div>
                    <div className="flex items-center space-x-2">
                      <Package className="h-4 w-4" />
                      <span>{profile.business_type || 'Unknown'}</span>
                    </div>
                  </div>
                </div>
                <div className="flex space-x-3">
                  <button
                    onClick={downloadProfile}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
                    title="Download Profile"
                  >
                    <Download className="h-5 w-5" />
                  </button>
                  <button
                    onClick={shareProfile}
                    className="p-2 bg-white/10 hover:bg-white/20 rounded-lg text-gray-300 hover:text-white transition-all duration-200"
                    title="Share Profile"
                  >
                    <Share2 className="h-5 w-5" />
                  </button>
                </div>
              </div>
            </div>

            {/* Grok AI Summary */}
            {grokSummary && (
              <div className="bg-gradient-to-r from-purple-500/20 to-blue-500/20 backdrop-blur-sm rounded-2xl border border-purple-500/30 p-6">
                <div className="flex items-center space-x-3 mb-4">
                  <div className="p-2 bg-gradient-to-br from-purple-500 to-blue-600 rounded-lg">
                    <Sparkles className="h-6 w-6 text-white" />
                  </div>
                  <div>
                    <h3 className="text-xl font-bold text-white">Grok AI Analysis</h3>
                    <p className="text-gray-300 text-sm">Advanced AI-powered insights and recommendations</p>
                  </div>
                </div>

                <div className="grid md:grid-cols-2 gap-6">
                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-white mb-2 flex items-center space-x-2">
                        <Eye className="h-4 w-4" />
                        <span>Executive Summary</span>
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{grokSummary.executive_summary}</p>
                    </div>
                    
                    <div>
                      <h4 className="font-semibold text-white mb-2 flex items-center space-x-2">
                        <BookOpen className="h-4 w-4" />
                        <span>Business Outlook</span>
                      </h4>
                      <p className="text-gray-300 text-sm leading-relaxed">{grokSummary.business_outlook}</p>
                    </div>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <h4 className="font-semibold text-white mb-2">Key Strengths</h4>
                      <ul className="space-y-1">
                        {grokSummary.key_strengths.map((strength, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-start space-x-2">
                            <span className="text-green-400 font-bold">•</span>
                            <span>{strength}</span>
                          </li>
                        ))}
                      </ul>
                    </div>
                    
                    <div className="p-4 bg-white/5 rounded-lg">
                      <div className="flex items-center justify-between mb-2">
                        <span className="font-semibold text-white">Work Environment</span>
                        <span className="text-green-400 font-bold">{grokSummary.work_environment_rating}</span>
                      </div>
                      <p className="text-gray-300 text-sm">{grokSummary.recommendation}</p>
                    </div>
                  </div>
                </div>
              </div>
            )}

            {summarizing && (
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <div className="flex items-center justify-center space-x-3">
                  <Loader2 className="h-6 w-6 animate-spin text-purple-400" />
                  <span className="text-white">Grok AI is analyzing the company profile...</span>
                </div>
              </div>
            )}

            {/* Company Details Grid */}
            <div className="grid md:grid-cols-2 gap-6">
              {/* Vision & Mission */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <div className="space-y-4">
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Target className="h-5 w-5 text-blue-400" />
                      <h3 className="font-bold text-white">Vision</h3>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {profile.vision || 'Vision statement not found'}
                    </p>
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Rocket className="h-5 w-5 text-purple-400" />
                      <h3 className="font-bold text-white">Mission</h3>
                    </div>
                    <p className="text-gray-300 text-sm leading-relaxed">
                      {profile.mission || 'Mission statement not found'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Working Culture & Timings */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <div className="space-y-4">
                  <div>
                    <div 
                      className="flex items-center justify-between cursor-pointer"
                      onClick={() => toggleSection('culture')}
                    >
                      <div className="flex items-center space-x-2">
                        <Users className="h-5 w-5 text-green-400" />
                        <h3 className="font-bold text-white">Working Culture</h3>
                      </div>
                      {expandedSections.culture ? 
                        <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                        <ChevronDown className="h-4 w-4 text-gray-400" />
                      }
                    </div>
                    {(expandedSections.culture || true) && profile.working_culture && (
                      <ul className="mt-3 space-y-2">
                        {profile.working_culture.map((culture, index) => (
                          <li key={index} className="text-gray-300 text-sm flex items-start space-x-2">
                            <span className="text-green-400 font-bold">•</span>
                            <span>{culture}</span>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                  
                  <div>
                    <div className="flex items-center space-x-2 mb-3">
                      <Clock className="h-5 w-5 text-yellow-400" />
                      <h3 className="font-bold text-white">Working Timings</h3>
                    </div>
                    <p className="text-gray-300 text-sm">
                      {profile.working_timings || 'Working hours not specified'}
                    </p>
                  </div>
                </div>
              </div>

              {/* Recent Achievements */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <div className="flex items-center space-x-2 mb-4">
                  <Award className="h-5 w-5 text-orange-400" />
                  <h3 className="font-bold text-white">Recent Achievements</h3>
                </div>
                {profile.recent_achievements ? (
                  <ul className="space-y-3">
                    {profile.recent_achievements.map((achievement, index) => (
                      <li key={index} className="text-gray-300 text-sm flex items-start space-x-2">
                        <span className="text-orange-400 font-bold">•</span>
                        <span>{achievement}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No recent achievements found</p>
                )}
              </div>

              {/* Products & Services */}
              <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
                <div 
                  className="flex items-center justify-between cursor-pointer mb-4"
                  onClick={() => toggleSection('products')}
                >
                  <div className="flex items-center space-x-2">
                    <Package className="h-5 w-5 text-cyan-400" />
                    <h3 className="font-bold text-white">Products & Services</h3>
                  </div>
                  {expandedSections.products ? 
                    <ChevronUp className="h-4 w-4 text-gray-400" /> : 
                    <ChevronDown className="h-4 w-4 text-gray-400" />
                  }
                </div>
                {(expandedSections.products || true) && profile.products_services ? (
                  <ul className="space-y-2">
                    {profile.products_services.map((item, index) => (
                      <li key={index} className="text-gray-300 text-sm flex items-start space-x-2">
                        <span className="text-cyan-400 font-bold">•</span>
                        <span>{item}</span>
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-gray-400 text-sm">No products/services information found</p>
                )}
              </div>
            </div>

            {/* Sources */}
            <div className="bg-white/5 backdrop-blur-sm rounded-2xl border border-white/10 p-6">
              <div className="flex items-center space-x-2 mb-4">
                <Globe className="h-5 w-5 text-gray-400" />
                <h3 className="font-bold text-white">Sources</h3>
              </div>
              <div className="space-y-2">
                {profile.sources_used.map((source, index) => (
                  <p key={index} className="text-gray-400 text-sm">
                    • {source}
                  </p>
                ))}
              </div>
            </div>
          </div>
        )}
      </div>

      {/* Footer */}
      <footer className="mt-16 bg-black/20 backdrop-blur-sm border-t border-white/10 py-8">
        <div className="max-w-7xl mx-auto px-4 text-center">
          <p className="text-gray-400 text-sm">
            Powered by Advanced Web Scraping, Wikipedia API, and Grok AI Analysis
          </p>
        </div>
      </footer>
    </div>
  );
};

export default CompanyProfileFetcher;