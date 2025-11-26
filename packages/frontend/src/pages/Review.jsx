import React, { useState, useEffect, useRef } from 'react';
import axios from 'axios';
import SummaryCard from '../components/SummaryCard';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function Review() {
  const [reports, setReports] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [expandedReport, setExpandedReport] = useState(null);
  const [filter, setFilter] = useState('all'); // all, analyzed, pending
  const scrollPositionRef = useRef(0);

  useEffect(() => {
    fetchReports();
    const interval = setInterval(fetchReports, 10000);
    return () => clearInterval(interval);
  }, []);

  const fetchReports = async () => {
    try {
      const response = await axios.get(`${API_URL}/api/reports`);
      setReports(response.data);
      setError(null);
    } catch (err) {
      setError('Failed to load bug reports. Please try again.');
      console.error('Error fetching reports:', err);
    } finally {
      setLoading(false);
    }
  };

  const filteredReports = reports.filter(report => {
    if (filter === 'analyzed') return report.summary;
    if (filter === 'pending') return !report.summary;
    return true;
  });

  const analyzedCount = reports.filter(r => r.summary).length;
  const pendingCount = reports.length - analyzedCount;

  const handleToggleReport = (reportId) => {
    // Save current scroll position
    scrollPositionRef.current = window.scrollY;
    
    // Toggle the report
    setExpandedReport(expandedReport === reportId ? null : reportId);
    
    // Restore scroll position after a short delay
    setTimeout(() => {
      window.scrollTo({
        top: scrollPositionRef.current,
        behavior: 'instant'
      });
    }, 0);
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-slate-50 via-white to-violet-50/30">
      {/* Animated background elements */}
      <div className="fixed inset-0 overflow-hidden pointer-events-none -z-10">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-violet-200/30 rounded-full blur-3xl animate-float"></div>
        <div className="absolute top-60 -left-40 w-96 h-96 bg-fuchsia-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '2s' }}></div>
        <div className="absolute bottom-20 right-1/3 w-64 h-64 bg-cyan-200/20 rounded-full blur-3xl animate-float" style={{ animationDelay: '4s' }}></div>
      </div>

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 sm:py-12">
        {/* Premium Header */}
        <div className="mb-10">
          <div className="flex items-start justify-between gap-6 mb-6">
            <div className="flex-1">
              <div className="inline-flex items-center gap-2 px-3 py-1 bg-violet-100 text-violet-700 rounded-full text-xs font-bold mb-4">
                <span className="relative flex h-2 w-2">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-violet-400 opacity-75"></span>
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-violet-600"></span>
                </span>
                Live Dashboard
              </div>
              <h1 className="text-5xl font-black text-slate-900 mb-3 tracking-tight">
                Bug Reports
              </h1>
              <p className="text-lg text-slate-600 max-w-2xl">
                Comprehensive overview of all submitted issues with real-time AI-powered analysis
              </p>
            </div>

            {/* Stats Cards */}
            <div className="hidden lg:flex gap-3">
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-slate-200/60 shadow-lg shadow-slate-200/50 min-w-[140px]">
                <div className="text-sm text-slate-600 font-medium mb-1">Total Reports</div>
                <div className="text-3xl font-black text-slate-900">{reports.length}</div>
              </div>
              <div className="bg-white/80 backdrop-blur-sm rounded-2xl p-5 border border-emerald-200/60 shadow-lg shadow-emerald-100/50 min-w-[140px]">
                <div className="text-sm text-emerald-700 font-medium mb-1">Analyzed</div>
                <div className="text-3xl font-black text-emerald-600">{analyzedCount}</div>
              </div>
            </div>
          </div>

          {/* Filter Tabs */}
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                filter === 'all'
                  ? 'bg-slate-900 text-white shadow-lg shadow-slate-900/30'
                  : 'bg-white/70 text-slate-700 hover:bg-white border border-slate-200'
              }`}
            >
              All Reports
              <span className={`ml-2 px-2 py-0.5 rounded-md text-xs ${
                filter === 'all' ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {reports.length}
              </span>
            </button>
            <button
              onClick={() => setFilter('analyzed')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                filter === 'analyzed'
                  ? 'bg-emerald-600 text-white shadow-lg shadow-emerald-600/30'
                  : 'bg-white/70 text-slate-700 hover:bg-white border border-slate-200'
              }`}
            >
              Analyzed
              <span className={`ml-2 px-2 py-0.5 rounded-md text-xs ${
                filter === 'analyzed' ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {analyzedCount}
              </span>
            </button>
            <button
              onClick={() => setFilter('pending')}
              className={`px-5 py-2.5 rounded-xl font-bold text-sm transition-all duration-200 ${
                filter === 'pending'
                  ? 'bg-amber-500 text-white shadow-lg shadow-amber-500/30'
                  : 'bg-white/70 text-slate-700 hover:bg-white border border-slate-200'
              }`}
            >
              Pending
              <span className={`ml-2 px-2 py-0.5 rounded-md text-xs ${
                filter === 'pending' ? 'bg-white/20' : 'bg-slate-100'
              }`}>
                {pendingCount}
              </span>
            </button>
          </div>
        </div>

        {/* Loading State */}
        {loading && (
          <div className="flex flex-col items-center justify-center py-32">
            <div className="relative mb-8">
              <div className="w-20 h-20 border-4 border-violet-100 rounded-full"></div>
              <div className="w-20 h-20 border-4 border-violet-600 rounded-full border-t-transparent animate-spin absolute top-0"></div>
            </div>
            <p className="text-slate-700 font-bold text-lg mb-2">Loading Reports</p>
            <p className="text-slate-500 text-sm">Fetching latest data...</p>
          </div>
        )}

        {/* Error State */}
        {error && (
          <div className="bg-white/90 backdrop-blur-sm rounded-3xl border border-red-200 p-8 shadow-xl shadow-red-100/50">
            <div className="flex items-start gap-6">
              <div className="flex-shrink-0 w-16 h-16 bg-gradient-to-br from-red-500 to-rose-600 rounded-2xl flex items-center justify-center shadow-lg shadow-red-500/30">
                <svg className="w-8 h-8 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                </svg>
              </div>
              <div className="flex-1">
                <h3 className="font-black text-red-900 text-xl mb-2">Unable to Load Reports</h3>
                <p className="text-red-700 mb-6">{error}</p>
                <button
                  onClick={fetchReports}
                  className="px-6 py-3 bg-gradient-to-r from-red-600 to-rose-600 hover:from-red-700 hover:to-rose-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-red-500/30 hover:shadow-xl hover:shadow-red-500/40"
                >
                  Retry Connection
                </button>
              </div>
            </div>
          </div>
        )}

        {/* Empty State */}
        {!loading && !error && reports.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-20 text-center shadow-xl shadow-slate-200/50">
            <div className="inline-flex items-center justify-center w-24 h-24 bg-gradient-to-br from-violet-100 to-fuchsia-100 rounded-3xl mb-6 shadow-inner">
              <svg className="w-12 h-12 text-violet-600" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-3">No Reports Yet</h3>
            <p className="text-slate-600 text-lg mb-8">Submit your first bug report to start tracking issues</p>
            <a
              href="/submit"
              className="inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-violet-600 to-fuchsia-600 hover:from-violet-700 hover:to-fuchsia-700 text-white font-bold rounded-xl transition-all shadow-lg shadow-violet-500/30 hover:shadow-xl hover:shadow-violet-500/40"
            >
              <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 4v16m8-8H4" />
              </svg>
              Submit Bug Report
            </a>
          </div>
        )}

        {/* Reports List */}
        {!loading && !error && filteredReports.length > 0 && (
          <div className="space-y-4">
            {filteredReports.map((report) => (
              <div
                key={report.id}
                className="group bg-white/90 backdrop-blur-sm rounded-2xl border border-slate-200/60 shadow-lg shadow-slate-200/50 hover:shadow-xl hover:shadow-slate-300/50 transition-all duration-300 overflow-hidden"
              >
                {/* Card Header */}
                <div 
                  className="cursor-pointer"
                  onClick={(e) => {
                    e.preventDefault();
                    handleToggleReport(report.id);
                  }}
                >
                  <div className="px-6 py-5 bg-gradient-to-r from-slate-50/80 to-white">
                    <div className="flex items-start justify-between gap-4">
                      <div className="flex-1 min-w-0">
                        <div className="flex items-center gap-3 mb-3 flex-wrap">
                          <h2 className="text-xl font-bold text-slate-900 group-hover:text-violet-700 transition-colors">
                            {report.title}
                          </h2>
                          {report.summary ? (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-emerald-500 to-teal-500 text-white text-xs font-bold rounded-full shadow-md shadow-emerald-500/30">
                              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 20 20">
                                <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                              </svg>
                              Analyzed
                            </span>
                          ) : (
                            <span className="inline-flex items-center gap-1.5 px-3 py-1 bg-gradient-to-r from-amber-400 to-orange-500 text-white text-xs font-bold rounded-full shadow-md shadow-amber-500/30">
                              <svg className="w-3.5 h-3.5 animate-spin" fill="none" viewBox="0 0 24 24">
                                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                              </svg>
                              Processing
                            </span>
                          )}
                        </div>
                        
                        <div className="flex items-center gap-6 text-sm text-slate-600 flex-wrap">
                          <span className="flex items-center gap-2 font-medium">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                            {new Date(report.createdAt).toLocaleDateString('en-US', {
                              month: 'long',
                              day: 'numeric',
                              year: 'numeric'
                            })}
                          </span>
                          <span className="flex items-center gap-2 font-medium">
                            <svg className="w-4 h-4 text-slate-400" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            {new Date(report.createdAt).toLocaleTimeString('en-US', {
                              hour: 'numeric',
                              minute: '2-digit',
                              hour12: true
                            })}
                          </span>
                          <span className="flex items-center gap-2 font-mono font-bold text-violet-600">
                            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 20l4-16m2 16l4-16M6 9h14M4 15h14" />
                            </svg>
                            #{report.id}
                          </span>
                        </div>
                      </div>
                      
                      <button className="flex-shrink-0 w-10 h-10 flex items-center justify-center hover:bg-slate-100 rounded-xl transition-colors">
                        <svg 
                          className={`w-6 h-6 text-slate-600 transition-transform duration-300 ${expandedReport === report.id ? 'rotate-180' : ''}`}
                          fill="none" 
                          stroke="currentColor" 
                          viewBox="0 0 24 24"
                        >
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                        </svg>
                      </button>
                    </div>
                  </div>
                </div>

                {/* Expandable Content */}
                {expandedReport === report.id && (
                  <div className="animate-slideDown">
                    <div className="px-6 py-6 space-y-6 bg-gradient-to-b from-white to-slate-50/50">
                    
                    {/* Description Section */}
                    <div className="group/section">
                      <div className="flex items-center gap-3 mb-4">
                        <div className="w-10 h-10 bg-gradient-to-br from-violet-500 to-purple-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30">
                          <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 6h16M4 12h16M4 18h7" />
                          </svg>
                        </div>
                        <h3 className="text-lg font-black text-slate-900">Description</h3>
                      </div>
                      <div className="bg-white rounded-xl p-5 border border-slate-200 shadow-sm">
                        <p className="text-slate-700 leading-relaxed">{report.description}</p>
                      </div>
                    </div>

                    {/* Environment Section */}
                    {(report.os || report.browser) && (
                      <div className="group/section">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-blue-500 to-cyan-600 rounded-xl flex items-center justify-center shadow-lg shadow-blue-500/30">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.75 17L9 20l-1 1h8l-1-1-.75-3M3 13h18M5 17h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-black text-slate-900">Environment</h3>
                        </div>
                        <div className="flex flex-wrap gap-3">
                          {report.os && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-blue-50 to-cyan-50 border border-blue-200 rounded-xl shadow-sm">
                              <span className="text-2xl">💻</span>
                              <span className="font-bold text-blue-900">{report.os}</span>
                            </div>
                          )}
                          {report.browser && (
                            <div className="flex items-center gap-2 px-4 py-3 bg-gradient-to-br from-cyan-50 to-teal-50 border border-cyan-200 rounded-xl shadow-sm">
                              <span className="text-2xl">🌐</span>
                              <span className="font-bold text-cyan-900">
                                {report.browser} {report.browserVersion}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Stack Trace Section */}
                    {report.stacktrace && (
                      <div className="group/section">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-red-500 to-rose-600 rounded-xl flex items-center justify-center shadow-lg shadow-red-500/30">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-black text-slate-900">Stack Trace</h3>
                        </div>
                        <div className="bg-slate-900 rounded-xl overflow-hidden border border-slate-700 shadow-lg">
                          <div className="flex items-center gap-2 px-4 py-2 bg-slate-800 border-b border-slate-700">
                            <div className="flex gap-1.5">
                              <div className="w-3 h-3 rounded-full bg-red-500"></div>
                              <div className="w-3 h-3 rounded-full bg-yellow-500"></div>
                              <div className="w-3 h-3 rounded-full bg-green-500"></div>
                            </div>
                            <span className="text-xs font-mono text-slate-400 ml-2">error.log</span>
                          </div>
                          <pre className="p-5 text-emerald-400 text-sm font-mono overflow-x-auto max-h-96 overflow-y-auto">
{report.stacktrace}
                          </pre>
                        </div>
                      </div>
                    )}

                    {/* Screenshots Section */}
                    {report.screenshots && report.screenshots.length > 0 && (
                      <div className="group/section">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-fuchsia-500 to-pink-600 rounded-xl flex items-center justify-center shadow-lg shadow-fuchsia-500/30">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 16l4.586-4.586a2 2 0 012.828 0L16 16m-2-2l1.586-1.586a2 2 0 012.828 0L20 14m-6-6h.01M6 20h12a2 2 0 002-2V6a2 2 0 00-2-2H6a2 2 0 00-2 2v12a2 2 0 002 2z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-black text-slate-900">
                            Screenshots
                            <span className="ml-2 text-sm font-normal text-slate-500">({report.screenshots.length})</span>
                          </h3>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4">
                          {report.screenshots.map((screenshot, index) => (
                            <a
                              key={index}
                              href={`${API_URL}${screenshot}`}
                              target="_blank"
                              rel="noopener noreferrer"
                              className="group/img relative overflow-hidden rounded-xl border-2 border-slate-200 hover:border-violet-400 transition-all aspect-video bg-slate-100 shadow-md hover:shadow-xl"
                            >
                              <img
                                src={`${API_URL}${screenshot}`}
                                alt={`Screenshot ${index + 1}`}
                                className="w-full h-full object-cover group-hover/img:scale-110 transition-transform duration-500"
                              />
                              <div className="absolute inset-0 bg-gradient-to-t from-black/80 via-black/20 to-transparent opacity-0 group-hover/img:opacity-100 transition-all duration-300 flex items-end justify-center p-4">
                                <span className="flex items-center gap-2 text-white font-bold text-sm">
                                  <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0zM10 7v3m0 0v3m0-3h3m-3 0H7" />
                                  </svg>
                                  View Full Size
                                </span>
                              </div>
                            </a>
                          ))}
                        </div>
                      </div>
                    )}

                    {/* AI Analysis Section */}
                    {report.summary ? (
                      <div className="group/section">
                        <div className="flex items-center gap-3 mb-4">
                          <div className="w-10 h-10 bg-gradient-to-br from-violet-600 via-purple-600 to-fuchsia-600 rounded-xl flex items-center justify-center shadow-lg shadow-violet-500/30 animate-pulse">
                            <svg className="w-5 h-5 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
                            </svg>
                          </div>
                          <h3 className="text-lg font-black text-slate-900">AI-Powered Analysis</h3>
                        </div>
                        <div className="bg-gradient-to-br from-violet-50 via-purple-50 to-fuchsia-50 rounded-xl p-6 border-2 border-violet-200 shadow-lg">
                          <SummaryCard 
                            summary={report.summary} 
                            reportId={report.id} 
                            onUpdated={fetchReports} 
                          />
                        </div>
                      </div>
                    ) : (
                      <div className="relative overflow-hidden rounded-xl bg-gradient-to-r from-violet-600 via-purple-600 to-fuchsia-600 p-8 shadow-xl">
                        <div className="absolute inset-0 bg-[url('data:image/svg+xml;base64,PHN2ZyB3aWR0aD0iNjAiIGhlaWdodD0iNjAiIHZpZXdCb3g9IjAgMCA2MCA2MCIgeG1sbnM9Imh0dHA6Ly93d3cudzMub3JnLzIwMDAvc3ZnIj48ZyBmaWxsPSJub25lIiBmaWxsLXJ1bGU9ImV2ZW5vZGQiPjxwYXRoIGQ9Ik0zNiAxOGMzLjMxNCAwIDYgMi42ODYgNiA2cy0yLjY4NiA2LTYgNi02LTIuNjg2LTYtNiAyLjY4Ni02IDYtNiIgc3Ryb2tlPSIjZmZmIiBzdHJva2Utd2lkdGg9IjIiIG9wYWNpdHk9Ii4xIi8+PC9nPjwvc3ZnPg==')] opacity-10"></div>
                        <div className="relative flex items-center gap-6">
                          <div className="flex-shrink-0 w-16 h-16 bg-white/20 backdrop-blur-sm rounded-2xl flex items-center justify-center shadow-lg">
                            <svg className="w-8 h-8 text-white animate-pulse" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M13 10V3L4 14h7v7l9-11h-7z" />
                            </svg>
                          </div>
                          <div className="flex-1">
                            <p className="font-black text-white text-2xl mb-2">AI Analysis in Progress</p>
                            <p className="text-violet-100 text-sm font-medium">Our AI is analyzing this bug report to provide insights and recommendations...</p>
                          </div>
                        </div>
                      </div>
                    )}
                    
                  </div>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}

        {/* Empty Filtered State */}
        {!loading && !error && reports.length > 0 && filteredReports.length === 0 && (
          <div className="bg-white/80 backdrop-blur-sm rounded-3xl border border-slate-200/60 p-16 text-center shadow-xl shadow-slate-200/50">
            <div className="inline-flex items-center justify-center w-20 h-20 bg-gradient-to-br from-slate-100 to-slate-200 rounded-3xl mb-6 shadow-inner">
              <svg className="w-10 h-10 text-slate-500" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 4a1 1 0 011-1h16a1 1 0 011 1v2.586a1 1 0 01-.293.707l-6.414 6.414a1 1 0 00-.293.707V17l-4 4v-6.586a1 1 0 00-.293-.707L3.293 7.293A1 1 0 013 6.586V4z" />
              </svg>
            </div>
            <h3 className="text-2xl font-black text-slate-900 mb-2">No {filter === 'analyzed' ? 'Analyzed' : 'Pending'} Reports</h3>
            <p className="text-slate-600">Try selecting a different filter to view reports</p>
          </div>
        )}
      </div>
    </div>
  );
}

export default Review;
