import React, { useState } from 'react';
import {
  Search,
  Building2,
  Target,
  Users,
  Award,
  Clock,
  DollarSign,
  Briefcase,
  Calendar,
  Globe,
  Loader2,
  CheckCircle,
  ArrowRight,
  ExternalLink,
  User,
  MapPin,
  Send,
  Sparkles
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';

const CompanyProfileFetcher = () => {
  const [companyName, setCompanyName] = useState('');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [progressStep, setProgressStep] = useState('');

  const fetchCompanyProfile = async () => {
    if (!companyName.trim()) {
      setError('Please enter a company name');
      return;
    }
    setLoading(true);
    setError('');
    setProfile(null);
    setProgressStep('Connecting to AI...');

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
      setProgressStep('');
    }
  };

  const handleSubmit = (e) => {
    e.preventDefault();
    fetchCompanyProfile();
  };

  const InfoDetail = ({ icon: Icon, label, value, colorClass }) => (
    <div className="flex items-start gap-4 p-4 rounded-xl bg-gray-50/50 hover:bg-white hover:shadow-md transition-all duration-300 border border-transparent hover:border-gray-100 group">
      <div className={`p-3 rounded-xl ${colorClass} text-white shadow-lg group-hover:scale-110 transition-transform duration-300`}>
        <Icon size={20} />
      </div>
      <div className="flex-1">
        <p className="text-sm font-semibold text-gray-500 mb-1 uppercase tracking-wider">{label}</p>
        <p className="font-bold text-gray-800 text-lg leading-tight">{value || "Not available"}</p>
      </div>
    </div>
  );

  const SectionCard = ({ icon: Icon, title, content, gradient, delay }) => {
    if (!content || (Array.isArray(content) && content.length === 0)) return null;

    return (
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: delay * 0.1 }}
        className="bg-white rounded-2xl shadow-xl p-8 border border-gray-100/50 hover:shadow-2xl transition-all duration-300 group overflow-hidden relative"
      >
        <div className={`absolute top-0 left-0 w-2 h-full bg-gradient-to-b ${gradient}`} />
        <div className="flex items-center mb-6 relative z-10">
          <div className={`p-3 rounded-xl bg-gradient-to-br ${gradient} text-white mr-4 shadow-lg group-hover:scale-110 transition-transform duration-300`}>
            <Icon size={24} />
          </div>
          <h3 className="text-2xl font-bold text-gray-800">{title}</h3>
        </div>

        <div className="relative z-10">
          {Array.isArray(content) ? (
            <ul className="space-y-4">
              {content.map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  animate={{ opacity: 1, x: 0 }}
                  transition={{ delay: (delay * 0.1) + (index * 0.05) }}
                  className="flex items-start group/item"
                >
                  <span className={`mr-3 mt-1.5 h-2 w-2 rounded-full bg-gradient-to-r ${gradient} group-hover/item:scale-150 transition-transform duration-300`} />
                  <span className="text-gray-700 leading-relaxed font-medium">{item}</span>
                </motion.li>
              ))}
            </ul>
          ) : (
            <p className="text-gray-700 leading-relaxed text-lg font-medium">{content}</p>
          )}
        </div>

        {/* Background Decoration */}
        <div className={`absolute -bottom-10 -right-10 w-40 h-40 bg-gradient-to-br ${gradient} opacity-5 rounded-full blur-3xl group-hover:opacity-10 transition-opacity duration-300`} />
      </motion.div>
    );
  };

  return (
    <div className="min-h-screen bg-[#f8fafc] font-sans selection:bg-blue-100 selection:text-blue-900">
      {/* Dynamic Background */}
      <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
        <div className="absolute top-[-10%] left-[-10%] w-[500px] h-[500px] bg-purple-200/20 rounded-full blur-[100px] animate-pulse" />
        <div className="absolute bottom-[-10%] right-[-10%] w-[500px] h-[500px] bg-blue-200/20 rounded-full blur-[100px] animate-pulse delay-700" />
      </div>

      <div className="relative z-10 max-w-7xl mx-auto px-4 py-12 sm:px-6 lg:px-8">

        {/* Header Section */}
        <div className="text-center mb-12">
          <motion.div
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            className="inline-flex items-center gap-2 px-4 py-2 bg-white rounded-full shadow-md text-blue-600 font-semibold text-sm mb-6 border border-blue-100"
          >
            <Sparkles size={16} className="text-yellow-500" />
            AI-Powered Corporate Intelligence
          </motion.div>

          <motion.h1
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.1 }}
            className="text-5xl md:text-6xl font-black text-gray-900 mb-6 tracking-tight"
          >
            Company <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-violet-600">Profile Analyzer</span>
          </motion.h1>

          <motion.p
            initial={{ opacity: 0, y: -20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ delay: 0.2 }}
            className="text-xl text-gray-600 max-w-2xl mx-auto font-medium"
          >
            Uncover in-depth insights, financials, and strategic details of any company instantly using advanced AI.
          </motion.p>
        </div>

        {/* Search Bar */}
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.3 }}
          className="max-w-2xl mx-auto mb-16"
        >
          <div className="relative group">
            <div className="absolute -inset-1 bg-gradient-to-r from-blue-500 to-violet-600 rounded-2xl blur opacity-25 group-hover:opacity-50 transition duration-1000 group-hover:duration-200"></div>
            <div className="relative flex bg-white rounded-2xl shadow-xl overflow-hidden p-2">
              <input
                type="text"
                value={companyName}
                onChange={(e) => setCompanyName(e.target.value)}
                onKeyPress={(e) => e.key === 'Enter' && handleSubmit(e)}
                placeholder="Enter company name (e.g. Tesla, Google)..."
                className="flex-1 px-6 py-4 text-lg font-medium outline-none text-gray-700 placeholder-gray-400 bg-transparent"
                disabled={loading}
              />
              <button
                onClick={handleSubmit}
                disabled={loading}
                className={`px-8 py-3 rounded-xl font-bold text-white shadow-lg transition-all duration-300 flex items-center gap-2 ${loading ? 'bg-gray-400 cursor-not-allowed' : 'bg-gradient-to-r from-blue-600 to-violet-600 hover:scale-105 active:scale-95'
                  }`}
              >
                {loading ? <Loader2 className="animate-spin" size={24} /> : <Search size={24} />}
                <span className="hidden sm:inline">{loading ? 'Analyzing...' : 'Analyze'}</span>
              </button>
            </div>
          </div>

          {/* Progress Indicators */}
          <AnimatePresence>
            {loading && profile?.processing_steps && (
              <motion.div
                initial={{ opacity: 0, height: 0 }}
                animate={{ opacity: 1, height: 'auto' }}
                exit={{ opacity: 0, height: 0 }}
                className="mt-6 bg-white/80 backdrop-blur-md rounded-xl p-4 shadow-lg border border-white/50"
              >
                <div className="space-y-2">
                  {profile.processing_steps.slice(-3).map((step, idx) => (
                    <motion.div
                      key={idx}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      className="flex items-center gap-3 text-sm font-medium text-gray-600"
                    >
                      <div className="w-2 h-2 rounded-full bg-blue-500 animate-pulse" />
                      {step}
                    </motion.div>
                  ))}
                </div>
              </motion.div>
            )}
          </AnimatePresence>

          {error && (
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="mt-4 p-4 bg-red-50 border border-red-100 text-red-600 rounded-xl flex items-center gap-3 shadow-sm"
            >
              <div className="p-2 bg-red-100 rounded-lg"><Sparkles size={18} className="text-red-500 rotate-180" /></div>
              <p className="font-medium">{error}</p>
            </motion.div>
          )}
        </motion.div>

        {/* Results Section */}
        <AnimatePresence>
          {profile && !loading && (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              className="space-y-8"
            >
              {/* Company Hero Card */}
              <motion.div
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="bg-white rounded-[2rem] shadow-2xl overflow-hidden border border-gray-100 relative group"
              >
                <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-bl from-blue-500/10 to-transparent rounded-full blur-3xl -mr-20 -mt-20 pointer-events-none" />

                <div className="p-8 md:p-12 relative z-10">
                  <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-6 mb-10">
                    <div>
                      <div className="flex items-center gap-3 mb-2">
                        <span className="px-3 py-1 bg-blue-50 text-blue-600 text-xs font-bold uppercase tracking-wider rounded-full border border-blue-100">
                          Corporate Profile
                        </span>
                        {profile.wikipedia_source && (
                          <a
                            href={profile.wikipedia_source}
                            target="_blank"
                            rel="noreferrer"
                            className="flex items-center gap-1 text-xs font-semibold text-gray-400 hover:text-blue-600 transition-colors"
                          >
                            <Globe size={12} />
                            Wikipedia Verified
                          </a>
                        )}
                      </div>
                      <h2 className="text-4xl md:text-5xl font-black text-gray-900 mb-2">
                        {profile.full_company_name}
                      </h2>
                    </div>
                  </div>

                  {/* Key Stats Grid */}
                  <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
                    <InfoDetail
                      icon={User}
                      label="Founder(s)"
                      value={profile.founder}
                      colorClass="bg-gradient-to-br from-purple-500 to-indigo-600"
                    />
                    <InfoDetail
                      icon={MapPin}
                      label="Headquarters"
                      value={profile.headquarters}
                      colorClass="bg-gradient-to-br from-blue-500 to-cyan-500"
                    />
                    <InfoDetail
                      icon={Users}
                      label="Workforce"
                      value={profile.employees}
                      colorClass="bg-gradient-to-br from-emerald-500 to-teal-600"
                    />
                  </div>
                </div>
              </motion.div>

              {/* Main Content Grid */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-8">
                <SectionCard
                  icon={Target}
                  title="Vision"
                  content={profile.vision}
                  gradient="from-amber-400 to-orange-500"
                  delay={1}
                />
                <SectionCard
                  icon={Briefcase}
                  title="Mission"
                  content={profile.mission}
                  gradient="from-emerald-400 to-teal-500"
                  delay={2}
                />
                <SectionCard
                  icon={Calendar}
                  title="Founding Story"
                  content={profile.founding_info}
                  gradient="from-blue-400 to-indigo-500"
                  delay={3}
                />
                <SectionCard
                  icon={DollarSign}
                  title="Financials"
                  content={profile.financial_info}
                  gradient="from-rose-400 to-pink-500"
                  delay={4}
                />
              </div>

              {/* Full Width Sections */}
              <SectionCard
                icon={Briefcase}
                title="Products & Services"
                content={profile.products_services}
                gradient="from-violet-500 to-purple-600"
                delay={5}
              />

              <SectionCard
                icon={Award}
                title="Recent Achievements"
                content={profile.recent_achievements}
                gradient="from-fuchsia-500 to-pink-600"
                delay={6}
              />

            </motion.div>
          )}
        </AnimatePresence>
      </div>
    </div>
  );
};

export default CompanyProfileFetcher;