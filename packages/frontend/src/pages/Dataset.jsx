import React, { useState, useEffect } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function Dataset() {
  const [stats, setStats] = useState(null);
  const [exports, setExports] = useState([]);
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [message, setMessage] = useState(null);
  const [filter, setFilter] = useState('all'); // all, analyzed, pending, resolved
  
  const [exportConfig, setExportConfig] = useState({
    format: 'json',
    includeImages: false,
    anonymize: true,
    minQuality: 'analyzed'
  });

  useEffect(() => {
    fetchStats();
    fetchExports();
    fetchReports();
  }, []);

  const fetchStats = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dataset/stats`);
      setStats(response.data);
    } catch (error) {
      console.error('Error fetching stats:', error);
    }
  };

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reports`);
      setReports(response.data);
    } catch (error) {
      console.error('Error fetching reports:', error);
    }
  };

  const fetchExports = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/dataset/exports`);
      setExports(response.data.exports);
    } catch (error) {
      console.error('Error fetching exports:', error);
    }
  };

  const handleExport = async () => {
    setExporting(true);
    setMessage(null);
    
    try {
      const response = await axios.post(
        `${API_URL}/api/dataset/export`,
        exportConfig,
        { responseType: 'blob' }
      );
      
      // Create download link
      const url = window.URL.createObjectURL(new Blob([response.data]));
      const link = document.createElement('a');
      link.href = url;
      link.setAttribute('download', `bug_dataset_${Date.now()}.${exportConfig.format}`);
      document.body.appendChild(link);
      link.click();
      link.remove();
      
      setMessage({ type: 'success', text: 'Dataset exported successfully!' });
      fetchExports(); // Refresh exports list
    } catch (error) {
      setMessage({ type: 'error', text: 'Failed to export dataset' });
      console.error('Export error:', error);
    } finally {
      setExporting(false);
      setTimeout(() => setMessage(null), 5000);
    }
  };

  const formatBytes = (bytes) => {
    if (bytes === 0) return '0 Bytes';
    const k = 1024;
    const sizes = ['Bytes', 'KB', 'MB', 'GB'];
    const i = Math.floor(Math.log(bytes) / Math.log(k));
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i];
  };

  const analyzedCount = reports.filter(r => r.summary !== null && r.status !== 'resolved').length;
  const pendingCount = reports.filter(r => r.summary === null).length;
  const resolvedCount = reports.filter(r => r.status === 'resolved').length;

  return (
    <div className="min-h-screen bg-gradient-to-br from-indigo-50 via-purple-50 to-pink-50 py-12 px-4 relative overflow-hidden">
      {/* Background decoration */}
      <div className="absolute inset-0 overflow-hidden pointer-events-none">
        <div className="absolute top-32 right-10 w-80 h-80 bg-gradient-to-r from-blue-300 to-cyan-300 rounded-full blur-3xl opacity-20 animate-float"></div>
        <div className="absolute bottom-20 left-10 w-72 h-72 bg-gradient-to-r from-indigo-300 to-purple-300 rounded-full blur-3xl opacity-20 animate-float" style={{ animationDelay: '1.5s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto relative z-10">
        {/* Header */}
        <div className="text-center mb-12">
          <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-2xl mb-6 shadow-2xl hover:scale-110 transition-transform duration-300">
            <svg className="w-10 h-10 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 7v10c0 2.21 3.582 4 8 4s8-1.79 8-4V7M4 7c0 2.21 3.582 4 8 4s8-1.79 8-4M4 7c0-2.21 3.582-4 8-4s8 1.79 8 4m0 5c0 2.21-3.582 4-8 4s-8-1.79-8-4" />
            </svg>
          </div>
          <h1 className="text-5xl font-black text-gray-900 mb-3 pb-2">
            Benchmark Dataset
          </h1>
          <p className="text-gray-600 text-lg font-medium">
            Export and share multimodal bug reports for research
          </p>
        </div>

        {/* Alert Messages */}
        {message && (
          <div className={`mb-8 p-5 rounded-xl shadow-lg border-2 ${
            message.type === 'success' 
              ? 'bg-green-50 border-green-200 text-green-800' 
              : 'bg-red-50 border-red-200 text-red-800'
          }`}>
            <p className="font-medium">{message.text}</p>
          </div>
        )}

        {/* Stats Cards */}
        <div className="grid md:grid-cols-4 gap-6 mb-8">
          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Total Reports</p>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-indigo-600 to-purple-600 mt-2">
                  {reports.length}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-indigo-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21a4 4 0 01-4-4V5a2 2 0 012-2h4a2 2 0 012 2v12a4 4 0 01-4 4zm0 0h12a2 2 0 002-2v-4a2 2 0 00-2-2h-2.343M11 7.343l1.657-1.657a2 2 0 012.828 0l2.829 2.829a2 2 0 010 2.828l-8.486 8.485M7 17h.01" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Analyzed</p>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-blue-600 to-cyan-600 mt-2">
                  {analyzedCount}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Resolved</p>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-green-600 to-emerald-600 mt-2">
                  {resolvedCount}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-green-500 to-emerald-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M5 13l4 4L19 7" />
                </svg>
              </div>
            </div>
          </div>

          <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-6 shadow-lg border border-white/20 hover:shadow-xl transition-all duration-200 hover:scale-105">
            <div className="flex items-center justify-between">
              <div>
                <p className="text-sm font-semibold text-gray-600 uppercase tracking-wide">Pending</p>
                <p className="text-4xl font-bold text-transparent bg-clip-text bg-gradient-to-r from-yellow-600 to-orange-600 mt-2">
                  {pendingCount}
                </p>
              </div>
              <div className="w-16 h-16 bg-gradient-to-br from-yellow-500 to-orange-600 rounded-xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
            </div>
          </div>
        </div>

        {/* Filter Tabs */}
        <div className="bg-white/80 backdrop-blur-xl rounded-2xl p-2 shadow-lg border border-white/20 mb-8 inline-flex">
          <button
            onClick={() => setFilter('all')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              filter === 'all'
                ? 'bg-gradient-to-r from-indigo-600 to-purple-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            All ({reports.length})
          </button>
          <button
            onClick={() => setFilter('analyzed')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              filter === 'analyzed'
                ? 'bg-gradient-to-r from-blue-600 to-cyan-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Analyzed ({analyzedCount})
          </button>
          <button
            onClick={() => setFilter('resolved')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              filter === 'resolved'
                ? 'bg-gradient-to-r from-green-600 to-emerald-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Resolved ({resolvedCount})
          </button>
          <button
            onClick={() => setFilter('pending')}
            className={`px-6 py-2.5 rounded-xl font-semibold transition-all duration-200 ${
              filter === 'pending'
                ? 'bg-gradient-to-r from-yellow-600 to-orange-600 text-white shadow-md'
                : 'text-gray-600 hover:bg-gray-100'
            }`}
          >
            Pending ({pendingCount})
          </button>
        </div>

        {/* Export Configuration */}
        <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/20 mb-8">
          <h2 className="text-2xl font-bold text-gray-800 mb-6 flex items-center">
            <svg className="w-6 h-6 mr-2 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 10v6m0 0l-3-3m3 3l3-3m2 8H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
            </svg>
            Export Dataset
          </h2>

          <div className="grid md:grid-cols-2 gap-6 mb-6">
            {/* Format Selection */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Export Format</label>
              <select
                value={exportConfig.format}
                onChange={(e) => setExportConfig({...exportConfig, format: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
              >
                <option value="json">JSON (Full metadata)</option>
                <option value="jsonl">JSONL (Line-delimited)</option>
                <option value="csv">CSV (Tabular)</option>
                <option value="pdf">PDF (Formatted document)</option>
              </select>
            </div>

            {/* Quality Filter */}
            <div>
              <label className="block text-sm font-semibold text-gray-700 mb-2">Minimum Quality</label>
              <select
                value={exportConfig.minQuality}
                onChange={(e) => setExportConfig({...exportConfig, minQuality: e.target.value})}
                className="w-full px-4 py-3 bg-gray-50 border-2 border-gray-200 rounded-xl focus:outline-none focus:border-blue-500"
              >
                <option value="all">All Reports</option>
                <option value="analyzed">Analyzed Only</option>
                <option value="resolved">Resolved Only</option>
              </select>
            </div>
          </div>

          {/* Checkboxes */}
          <div className="space-y-3 mb-6">
            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={exportConfig.anonymize}
                onChange={(e) => setExportConfig({...exportConfig, anonymize: e.target.checked})}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 font-medium">
                Anonymize sensitive data (emails, IPs, file paths)
              </span>
            </label>

            <label className="flex items-center space-x-3 cursor-pointer">
              <input
                type="checkbox"
                checked={exportConfig.includeImages}
                onChange={(e) => setExportConfig({...exportConfig, includeImages: e.target.checked})}
                className="w-5 h-5 text-blue-600 border-gray-300 rounded focus:ring-blue-500"
              />
              <span className="text-gray-700 font-medium">
                Include screenshot paths (multimodal dataset)
              </span>
            </label>
          </div>

          {/* Export Button */}
          <button
            onClick={handleExport}
            disabled={exporting || !stats}
            className={`w-full py-4 rounded-xl font-semibold text-white shadow-lg transition-all duration-200 ${
              exporting || !stats
                ? 'bg-gray-400 cursor-not-allowed'
                : 'bg-gradient-to-r from-blue-600 to-cyan-600 hover:from-blue-700 hover:to-cyan-700 hover:shadow-xl hover:scale-105'
            }`}
          >
            {exporting ? (
              <span className="flex items-center justify-center space-x-2">
                <svg className="animate-spin h-5 w-5" fill="none" viewBox="0 0 24 24">
                  <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                  <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                </svg>
                <span>Exporting...</span>
              </span>
            ) : (
              <span className="flex items-center justify-center space-x-2">
                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                </svg>
                <span>Export Dataset</span>
              </span>
            )}
          </button>
        </div>

        {/* Category Distribution */}
        {stats && stats.by_category && Object.keys(stats.by_category).length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/20 mb-8">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Category Distribution</h2>
            <div className="grid md:grid-cols-3 gap-4">
              {Object.entries(stats.by_category).map(([category, count]) => (
                <div key={category} className="bg-gradient-to-r from-blue-50 to-cyan-50 p-4 rounded-xl border border-blue-200">
                  <p className="text-sm text-gray-600 font-medium">{category}</p>
                  <p className="text-2xl font-bold text-blue-700">{count}</p>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* Previous Exports */}
        {exports.length > 0 && (
          <div className="bg-white/80 backdrop-blur-xl shadow-2xl rounded-3xl p-8 border border-white/20">
            <h2 className="text-2xl font-bold text-gray-800 mb-6">Previous Exports</h2>
            <div className="space-y-3">
              {exports.map((exp, index) => (
                <div key={index} className="flex items-center justify-between p-4 bg-gray-50 rounded-xl hover:bg-gray-100 transition-colors">
                  <div className="flex items-center space-x-3">
                    <svg className="w-8 h-8 text-blue-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 21h10a2 2 0 002-2V9.414a1 1 0 00-.293-.707l-5.414-5.414A1 1 0 0012.586 3H7a2 2 0 00-2 2v14a2 2 0 002 2z" />
                    </svg>
                    <div>
                      <p className="font-semibold text-gray-800">{exp.filename}</p>
                      <p className="text-sm text-gray-600">
                        {formatBytes(exp.size)} • {new Date(exp.created).toLocaleString()}
                      </p>
                    </div>
                  </div>
                  <a
                    href={`${API_URL}${exp.download_url}`}
                    className="px-4 py-2 bg-blue-600 text-white font-medium rounded-lg hover:bg-blue-700 transition-colors"
                  >
                    Download
                  </a>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

export default Dataset;
