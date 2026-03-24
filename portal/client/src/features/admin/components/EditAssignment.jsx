import React from 'react';
import { useEffect, useState } from 'react';
import axios from 'axios';
import DatePicker from "react-datepicker";
import "react-datepicker/dist/react-datepicker.css"; // Import the CSS file

const EditAssignment = ({ setSelectedAssignmentId,
    selectedAssignmentObj,
    onAssignmentDelete,
    onAssignmentUpdate }) => {
    const [hasChanges, setHasChanges] = useState(false);
    const [title, setTitle] = useState(selectedAssignmentObj.title);
    const [dueDate, setDueDate] = useState(selectedAssignmentObj.dueDate);
    const [showExplanations, setShowExplanations] = useState(selectedAssignmentObj.showExplanations);
    const [isDraft, setIsDraft] = useState(selectedAssignmentObj.isDraft);
    const [sections, setSections] = useState([]);
    const [pickerDate, setPickerDate] = useState(dueDate ? new Date(dueDate) : null);
    const [selectedSectionIds, setSelectedSectionIds] = useState(
        (selectedAssignmentObj.sections || []).map(sec => Number(sec.sectionId))
    );

    //FETCH THE SECTIONS 
    useEffect(() => {
        const fetchSections = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_HOST}/sections`);
                setSections(res.data || []);
            } catch (err) {
                console.error('Failed to load sections', err.message);
            }
        };
        fetchSections();
    }, []);

    //SET EVERYTHING 
    useEffect(() => {
        setTitle(selectedAssignmentObj.title);
        setDueDate(selectedAssignmentObj.dueDate);
        setShowExplanations(selectedAssignmentObj.showExplanations);
        setIsDraft(selectedAssignmentObj.isDraft);
        setSelectedSectionIds((selectedAssignmentObj.sections || []).map(sec => Number(sec.sectionId)));
        setHasChanges(false);
    }, [selectedAssignmentObj]); //when selection changes, update field in assignment details

    const handleSectionChange = (event) => {
        const ids = Array.from(event.target.selectedOptions, option => Number(option.value));
        setSelectedSectionIds(ids);
        setHasChanges(true);
    };

    const toggleSectionSelection = () => {
        if (!sections.length) return;
        if (selectedSectionIds.length === sections.length) {
            setSelectedSectionIds([]);
        } else {
            setSelectedSectionIds(sections.map(sec => sec.id));
        }
        setHasChanges(true);
    };

    const handleDelete = async () => {
        try {
            const response = await axios.delete(`${process.env.REACT_APP_API_HOST}/assignments/delete-assignment/${selectedAssignmentObj.id}`);
            console.log('Assignment Deleted!');
            setSelectedAssignmentId(-1);
            if (onAssignmentDelete) onAssignmentDelete(response.data);
        } catch (err) {
            console.error('Error in deleteAssignment', err.message);
        }
    }

    const handleUpdate = async () => {
        try {
            const resolvedSectionIds = selectedSectionIds.length
                ? selectedSectionIds
                : sections.map(sec => sec.id);

            const response = await axios.put(`${process.env.REACT_APP_API_HOST}/assignments/${selectedAssignmentObj.id}`, {
                title,
                dueDate,
                showExplanations,
                isDraft,
                sectionIds: resolvedSectionIds
            });
            if (response.data) {
                setHasChanges(false);
                setSelectedSectionIds((response.data.sections || []).map(sec => Number(sec.sectionId)));
            }
            if (onAssignmentUpdate) onAssignmentUpdate(response.data);

            //REGRADE SUBMISSION WITH WORKER
            await axios.post(`${process.env.REACT_APP_API_HOST}/submissions/update-late-grade`, {
                assignmentId: selectedAssignmentObj.id
            });
        } catch (err) {
            console.error('error in AssignmentDetails handleUpdate->', err);
        }
    };

    const handlePickerChange = (date) => {
        setPickerDate(date);
        setDueDate(date ? date.toISOString() : null);
        setHasChanges(true);
    };

    return (
        <div style={{
            maxWidth: '600px',
            margin: '20px auto',
            padding: '20px',
            border: '1px solid #ddd',
            borderRadius: '8px',
            backgroundColor: '#f9f9f9'
        }}>
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>Edit Assignment Details</h3>

            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Title:</label>
                <input
                    type="text"  // Changed from "string" to "text"
                    value={title}
                    onChange={(e) => {
                        setTitle(e.target.value);
                        setHasChanges(true);
                    }}
                    style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}
                />
            </div>
            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Due Date & Time:</label>
            
                <DatePicker
                    selected={pickerDate}
                    onChange={handlePickerChange}
                    showTimeSelect
                    timeIntervals={15}
                    dateFormat="yyyy-MM-dd h:mm aa"
                    placeholderText="Select due date and time"
                    className="your-input-styles"
                />
            </div>

            {/* SHOW ASSIGNMENT TYPE  */}
            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Assignment Type: </label>
                <p>{selectedAssignmentObj.type}</p>
            </div>

            <div style={{ marginBottom: '20px' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold'
                }}>
                    Assign to Sections:
                </label>
                <select
                    multiple
                    value={selectedSectionIds.map(String)}
                    onChange={handleSectionChange}
                    disabled={!sections.length}
                    size={Math.min(6, Math.max(sections.length, 1))}
                    style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}
                >
                    {sections.length === 0 && (
                        <option value="" disabled>No sections available</option>
                    )}
                    {sections.map(sec => (
                        <option key={sec.id} value={sec.id}>
                            {sec.name || `Section ${sec.id}`}
                        </option>
                    ))}
                </select>
                <div style={{ marginTop: '8px', textAlign: 'right' }}>
                    <button
                        type="button"
                        onClick={toggleSectionSelection}
                        disabled={!sections.length}
                        style={{
                            padding: '6px 10px',
                            backgroundColor: '#6c757d',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            fontSize: '12px',
                            cursor: sections.length ? 'pointer' : 'not-allowed'
                        }}
                    >
                        {sections.length && selectedSectionIds.length === sections.length ? 'Clear Selection' : 'Select All'}
                    </button>
                </div>
                <small style={{ display: 'block', marginTop: '6px', color: '#555' }}>
                    Hold Ctrl (Windows/Linux) or Command (Mac) to select multiple sections.
                </small>
            </div>

            {/* SHOW EXPLANATIONS CHECK BOX */}
            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Show Explanations to students:</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={showExplanations}
                        onChange={(e) => { setShowExplanations(e.target.checked); setHasChanges(true); }}
                    />
                    <span style={{ fontSize: '14px' }}>{showExplanations ? 'Explanations visible' : 'Click to show explanations'}</span>
                </label>
            </div>

            {/* SHOW IS DRAFT */}
            <div style={{ marginBottom: '10px' }}>
                <label style={{ display: 'block', marginBottom: '5px', fontWeight: 'bold' }}>Show Assignment to students:</label>
                <label style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                    <input
                        type="checkbox"
                        checked={!isDraft}
                        onChange={(e) => { setIsDraft(!e.target.checked); setHasChanges(true); }}
                    />
                    <span style={{ fontSize: '14px' }}>{isDraft ? 'Click to publish' : 'Published'}</span>
                </label>
            </div>


            {/* UPDATE BUTTON */}
            {hasChanges && (
                <div style={{
                    display: 'left',
                    justifyContent: 'flex-end',
                    marginTop: '10px'
                }}>
                    <button
                        onClick={handleUpdate}
                        style={{
                            padding: '8px 16px',
                            backgroundColor: '#28a745',
                            color: 'white',
                            border: 'none',
                            borderRadius: '4px',
                            cursor: 'pointer'
                        }}
                    >
                        Update Assignment
                    </button>
                </div>
            )}
            <br></br>

            {/* 
            DELETE BUTTON  */}
            <div style={{
                display: 'center',
                justifyContent: 'flex-end',
                marginTop: '10px'
            }}>
                <button
                    onClick={handleDelete}
                    style={{
                        padding: '8px 16px',
                        backgroundColor: '#c7173aff',
                        color: 'white',
                        border: 'none',
                        borderRadius: '4px',
                        cursor: 'pointer'
                    }}
                >
                    Delete Assignment
                </button>

            </div>
        </div>
    );
};

export default EditAssignment;