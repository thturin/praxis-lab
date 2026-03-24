import React from 'react';

const LatePolicyInfo = () => {
    return (
        <div style={{
            background: 'linear-gradient(135deg, #667eea 0%, #764ba2 100%)',
            borderRadius: '16px',
            padding: '24px',
            color: 'white',
            boxShadow: '0 8px 32px rgba(0,0,0,0.1)',
            border: '1px solid rgba(255,255,255,0.1)',
            backdropFilter: 'blur(10px)'
        }}>
            <h4 style={{
                color: 'white',
                marginTop: 0,
                marginBottom: '20px',
                fontSize: '18px',
                fontWeight: '600',
                display: 'flex',
                alignItems: 'center',
                gap: '8px'
            }}>
                📋 Late Submission Policy
            </h4>

            <div style={{ color: 'rgba(255,255,255,0.9)' }}>
                {[
                    { time: 'On Time', penalty: 'Full credit', score: '100%', color: '#4ade80' },
                    { time: '1 Day Late', penalty: '10% penalty', score: '90% max', color: '#fbbf24' },
                    { time: '2-3 Days Late', penalty: '15% penalty', score: '85% max', color: '#fb923c' },
                    { time: '4-5 Days Late', penalty: '20% penalty', score: '80% max', color: '#f87171' },
                    { time: '6+ Days Late', penalty: '25% penalty', score: '75% max', color: '#ef4444' }
                ].map((item, index) => (
                    <div key={index} style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        padding: '12px 16px',
                        marginBottom: '8px',
                        backgroundColor: 'rgba(255,255,255,0.1)',
                        borderRadius: '8px',
                        border: '1px solid rgba(255,255,255,0.2)'
                    }}>
                        <div style={{ fontWeight: '500' }}>{item.time}</div>
                        <div style={{
                            fontSize: '14px',
                            color: item.color,
                            fontWeight: '600'
                        }}>
                            {item.score}
                        </div>
                    </div>
                ))}
            </div>
            <div style={{ 
                fontSize: '13px', 
                color: 'rgba(255,255,255,0.7)',
                fontStyle: 'italic',
                marginTop: '16px',
                textAlign: 'center'
            }}>
                ⚡ Penalties are automatically calculated
            </div>
        </div>
    );
};

export default LatePolicyInfo;