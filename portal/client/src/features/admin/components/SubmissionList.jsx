import React, { useEffect, useState, useMemo } from 'react';
import axios from 'axios';


const SubmissionList = ({
    selectedAssignmentObj,
    filteredSubs,
    setEditedScores, 
    editedScores,
    setHasChanges,
    hasChanges,
    setSubmissions, //when you update the score
    selectedSubmissionId,//for the lab preview in adminDashboard
    setSelectedSubmissionId,
    reloadKey
}) => {

    // Sorting state
    const [sortBy, setSortBy] = useState('submittedAt');
    const [sortDir, setSortDir] = useState('desc'); // 'asc' | 'desc'
  
    const toggleSort = (col) => {
        if (sortBy === col) {
            setSortDir(d => (d === 'asc' ? 'desc' : 'asc'));
        } else {
            setSortBy(col);
            setSortDir('asc');
        }
    };

    //sorting submission processing heavy so only re-render when needed and use sorted list in cache when nothing has changed. 
    const sortedSubs = useMemo(() => {
        const arr = [...(filteredSubs || [])];
        arr.sort((a, b) => {
            let av, bv, cmp = 0;
            switch (sortBy) {
                case 'section':
                    av = (a.user?.section?.name || '').toLowerCase();
                    bv = (b.user?.section?.name || '').toLowerCase();
                    cmp = av.localeCompare(bv);
                    break;
                case 'name':
                    av = (a.user?.name || '').toLowerCase();
                    bv = (b.user?.name || '').toLowerCase();
                    cmp = av.localeCompare(bv);
                    break;
                case 'username':
                    av = (a.user?.username || '').toLowerCase();
                    bv = (b.user?.username || '').toLowerCase();
                    cmp = av.localeCompare(bv);
                    break;
                case 'userId':
                    av = Number(a.userId) || 0;
                    bv = Number(b.userId) || 0;
                    cmp = av === bv ? 0 : av < bv ? -1 : 1;
                    break;
                case 'score':
                    av = editedScores[a.id] !== undefined ? editedScores[a.id] : (typeof a.score === 'number' ? a.score : -Infinity);
                    bv = editedScores[b.id] !== undefined ? editedScores[b.id] : (typeof b.score === 'number' ? b.score : -Infinity);
                    cmp = av === bv ? 0 : av < bv ? -1 : 1;
                    break;
                case 'submittedAt':
                default:
                    av = a.submittedAt ? new Date(a.submittedAt).getTime() : 0;
                    bv = b.submittedAt ? new Date(b.submittedAt).getTime() : 0;
                    cmp = av === bv ? 0 : av < bv ? -1 : 1;
                    break;
            }
            return sortDir === 'asc' ? cmp : -cmp;
        });
        return arr;
    }, [filteredSubs, sortBy, sortDir, editedScores]);

    // Clear any locally edited scores whenever a reload is requested so we display fresh server data.
    useEffect(() => {
        setEditedScores({});
        setHasChanges(false);
    }, [reloadKey, setEditedScores, setHasChanges]);

    // Ensure something is selected (or re-select the first row if the previous selection disappeared).
    useEffect(() => {
        const hasSelection = sortedSubs.some(sub => sub.id === Number(selectedSubmissionId));
        if (!hasSelection && sortedSubs.length) {
            setSelectedSubmissionId(sortedSubs[0].id);
        }
    }, [sortedSubs, selectedSubmissionId, setSelectedSubmissionId]);

    const sortIndicator = (col) => (sortBy === col ? (sortDir === 'asc' ? ' ↑' : ' ↓') : '');

    return (
        <>
            {/* SUBMISSION LIST */}
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>
                Submissions for Assignment: {selectedAssignmentObj ? selectedAssignmentObj.title : ''}
            </h3>

            <table style={{ width: '100%', borderCollapse: 'collapse', marginTop: '12px' }}>
                <thead>
                    <tr>
                        <th
                            onClick={() => toggleSort('section')}
                            style={{
                                border: '1px solid #ccc',
                                padding: '4px',
                                cursor: 'pointer',
                                backgroundColor: '#f8f9fa',
                                userSelect: 'none'
                            }}
                            title="Click to sort by section"
                        >
                            Section{sortIndicator('section')}
                        </th>
                        <th
                            onClick={() => toggleSort('name')}
                            style={{
                                border: '1px solid #ccc',
                                padding: '4px',
                                cursor: 'pointer',
                                backgroundColor: '#f8f9fa',
                                userSelect: 'none'
                            }}
                            title="Click to sort by name"
                        >
                            Name{sortIndicator('name')}
                        </th>
                        <th
                            onClick={() => toggleSort('username')}
                            style={{
                                border: '1px solid #ccc',
                                padding: '4px',
                                cursor: 'pointer',
                                backgroundColor: '#f8f9fa',
                                userSelect: 'none'
                            }}
                            title="Click to sort by username"
                        >
                            Username{sortIndicator('username')}
                        </th>
                        <th
                            onClick={() => toggleSort('userId')}
                            style={{
                                border: '1px solid #ccc',
                                padding: '4px',
                                cursor: 'pointer',
                                backgroundColor: '#f8f9fa',
                                userSelect: 'none'
                            }}
                            title="Click to sort by user ID"
                        >
                            User ID{sortIndicator('userId')}
                        </th>
                        <th
                            onClick={() => toggleSort('score')}
                            style={{
                                border: '1px solid #ccc',
                                padding: '4px',
                                cursor: 'pointer',
                                backgroundColor: '#f8f9fa',
                                userSelect: 'none'
                            }}
                            title="Click to sort by score"
                        >
                            Score%{sortIndicator('score')}
                        </th>
                        <th
                            onClick={() => console.log('hello')}
                            style={{
                                border: '1px solid #ccc',
                                padding: '4px',
                                cursor: 'pointer',
                                backgroundColor: '#f8f9fa'

                            }}
                            title="View Submission"
                        >
                            Submission
                        </th>
                    </tr>
                </thead>
                <tbody>
                    {sortedSubs.length === 0 ? (
                        <tr>
                            <td colSpan={5} style={{ color: 'red', textAlign: 'center', padding: '8px' }}>
                                No Submissions
                            </td>
                        </tr>
                    ) : (
                        sortedSubs.map(sub => (
                            <tr key={sub.id}>
                                <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                                    {sub.user?.section?.name || 'no section'}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                                    {sub.user?.name || 'no name'}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                                    {sub.user?.username || 'no username'}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                                    {sub.userId}
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                                    <input
                                        type="number"
                                        value={editedScores[sub.id] !== undefined ? editedScores[sub.id] : (sub.score ?? 0)}
                                        onChange={(e) => {
                                            setEditedScores(prev => ({
                                                ...prev,
                                                [sub.id]: Number(e.target.value)
                                            }));
                                            setHasChanges(true);
                                        }}
                                        style={{
                                            width: '60px',
                                            padding: '2px',
                                            border: '1px solid #ccc',
                                            borderRadius: '3px'
                                        }}
                                    />
                                </td>
                                <td style={{ border: '1px solid #ccc', padding: '4px' }}>
                                    <input
                                        type="radio"
                                        value={sub.id}
                                        checked={Number(selectedSubmissionId) === sub.id}
                                        // wrong — this calls the setter during render
                                        // onChange={ setSelectedSubmission(sub.id) }
                                        onChange={(e) => { setSelectedSubmissionId(Number(e.target.value)) }}
                                    />
                                </td>
                            </tr>
                        ))
                    )}
                </tbody>
            </table>

            {/* UPDATE BUTTON */}
            {hasChanges && (
                <div style={{
                    display: 'flex',
                    justifyContent: 'flex-end',
                    alignItems: 'center',
                    gap: '16px',
                    marginTop: '10px'
                }}>
                   

                    <button
                        onClick={async () => {
                            try {
                                //create a promise for each submission that is in the edited list
                                await Promise.all(
                                    Object.entries(editedScores).map(([submissionId, score]) =>
                                        axios.post(`${process.env.REACT_APP_API_HOST}/submissions/manual-regrade`, {
                                            submissionId: Number(submissionId),
                                            score: Number(score)
                                        })
                                    )
                                );
                                setHasChanges(false); //no more changes
                                //update local state map the previous submissions to the editedScores
                                setSubmissions(prev => {
                                    return prev.map(submission => ({
                                        ...submission,
                                        score: editedScores[submission.id] ?? submission.score //nullish returns right side if left is null
                                    }))
                                })
                            } catch (error) {
                                console.error('Failed to update grades:', error);
                            }
                        }}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '16px'
                        }}
                    >
                        Update Grades
                    </button>
                </div>
            )}
        </>
    );
};

export default SubmissionList;