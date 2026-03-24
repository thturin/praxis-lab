import React from 'react';

const Spinner = ({ size = 16, color = '#007bff' }) => {
    return (
        <div 
            style={{
                display: 'inline-block',
                width: `${size}px`,
                height: `${size}px`,
                border: `2px solid #f3f3f3`,
                borderTop: `2px solid ${color}`,
                borderRadius: '50%',
                animation: 'spin 1s linear infinite',
                marginRight: '8px'
            }}
        />
    );
};

// Add CSS animation
const spinnerStyles = `
@keyframes spin {
    0% { transform: rotate(0deg); }
    100% { transform: rotate(360deg); }
}
`;

// Inject styles
if (typeof document !== 'undefined') {
    const styleElement = document.createElement('style');
    styleElement.innerHTML = spinnerStyles;
    document.head.appendChild(styleElement);
}

export default Spinner;