import axios from 'axios';
import { useEffect, useState } from 'react';
import StudentSubmitGithub from '../components/StudentSubmitGithub.jsx';
import StudentSubmissionList from '../components/StudentSubmissionList.jsx';
import LatePolicyInfo from '../components/LatePolicyInfo.jsx';
import Navbar from '../../../shared/Navbar.jsx';
import LabPreview from '../../lab/components/LabPreview.jsx';
import StudentAssignmentMenu from '../components/StudentAssignmentMenu.jsx';

const StudentDashboard = ({ user, onLogout }) => {
    //for lab preview
    const [blocks, setBlocks] = useState([]);
    const [title, setTitle] = useState('');

    const [submissions, setSubmissions] = useState([]);
    const [assignments, setAssignments] = useState([]);
    const [selection, setSelection] = useState(); //work, submit, late or create, a, create l , test
    const [selectedAssignmentId, setSelectedAssignmentId] = useState(-1);

//GET ALL ASSIGNMENTS and  SUBMISSIONS
    useEffect(() => {
        console.log('here is the user object in student dashboard', user);
    },[user]);
    useEffect(() => {
        const fetchData = async () => {
            try {
                const subRes = await axios.get(`${process.env.REACT_APP_API_HOST}/submissions`);
                //filter the subs by the user id and is the assignment of the submission is published
                const subs = subRes.data.filter(sub => (sub.userId === user.id && !sub.assignment?.isDraft));
                setSubmissions(subs);

                const assignmentRes = await axios.get(`${process.env.REACT_APP_API_HOST}/assignments`, {
                    role: user?.role
                });
                const filterAssignments = assignmentRes.data.filter(assignment => {
                    const sectionList = assignment.sections || []; //example [13,14,18] 
                    //user does not have sectionId or sectionList from assignment is empty
                    if (!user.sectionId || sectionList.length === 0) return true; //will return true for every, item
                    //which means all assignments will be set in allowedAssignments
                    
                    //find at least one sectionId in sectionList that equals the user's sectionId
                    return sectionList.some(sec => Number(sec.sectionId) === Number(user.sectionId));
                });
                setAssignments(filterAssignments);
            } catch (err) {
                console.error('Error fetching data:', err);
            }

        };
        fetchData();
    }, [user?.id, user?.role, user?.sectionId]);

    //FIND SELECTED ASSIGNMENT OBJECT 
    const selectedAssignmentObj = assignments.find(a => a.id === Number(selectedAssignmentId));
    //SET LAB TITLE 
    useEffect(()=>{
        if(selectedAssignmentObj?.labId){
            setTitle(selectedAssignmentObj.title || 'Untitled Lab');
        }else{
            setTitle('NULL');
        }

    },[selectedAssignmentObj]);


    //UPDATE SUBMISSIONS
    const updateSubmissions = (childData) => {
        setSubmissions(prev =>
            [
                ...prev.filter(sub => String(sub.assignmentId) !== String(childData.assignmentId)),
                childData
            ]
        );
    };

    return (
        <div style={{
            minHeight: '100vh',
            height: '100vh',
            backgroundColor: '#f8fafc',
            padding: '24px'
        }}>
            {/* ✨ Navbar at the top */}
            <Navbar
                user={user}
                onSelect={setSelection}
                onLogout={onLogout}
                assignmentTitle={selectedAssignmentObj?.title}
                assignmentType={selectedAssignmentObj?.type ?? ''}
                assignmentId={selectedAssignmentId}
                currentTab={selection}
            />

            {/* ✨ Main Content Layout */}
            <div style={{
                display: 'flex',
                flexGrow: 1,
                gap: '32px',
                alignItems: 'stretch',
                minHeight: '60vh',
                width: '100%',
                marginTop: '24px', // added space between navbar and content
            }}>

                {selection === 'github' && user && (
                    <div style={{ width: '100%', maxWidth: 900 }}>
                        <StudentSubmitGithub
                            githubUsername={user.githubUsername}
                            userId={user.id}
                            onUpdateSubmission={updateSubmissions}
                            submissions={submissions}
                            selectedAssignmentId={selectedAssignmentId}
                        />
                    </div>

                )}

                {selection === 'lab' && user && (
                    //  blocks, setBlocks, title, setTitle, id, setId, mode = 'student', userId, username 
                    <LabPreview
                        blocks={blocks}
                        setBlocks={setBlocks}
                        title={title}
                        setTitle={setTitle}
                        assignmentId={selectedAssignmentId}
                        userId={user.id}
                        username={user.username}
                        mode={user.role}
                        labId={selectedAssignmentObj?.labId ?? null}
                        selectedAssignmentDueDate={selectedAssignmentObj?.dueDate}
                        onUpdateSubmission={updateSubmissions}
                        showExplanations={selectedAssignmentObj?.showExplanations}
                    />
                )}

                {selection === 'view' && user && (
                    <div style={{
                        display: 'flex',
                        justifyContent: 'center',    // center horizontally
                        alignItems: 'flex-start',
                        width: '100%',
                        padding: '16px 0'
                    }}>
                        <div style={{ width: '100%', maxWidth: 900, display: 'flex', flexDirection: 'column', gap: '16px' }}>
                            <StudentAssignmentMenu
                                setSelectedAssignmentId={setSelectedAssignmentId}
                                selectedAssignmentId={selectedAssignmentId}
                                assignments={assignments}
                            />

                            <StudentSubmissionList
                                submissions={submissions}
                                assignments={assignments}
                            />
                        </div>
                    </div>
                )}

                {selection === 'late' && user && <LatePolicyInfo />}
            </div>
        </div>
    );
};

export default StudentDashboard;
