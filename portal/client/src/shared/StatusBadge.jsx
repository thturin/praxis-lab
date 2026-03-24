import React from 'react';

const StatusBadge = ({ isLate, daysLate }) => {
    const badgeStyle = {
        padding: '6px 12px',
        borderRadius: '20px',
        fontSize: '12px',
        fontWeight: '600',
        textTransform: 'uppercase',
        letterSpacing: '0.5px'
    };

    if (!isLate) {
        return (
            <span style={{
                ...badgeStyle,
                backgroundColor: '#dcfce7',
                color: '#166534',
                border: '1px solid #bbf7d0'
            }}>
                ✅ On Time
            </span>
        );
    }

    return (
        <span style={{
            ...badgeStyle,
            backgroundColor: '#fef2f2',
            color: '#dc2626',
            border: '1px solid #fecaca'
        }}>
            ⏰ Late {daysLate} Day{daysLate > 1 ? 's' : ''}
        </span>
    );
};



export default StatusBadge;