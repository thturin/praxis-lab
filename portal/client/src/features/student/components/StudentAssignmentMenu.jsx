import React, { useState } from 'react';
import { formatDate, isPastDue } from '../../../utils/dateUtils';

const PAGE_SIZE = 10;

const StudentAssignmentMenu = ({
    setSelectedAssignmentId,
    selectedAssignmentId,
    assignments
}) => {
    const [page, setPage] = useState(0);

    const sorted = [...assignments].sort((a, b) => new Date(b.dueDate) - new Date(a.dueDate)); //bubble sort, most recent due date first
    const totalPages = Math.ceil(sorted.length / PAGE_SIZE);
    const pageAssignments = sorted.slice(page * PAGE_SIZE, (page + 1) * PAGE_SIZE);

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
                    value={selectedAssignmentId}
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
                    {pageAssignments.map(ass => (
                        <option key={ass.id}
                                value={ass.id}
                                style={{ color: isPastDue(ass.dueDate) ? 'red' : 'black' }}
                        >
                            {ass.title}- Due Date: {formatDate(ass.dueDate, 1)} {formatDate(ass.dueDate, 2)}
                        </option>
                    ))}
                </select>

                {totalPages > 1 && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'space-between',
                        alignItems: 'center',
                        marginTop: '8px'
                    }}>
                        <button
                            onClick={() => setPage(p => p - 1)}
                            disabled={page === 0}
                            style={{
                                padding: '4px 12px',
                                cursor: page === 0 ? 'default' : 'pointer',
                                opacity: page === 0 ? 0.4 : 1
                            }}
                        >
                            ← Prev
                        </button>
                        <span style={{ fontSize: '13px', color: '#555' }}>
                            Page {page + 1} of {totalPages}
                        </span>
                        <button
                            onClick={() => setPage(p => p + 1)}
                            disabled={page >= totalPages - 1}
                            style={{
                                padding: '4px 12px',
                                cursor: page >= totalPages - 1 ? 'default' : 'pointer',
                                opacity: page >= totalPages - 1 ? 0.4 : 1
                            }}
                        >
                            Next →
                        </button>
                    </div>
                )}
            </div>
        </div>
    </>);
}

export default StudentAssignmentMenu;