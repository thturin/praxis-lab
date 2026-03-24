import React from 'react';
import Button from '../../../shared/Button';

const JupiterExportButton = ({selectedAssignmentId,filteredSubsLength,selectedSection}) => (
            <Button
                disabled={!selectedAssignmentId || filteredSubsLength === 0 || !selectedSection}
                onClick={async () => {
                
                    window.location.href = `${process.env.REACT_APP_API_HOST}/admin/exportAssignment?assignmentId=${selectedAssignmentId}${selectedSection ? `&sectionId=${selectedSection}` : ''}`;
                }}
                style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px'
                }}
            >
                JUPITER EXPORT
            </Button>
);

export default JupiterExportButton;