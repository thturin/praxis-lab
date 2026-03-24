import React from 'react';

const SectionSelection = ({selectedSection, setSelectedSection, sections})=>(
    <>

            <div style={{ marginBottom: '15px' }}>
                <label style={{
                    display: 'block',
                    marginBottom: '5px',
                    fontWeight: 'bold'
                }}>
                    Section:
                </label>
                <select
                    value={selectedSection}
                    onChange={e => setSelectedSection(e.target.value)}
                    style={{
                        width: '100%',
                        padding: '8px',
                        border: '1px solid #ccc',
                        borderRadius: '4px',
                        fontSize: '14px'
                    }}
                >
                    <option value="-1">All Sections</option>
                    {sections.map(sec => (
                        <option key={sec.id} value={sec.id}>
                            {sec.name}
                        </option>
                    ))}
                </select>
            </div>
    </>
)



export default SectionSelection;