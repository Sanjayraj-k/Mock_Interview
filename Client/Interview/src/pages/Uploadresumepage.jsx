import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Upload, FileText, Send, AlertCircle, CheckCircle } from 'lucide-react';

export default function ResumeUploadPage() {
  const [resumeText, setResumeText] = useState('');
  const [resumeFile, setResumeFile] = useState(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const file = e.target.files[0];
    setResumeFile(file);
    setError(null);
    setSuccess(null);

    // Optional: Preview file content if it's a text file
    if (file && file.type === 'text/plain') {
      const reader = new FileReader();
      reader.onload = (event) => {
        setResumeText(event.target.result);
      };
      reader.readAsText(file);
    } else if (file && file.type === 'application/pdf') {
      setResumeText(''); // PDF handling should be done server-side
      setSuccess('PDF selected. It will be processed on submission.');
    }
  };

  const handleTextChange = (e) => {
    setResumeText(e.target.value);
    setResumeFile(null); // Clear file if user types directly
    setError(null);
    setSuccess(null);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setError(null);
    setSuccess(null);

    try {
      let formData;
      const headers = {};

      if (resumeFile) {
        // Handle file upload
        formData = new FormData();
        formData.append('resume_file', resumeFile);
        // Note: Backend should handle file processing (e.g., PDF text extraction)
      } else if (resumeText.trim()) {
        // Handle text input
        formData = { resume_text: resumeText.trim() };
        headers['Content-Type'] = 'application/json';
      } else {
        throw new Error('Please provide a resume by either pasting text or uploading a file.');
      }

      const response = await fetch('http://localhost:5000/interview/start', {
        method: 'POST',
        headers: resumeFile ? {} : headers,
        body: resumeFile ? formData : JSON.stringify(formData),
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to start interview session.');
      }

      setSuccess('Interview session started successfully!');
      // Redirect to the interview dashboard with session ID
      setTimeout(() => {
        navigate(`/interview/${data.session_id}`);
      }, 1000);
    } catch (err) {
      setError(err.message);
      console.error('Error starting interview:', err);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-white to-purple-50 flex items-center justify-center p-4">
      <div className="bg-white/80 backdrop-blur-sm rounded-3xl shadow-2xl p-8 max-w-2xl w-full border border-white/20">
        <div className="flex items-center justify-between mb-8">
          <div className="flex items-center gap-3">
            <FileText className="w-8 h-8 text-indigo-600" />
            <h1 className="text-3xl font-bold bg-gradient-to-r from-indigo-900 to-purple-900 bg-clip-text text-transparent">
              Upload Your Resume
            </h1>
          </div>
        </div>

        {error && (
          <div className="mb-6 p-4 bg-red-50 border border-red-200 rounded-xl flex items-center text-red-700">
            <AlertCircle className="mr-3 w-5 h-5" />
            <p className="text-sm">{error}</p>
          </div>
        )}

        {success && (
          <div className="mb-6 p-4 bg-emerald-50 border border-emerald-200 rounded-xl flex items-center text-emerald-700">
            <CheckCircle className="mr-3 w-5 h-5" />
            <p className="text-sm">{success}</p>
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-6">
          {/* Text Input for Resume */}
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              Paste Your Resume Text
            </label>
            <textarea
              value={resumeText}
              onChange={handleTextChange}
              placeholder="Paste your resume content here..."
              className="w-full h-48 p-4 rounded-xl border border-gray-200 bg-gradient-to-br from-gray-50 to-white focus:outline-none focus:ring-2 focus:ring-indigo-500 resize-none"
              disabled={isSubmitting}
            />
            <p className="mt-2 text-xs text-gray-500">
              Enter your resume details directly or upload a file below.
            </p>
          </div>

          {/* File Upload */}
          <div>
            <label className="blockかす0block text-sm font-medium text-gray-700 mb-2">
              Or Upload Resume File
            </label>
            <div className="flex items-center gap-3">
              <input
                type="file"
                accept=".txt,.pdf"
                onChange={handleFileChange}
                className="block w-full text-sm text-gray-500 file:mr-4 file:py-2 file:px-4 file:rounded-xl file:border-0 file:bg-indigo-100 file:text-indigo-700 file:hover:bg-indigo-200 file:cursor-pointer file:transition-colors"
                disabled={isSubmitting}
              />
              {resumeFile && (
                <span className="text-sm text-gray-600">{resumeFile.name}</span>
              )}
            </div>
            <p className="mt-2 text-xs text-gray-500">
              Accepted formats: .txt, .pdf
            </p>
          </div>

          {/* Submit Button */}
          <button
            type="submit"
            disabled={isSubmitting || (!resumeText.trim() && !resumeFile)}
            className="w-full flex items-center justify-center gap-2 px-6 py-3 rounded-xl font-medium transition-all duration-200 bg-gradient-to-r from-indigo-500 to-purple-500 hover:from-indigo-600 hover:to-purple-600 text-white shadow-lg disabled:opacity-50 disabled:cursor-not-allowed hover:scale-105 disabled:hover:scale-100"
          >
            <Send className="w-5 h-5" />
            {isSubmitting ? 'Starting Interview...' : 'Start Interview'}
          </button>
        </form>
      </div>
    </div>
  );
}