import React, { useEffect, useState } from 'react';
import axios from 'axios';
import Spinner from '../../../shared/Spinner';
import Button from '../../../shared/Button';

const apiUrl = process.env.REACT_APP_API_HOST;
//set global axios defaults

//MAKE SURE AXIOS IS SEENDING SESSION COOKIES TO BACKEND
axios.defaults.withCredentials = true;

const StudentSubmitGithub = ({ onUpdateSubmission, githubUsername, userId, submissions, selectedAssignmentId }) => {

    const [url, setUrl] = useState('');
    const [assignments, setAssignments] = useState([]); //assignment list 
    const [score, setScore] = useState(null);
    const [error, setError] = useState('');
    const [submissionExists, setSubmissionExists] = useState(false);
    const [gradleOutput, setGradleOutput] = useState(''); //gradle test output
    const [verificationFeedback, setVerificationFeedback] = useState(''); //show googledoc feedback
    const [isSubmitting, setIsSubmitting] = useState(false);


    //FETCH ASSIGNMENTS and log the github username for debugging
    useEffect(() => { //useEffect() code to run after the component renders
        //useEffect let your perform actions (side effects) in your componenet, such as fetching api data
        async function fetchAssignments() {
            console.log('-------FETCHING ASSIGNMENTS----------');
            try {
                const res = await axios.get(`${apiUrl}/assignments`);
                setAssignments(res.data);
            } catch (err) {
                setError('Failed to load assignments');
            }
        }
        fetchAssignments();
        console.log('githubUsernaem',githubUsername);

    }, [githubUsername]); //re-run when the username used for verification changes

    const verifyGithubOwnership = async (url) => {
        const res = await axios.post(`${apiUrl}/verify-github-ownership`, {
            url,
            githubUsername
        });
        return res.data;
    };

    const handleSubmit = async (e) => { //on button click of form
        setSubmissionExists(false);
        e.preventDefault();
        setScore(null);
        setError('');
        setGradleOutput('');
        setVerificationFeedback('');
        setIsSubmitting(true);
        console.log('Submitting github url:', url);

        try {
            //VERIFY USER OWNERSHIP FOR GITHUB 
            try {
                console.log('Verifying github ownership for url:', url, 'and username:', githubUsername);
                const verifyRes = await verifyGithubOwnership(url);
                setVerificationFeedback(verifyRes.output);
                if (!verifyRes.success) return; //if promise is successfull but verification failed, return
            } catch (err) {
                console.error('error caught verifyGithubOwnership (client)', err);
                setError('Failed to verify github user');
                return;
            }

    //CHECK FOR EXISTING SUBMISSION
            const existingSubmission = submissions.find(
                sub => String(sub.assignmentId) === String(selectedAssignmentId)
            );

            const selectedAssignment = assignments.find(a=>String(a.id)===String(selectedAssignmentId));
            
            const data = {
                url,
                submissionId:existingSubmission?.id,
                assignmentId: selectedAssignmentId,
                userId,
                assignmentTitle: selectedAssignment?.title,
                dueDate: selectedAssignment?.dueDate
            };
//---------UPDATE OR CREATE SUBMISSION------------
            let response;
            try{
                response = await axios.post(`${apiUrl}/submissions/upsertGithub`,data);
                console.log('success', response.data);
            }catch(err){
                setError('Could not create or update github assignment');
                console.error('errror in upsertGithubSubmission',err);
            }
            setScore(response.data.result.score);
            setGradleOutput(response.data.result.output);
            onUpdateSubmission(response.data);
        } catch (err) {
            console.error(err);
            //if err.response exists -> if error.response.data exists, check the .error message
            setError(err.response?.data?.error || 'Submission Failed');
            setGradleOutput(err.response?.data?.output || '');
        } finally {
            setIsSubmitting(false); //for spinner 
        }
    };

    return (
        <div className="submit-form" style={{ marginTop: '80px' }}>
            <h3>Submit a Github Repository</h3>
            <form onSubmit={handleSubmit}>

                <label>
                    GitHub Repository URL
                </label>

                <input
                    type="url"
                    placeholder={'https://github.com/username/repo name'}
                    value={url}
                    onChange={(e) => {
                        setUrl(e.target.value.trim());
                    }}
                    required style={{ width: '400px', padding: '8px' }}
                />

                <Button
                    type='submit'
                    color='primary'
                    style={{
                        marginLeft: '10px',
                        opacity: isSubmitting ? 0.6 : 1,
                        cursor: isSubmitting ? 'not-allowed' : 'pointer'
                    }}
                    disabled={isSubmitting}
                >
                    {isSubmitting ? (
                        <>
                            <Spinner /> Running Tests...
                        </>
                    ) : (
                        'Submit'
                    )}

                </Button>
                {/* SUBMIT BUTTON */}

                <span style={{ color: 'green', marginLeft: '12px', verticalAlign: 'middle' }}>
                    {submissionExists ? "Resubmitted"
                        : (!error && "")
                    }
                </span>
            </form>

            {/* Loading indicator for gradle tests */}
            {isSubmitting && (
                <div style={{
                    marginTop: '20px',
                    padding: '15px',
                    backgroundColor: '#f0f8ff',
                    border: '1px solid #b0d4f1',
                    borderRadius: '4px',
                    textAlign: 'center'
                }}>
                    <Spinner />
                    <strong>Running Gradle Tests...</strong>
                    <div style={{ fontSize: '0.9em', color: '#666', marginTop: '5px' }}>
                        This may take 30-60 seconds. Please wait...
                    </div>
                </div>
            )}

            {/* SET VERIFICATION FEEDBACK */}
            {verificationFeedback && (
                <div style={{ marginTop: '15px', color: verificationFeedback.includes('not the owner') ? 'red' : 'green' }}>
                    {verificationFeedback}
                </div>
            )}
            {/*  OUTPUT SCORE AFTER SUBMISSION */}
            {score !== null && (
                <p style={{ marginTop: '20px' }}>✅ Submission graded! Score: <strong>{score}</strong></p>
            )}

            {/* SHOW GRADLE TEST OUTPUT */}
            {gradleOutput && (
                <div style={{ marginTop: '20px' }}>
                    <h4>Test Output:</h4>
                    <pre style={{
                        backgroundColor: '#f5f5f5',
                        border: '1px solid #ddd',
                        borderRadius: '4px',
                        padding: '15px',
                        whiteSpace: 'pre-wrap',
                        overflow: 'auto',
                        maxHeight: '400px',
                        fontSize: '12px',
                        fontFamily: 'Courier New, monospace'
                    }}>
                        {gradleOutput}
                    </pre>
                </div>
            )}

            {/* //if there was an error */}
            {error && (
                <p style={{ marginTop: '20px', color: 'red' }}>❌ {error}</p>
            )}
        </div>
    );
};

export default StudentSubmitGithub;