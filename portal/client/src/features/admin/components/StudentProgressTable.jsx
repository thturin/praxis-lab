import React, { useState, useMemo } from 'react';

function StudentProgressTable({ students, questions }) {
  const [sortColumn, setSortColumn] = useState('overallScore');
  const [sortDirection, setSortDirection] = useState('desc');
  const [expandedStudents, setExpandedStudents] = useState(new Set());

  // Handle column sort
  const handleSort = (column) => {
    if (sortColumn === column) {
      setSortDirection(sortDirection === 'asc' ? 'desc' : 'asc');
    } else {
      setSortColumn(column);
      setSortDirection('desc');
    }
  };

  // Sort students
  const sortedStudents = useMemo(() => {
    if (!students || students.length === 0) return [];

    return [...students].sort((a, b) => {
      let aVal = a[sortColumn];
      let bVal = b[sortColumn];

      // Handle null values
      if (aVal === null || aVal === undefined) return 1;
      if (bVal === null || bVal === undefined) return -1;

      // String comparison
      if (typeof aVal === 'string') {
        aVal = aVal.toLowerCase();
        bVal = bVal.toLowerCase();
      }

      if (aVal < bVal) return sortDirection === 'asc' ? -1 : 1;
      if (aVal > bVal) return sortDirection === 'asc' ? 1 : -1;
      return 0;
    });
  }, [students, sortColumn, sortDirection]);

  // Toggle row expansion
  const toggleExpand = (userId) => {
    const newExpanded = new Set(expandedStudents);
    if (newExpanded.has(userId)) {
      newExpanded.delete(userId);
    } else {
      newExpanded.add(userId);
    }
    setExpandedStudents(newExpanded);
  };

  // Get color for score
  const getScoreColor = (score) => {
    if (score >= 80) return '#10b981'; // green
    if (score >= 60) return '#f59e0b'; // yellow
    return '#ef4444'; // red
  };

  if (!students || students.length === 0) {
    return (
      <div style={{ padding: '20px', textAlign: 'center', color: '#666' }}>
        No student data available
      </div>
    );
  }

  return (
    <div style={{ marginBottom: '30px' }}>
      <h3 style={{ marginBottom: '15px', fontSize: '18px', fontWeight: 'bold' }}>
        Student Progress
      </h3>

      <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '14px' }}>
        <thead>
          <tr style={{ borderBottom: '2px solid #e5e7eb', backgroundColor: '#f9fafb' }}>
            <th style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600' }}></th>
            <th
              onClick={() => handleSort('name')}
              style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
            >
              Name {sortColumn === 'name' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('username')}
              style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
            >
              Username {sortColumn === 'username' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('section')}
              style={{ padding: '12px 8px', textAlign: 'left', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
            >
              Section {sortColumn === 'section' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('overallScore')}
              style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
            >
              Score (%) {sortColumn === 'overallScore' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('questionsAnswered')}
              style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
            >
              Answered {sortColumn === 'questionsAnswered' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('questionsCorrect')}
              style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
            >
              Correct {sortColumn === 'questionsCorrect' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
            <th
              onClick={() => handleSort('isLate')}
              style={{ padding: '12px 8px', textAlign: 'center', fontWeight: '600', cursor: 'pointer', userSelect: 'none' }}
            >
              Status {sortColumn === 'isLate' && (sortDirection === 'asc' ? '▲' : '▼')}
            </th>
          </tr>
        </thead>
        <tbody>
          {sortedStudents.map((student) => (
            <React.Fragment key={student.userId}>
              {/* Main row */}
              <tr
                style={{
                  borderBottom: '1px solid #e5e7eb',
                  backgroundColor: expandedStudents.has(student.userId) ? '#f9fafb' : 'white',
                  cursor: 'pointer'
                }}
                onClick={() => toggleExpand(student.userId)}
              >
                <td style={{ padding: '12px 8px', textAlign: 'center', width: '30px' }}>
                  {expandedStudents.has(student.userId) ? '▼' : '▶'}
                </td>
                <td style={{ padding: '12px 8px' }}>{student.name}</td>
                <td style={{ padding: '12px 8px' }}>{student.username}</td>
                <td style={{ padding: '12px 8px' }}>{student.section}</td>
                <td style={{
                  padding: '12px 8px',
                  textAlign: 'center',
                  fontWeight: 'bold',
                  color: getScoreColor(student.overallScore)
                }}>
                  {student.overallScore.toFixed(1)}%
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  {student.questionsAnswered}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  {student.questionsCorrect}
                </td>
                <td style={{ padding: '12px 8px', textAlign: 'center' }}>
                  {student.isLate === null ? (
                    <span style={{ color: '#9ca3af' }}>-</span>
                  ) : student.isLate ? (
                    <span style={{ color: '#ef4444' }}>Late ({student.latePenalty.toFixed(1)}% penalty)</span>
                  ) : (
                    <span style={{ color: '#10b981' }}>On time</span>
                  )}
                </td>
              </tr>

              {/* Expanded row - Question details */}
              {expandedStudents.has(student.userId) && (
                <tr style={{ backgroundColor: '#f9fafb' }}>
                  <td colSpan="8" style={{ padding: '15px 20px' }}>
                    <div>
                      <strong style={{ marginBottom: '10px', display: 'block' }}>Question Breakdown:</strong>
                      <table style={{ width: '100%', fontSize: '13px' }}>
                        <thead>
                          <tr style={{ borderBottom: '1px solid #d1d5db' }}>
                            <th style={{ padding: '8px', textAlign: 'left', fontWeight: '500' }}>Question</th>
                            <th style={{ padding: '8px', textAlign: 'center', fontWeight: '500' }}>Score</th>
                            <th style={{ padding: '8px', textAlign: 'left', fontWeight: '500' }}>Feedback</th>
                          </tr>
                        </thead>
                        <tbody>
                          {questions.map((q) => {
                            const result = student.questionScores[q.id];
                            if (!result) return null;

                            return (
                              <tr key={q.id} style={{ borderBottom: '1px solid #e5e7eb' }}>
                                <td style={{ padding: '8px' }}>
                                  {q.prompt.substring(0, 60)}...
                                </td>
                                <td style={{
                                  padding: '8px',
                                  textAlign: 'center',
                                  color: getScoreColor(result.score * 100),
                                  fontWeight: '500'
                                }}>
                                  {(result.score * 100).toFixed(0)}%
                                </td>
                                <td style={{ padding: '8px', color: '#6b7280', fontSize: '12px' }}>
                                  {result.feedback || 'No feedback'}
                                </td>
                              </tr>
                            );
                          })}
                        </tbody>
                      </table>
                    </div>
                  </td>
                </tr>
              )}
            </React.Fragment>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default StudentProgressTable;
