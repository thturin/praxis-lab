import React from 'react';
import Button from '../../../shared/Button';

const activeStyle = {
    borderBottom: '3px solid #34f516ff',
    color: '#16e927ff'
};

const StudentNavButtons = ({ onSelect, assignmentTitle, assignmentType, assignmentId, currentTab }) => {
    let githubDisabled;
    let labDisabled;

    if(assignmentId === -1){ //no assignment selected
      githubDisabled = true;
      labDisabled = true;
    }else{
      githubDisabled = assignmentType === 'lab';
      labDisabled = assignmentType === 'github';
    }

    return (
        <>
            <Button
              color="secondary"
              onClick={() => onSelect('github')}
              disabled={githubDisabled}
              style={{
                opacity: githubDisabled ? 0.5 : 1,
                ...(currentTab === 'github' ? activeStyle : {})
              }}
            >
              😸 Github
            </Button>

            <Button
              color="secondary"
              onClick={() => onSelect('lab')}
              disabled={labDisabled}
              style={{
                opacity: labDisabled ? 0.5 : 1,
                ...(currentTab === 'lab' ? activeStyle : {})
              }}
            >
              🧪 Lab
            </Button>

            <Button
              color="primary"
              onClick={() => onSelect('view')}
              style={currentTab === 'view' ? activeStyle : undefined}
            >
              👀 Select/View
            </Button>

            <Button
              color="secondary"
              onClick={() => onSelect('late')}
              style={currentTab === 'late' ? activeStyle : undefined}
            >
              ⏰ Late Policy
            </Button>

            <Button color="default" style={{ cursor: 'default', pointerEvents: 'none', marginLeft: '8px', opacity: 0.7 }}>
                📄 {assignmentTitle || "No Assignment Selected"}
            </Button>
        </>
    );
};

export default StudentNavButtons;
