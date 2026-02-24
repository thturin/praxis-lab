import React from 'react';

const STREAMLIT_URL = process.env.REACT_APP_ANALYTICS_URL || 'http://localhost:18501';

export const AnalyticsDashboard: React.FC = () => {
    return (
        <div style={{ width: '100%', height: '100vh' }}>
            <iframe
                src={STREAMLIT_URL}
                width="100%"
                height="100%"
                style={{ border: 'none' }}
                title="Analytics Dashboard"
            />
        </div>
    );
};

//export default AnalyticsDashboard;
