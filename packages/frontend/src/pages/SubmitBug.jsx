import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function SubmitBug() {
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    os: '',
    browser: '',
    browserVersion: '',
    stacktrace: ''
  });
  const [screenshots, setScreenshots] = useState([]);
  const [previewUrls, setPreviewUrls] = useState([]);
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState({ type: '', text: '' });

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    setFormData(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleFileChange = (e) => {
    const files = Array.from(e.target.files);
    setScreenshots(files);
    const urls = files.map(file => URL.createObjectURL(file));
    setPreviewUrls(urls);
  };

  const removeScreenshot = (index) => {
    const newScreenshots = screenshots.filter((_, i) => i !== index);
    const newPreviewUrls = previewUrls.filter((_, i) => i !== index);
    URL.revokeObjectURL(previewUrls[index]);
    setScreenshots(newScreenshots);
    setPreviewUrls(newPreviewUrls);
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setMessage({ type: '', text: '' });

    if (!formData.title.trim() || !formData.description.trim()) {
      setMessage({ type: 'error', text: 'Title and description are required' });
      return;
    }

    if (!formData.stacktrace.trim() && screenshots.length === 0) {
      setMessage({ type: 'error', text: 'Please provide either a stacktrace or at least one screenshot' });
      return;
    }

    setLoading(true);

    try {
      const data = new FormData();
      data.append('title', formData.title);
      data.append('description', formData.description);
      data.append('os', formData.os);
      data.append('browser', formData.browser);
      data.append('browserVersion', formData.browserVersion);
      data.append('stacktrace', formData.stacktrace);

      screenshots.forEach((file) => {
        data.append('screenshots', file);
      });

      await axios.post(`${API_URL}/api/reports`, data, {
        headers: { 'Content-Type': 'multipart/form-data' }
      });

      setMessage({ type: 'success', text: '✓ Bug report submitted successfully! AI is analyzing it now.' });
      
      // Reset form
      setFormData({
        title: '',
        description: '',
        os: '',
        browser: '',
        browserVersion: '',
        stacktrace: ''
      });
      setScreenshots([]);
      previewUrls.forEach(url => URL.revokeObjectURL(url));
      setPreviewUrls([]);

      // Auto-clear message after 5 seconds
      setTimeout(() => setMessage({ type: '', text: '' }), 5000);

    } catch (error) {
      setMessage({ 
        type: 'error', 
        text: error.response?.data?.message || 'Failed to submit bug report. Please try again.' 
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-20 right-20 w-64 h-64 bg-gradient-to-r from-purple-300 to-pink-300 rounded-full blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-20 left-20 w-80 h-80 bg-gradient-to-r from-indigo-300 to-purple-300 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '3s' }}></div>
      </div>

      <div className="max-w-4xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-2xl mb-6 shadow-2xl hover:scale-110 transition-transform duration-300">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-gray-900 mb-3 pb-2">
            Submit Bug Report
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            Provide details and let AI analyze and suggest solutions
          </p>
        </div>

        {/* Alert Messages */}
        {message.text && (
          <div className={`mb-8 p-5 rounded-xl shadow-lg border-2 backdrop-blur-sm transition-all duration-300 ${
            message.type === 'success' 
              ? 'bg-green-50/90 border-green-200 text-green-800' 
              : 'bg-red-50/90 border-red-200 text-red-800'
          }`}>
            <div className="flex items-center space-x-3">
              <div className={`flex-shrink-0 w-8 h-8 rounded-full flex items-center justify-center ${
                message.type === 'success' ? 'bg-green-200' : 'bg-red-200'
              }`}>
                {message.type === 'success' ? (
                  <svg className="w-5 h-5 text-green-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5 text-red-700" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                  </svg>
                )}
              </div>
              <p className="font-medium">{message.text}</p>
            </div>
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleSubmit} className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/20">
          <div className="space-y-6">
            {/* Title */}
            <div className="group">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 8h10M7 12h4m1 8l-4-4H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-3l-4 4z" />
                </svg>
                Bug Title <span className="text-red-500 ml-1">*</span>
              </label>
              <input
                type="text"
                name="title"
                value={formData.title}
                onChange={handleInputChange}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 group-hover:border-gray-300"
                placeholder="e.g., App crashes when clicking Save button"
              />
            </div>

            {/* Description */}
            <div className="group">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <svg className="w-5 h-5 mr-2 text-purple-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                </svg>
                Description <span className="text-red-500 ml-1">*</span>
              </label>
              <textarea
                name="description"
                value={formData.description}
                onChange={handleInputChange}
                rows="5"
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-purple-500 focus:bg-white transition-all duration-200 resize-none group-hover:border-gray-300"
                placeholder="Describe the bug in detail. Include steps to reproduce, expected vs actual behavior..."
              />
            </div>

            {/* Environment Info */}
            <div className="grid md:grid-cols-3 gap-4">
              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Operating System
                </label>
                <select
                  name="os"
                  value={formData.os}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 hover:border-gray-300"
                >
                  <option value="">Select OS</option>
                  <option value="Windows">🪟 Windows</option>
                  <option value="macOS">🍎 macOS</option>
                  <option value="Linux">🐧 Linux</option>
                  <option value="iOS">📱 iOS</option>
                  <option value="Android">🤖 Android</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Browser
                </label>
                <select
                  name="browser"
                  value={formData.browser}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 hover:border-gray-300"
                >
                  <option value="">Select Browser</option>
                  <option value="Chrome">Chrome</option>
                  <option value="Firefox">Firefox</option>
                  <option value="Safari">Safari</option>
                  <option value="Edge">Edge</option>
                  <option value="Other">Other</option>
                </select>
              </div>

              <div>
                <label className="block text-sm font-semibold text-gray-700 mb-2">
                  Version
                </label>
                <input
                  type="text"
                  name="browserVersion"
                  value={formData.browserVersion}
                  onChange={handleInputChange}
                  className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-indigo-500 focus:bg-white transition-all duration-200 hover:border-gray-300"
                  placeholder="e.g., 120.0"
                />
              </div>
            </div>

            {/* Stack Trace */}
            <div className="group">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <svg className="w-5 h-5 mr-2 text-pink-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
                </svg>
                Stack Trace / Error Log
              </label>
              <textarea
                name="stacktrace"
                value={formData.stacktrace}
                onChange={handleInputChange}
                rows="6"
                className="w-full px-4 py-3 bg-gray-900 text-green-400 font-mono text-sm border-2 border-gray-700 rounded-xl focus:outline-none focus:border-pink-500 transition-all duration-200 resize-none"
                placeholder="Paste your error stack trace or console logs here..."
              />
            </div>

            {/* Screenshots */}
            <div className="group">
              <label className="flex items-center text-sm font-semibold text-gray-700 mb-2">
                <svg className="w-5 h-5 mr-2 text-indigo-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                Screenshots
              </label>
              <div className="relative">
                <input
                  type="file"
                  accept="image/*"
                  multiple
                  onChange={handleFileChange}
                  className="hidden"
                  id="screenshot-upload"
                />
                <label
                  htmlFor="screenshot-upload"
                  className="flex flex-col items-center justify-center w-full h-32 px-4 py-6 bg-gradient-to-br from-indigo-50 to-purple-50 border-2 border-dashed border-indigo-300 rounded-xl cursor-pointer hover:border-indigo-500 hover:bg-gradient-to-br hover:from-indigo-100 hover:to-purple-100 transition-all duration-200"
                >
                  <svg className="w-10 h-10 text-indigo-400 mb-2" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 16a4 4 0 01-.88-7.903A5 5 0 1115.9 6L16 6a5 5 0 011 9.9M15 13l-3-3m0 0l-3 3m3-3v12" />
                  </svg>
                  <p className="text-sm text-indigo-600 font-medium">Click to upload or drag and drop</p>
                  <p className="text-xs text-gray-500 mt-1">PNG, JPG, GIF up to 10MB</p>
                </label>
              </div>

              {/* Screenshot Previews */}
              {previewUrls.length > 0 && (
                <div className="grid grid-cols-2 md:grid-cols-4 gap-4 mt-4">
                  {previewUrls.map((url, index) => (
                    <div key={index} className="relative group">
                      <img
                        src={url}
                        alt={`Screenshot ${index + 1}`}
                        className="w-full h-32 object-cover rounded-xl border-2 border-gray-200 shadow-md"
                      />
                      <button
                        type="button"
                        onClick={() => removeScreenshot(index)}
                        className="absolute -top-2 -right-2 bg-red-500 text-white rounded-full p-1.5 opacity-0 group-hover:opacity-100 transition-opacity shadow-lg hover:bg-red-600"
                      >
                        <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M6 18L18 6M6 6l12 12" />
                        </svg>
                      </button>
                      <p className="text-xs text-gray-600 mt-1 truncate">{screenshots[index]?.name}</p>
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* Required Note */}
            <div className="flex items-start space-x-2 text-sm text-gray-600 bg-blue-50 p-4 rounded-xl border border-blue-200">
              <svg className="w-5 h-5 text-blue-500 flex-shrink-0 mt-0.5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p>
                <span className="font-semibold">Note:</span> Fields marked with <span className="text-red-500">*</span> are required. 
                Please provide either a stack trace or screenshots to help AI analyze the bug.
              </p>
            </div>
          </div>

          {/* Submit Button */}
          <div className="mt-8 flex justify-end space-x-4">
            <button
              type="button"
              onClick={() => {
                setFormData({
                  title: '',
                  description: '',
                  os: '',
                  browser: '',
                  browserVersion: '',
                  stacktrace: ''
                });
                setScreenshots([]);
                setPreviewUrls([]);
                setMessage({ type: '', text: '' });
              }}
              className="px-6 py-3 text-gray-700 bg-gray-100 font-semibold rounded-xl hover:bg-gray-200 transition-all duration-200"
            >
              Clear Form
            </button>
            <button
              type="submit"
              disabled={loading}
              className={`group relative px-8 py-3 font-semibold rounded-xl shadow-lg transition-all duration-200 ${
                loading 
                  ? 'bg-gray-400 cursor-not-allowed' 
                  : 'bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-700 hover:to-purple-700 text-white hover:shadow-xl hover:scale-105'
              }`}
            >
              {loading ? (
                <span className="flex items-center space-x-2">
                  <svg className="animate-spin h-5 w-5 text-white" fill="none" viewBox="0 0 24 24">
                    <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                    <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                  </svg>
                  <span>Submitting...</span>
                </span>
              ) : (
                <span className="flex items-center space-x-2">
                  <span>Submit Bug Report</span>
                  <svg className="w-5 h-5 group-hover:translate-x-1 transition-transform" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M14 5l7 7m0 0l-7 7m7-7H3" />
                  </svg>
                </span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

export default SubmitBug;
