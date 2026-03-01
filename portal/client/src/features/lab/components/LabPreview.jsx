import axios from "axios";
import { useState, useEffect, useCallback, useMemo } from 'react';
import { createSession } from '../models/session';
import MaterialBlock from './MaterialBlock';
import QuestionBlock from './QuestionBlock';
import AIPrompt from './AIPrompt';
import { generateDisplayNumbers } from '../utils/questionNumbers';
import "../styles/Lab.css";

function LabPreview({
    blocks,
    setBlocks,
    title,
    setTitle,
    assignmentId,
    selectedAssignmentDueDate,
    mode = 'student',
    userId,
    username,
    readOnly,
    labId,
    aiPrompt,
    setAiPrompt,
    handleAiPromptChange,
    onUpdateSubmission,
    showExplanations,
    reloadKey = 0
}) {

    const isAdmin = mode === 'admin';

    const [session, setSession] = useState(createSession(title, username, userId, labId));
    // const [sessionLoaded, setSessionLoaded] = useState(false);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const [submitError, setSubmitError] = useState('');

    const exportSessionToFile = () => {
        const payload = {
            title,
            labId,
            userId,
            username,
            session,
        };
        const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
        const url = URL.createObjectURL(blob);
        const link = document.createElement('a');
        link.href = url;
        link.download = `session-${username || userId || 'anon'}-${labId || 'lab'}.json`;
        document.body.appendChild(link);
        link.click();
        link.remove();
        URL.revokeObjectURL(url);
    };

    //derive from session/setSession
    const responses = session.responses || {};
    const gradedResults = session.gradedResults;
    const finalScore = session.finalScore || {};


    //update handler that modifies responses in session
    const handleResponseChange = (questionId, value) => {
        console.log('Response changed for questionId', questionId, 'to', value);
        setSession(prev => ({ //update the session and concatenate old data with new response for questionId an val
            ...prev,
            responses: { ...prev.responses, [questionId]: value }
        }));
    }

    const handleScoreOverride = ({ gradedResults, finalScore }) => { //desctructure {} insTEAD OF (DATA)
        setSession(prev => ({
            ...prev,
            gradedResults,
            finalScore
        }));

        if (onUpdateSubmission) {
            onUpdateSubmission(finalScore.percent);
        }
    };

    //all questions that are being scored. questions that are not being scored are ignored
    const scoredNoSubQuestions = blocks.filter(
        b => b.blockType === "question" && b.isScored && (!b.subQuestions || b.subQuestions.length === 0)
    );

    const scoredSubQuestions = blocks
        .filter(b => b.blockType === "question" && b.subQuestions && b.subQuestions.length > 0)
        .flatMap(b => b.subQuestions.filter(sq => sq.isScored));

    const allQuestions = [...scoredNoSubQuestions, ...scoredSubQuestions];

    // Generate display numbers for all questions (1, 2, 3, 1a, 1b, etc.)
    const displayNumbers = useMemo(
        () => generateDisplayNumbers(blocks),
        [blocks]

    );

    const loadLab = useCallback(async () => {
        try {
            const response = await axios.get(`${process.env.REACT_APP_API_LAB_HOST}/lab/load-lab`, {
                params: { assignmentId, title }
            });
            setBlocks(response.data.blocks);
            setTitle(response.data.title);
            if (mode === 'admin') setAiPrompt(response.data.aiPrompt);
        } catch (err) {
            console.error('Lab did not load from labController successfully', err.message);
        }
    }, [assignmentId, title, mode, setBlocks, setTitle, setAiPrompt]);

    const loadSession = useCallback(async () => {
        try {
            console.log('Loading session for labId', labId, 'userId', userId, 'username', username);
            const response = await axios.get(`${process.env.REACT_APP_API_LAB_HOST}/session/load-session/${labId}`, {
                params: { userId, username, title }
            });

            if (response.data.session) setSession(response.data.session);
            //setSessionLoaded(true);
            console.log('Session Loaded!');
        } catch (err) {
            console.error('Error in getResponse()', err);
        }
    }, [labId, userId, username, title]);


    const saveSession = useCallback(async () => {
        //if (!session || !title || !userId || !labId || !sessionLoaded) return;
        console.log('save session...');
        try {
            await axios.post(`${process.env.REACT_APP_API_LAB_HOST}/session/save-session`, { session });
        } catch (err) {
            console.error('Error saving session. Check backend', err);
        }
    }, [session]);

    //LOAD SESSION and LAB
    useEffect(() => {
        if (!assignmentId) return;
        loadLab();
    }, [assignmentId, reloadKey, loadLab]);

    useEffect(() => {
        //if (!labId || (!userId && !username)) return;
        console.log('Loading session for labId', labId, 'userId', userId, 'username', username);
        //setSessionLoaded(false);
        loadSession();
    }, [labId, userId, username, reloadKey, loadSession]);

    // AUTO SAVE SESSION - save 
    useEffect(() => { //useeffect cannot be async
        //console.log('Auto-saving session...');
        saveSession();
        const timeoutId = setTimeout(saveSession, 1000); //add 1 second delay 
        return () => clearTimeout(timeoutId);
    }, [saveSession]);


    // Finds question metadata from blocks and calls the grading API for a single question.
    // Returns a graded result object, or null if the question can't be found/graded.
    const gradeSingleQuestion = async (questionId, userAnswer) => {
        let answerKey = '';
        let question = '';
        let type = '';
        let generatedTestCode = '';
        let imageText = '';

        for (const block of blocks) {
            //for questions without subquestions
            if (block.blockType === 'question' && block.isScored &&
                (!block.subQuestions || block.subQuestions.length === 0) &&
                block.id === questionId) {
                answerKey = block.key || block.explanation || '';
                question = block.prompt;
                type = block.type;
                generatedTestCode = block.generatedTestCode || '';
                imageText = block.imageText || '';
                break;
            }
            //for questions with subquestions
            if (block.blockType === 'question' && block.subQuestions && block.subQuestions.length > 0) {
                for (const sq of block.subQuestions) {
                    if (sq.id === questionId && sq.isScored) {
                        answerKey = sq.key || sq.explanation || '';
                        const mainPrompt = block.prompt || '';
                        question = mainPrompt ? `${mainPrompt}\n\n${sq.prompt}` : sq.prompt;
                        type = sq.type;
                        generatedTestCode = sq.generatedTestCode || '';
                        imageText = sq.imageText || block.imageText || '';
                        break;
                    }
                }
            }
        }

        if (!question || !type) return null; 

        if (!answerKey) { //no answer they then automatic score of 1 and feedback of no answer key provided. This is for non-graded questions where we still want to provide feedback and a score of 1 for completion.
            return { score: 1, feedback: 'Auto-awarded: no answer key provided' };
        }

        //for code questions 
        if (type === 'code') {
            const response = await axios.post(`${process.env.REACT_APP_API_LAB_HOST}/grade/java`, {
                userAnswer,
                testCode: generatedTestCode,
                question,
                imageText
            });
            return {
                score: response.data.gradingResults.score,
                feedback: response.data.gradingResults.feedback,
                testResults: response.data.testResults,
                generatedTests: response.data.generatedTests
            };
        } else {
            const response = await axios.post(`${process.env.REACT_APP_API_LAB_HOST}/grade/question`, {
                userAnswer,
                answerKey,
                question,
                questionType: type,
                AIPrompt: aiPrompt,
                imageText
            });
            return { score: response.data.score, feedback: response.data.feedback };
        }
    };

    //keep track of questionID's that are currently being graded to disable grading button
    //show "loading"
    const [gradingQuestionIds, setGradingQuestionIds] = useState(new Set());
    const [gradingErrors, setGradingErrors] = useState({});

    //grade single quesrtion
    const handleGradeSingle = async (questionId) => {
        const userAnswer = responses[questionId];
        setGradingQuestionIds(prev => new Set(prev).add(questionId));
        setGradingErrors(prev => { const next = { ...prev }; delete next[questionId]; return next; });
        try {
            const result = await gradeSingleQuestion(questionId, userAnswer);
            if (!result) return;

            // Initialize all scored questions to 0 so calculate-score sees the full question set,
            // not just the one being graded. Existing graded results are preserved on top.
            //this will provide an accurate final score even if student only answered one question
            const baseResults = {};
            allQuestions.forEach(q => {
                if (q.isScored) {
                    //if there is a graded result for this question, add to baseResults
                    //otherwise, add a default graded result with score 0 and feedback of "no response"
                    baseResults[q.id] = session.gradedResults[q.id] || { score: 0, feedback: 'waiting for response' };
                }
            });
            //combine baseResults with nrw graded result for this question
            const newGradedResults = { ...baseResults, [questionId]: result };

            //re-calculate final score with newGraded results 
            const scoreResponse = await axios.post(`${process.env.REACT_APP_API_LAB_HOST}/grade/calculate-score`, {
                gradedResults: newGradedResults,
                labId,
                userId
            });

            //update the session with new gradedResults and final score from calculate-score response
            const newFinalScorePercent = scoreResponse.data.session.finalScore.percent;
            setSession(prev => ({
                ...prev,
                gradedResults: newGradedResults,
                finalScore: scoreResponse.data.session.finalScore
            }));

            //if a student is submitting, then create or update an actual submission
            //admins do not have submissions
            if (!isAdmin) {
                try {
                    const subResponse = await axios.post(`${process.env.REACT_APP_API_HOST}/submissions/upsertLab`, {
                        assignmentId,
                        userId,
                        dueDate: selectedAssignmentDueDate,
                        score: newFinalScorePercent
                    });
                    onUpdateSubmission(subResponse.data);
                } catch (err) {
                    console.error('error upsertingLab from handleGradeSingle', err);
                }
            }
        } catch (err) {
            console.error('Error in handleGradeSingle', err);
            const message = err.response?.data?.error || 'Grading failed. Please try again.';
            setGradingErrors(prev => ({ ...prev, [questionId]: message }));
        } finally {
            //set loading state for this questionId to false regardless of success or failure
            setGradingQuestionIds(prev => {
                const next = new Set(prev);
                next.delete(questionId);
                return next;
            });
        }
    };

    //if student clicks submit, we want to grade all questions, 
    // even those that haven't been graded yet, and then calculate final score and update session and submission with final score.
    const submitResponses = async () => {
        setIsSubmitting(true);
        setSubmitError('');

        let newGradedResults = { ...session.gradedResults };
        for (const [questionId, userAnswer] of Object.entries(responses)) {
            try {
                const result = await gradeSingleQuestion(questionId, userAnswer);
                if (!result) continue;
                newGradedResults = { ...newGradedResults, [questionId]: result };
            } catch (err) {
                console.error("Error grading in LabPreview [LabPreview.jsx]", err.message);
            }
        } //END OF FOR LOOP

        //FOR QUESTIONS THAT WERE LEFT BLANK, CREATE A NEW OBJECT IN GRADEDRESULTS 
        //WITH SCORE 0 AND NO RESPONSE
        allQuestions.forEach(q => {
            //if new gradedResults does not contain this id,
            if (!newGradedResults[q.id] && q.isScored) {
                newGradedResults[q.id] = {
                    score: 0,
                    feedback: "left blank"
                }
            }
        });
        //CALCULATE FINAL SCORE
        let newFinalScorePercent = 0;

        try {
            const response = await axios.post(`${process.env.REACT_APP_API_LAB_HOST}/grade/calculate-score`, {
                gradedResults: newGradedResults, //use variable instead
                labId,
                userId
            });

            //when upserting submission, use this value for percent insteado using session because 
            //setSession is asynchronous so doesn't always update before upserting to lab 
            newFinalScorePercent = response.data.session.finalScore.percent;

            //update session with new graded results and final score
            setSession(prev => ({
                ...prev,
                gradedResults: newGradedResults,
                finalScore: response.data.session.finalScore
            }));

            //create a lab submission or update it with final score and due date for late penalty calculation in backend. 
            //only do this if calculate-score is successful
            if (!isAdmin) {
                try {
                    const response = await axios.post(`${process.env.REACT_APP_API_HOST}/submissions/upsertLab`, {
                        assignmentId,
                        userId,
                        dueDate: selectedAssignmentDueDate,
                        score: newFinalScorePercent
                    
                    });
                    //SESSION SCORE DOES NOT GET UPDATED with late penalty
                    onUpdateSubmission(response.data);
                } catch (err) {
                    console.error('error upsertingLab ', err);
                    setSubmitError('Submission failed to save. Please try submitting again.');
                } finally {
                    setIsSubmitting(false); //stop loading regardless of success/failure
                }
            }
        } catch (err) {
            console.error('error calculating final score', err);
            setSubmitError('Failed to calculate score. Please try submitting again.');
        } finally {
            setIsSubmitting(false);
        }
    }

    return (
        <>
            {/* LAB PREVIEW */}
            <div className="ml-8" style={{ fontFamily: "'Courier New', Courier, monospace" }}>
                <div className="mt-8 p-6 border rounded bg-gray-100">
                    <h2 className="text-xl font-bold mb-4">Lab Preview</h2>
                </div>
                <div>
                    <h3 className="font-semibold mb-2">{title}</h3>
                </div>
                {/* LIST BLOCKS AND DISPLAY */}
                {blocks.map((block, i) => (
                    <div key={block.id || i} className="mb-6">
                        {/* bordered block wrapper */}
                        <div className="rounded-lg border-2 border-slate-900 bg-white p-4 shadow-sm">
                            {/* DISPLAY A MATERIAL */}
                            {block.blockType === "material" ? (
                                <MaterialBlock content={block.content} />
                            ) : (
                                // DISPLAY A QUESTION OR SUBQUESTION
                                <QuestionBlock
                                    block={block}
                                    displayNumber={displayNumbers[block.id]}
                                    displayNumbers={displayNumbers}
                                    setResponses={handleResponseChange}
                                    responses={responses}
                                    gradedResults={gradedResults}
                                    finalScore={finalScore}
                                    showExplanations={showExplanations}
                                    isAdmin={isAdmin}
                                    sessionId={session.id}
                                    onScoreUpdated={handleScoreOverride}
                                    onGradeSingle={readOnly ? undefined : handleGradeSingle}
                                    gradingQuestionIds={gradingQuestionIds}
                                    gradingErrors={gradingErrors}
                                />
                            )}
                        </div>
                    </div>
                ))}
                {mode === 'admin' && !readOnly && (
                    <AIPrompt value={aiPrompt} onChange={handleAiPromptChange} />
                )}

                {/* Export session for local testing */}

                {mode === 'admin' && (
                    <button
                        onClick={exportSessionToFile}
                        className="bg-slate-700 text-white px-4 py-2 rounded mt-4 mr-3"
                        type="button"
                    >
                        Export Session JSON
                    </button>
                )}


                {/* //read only is for admin viewing in submission list */}
                {!readOnly && (
                    <>
                        {/* BUTTON SUBMIT RESPONSE */}
                        < button
                            onClick={submitResponses}
                            disabled={isSubmitting}
                            className={`bg-purple-600 text-white px-4 py-2 rounded mt-4 flex items-center ${isSubmitting ? 'opacity-75 cursor-not-allowed' : ''
                                }`}
                        >
                            {isSubmitting ? (
                                <>
                                    <svg className="animate-spin -ml-1 mr-3 h-5 w-5 text-white" xmlns="http://www.w3.org/2000/svg" fill="none" viewBox="0 0 24 24">
                                        <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                                        <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4zm2 5.291A7.962 7.962 0 014 12H0c0 3.042 1.135 5.824 3 7.938l3-2.647z"></path>
                                    </svg>
                                    Submitting...
                                </>
                            ) : (
                                'Submit'
                            )}
                        </button>
                    </>
                )}

                {submitError && (
                    <div className="mt-4 p-4 border rounded bg-red-50 text-red-700">
                        {submitError}
                    </div>
                )}

                {/*OUTPUT FINAL SCORE */}
                {Object.keys(gradedResults).length > 0 && (
                    <div className="mb-6 p-4 border rounded bg-blue-50">
                        <h3 className="font-bold mb-2">Score 📊</h3>
                        Total Score: {parseFloat(finalScore?.totalScore).toFixed(2)} / {finalScore?.maxScore}<br />{finalScore?.percent}%
                    </div>
                )}
            </div >
        </>

    )
}


export default LabPreview;
