import React, { useState } from 'react';
import axios from 'axios';

const API_URL = import.meta.env.VITE_API_URL || 'http://localhost:4000';

function SummaryCard({ summary, reportId, onUpdated }) {
  const [expandedSections, setExpandedSections] = useState({
    environment: true,
    actual: true,
    expected: true,
    category: true,
    rootCause: true,
    solution: true
  });
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState(null);

  const toggleSection = (section) => {
    setExpandedSections(prev => ({
      ...prev,
      [section]: !prev[section]
    }));
  };

  const sections = [
    {
      id: 'environment',
      title: 'Environment',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
        </svg>
      ),
      content: summary.environment,
      gradient: 'from-indigo-600 to-indigo-700',
      bgGradient: 'from-indigo-50 to-indigo-100',
      borderColor: 'border-indigo-200',
      textColor: 'text-indigo-900'
    },
    {
      id: 'actual',
      title: 'Actual Behavior',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
        </svg>
      ),
      content: summary.actualBehavior,
      gradient: 'from-red-600 to-red-700',
      bgGradient: 'from-red-50 to-red-100',
      borderColor: 'border-red-200',
      textColor: 'text-red-900'
    },
    {
      id: 'expected',
      title: 'Expected Behavior',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
        </svg>
      ),
      content: summary.expectedBehavior,
      gradient: 'from-green-600 to-green-700',
      bgGradient: 'from-green-50 to-green-100',
      borderColor: 'border-green-200',
      textColor: 'text-green-900'
    },
    {
      id: 'category',
      title: 'Bug Category',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M7 7h.01M7 3h5c.512 0 1.024.195 1.414.586l7 7a2 2 0 010 2.828l-7 7a2 2 0 01-2.828 0l-7-7A1.994 1.994 0 013 12V7a4 4 0 014-4z" />
        </svg>
      ),
      content: summary.bugCategory,
      gradient: 'from-purple-600 to-purple-700',
      bgGradient: 'from-purple-50 to-purple-100',
      borderColor: 'border-purple-200',
      textColor: 'text-purple-900'
    },
    {
      id: 'solution',
      title: '💡 How to Fix It',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
        </svg>
      ),
      content: summary.suggestedSolution,
      gradient: 'from-emerald-600 to-green-600',
      bgGradient: 'from-emerald-50 to-green-50',
      borderColor: 'border-emerald-200',
      textColor: 'text-emerald-900',
      isHighlight: true,
      simple: true
    },
    {
      id: 'rootCause',
      title: '🔍 Why This Happened',
      icon: (
        <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2m-6 9l2 2 4-4" />
        </svg>
      ),
      content: summary.rootCause || 'Root cause analysis not available for this report',
      gradient: 'from-orange-600 to-red-600',
      bgGradient: 'from-orange-50 to-red-50',
      borderColor: 'border-orange-200',
      textColor: 'text-orange-900',
      isHighlight: false,
      simple: true
    }
  ];

  return (
    <div className="space-y-5">
      {/* Inline toast/message */}
      {message && (
        <div className="px-5 py-3.5 rounded-xl bg-white border-2 border-indigo-200 shadow-lg">
          <p className="text-sm text-indigo-900 font-bold">{message}</p>
        </div>
      )}
      {/* Header */}
      <div className="flex items-center space-x-4 mb-6">
        <div className="w-14 h-14 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl flex items-center justify-center shadow-xl relative">
          <div className="absolute inset-0 bg-gradient-to-br from-indigo-600 via-purple-600 to-pink-600 rounded-2xl blur opacity-50"></div>
          <svg className="w-8 h-8 text-white relative z-10" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9.663 17h4.673M12 3v1m6.364 1.636l-.707.707M21 12h-1M4 12H3m3.343-5.657l-.707-.707m2.828 9.9a5 5 0 117.072 0l-.548.547A3.374 3.374 0 0014 18.469V19a2 2 0 11-4 0v-.531c0-.895-.356-1.754-.988-2.386l-.548-.547z" />
          </svg>
        </div>
        <div>
          <h3 className="text-2xl font-black text-gray-900">
            AI Analysis Summary
          </h3>
          <p className="text-sm text-gray-600 font-medium">Powered by advanced multimodal AI</p>
        </div>
      </div>

      {/* Summary Sections */}
      <div className="space-y-4">
        {sections.map((section) => (
          <div
            key={section.id}
            className={`relative bg-white border-2 ${section.borderColor} rounded-2xl overflow-hidden shadow-md hover:shadow-xl transition-all duration-300 ${
              section.isHighlight ? 'ring-2 ring-indigo-300 ring-offset-2 shadow-indigo-200' : ''
            }`}
          >
            {/* Decorative gradient line */}
            <div className={`absolute top-0 left-0 right-0 h-1 bg-gradient-to-r ${section.gradient}`}></div>
            
            {/* Section Header */}
            <button
              onClick={() => toggleSection(section.id)}
              className="w-full px-6 py-5 flex items-center justify-between hover:bg-gray-50 transition-colors"
            >
              <div className="flex items-center space-x-4">
                <div className={`w-12 h-12 bg-gradient-to-br ${section.gradient} rounded-xl flex items-center justify-center shadow-lg relative`}>
                  <div className={`absolute inset-0 bg-gradient-to-br ${section.gradient} rounded-xl blur opacity-40`}></div>
                  <div className="text-white relative z-10">
                    {section.icon}
                  </div>
                </div>
                <div className="text-left">
                  <h4 className={`font-black text-lg ${section.textColor}`}>
                    {section.title}
                  </h4>
                  {section.isHighlight && (
                    <span className="text-xs text-indigo-600 font-bold flex items-center space-x-1">
                      <svg className="w-3 h-3" fill="currentColor" viewBox="0 0 20 20">
                        <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.07 3.292a1 1 0 00.95.69h3.462c.969 0 1.371 1.24.588 1.81l-2.8 2.034a1 1 0 00-.364 1.118l1.07 3.292c.3.921-.755 1.688-1.54 1.118l-2.8-2.034a1 1 0 00-1.175 0l-2.8 2.034c-.784.57-1.838-.197-1.539-1.118l1.07-3.292a1 1 0 00-.364-1.118L2.98 8.72c-.783-.57-.38-1.81.588-1.81h3.461a1 1 0 00.951-.69l1.07-3.292z" />
                      </svg>
                      <span>AI Recommended</span>
                    </span>
                  )}
                </div>
              </div>
              <div className="flex items-center space-x-3">
                {section.isHighlight && (
                  <span className="px-3 py-1.5 bg-gradient-to-r from-indigo-500 to-purple-600 text-white text-xs font-bold rounded-lg shadow-md">
                    PRIORITY
                  </span>
                )}
                <svg
                  className={`w-6 h-6 ${section.textColor} transition-transform duration-300 ${
                    expandedSections[section.id] ? 'rotate-180' : ''
                  }`}
                  fill="none"
                  stroke="currentColor"
                  viewBox="0 0 24 24"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2.5" d="M19 9l-7 7-7-7" />
                </svg>
              </div>
            </button>

            {/* Section Content */}
            {expandedSections[section.id] && (
              <div className="px-6 pb-5 pt-2">
                <div className={`bg-gradient-to-br ${section.bgGradient} rounded-xl p-5 ${section.textColor} border-2 ${section.borderColor} shadow-inner`}>
                  {section.simple ? (
                    <div className="space-y-3">
                      {section.content.split(/\. (?=[A-Z])/).filter(s => s.trim()).map((sentence, idx) => (
                        <div key={idx} className="flex items-start space-x-3">
                          <span className="flex-shrink-0 w-6 h-6 bg-white rounded-full flex items-center justify-center text-xs font-bold shadow-sm">{idx + 1}</span>
                          <p className="leading-relaxed font-medium text-base pt-0.5">{sentence.trim()}{sentence.endsWith('.') ? '' : '.'}</p>
                        </div>
                      ))}
                    </div>
                  ) : (
                    <p className="leading-relaxed whitespace-pre-wrap font-medium text-base">{section.content}</p>
                  )}
                </div>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Action Buttons */}
      <div className="flex flex-wrap gap-3 pt-6 border-t-2 border-gray-200">
        <button
          onClick={async () => {
            if (!reportId) return setMessage('Report id missing');
            setBusy(true);
            try {
              await axios.post(`${API_URL}/api/reports/${reportId}/status`, { status: 'resolved' });
              setMessage('✓ Marked as resolved');
              onUpdated?.();
            } catch (err) {
              console.error('Error marking resolved', err);
              setMessage('Failed to mark resolved');
            } finally {
              setBusy(false);
              setTimeout(() => setMessage(null), 3000);
            }
          }}
          disabled={busy}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-emerald-500 to-green-600 text-white font-bold rounded-xl hover:from-emerald-600 hover:to-green-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-60"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
          </svg>
          <span>Mark as Resolved</span>
        </button>
        <button
          onClick={async () => {
            try {
              const text = [
                `Title: ${summary?.title || 'N/A'}`,
                `Category: ${summary?.bugCategory || 'N/A'}`,
                `Suggested Solution:\n${summary?.suggestedSolution || 'N/A'}`
              ].join('\n\n');

              if (navigator.clipboard) {
                await navigator.clipboard.writeText(text);
                setMessage('✓ Summary copied to clipboard');
              } else {
                setMessage('Clipboard not available in this browser');
              }
            } catch (err) {
              console.error('Copy failed', err);
              setMessage('Failed to copy');
            }
            setTimeout(() => setMessage(null), 2500);
          }}
          className="flex items-center space-x-2 px-6 py-3 bg-gradient-to-r from-indigo-500 to-purple-600 text-white font-bold rounded-xl hover:from-indigo-600 hover:to-purple-700 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105"
        >
          <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
          </svg>
          <span>Copy Summary</span>
        </button>

        <button
          onClick={async (e) => {
            e.preventDefault();
            if (!reportId) return setMessage('Report id missing');
            setBusy(true);
            try {
              await axios.post(`${API_URL}/api/reports/${reportId}/reanalyze`);
              setMessage('Re-analysis started! Refreshing in 3 seconds...');
              
              setTimeout(() => {
                setBusy(false);
                setMessage(null);
                onUpdated?.();
              }, 3000);
            } catch (err) {
              console.error('Re-analyze failed', err);
              setMessage('Failed to queue re-analysis');
              setBusy(false);
              setTimeout(() => setMessage(null), 3000);
            }
          }}
          disabled={busy}
          className="flex items-center space-x-2 px-6 py-3 bg-white text-gray-700 font-bold rounded-xl hover:bg-gray-50 border-2 border-gray-300 shadow-lg hover:shadow-xl transition-all duration-200 hover:scale-105 disabled:opacity-60"
        >
          <svg className={`w-5 h-5 ${busy ? 'animate-spin' : ''}`} fill="none" stroke="currentColor" viewBox="0 0 24 24">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
          </svg>
          <span>{busy ? 'Re-analyzing...' : 'Re-analyze'}</span>
        </button>
      </div>

      {/* AI Badge */}
      <div className="flex items-center justify-center space-x-2 pt-5">
        <div className="px-5 py-3 bg-gradient-to-r from-indigo-100 via-purple-100 to-pink-100 rounded-xl border-2 border-indigo-200 shadow-md">
          <div className="flex items-center space-x-2">
            <div className="relative flex h-3 w-3">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-emerald-400 opacity-75"></span>
              <span className="relative inline-flex rounded-full h-3 w-3 bg-emerald-500"></span>
            </div>
            <span className="text-sm font-black text-gray-800">
              Analyzed by AI • Confidence: High
            </span>
          </div>
        </div>
      </div>
    </div>
  );
}

export default SummaryCard;
