import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { UploadCloud, FileCheck, AlertTriangle, Loader } from 'lucide-react';

const ResumeUpload = () => {
  const [file, setFile] = useState(null);
  const [error, setError] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const navigate = useNavigate();

  const handleFileChange = (e) => {
    const selectedFile = e.target.files[0];
    if (selectedFile) {
      if (selectedFile.type === 'application/pdf' && selectedFile.size <= 5 * 1024 * 1024) {
        setFile(selectedFile);
        setError('');
      } else {
        setFile(null);
        setError('Please upload a PDF file smaller than 5MB.');
      }
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!file) {
      setError('Please select a valid PDF file.');
      return;
    }

    setIsLoading(true);
    setError('');

    const formData = new FormData();
    formData.append('file', file);

    try {
      const response = await fetch('http://localhost:5000/api/upload-resume', {
        method: 'POST',
        body: formData,
      });

      const data = await response.json();

      if (!response.ok) {
        throw new Error(data.error || 'Failed to upload resume.');
      }

      // On success, navigate to interview page with the resume summary
      navigate('/interview', { state: { resumeSummary: data.resume_summary } });

    } catch (err) {
      setError(err.message);
      setIsLoading(false);
    }
  };
  
  const handleSkip = () => {
    navigate('/interview', { state: { resumeSummary: '' } });
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-indigo-100 flex items-center justify-center p-4">
      <div className="max-w-md w-full mx-auto p-8 bg-white rounded-xl shadow-2xl space-y-6">
        <div className="text-center">
          <h2 className="text-3xl font-bold text-gray-800">Start Your Interview</h2>
          <p className="mt-2 text-gray-600">Upload your resume for a tailored experience, or skip to start with general questions.</p>
        </div>
        
        <form onSubmit={handleSubmit} className="space-y-6">
            <label htmlFor="resume" className="flex flex-col items-center justify-center w-full h-32 border-2 border-dashed border-blue-300 hover:border-blue-400 rounded-lg cursor-pointer bg-blue-50 hover:bg-blue-100 transition duration-300 ease-in-out">
                <div className="flex flex-col items-center justify-center pt-7">
                    {file ? <FileCheck className="h-8 w-8 text-green-500" /> : <UploadCloud className="h-8 w-8 text-blue-500" />}
                    <p className="pt-1 text-sm tracking-wider text-gray-600">
                        {file ? file.name : 'Click to upload PDF resume'}
                    </p>
                </div>
                <input id="resume" type="file" accept="application/pdf" onChange={handleFileChange} className="opacity-0" />
            </label>
            <p className="text-xs text-gray-500 text-center">PDF files only, max 5MB</p>

          {error && (
            <div className="p-3 bg-red-50 text-red-700 rounded-lg flex items-center gap-2">
              <AlertTriangle className="h-5 w-5" /> {error}
            </div>
          )}

          <button type="submit" disabled={!file || isLoading} className="w-full py-3 px-4 rounded-lg font-semibold text-white focus:outline-none focus:ring-2 focus:ring-offset-2 transition duration-300 ease-in-out flex items-center justify-center gap-2 bg-blue-600 hover:bg-blue-700 focus:ring-blue-500 disabled:bg-gray-400 disabled:cursor-not-allowed transform hover:scale-105">
            {isLoading && <Loader className="animate-spin w-5 h-5" />}
            {isLoading ? 'Processing Resume...' : 'Start with Resume'}
          </button>
        </form>

        <div className="relative flex py-2 items-center">
            <div className="flex-grow border-t border-gray-300"></div>
            <span className="flex-shrink mx-4 text-gray-400 text-sm">OR</span>
            <div className="flex-grow border-t border-gray-300"></div>
        </div>
        
        <button onClick={handleSkip} disabled={isLoading} className="w-full py-3 px-4 rounded-lg font-semibold text-gray-700 bg-gray-200 hover:bg-gray-300 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-400 transition">
            Skip and Start General Interview
        </button>
      </div>
    </div>
  );
};

export default ResumeUpload;