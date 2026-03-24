import React from 'react';
import { formatDate, isPastDueSubmission, calcDiffDays } from '../../../utils/dateUtils';
import ScoreDisplay from '../../../shared/ScoreDisplay';
import StatusBadge from '../../../shared/StatusBadge';

// Utility functions (move to utils if you want)

const StudentSubmissionList = ({ submissions, assignments }) => (
  <div style={{
      display: 'flex',
      justifyContent: 'center',   // center horizontally
      alignItems: 'flex-start',
      padding: '32px 16px'
  }}>
    <div style={{
        backgroundColor: 'white',
        borderRadius: '16px',
        padding: '32px',
        boxShadow: '0 4px 20px rgba(0,0,0,0.08)',
        border: '1px solid #e2e8f0',
        width: '100%',
        maxWidth: '900px',
        boxSizing: 'border-box'
    }}>
      <h3 style={{
          margin: '0 0 24px 0',
          fontSize: '24px',
          fontWeight: '700',
          color: '#1e293b',
          display: 'flex',
          alignItems: 'center',
          gap: '8px'
      }}>
          📚 Your Submissions
      </h3>

      {submissions.length === 0 ? (
          <div style={{
              textAlign: 'center',
              padding: '48px',
              color: '#64748b'
          }}>
              <div style={{ fontSize: '48px', marginBottom: '16px' }}>📝</div>
              <h4 style={{ margin: '0 0 8px 0', color: '#475569' }}>No submissions yet</h4>
              <p style={{ margin: 0 }}>Submit your first assignment to get started!</p>
          </div>
      ) : (
          <div style={{ display: 'grid', gap: '16px' }}>
              {submissions.map(sub => {
                  const assignment = assignments.find(
                      ass => String(ass.id) === String(sub.assignmentId)
                  );

                  if (!assignment) {
                      console.warn('⚠️ No assignment found for submission:', sub);
                  }

                  const isLate = assignment ? isPastDueSubmission(sub.submittedAt, assignment.dueDate) : false;
                  const daysLate = assignment ? calcDiffDays(sub.submittedAt, assignment.dueDate) : 0;

                  return (
                      <div key={sub.id} style={{
                          background: 'linear-gradient(135deg, #ffffff 0%, #f8fafc 100%)',
                          border: '1px solid #e2e8f0',
                          borderRadius: '12px',
                          padding: '24px',
                          transition: 'all 0.2s ease',
                          cursor: 'pointer'
                      }}
                          onMouseEnter={e => {
                              e.target.style.transform = 'translateY(-2px)';
                              e.target.style.boxShadow = '0 8px 25px rgba(0,0,0,0.1)';
                          }}
                          onMouseLeave={e => {
                              e.target.style.transform = 'translateY(0)';
                              e.target.style.boxShadow = 'none';
                          }}>
                          <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'flex-start',
                              marginBottom: '16px'
                          }}>
                              <h4 style={{
                                  margin: 0,
                                  fontSize: '18px',
                                  fontWeight: '600',
                                  color: '#1e293b'
                              }}>
                                  {assignment?.title || `Unknown Assignment (ID: ${sub.assignmentId})`}
                              </h4>
                              <ScoreDisplay score={sub.score} />
                          </div>

                          <div style={{
                              display: 'grid',
                              gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))',
                              gap: '16px',
                              marginBottom: '16px'
                          }}>
                              <div>
                                  <div style={{
                                      fontSize: '12px',
                                      color: '#64748b',
                                      textTransform: 'uppercase',
                                      fontWeight: '600',
                                      letterSpacing: '0.5px',
                                      marginBottom: '4px'
                                  }}>
                                      Submitted
                                  </div>
                                  <div style={{
                                      fontSize: '14px',
                                      color: '#374151'
                                  }}>
                                      {formatDate(sub.submittedAt,1)}<br/>
                                      {formatDate(sub.submittedAt,2)}
                                  </div>
                              </div>

                              {assignment && (
                                  <div>
                                      <div style={{
                                          fontSize: '12px',
                                          color: '#64748b',
                                          textTransform: 'uppercase',
                                          fontWeight: '600',
                                          letterSpacing: '0.5px',
                                          marginBottom: '4px'
                                      }}>
                                          Due Date
                                      </div>
                                      <div style={{
                                          fontSize: '14px',
                                          color: '#374151'
                                      }}>
                                          {formatDate(assignment.dueDate,1)}<br/>
                                          {formatDate(assignment.dueDate,2)}
                                      </div>
                                  </div>
                              )}
                          </div>

                          <div style={{
                              display: 'flex',
                              justifyContent: 'space-between',
                              alignItems: 'center'
                          }}>
                              <StatusBadge
                                  isLate={isLate}
                                  daysLate={daysLate}
                              />

                              <div style={{
                                  fontSize: '12px',
                                  color: '#64748b'
                              }}>
                                  ID: {sub.id}
                              </div>
                          </div>
                      </div>
                  );
              })}
          </div>
      )}
    </div>
  </div>
);

export default StudentSubmissionList;