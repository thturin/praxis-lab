import React from 'react';
import { getQuestionResponses } from '../utils/analyticsAggregator';

function QuestionResponsesModal({ questionId, question, sessions, questions, onClose }) {
  if (!questionId || !sessions) return null;

  const responses = getQuestionResponses(sessions, questionId, questions);

  const getScoreColor = (score) => {
    if (score >= 0.8) return '#10b981'; // green
    if (score >= 0.6) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  return (
    <div
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        backgroundColor: 'rgba(0, 0, 0, 0.5)',
        display: 'flex',
        alignItems: 'center',
        justifyContent: 'center',
        zIndex: 1000,
        padding: '20px'
      }}
      onClick={onClose}
    >
      <div
        style={{
          backgroundColor: 'white',
          borderRadius: '8px',
          padding: '30px',
          maxWidth: '900px',
          maxHeight: '80vh',
          width: '100%',
          overflow: 'auto',
          boxShadow: '0 10px 25px rgba(0, 0, 0, 0.3)'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Header */}
        <div style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'start',
          marginBottom: '20px',
          borderBottom: '2px solid #e5e7eb',
          paddingBottom: '15px'
        }}>
          <div style={{ flex: 1 }}>
            <h2 style={{ fontSize: '20px', fontWeight: 'bold', marginBottom: '8px' }}>
              Class Responses
            </h2>
            <p style={{ color: '#6b7280', fontSize: '14px', lineHeight: '1.5' }}>
              {question?.prompt || 'Question prompt not available'}
            </p>
          </div>
          <button
            onClick={onClose}
            style={{
              backgroundColor: 'transparent',
              border: 'none',
              fontSize: '24px',
              cursor: 'pointer',
              color: '#9ca3af',
              padding: '0 10px',
              marginLeft: '15px'
            }}
          >
            ×
          </button>
        </div>

        {/* Stats Summary */}
        {responses.length > 0 && (
          <div style={{
            display: 'flex',
            gap: '20px',
            marginBottom: '20px',
            padding: '15px',
            backgroundColor: '#f9fafb',
            borderRadius: '6px'
          }}>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Total Responses</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>{responses.length}</div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Avg Score</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {(responses.reduce((sum, r) => sum + r.score, 0) / responses.length * 100).toFixed(1)}%
              </div>
            </div>
            <div>
              <div style={{ fontSize: '12px', color: '#6b7280', marginBottom: '4px' }}>Pass Rate</div>
              <div style={{ fontSize: '24px', fontWeight: 'bold' }}>
                {(responses.filter(r => r.score >= 0.8).length / responses.length * 100).toFixed(1)}%
              </div>
            </div>
          </div>
        )}

        {/* Responses Table */}
        {responses.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '40px', color: '#9ca3af' }}>
            No responses yet
          </div>
        ) : (
          <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
            <thead>
              <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Student</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Response</th>
                <th style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600' }}>Score</th>
                <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}>Feedback</th>
              </tr>
            </thead>
            <tbody>
              {responses.map((response, idx) => (
                <tr key={idx} style={{ borderBottom: '1px solid #e5e7eb' }}>
                  <td style={{ padding: '12px 8px', fontWeight: '500' }}>
                    {response.username}
                  </td>
                  <td style={{ padding: '12px 8px', maxWidth: '300px' }}>
                    <div style={{
                      whiteSpace: 'pre-wrap',
                      wordBreak: 'break-word',
                      backgroundColor: '#f9fafb',
                      padding: '8px',
                      borderRadius: '4px',
                      fontSize: '13px',
                      fontFamily: 'monospace',
                      maxHeight: '100px',
                      overflow: 'auto'
                    }}>
                      {response.response}
                    </div>
                  </td>
                  <td style={{
                    padding: '12px 8px',
                    textAlign: 'center',
                    fontWeight: 'bold',
                    color: getScoreColor(response.score)
                  }}>
                    {(response.score * 100).toFixed(0)}%
                  </td>
                  <td style={{ padding: '12px 8px', color: '#6b7280', fontSize: '13px', maxWidth: '250px' }}>
                    {response.feedback}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>
    </div>
  );
}

export default QuestionResponsesModal;
