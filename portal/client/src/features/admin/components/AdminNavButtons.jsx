import React from 'react';
import Button from '../../../shared/Button';

const activeStyle = {
    borderBottom: '5px solid #33ff00ff',
    color: '#22a904ff'
};

const AdminNavButtons = ({ onSelect, assignmentTitle, assignmentId, assignmentType, currentTab }) => {
    let viewDisabled = false;
    let submissionsDisabled = false;
    let analyticsDisabled = false;
    if (assignmentId === -1) {
        viewDisabled = true;
        submissionsDisabled = true;
        analyticsDisabled = true;
    }

    if (assignmentType === 'github') {
        viewDisabled = true;
        analyticsDisabled = true;
    }



    return (
        <>
            {/* //(OnSelect wrapped in function prevents function from executing immediately. Only on click */}
            <Button
                color="secondary"
                onClick={() => onSelect('analytics')}
                style={{
                    opacity: analyticsDisabled ? 0.5 : 1,
                    ...(currentTab === 'analytics' ? activeStyle : {})
                }}
                disabled={analyticsDisabled}
            >
                📊 Analytics
            </Button>
            <Button
                color="secondary"
                onClick={() => onSelect('review')}
                style={{
                    opacity: submissionsDisabled ? 0.5 : 1,
                    ...(currentTab === 'review' ? activeStyle : {})
                }}
                disabled={submissionsDisabled}
            >
                👁️ Submissions
            </Button>
            <Button
                color="secondary"
                onClick={() => onSelect('manage')}
                style={{
                    opacity: viewDisabled ? 0.5 : 1,
                    ...(currentTab === 'manage' ? activeStyle : {})
                }}
                disabled={viewDisabled}
            >
                ✅ Manage/Preview
            </Button>
            <Button
                color="primary"
                onClick={() => onSelect('create')}
                style={currentTab === 'create' ? activeStyle : undefined}
            >
                🔨 Select/Build
            </Button>
            {/* Fake button for assignment title */}
            <Button color="default" style={{ cursor: 'default', pointerEvents: 'none', marginLeft: '8px', opacity: 0.7 }}>
                📄 {assignmentTitle || "No Assignment Selected"}
            </Button>
        </>
    );
};

export default AdminNavButtons;
