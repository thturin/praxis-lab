import axios from 'axios';
import {useEffect, useState } from 'react';
import Navbar from '../../../shared/Navbar';
import AdminAssignmentMenu from '../components/AdminAssignmentMenu';
import SubmissionList from '../components/SubmissionList';
import JupiterExportButton from '../components/JupiterExportButton';
import SectionSelection from '../components/SectionSelection';
import LabBuilder from '../../lab/components/LabBuilder';
import LabPreview from '../../lab/components/LabPreview';
import SubmissionRegrade from '../components/SubmissionRegrade';
import CreateAssignment from '../components/CreateAssignment';
import EditAssignment from '../components/EditAssignment';
//import AnalyticsDashboard from './AnalyticsDashboard';
import { AnalyticsDashboard } from './AnalyticsDashboard';


const AdminDashboard = ({ user, onLogout }) => {
    //for lab-builder/preview
    const [blocks, setBlocks] = useState([]);
    const [title, setTitle] = useState('');
    const [aiPrompt, setAiPrompt] = useState();


    const [assignments, setAssignments] = useState([]);
    const [submissions, setSubmissions] = useState([]);
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(-1);
    const [sections, setSections] = useState([]);
    const [selectedSection, setSelectedSection] = useState('');
    const [editedScores, setEditedScores] = useState({}); //for editing scores on submission list
    const [hasChanges, setHasChanges] = useState(false);  //for submissionLIst when updating scores. 
    const [currentTab, setCurrentTab] = useState('');
    const [selectedSubmissionId, setSelectedSubmissionId] = useState(null);
    const [labRefreshKey, setLabRefreshKey] = useState(0);

    // useEffect(()=>{
    //     console.log('hello labrefresh key');
    // },[labRefreshKey,setLabRefreshKey]);

 
    const selectedSubmission = submissions.find(
        sub => sub.id === Number(selectedSubmissionId)
    );

    const selectedAssignmentObj = assignments.find(  //this will execute on any render
        ass => ass.id === Number(selectedAssignmentId)
    );

    const filteredSubs = submissions.filter(
        sub => {
            if (!selectedAssignmentId) return false;
            if (!selectedSection) {
                return sub.assignmentId === Number(selectedAssignmentId);
            } else {
                return sub.assignmentId === Number(selectedAssignmentId) && sub.user?.sectionId === Number(selectedSection);
            }
        }
    );

    // const onUpdateSubmission = (updatedSubmission)=>{
    //     setSubmissions(prev=>prev.map(sub=>{
    //         if (sub.id === updatedSubmission.id) {
    //             return {
    //                 ...sub,
    //                 score: updatedSubmission.score
    //             }
    //         }
    //         return sub;
    //     }))
    // };


    //fetch assignmenbts, submissions, and sections
    useEffect(() => {
        const fetchData = async () => {
            try {
                const [assignmentsRes, submissionsRes, sectionsRes] = await Promise.all([
                    axios.get(`${process.env.REACT_APP_API_HOST}/assignments`),
                    axios.get(`${process.env.REACT_APP_API_HOST}/submissions`),
                    axios.get(`${process.env.REACT_APP_API_HOST}/sections`)
                ]);
                setAssignments(assignmentsRes.data);
                setSubmissions(submissionsRes.data);
                setSections(sectionsRes.data);
            } catch (err) {
                console.error('Error fetching admin dashboard data:', err);
            }
        };

        fetchData();
    }, [labRefreshKey]);

    const handleAiPromptChange = async (prompt) => {
        //update lab with new aiPrompt
        setAiPrompt(prompt);
        if (!selectedAssignmentId) return;
        try {
            await axios.post(`${process.env.REACT_APP_API_LAB_HOST}/lab/update-lab-prompt`, {
                assignmentId:selectedAssignmentId,
                aiPrompt: prompt
            });
        } catch (err) {
            console.error('Failed to save AI prompt', err.message);
        }
    }

    const onAssignmentUpdate = (updatedAssignment) => {
        //gt previous assignments->map it and compare each assignment id to updatedAssignment Id. change that assignment when found
        setAssignments(prev => prev.map(ass => {
            return ass.id === updatedAssignment.id ? updatedAssignment : ass;
        }));
    }

    const onAssignmentCreate = (newAssignment) => {
        //default to the newly created assignment as the slelectedAssignmentId
        setSelectedAssignmentId(newAssignment.id);
        setAssignments(prev => [...prev, newAssignment]);
    }

    const onAssignmentDelete = (deleteAssignment) => {
        //deleteAssignment = {assignmentId:18}
        setSubmissions(prev => prev.filter(ass => Number(ass.assignmentId) !== Number(deleteAssignment.assignmentId)));
        setAssignments(prev => prev.filter(ass => Number(ass.id) !== Number(deleteAssignment.assignmentId)));
        // console.log(assignments);
        // console.log(submissions);
    }

    const handleSubmissionUpdate = (newScore) => {
        setSubmissions(prev => prev.map(sub => {
            if (sub.id === Number(selectedSubmissionId)) {
                return {
                    ...sub,
                    score: newScore
                };
            }
            return sub;
        }));
    };

    const handleTabSelect = (tab) => {
        setCurrentTab(tab);
    }

    return (
        <div>
            <Navbar user={user}
                onSelect={handleTabSelect}
                onLogout={onLogout}
                assignmentTitle={selectedAssignmentObj?.title}
                assignmentType={selectedAssignmentObj?.type}
                assignmentId={selectedAssignmentId}
                currentTab={currentTab}
            />
            <div style={{ marginTop: '80px' }}>  {/* Add space below navbar */}


                {currentTab === 'review' && (
                    <>
                        <div style={{
                            maxWidth: '1000px',
                            margin: '20px auto',
                            padding: '20px',
                            border: '1px solid #ddd',
                            borderRadius: '8px',
                            backgroundColor: '#f9f9f9'
                        }}>
                            {/* JUPITER EXPORT BUTTON */}
                            <div style={{ display: 'inline-block', transform: 'scale(0.8)', transformOrigin: 'top left' }}>
                                <JupiterExportButton
                                    selectedAssignmentId={selectedAssignmentId}
                                    filteredSubsLength={filteredSubs.length}
                                    selectedSection={selectedSection}
                                />
                            </div>
                            {/* DROP DOWN MENU FOR SECTION */}
                            <SectionSelection
                                setSelectedSection={setSelectedSection}
                                selectedSection={selectedSection}
                                sections={sections}
                            />

                            <SubmissionRegrade
                                assignmentId={selectedAssignmentId}
                                onRegradeApplied={() => setLabRefreshKey(key => key + 1)}
                                selectedSection={selectedSection}
                                submissions={filteredSubs}
                            />

                            <SubmissionList
                                filteredSubs={filteredSubs}
                                selectedAssignmentObj={selectedAssignmentObj}
                                editedScores={editedScores}
                                setEditedScores={setEditedScores}
                                setHasChanges={setHasChanges}
                                hasChanges={hasChanges}
                                setSubmissions={setSubmissions}
                                setSelectedSubmissionId={setSelectedSubmissionId}
                                selectedSubmissionId={selectedSubmissionId}
                                reloadKey={labRefreshKey}
                            />


                            {/* SHOW LAB PREVIEW OF SELECTED SUBMISSION */}
                            {selectedSubmission && selectedAssignmentObj?.type === 'lab' && (
                                <div style={{
                                    maxWidth: '900px',
                                    margin: '20px auto',
                                    padding: '20px',
                                    border: '2px solid #007bff',
                                    borderRadius: '8px',
                                    backgroundColor: '#f8f9fa'
                                }}>
                                    <h3 style={{ color: '#007bff', marginTop: 0 }}>
                                        Viewing: {selectedSubmission.user?.name || 'Unknown'}'s Submission
                                    </h3>
                                    <p style={{ color: '#666', margin: '0 0 20px 0' }}>
                                        Score: {selectedSubmission.score ?? 'Not graded'} |
                                        Submitted: {selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString() : 'Unknown'}
                                    </p>
                                    <LabPreview
                                        blocks={blocks}
                                        setBlocks={setBlocks}
                                        title={title}
                                        setTitle={setTitle}
                                        assignmentId={selectedAssignmentId}
                                        mode='admin'
                                        userId={selectedSubmission.userId}
                                        username={selectedSubmission.user.username}
                                        labId={selectedAssignmentObj.labId}
                                        showExplanations={selectedAssignmentObj.showExplanations}
                                        readOnly={true}
                                        handleAiPromptChange={handleAiPromptChange}
                                        aiPrompt={aiPrompt}
                                        setAiPrompt={setAiPrompt}
                                        reloadKey={labRefreshKey} 
                                        selectedAssignmentDueDate={undefined} 
                                        onUpdateSubmission={handleSubmissionUpdate}
                                    />
                                </div>
                            )}
                        {/* IF ASSIGNMENT IS GITHUB THEN OPEN REPOSITORY LINK */}
                            {selectedSubmission && selectedAssignmentObj?.type === 'github' && (
                                <div style={{
                                    maxWidth: '900px',
                                    margin: '20px auto',
                                    padding: '20px',
                                    border: '2px solid #28a745',
                                    borderRadius: '8px',
                                    backgroundColor: '#f8fff9'
                                }}>
                                    <h3 style={{ color: '#28a745', marginTop: 0 }}>
                                        Viewing: {selectedSubmission.user?.name || 'Unknown'}'s GitHub Submission
                                    </h3>
                                    <p style={{ color: '#666', margin: '0 0 12px 0' }}>
                                        Score: {selectedSubmission.score ?? 'Not graded'} |
                                        Submitted: {selectedSubmission.submittedAt ? new Date(selectedSubmission.submittedAt).toLocaleString() : 'Unknown'}
                                    </p>
                                    {selectedSubmission.url ? (
                                        <>
                                            <a
                                                href={selectedSubmission.url}
                                                target="_blank"
                                                rel="noopener noreferrer"
                                                style={{
                                                    display: 'inline-block',
                                                    backgroundColor: '#007bff',
                                                    color: '#fff',
                                                    padding: '8px 14px',
                                                    borderRadius: '6px',
                                                    textDecoration: 'none',
                                                    fontWeight: 600
                                                }}
                                            >
                                                Open Repository
                                            </a>
                                            <div style={{ marginTop: 12 }}>
                                                <small style={{ color: '#666' }}>
                                                    URL:&nbsp;
                                                    <span style={{ wordBreak: 'break-all', color: '#333' }}>
                                                        {selectedSubmission.url}
                                                    </span>
                                                </small>
                                            </div>
                                        </>
                                    ) : (
                                        <span style={{ color: '#999' }}>No URL provided</span>
                                    )}
                                </div>
                            )}

                        </div>
                    </>
                )}

                {currentTab === 'create' && (
                    <div style={{ padding: '20px' }}>
                        {/* Side-by-side layout for assignment menu and edit/create form */}
                        <div style={{
                            display: 'flex',
                            gap: '20px',
                            marginBottom: '20px',
                            alignItems: 'flex-start'
                        }}>
                            {/* Left side - Assignment Menu */}
                            <div style={{ flex: '0 0 auto', minWidth: '600px' }}>
                                <AdminAssignmentMenu
                                    setSelectedAssignmentId={setSelectedAssignmentId}
                                    selectedAssignmentId={selectedAssignmentId}
                                    assignments={assignments}
                                    setTitle={setTitle}
                                    sections={sections}
                                />
                            </div>

                            {/* Right side - Create/Edit Form */}
                            <div style={{ flex: '1' }}>
                                {selectedAssignmentId === -2 && (
                                    <CreateAssignment onAssignmentCreate={onAssignmentCreate} />
                                )}
                                {selectedAssignmentObj && (
                                    <EditAssignment
                                        setSelectedAssignmentId={setSelectedAssignmentId}
                                        selectedAssignmentObj={selectedAssignmentObj}
                                        onAssignmentDelete={onAssignmentDelete}
                                        onAssignmentUpdate={onAssignmentUpdate}
                                    />
                                )}
                            </div>
                        </div>

                        {/* Lab Builder below */}
                        {selectedAssignmentObj?.type === 'lab' && (
                            <LabBuilder
                                blocks={blocks}
                                setBlocks={setBlocks}
                                title={selectedAssignmentObj?.title}
                                setTitle={setTitle}
                                assignmentId={selectedAssignmentId}
                                handleAiPromptChange={handleAiPromptChange}
                                aiPrompt={aiPrompt}
                                setAiPrompt={setAiPrompt}
                            />)
                        }
                    </div>
                )}

                {currentTab === 'manage' && (
                    <LabPreview
                        blocks={blocks}
                        setBlocks={setBlocks}
                        title={title}
                        setTitle={setTitle}
                        assignmentId={selectedAssignmentId}
                        mode='admin'
                        userId={user.id}
                        username={user.username}
                        labId={selectedAssignmentObj.labId}
                        showExplanations={selectedAssignmentObj.showExplanations}
                        handleAiPromptChange={handleAiPromptChange}
                        aiPrompt={aiPrompt}
                        setAiPrompt={setAiPrompt}
                        reloadKey={labRefreshKey} 
                        selectedAssignmentDueDate={undefined} 
                        readOnly={undefined} 
                        onUpdateSubmission={undefined}                    />
                )}

                {currentTab === 'analytics' && (
                    <AnalyticsDashboard/>
                )}
            </div>
        </div>
    );
}

export default AdminDashboard;
