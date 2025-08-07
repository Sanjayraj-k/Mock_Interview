import React, { useState } from 'react';
import { 
  Search, TrendingUp, Award, Target, Brain, 
  ChevronRight, Loader2, AlertCircle, Trophy 
} from 'lucide-react';

const LeetCodeAnalyzer = () => {
  const [username, setUsername] = useState('');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState(null);
  const [error, setError] = useState('');

  // API endpoint - change this to your Flask app URL
  const API_BASE_URL = 'http://localhost:5000';

  const analyzeUser = async (e) => {
    e.preventDefault();
    
    if (!username.trim()) {
      setError('Please enter a username');
      return;
    }

    setLoading(true);
    setError('');
    setResults(null);

    try {
      const response = await fetch(`${API_BASE_URL}/analyze`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({ username: username.trim() }),
      });

      if (!response.ok) {
        const errorData = await response.json();
        throw new Error(errorData.error || 'Failed to fetch user data');
      }

      const data = await response.json();
      setResults(data);
    } catch (err) {
      setError(err.message || 'An error occurred while fetching data');
    } finally {
      setLoading(false);
    }
  };

  const StatCard = ({ icon: Icon, label, value, color = "bg-gradient-to-br from-blue-500 to-purple-600" }) => (
    <div className={`${color} text-white p-6 rounded-xl shadow-lg transform hover:scale-105 transition-all duration-200`}>
      <div className="flex items-center justify-between">
        <div>
          <p className="text-white/80 text-sm font-medium">{label}</p>
          <p className="text-2xl font-bold mt-1">{value}</p>
        </div>
        <Icon className="w-8 h-8 text-white/80" />
      </div>
    </div>
  );

  const ProgressBar = ({ label, current, total, color = "bg-blue-500" }) => {
    const percentage = total > 0 ? (current / total) * 100 : 0;
    
    return (
      <div className="mb-4">
        <div className="flex justify-between items-center mb-2">
          <span className="text-sm font-medium text-gray-700">{label}</span>
          <span className="text-sm text-gray-500">{current}/{total}</span>
        </div>
        <div className="w-full bg-gray-200 rounded-full h-2">
          <div 
            className={`${color} h-2 rounded-full transition-all duration-500`}
            style={{ width: `${Math.min(percentage, 100)}%` }}
          ></div>
        </div>
      </div>
    );
  };

  const formatSuggestions = (suggestions) => {
    const lines = suggestions.split('\n');
    const formattedLines = lines.map((line, index) => {
      if (line.match(/^\d+\./)) {
        return <div key={index} className="font-semibold text-lg text-blue-700 mt-4 mb-2">{line}</div>;
      } else if (line.trim().startsWith('- ')) {
        return <div key={index} className="ml-4 text-gray-600 mb-1">{line}</div>;
      } else if (line.includes('**') && line.includes('**')) {
        const formatted = line.replace(/\*\*(.*?)\*\*/g, '<strong class="text-purple-700">$1</strong>');
        return <div key={index} className="mb-2" dangerouslySetInnerHTML={{ __html: formatted }} />;
      }
      return line.trim() ? <div key={index} className="mb-2 text-gray-700">{line}</div> : null;
    }).filter(Boolean);
    
    return formattedLines;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50">
      {/* Header */}
      <div className="bg-gradient-to-r from-indigo-600 to-purple-600 text-white">
        <div className="max-w-6xl mx-auto px-4 py-16 text-center">
          <h1 className="text-4xl md:text-6xl font-bold mb-4">🚀 LeetCode Progress Analyzer</h1>
          <p className="text-xl md:text-2xl text-indigo-100 max-w-3xl mx-auto">
            Get personalized problem suggestions powered by AI to accelerate your coding journey
          </p>
        </div>
      </div>

      <div className="max-w-6xl mx-auto px-4 py-8">
        {/* Search Form */}
        <form onSubmit={analyzeUser} className="flex flex-col md:flex-row items-center justify-center gap-4 mb-12">
          <input
            type="text"
            placeholder="Enter LeetCode username"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            className="w-full md:w-96 p-4 border border-gray-300 rounded-xl focus:ring-2 focus:ring-indigo-400 outline-none"
          />

          <button
            type="submit"
            className="px-6 py-3 bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-medium rounded-xl shadow-md hover:scale-105 transition-all duration-200 flex items-center justify-center space-x-2"
          >
            {loading ? (
              <>
                <Loader2 className="w-5 h-5 animate-spin" />
                <span>Analyzing...</span>
              </>
            ) : (
              <>
                <Brain className="w-5 h-5" />
                <span>Analyze Progress</span>
                <ChevronRight className="w-5 h-5" />
              </>
            )}
          </button>
        </form>

        {/* Error Message */}
        {error && (
          <div className="bg-red-50 border border-red-200 rounded-xl p-6 mb-8 flex items-center space-x-3">
            <AlertCircle className="w-6 h-6 text-red-500 flex-shrink-0" />
            <div>
              <h3 className="font-semibold text-red-800">Error occurred</h3>
              <p className="text-red-600">{error}</p>
            </div>
          </div>
        )}

        {/* Loading State */}
        {loading && (
          <div className="bg-white rounded-2xl shadow-xl p-12 text-center">
            <Loader2 className="w-12 h-12 animate-spin text-indigo-600 mx-auto mb-4" />
            <h3 className="text-xl font-semibold text-gray-700 mb-2">Analyzing Your Progress</h3>
            <p className="text-gray-500">Fetching your LeetCode data and generating personalized suggestions...</p>
          </div>
        )}

        {/* Results */}
        {results && (
          <div className="space-y-8">
            {/* User Stats Header */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Trophy className="w-8 h-8 text-yellow-500" />
                <h2 className="text-3xl font-bold text-gray-800">
                  Results for <span className="text-indigo-600">{results.username}</span>
                </h2>
              </div>

              {/* Stats Grid */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-4 gap-6 mb-8">
                <StatCard
                  icon={Target}
                  label="Total Solved"
                  value={results.stats.total_solved}
                  color="bg-gradient-to-br from-green-500 to-emerald-600"
                />
                <StatCard
                  icon={TrendingUp}
                  label="Easy Problems"
                  value={results.stats.easy_solved}
                  color="bg-gradient-to-br from-blue-500 to-cyan-600"
                />
                <StatCard
                  icon={Award}
                  label="Medium Problems"
                  value={results.stats.medium_solved}
                  color="bg-gradient-to-br from-yellow-500 to-orange-600"
                />
                <StatCard
                  icon={Trophy}
                  label="Hard Problems"
                  value={results.stats.hard_solved}
                  color="bg-gradient-to-br from-red-500 to-pink-600"
                />
              </div>

              {/* Progress Bars */}
              <div className="bg-gray-50 rounded-xl p-6">
                <h3 className="text-lg font-semibold text-gray-800 mb-4">Problem Distribution</h3>
                <ProgressBar 
                  label="Easy Problems" 
                  current={results.stats.easy_solved} 
                  total={results.stats.easy_solved + 200} 
                  color="bg-blue-500" 
                />
                <ProgressBar 
                  label="Medium Problems" 
                  current={results.stats.medium_solved} 
                  total={results.stats.medium_solved + 300} 
                  color="bg-yellow-500" 
                />
                <ProgressBar 
                  label="Hard Problems" 
                  current={results.stats.hard_solved} 
                  total={results.stats.hard_solved + 100} 
                  color="bg-red-500" 
                />
              </div>
            </div>

            {/* AI Suggestions */}
            <div className="bg-white rounded-2xl shadow-xl p-8">
              <div className="flex items-center space-x-3 mb-6">
                <Brain className="w-8 h-8 text-purple-500" />
                <h3 className="text-2xl font-bold text-gray-800">🎯 Personalized Problem Suggestions</h3>
              </div>
              
              <div className="bg-gradient-to-br from-purple-50 to-indigo-50 rounded-xl p-6 border border-purple-100">
                <div className="prose max-w-none">
                  {formatSuggestions(results.suggestions)}
                </div>
              </div>
            </div>

            {/* Raw Data */}
            <details className="bg-white rounded-2xl shadow-xl p-8">
              <summary className="cursor-pointer text-lg font-semibold text-gray-700 mb-4">
                📊 View Raw Statistics Data
              </summary>
              <pre className="bg-gray-100 rounded-lg p-4 overflow-x-auto text-sm">
                {JSON.stringify(results.raw_data, null, 2)}
              </pre>
            </details>
          </div>
        )}
      </div>
    </div>
  );
};

export default LeetCodeAnalyzer;
