import axios from 'axios';
import { useEffect, useState } from 'react';

//WHEN CREATING A NEW ASSIGNMENT, ALSO CREATE A NEW, EMPTY LAB
const CreateAssignment = ({ onAssignmentCreate }) => {
    const apiUrl = process.env.REACT_APP_API_HOST;
    const [title, setTitle] = useState('');
    const [dueDate, setDueDate] = useState('');
    const [type, setType] = useState('');
    const [sections, setSections] = useState([]);
    const [selectedSectionIds, setSelectedSectionIds] = useState([]);
    const [error, setError] = useState('');
    const [success, setSuccess] = useState('');

    useEffect(() => {
        const loadSections = async () => {
            try {
                const res = await axios.get(`${process.env.REACT_APP_API_HOST}/sections`);
                const list = res.data || [];
                setSections(list);
                setSelectedSectionIds(list.map(sec => sec.id));
            } catch (err) {
                console.error('Failed to load sections', err.message);
            }
        };
        loadSections();
    }, []);

    const handleSectionChange = (event) => {
        //from(copies each option into a real array and runs mapping function)
        //extract dom elements to an array of section id numbers
        const ids = Array.from(event.target.selectedOptions, opt => Number(opt.value));
        console.log('ids->>',ids);
        setSelectedSectionIds(ids);
    };

    const toggleSectionSelection = () => {
        if (selectedSectionIds.length === sections.length) {
            setSelectedSectionIds([]);
        } else {
            setSelectedSectionIds(sections.map(sec => sec.id));
        }
    };

    const handleSubmit = async (e) => {
        e.preventDefault();
        setError('');
        setSuccess('');
        const sectionIds = selectedSectionIds.length ? selectedSectionIds : sections.map(sec => sec.id);
        try {
            const assignment = await axios.post(`${apiUrl}/assignments`, {
                title,
                dueDate,
                type,
                sectionIds,
                submissions:[]
            });
            //create assignment and then lab
            let lab;
            try {
                lab = await axios.post(`${process.env.REACT_APP_API_LAB_HOST}/lab/upsert-lab`, {
                    title,
                    blocks: [],
                    assignmentId: Number(assignment.data.id)
                });
            //then update the assignment with the lab id
                await axios.put(`${apiUrl}/assignments/${assignment.data.id}`, {
                    labId: Number(lab.data.id)
                });
            } catch (err) {
                console.error('Error trying to upsert lab or update assignment', err.message);
            }

            setSuccess('Assignment Created');
            setTitle('');
            setDueDate('');
            setSelectedSectionIds(sections.map(sec => sec.id));

            const updatedAssignment = {
                ...assignment.data,
                labId: lab?.data?.id
            };

            if (onAssignmentCreate) onAssignmentCreate(updatedAssignment); //update UI (parent component)
        } catch (err) {
            setError(err.message || 'Failed to create assignment');
        }
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
            <h3 style={{ textAlign: 'center', marginTop: 0 }}>Create New Assignment</h3>

            <form onSubmit={handleSubmit}>
                <div style={{ marginBottom: '15px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '5px',
                        fontWeight: 'bold'
                    }}>
                        Assignment Title:
                    </label>
                    <input
                        type="text"
                        placeholder="Enter assignment title (e.g., Java Basics)"
                        value={title}
                        onChange={e => setTitle(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                </div>

                <div style={{ marginBottom: '15px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '5px',
                        fontWeight: 'bold'
                    }}>
                        Due Date:
                    </label>
                    <input
                        type="datetime-local"
                        value={dueDate}
                        onChange={e => setDueDate(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    />
                </div>
        {/* SECTION SELECTION */}
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
                        disabled={!sections.length} //empty list
                        size={Math.min(6, Math.max(sections.length, 1))} //how many options are visible at once
                        //min 6 or size of section list
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
                            onClick={toggleSectionSelection} //select all or none
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
                            {selectedSectionIds.length === sections.length ? 'Clear Selection' : 'Select All'}
                        </button>
                    </div>
                    <small style={{ display: 'block', marginTop: '6px', color: '#555' }}>
                        Hold Ctrl (Windows/Linux) or Command (Mac) to select multiple sections.
                    </small>
                </div>

                <div style={{ marginBottom: '20px' }}>
                    <label style={{
                        display: 'block',
                        marginBottom: '5px',
                        fontWeight: 'bold'
                    }}>
                        Submission Type:
                    </label>
                    <select
                        name="type"
                        value={type}
                        onChange={e => setType(e.target.value)}
                        required
                        style={{
                            width: '100%',
                            padding: '8px',
                            border: '1px solid #ccc',
                            borderRadius: '4px',
                            fontSize: '14px'
                        }}
                    >
                        <option value="">Select type</option>
                        <option value="github">GitHub Repository</option>
                        <option value="lab">Lab</option>
                    </select>
                </div>

                <button type="submit" style={{
                    width: '100%',
                    padding: '10px',
                    backgroundColor: '#007bff',
                    color: 'white',
                    border: 'none',
                    borderRadius: '4px',
                    fontSize: '16px'
                }}>
                    Create
                </button>

                {error && <div style={{ color: 'red', marginTop: 8 }}>{error}</div>}
                {success && <div style={{ color: 'green', marginTop: 8 }}>{success}</div>}
            </form>
        </div>
    );
};

export default CreateAssignment;