import React from 'react';

const Button = ({ children, style={}, color, onClick, disabled=false, type='button' }) => {
    const colors = {
        primary: '#764ba2',
        secondary: '#667eea',
        warning: '#f59e42',
        danger: '#ef4444'
    };

    return (
        <button
            type={type}
            style={{
                background: '#fff',
                color: colors[color],
                border: 'none',
                borderRadius: '8px',
                padding: '8px 20px',
                fontWeight: '600',
                cursor: 'pointer',
                fontSize: '16px',
                boxShadow: '0 2px 8px rgba(0,0,0,0.05)',
                ...style
            }}
            onClick={onClick}
            disabled={disabled}
        >
            {children}
        </button>
    );
};

export default Button;