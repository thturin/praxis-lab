import React from 'react';
import { formatDate, isPastDue } from '../../../utils/dateUtils';

const StudentAssignmentMenu = ({
    setSelectedAssignmentId,
    selectedAssignmentId,
    assignments
}) => {

    return (<>
        <div style={{
            maxWidth: '600px',
            margin: '20px auto',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
        }}>
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>Select Assignment</h3>

            {/* DROP DOWN MENU FOR ASSIGNMENTS */}
            <div style={{ marginBottom: '15px' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold'
                }}>
                    Assignment:
                </label>
                <select
                    value={selectedAssignmentId} //value that gets passed is not the text but assignment id
                    onChange={e => {
                        const value = e.target.value
                        setSelectedAssignmentId(Number(value) || -1);
                    }}
                    style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}
                >
                    <option value="">Select an Assignment</option>
                    {/* filter by assignmentType */}
                    {assignments.map(ass => (
                        <option key={ass.id} 
                                value={ass.id}
                                style={{ color: isPastDue(ass.dueDate) ? 'red' : 'black' }}
                        >
                            {ass.title}- Due Date: {formatDate(ass.dueDate, 1)} {formatDate(ass.dueDate, 2)}
                        </option>
                    ))}
                </select>
            </div>
        </div>
    </>);
}

export default StudentAssignmentMenu;