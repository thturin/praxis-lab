import React from 'react';


const ScoreDisplay = ({ score }) => {
    const getScoreColor = (score) => {
        if (score >= 90) return '#059669';
        if (score >= 80) return '#d97706';
        if (score >= 70) return '#dc2626';
        return '#7c2d12';
    };

    return (
        <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            backgroundColor: '#f8fafc',
            padding: '8px 16px',
            borderRadius: '8px',
            border: '1px solid #e2e8f0'
        }}>
            <span style={{
                fontSize: '20px',
                fontWeight: '700',
                color: getScoreColor(score)
            }}>
                {score || 0}%
            </span>
        </div>
    );
};

export default ScoreDisplay;