import React, { useState } from 'react';
import { useMemo } from 'react';

const AdminAssignmentMenu = ({
    setSelectedAssignmentId,
    selectedAssignmentId,
    assignments,
    setTitle,
    sections
}) => {

    const [expandedSections, setExpandedSections] = useState({});

    const sectionColors = [
        '#e8f0f7', // muted blue
        '#f0e8f5', // muted purple
        '#e8f3e8', // muted green
        '#f7f0e8', // muted orange/beige
        '#f5e8f0', // muted pink
        '#e8f3f1', // muted teal
        '#f3f5e8', // muted lime/yellow
        '#ede8f3', // muted deep purple
    ];

    // Group assignments by section and sort by due date (oldest to newest)
    const assignmentsBySection = useMemo(() => {
        const grouped = {};

        assignments.forEach(assignment => {
            const sectionIds = assignment.sections?.map(s => s.sectionId) || [];

            if (sectionIds.length === 0) {
                if (!grouped['unassigned']) grouped['unassigned'] = [];
                grouped['unassigned'].push(assignment);
            } else {
                sectionIds.forEach(sId => {
                    if (!grouped[sId]) grouped[sId] = [];
                    grouped[sId].push(assignment);
                });
            }
        });

        // Sort assignments in each section by id (oldest to newest)
        Object.keys(grouped).forEach(key => {
            grouped[key].sort((a, b) => a.id - b.id);//swap if evalution is negative
        });

        return grouped;
    }, [assignments]);

    const toggleSection = (sectionId) => {
        setExpandedSections(prev => ({
            ...prev,
            [sectionId]: !prev[sectionId]
        }));
    };

    const handleAssignmentClick = (assignment) => {
        setSelectedAssignmentId(assignment.id);
        setTitle(assignment.title ?? '');
    };

    return (<>
        <div style={{
            maxWidth: '600px',
            margin: '20px auto',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
        }}>
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>Select or Create Assignment</h3>

            {/* CREATE NEW ASSIGNMENT BUTTON */}
            <button
                onClick={() => setSelectedAssignmentId(-2)}
                style={{
                    width: '100%',
                    padding: '12px',
                    marginBottom: '20px',
                    backgroundColor: '#b1f3b3ff',
                    color: 'black',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '14px',
                    fontWeight: 'bold',
                    cursor: 'pointer'
                }}
            >
                ➕ Create New Assignment
            </button>

            {/* SECTIONS WITH COLLAPSIBLE ASSIGNMENTS */}
            <div style={{ marginBottom: '15px' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '10px',
                    fontWeight: 'bold'
                }}>
                    Assignments by Section:
                </label>

                {sections?.map((section, idx) => {
                    const sectionAssignments = assignmentsBySection[section.id] || [];
                    //if (sectionAssignments.length === 0) return null;
                    
                    const bgColor = sectionColors[idx % sectionColors.length];
                    const isExpanded = expandedSections[section.id];
                    
                    return (
                        <div key={section.id} style={{ marginBottom: '8px' }}>
                            {/* Section Header - Clickable */}
                            <div
                                onClick={() => toggleSection(section.id)}
                                style={{
                                    backgroundColor: bgColor,
                                    padding: '12px 16px',
                                    borderRadius: '4px',
                                    cursor: 'pointer',
                                    fontWeight: 'bold',
                                    display: 'flex',
                                    justifyContent: 'space-between',
                                    alignItems: 'center',
                                    transition: 'all 0.2s',
                                    border: '2px solid transparent'
                                }}
                                onMouseEnter={(e) => e.currentTarget.style.opacity = '0.8'}
                                onMouseLeave={(e) => e.currentTarget.style.opacity = '1'}
                            >
                                <span>{section.name} ({sectionAssignments.length})</span>
                                <span style={{ fontSize: '18px' }}>
                                    {isExpanded ? '▼' : '▶'}
                                </span>
                            </div>

                            {/* Assignment List - Expandable */}
                            {isExpanded && (
                                <div style={{
                                    marginTop: '4px',
                                    marginLeft: '16px',
                                    border: `2px solid ${bgColor}`,
                                    borderRadius: '4px',
                                    overflow: 'hidden'
                                }}>
                                    {sectionAssignments.map((ass, assIdx) => {
                                        const isSelected = selectedAssignmentId === ass.id;
                                        
                                        return (
                                            <div
                                                key={ass.id}
                                                onClick={() => handleAssignmentClick(ass)}
                                                style={{
                                                    padding: '10px 16px',
                                                    cursor: 'pointer',
                                                    backgroundColor: isSelected ? '#fff' : 'transparent',
                                                    borderLeft: isSelected ? '4px solid #2196F3' : '4px solid transparent',
                                                    borderBottom: assIdx < sectionAssignments.length - 1 ? '1px solid #e0e0e0' : 'none',
                                                    fontWeight: isSelected ? 'bold' : 'normal',
                                                    transition: 'all 0.2s'
                                                }}
                                                onMouseEnter={(e) => {
                                                    if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f5f5';
                                                }}
                                                onMouseLeave={(e) => {
                                                    if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                                }}
                                            >
                                                <span>{ass.title}</span>
                                                {ass.type && (
                                                    <span style={{
                                                        marginLeft: '8px',
                                                        padding: '2px 8px',
                                                        fontSize: '11px',
                                                        fontWeight: 'bold',
                                                        borderRadius: '3px',
                                                        backgroundColor: ass.type === 'lab' ? '#4CAF50' : '#2196F3',
                                                        color: 'white'
                                                    }}>
                                                        {ass.type === 'lab' ? 'LAB' : 'GITHUB'}
                                                    </span>
                                                )}
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    );
                })}

                {/* Unassigned assignments */}
                {assignmentsBySection['unassigned']?.length > 0 && (
                    <div style={{ marginBottom: '8px', marginTop: '16px' }}>
                        <div
                            onClick={() => toggleSection('unassigned')}
                            style={{
                                backgroundColor: '#ffebee',
                                padding: '12px 16px',
                                borderRadius: '4px',
                                cursor: 'pointer',
                                fontWeight: 'bold',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}
                        >
                            <span>⚠️ Unassigned ({assignmentsBySection['unassigned'].length})</span>
                            <span style={{ fontSize: '18px' }}>
                                {expandedSections['unassigned'] ? '▼' : '▶'}
                            </span>
                        </div>

                        {expandedSections['unassigned'] && (
                            <div style={{
                                marginTop: '4px',
                                marginLeft: '16px',
                                border: '2px solid #ffebee',
                                borderRadius: '4px',
                                overflow: 'hidden'
                            }}>
                                {assignmentsBySection['unassigned'].map((ass, assIdx) => {
                                    const isSelected = selectedAssignmentId === ass.id;
                                    return (
                                        <div
                                            key={ass.id}
                                            onClick={() => handleAssignmentClick(ass)}
                                            style={{
                                                padding: '10px 16px',
                                                cursor: 'pointer',
                                                backgroundColor: isSelected ? '#fff' : 'transparent',
                                                borderLeft: isSelected ? '4px solid #2196F3' : '4px solid transparent',
                                                borderBottom: assIdx < assignmentsBySection['unassigned'].length - 1 ? '1px solid #e0e0e0' : 'none',
                                                fontWeight: isSelected ? 'bold' : 'normal',
                                                transition: 'all 0.2s'
                                            }}
                                            onMouseEnter={(e) => {
                                                if (!isSelected) e.currentTarget.style.backgroundColor = '#f5f5f5';
                                            }}
                                            onMouseLeave={(e) => {
                                                if (!isSelected) e.currentTarget.style.backgroundColor = 'transparent';
                                            }}
                                        >
                                            {ass.title}
                                        </div>
                                    );
                                })}
                            </div>
                        )}
                    </div>
                )}
            </div>

        </div>
    </>);
}

export default AdminAssignmentMenu;