const { parseISO } = require('date-fns');
const { cloneRepo } = require('../services/gitService');
const { gradeJavaSubmission } = require('../services/gradingService');
const { PrismaClient } = require('@prisma/client');
const { submissionRegradeDueDateQueue, submissionRegradeQueue } = require('../queues/submissionRegradeQueue');
const prisma = new PrismaClient();
require('dotenv').config();

let assignmentPrefix;

const verifyGithubOwnership = async (req, res) => {
    try {
        const { url, githubUsername } = req.body;
        if (!url) {
            return res.status(400).json({
                error: 'GitHub URL is required'
            });
        }

        if (!githubUsername) {
            return res.status(400).json({
                success: false,
                output: '❌ No GitHub account linked. Please link your GitHub account first.'
            });
        } // Extract username and repo from GitHub URL

        //https://github.com/username/u1p1-calculator or https://github.com/username/u1p1-calculator.git
        const urlMatch = url.match(/github\.com\/([^\/]+)\/([^\/\?#]+)/);
        if (!urlMatch) {
            return res.status(400).json({
                success: false,
                output: '❌ Invalid GitHub URL format. Expected: github.com/username/repository'
            });
        }

        const urlUsername = urlMatch[1]; // e.g., 'thturin'
        let repoName = urlMatch[2]; // e.g., 'u1p1-calculator.git' or 'u1p1-calculator'

        // Remove .git suffix if present
        repoName = repoName.replace(/\.git$/, '');

        // Verify ownership by comparing GitHub usernames
        const isOwner = urlUsername.toLowerCase() === githubUsername.toLowerCase();
        console.log('DEBUG verifyGithubOwnership - URL Username:', urlUsername.toLowerCase(), '| DB Username:', githubUsername.toLowerCase(), '| Repo:', repoName);
        const assignmentPrefixMatch = repoName.match(/u\d(?:[pt]\d)?/i); //case insensitive - matches u3, u1p1, u1t1
        assignmentPrefix = assignmentPrefixMatch ? assignmentPrefixMatch[0] : '';
        console.log('DEBUG verifyGithubOwnership - Assignment Prefix extracted:', assignmentPrefix);


        return res.json({
            success: isOwner,
            output: isOwner ? `✅ You are the owner of this repository (${githubUsername})`
                : `❌ Repository does not belong to ${githubUsername}`
        });
    } catch (err) {
        console.error('Error verifying github username', err);
        res.status(500).json({
            error: 'POST/ verifyGithubOwnerShip (server) Failed to verify Github ownership'
        });
    }
};


//CURRENTLY WE ARE DISABLING LATE SCORE BECAUSE 
//THERE ARE TOO MANY ISSUES WITH SCORING AND IT IS CAUSING CONFUSION FOR STUDENTS. WE CAN REVISIT THIS LATER ONCE THE GRADING SYSTEM IS MORE STABLE.
const calculateLateScore = (submissionDate, dueDateInput, score) => { //dueDate accepts ISO strings or actual date object
    // if (!dueDateInput) return score;
    // const dueDate = dueDateInput instanceof Date
    //     ? dueDateInput
    //     : parseISO(typeof dueDateInput === 'string' ? dueDateInput : String(dueDateInput));
    // const submittedAt = submissionDate instanceof Date
    //     ? submissionDate
    //     : parseISO(typeof submissionDate === 'string' ? submissionDate : String(submissionDate));
    // const diffTime = submittedAt - dueDate;
    // const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24));
    // if (diffDays > 0 && score !== 0) { //if submission is late and not a 0 
    //     //1 day late 
    //     if (diffDays === 1) {
    //         return score * .9;
    //     } else if (diffDays >= 2 && diffDays <= 3) {
    //         return score * .85
    //     } else if (diffDays >= 4 && diffDays <= 5) {
    //         return score * .8;
    //     } else if (diffDays > 5) {
    //         return score * .75;
    //     }
    // } else { // negative difference, submission is on time/early
    //     //this will return on time 100% and submissions that are 0's 
    //     return score;
    // }
    return score;
};

const scoreGithubSubmission = async (url, path, assignmentTitle, submittedAt, dueDate) => { //clone student's repo pasted into submission portal
    console.log('-----Score Github Submission---------');
    try {
        ///DETEREMINE IF TITLE IN GITHUB URL MATCHES ASSIGNMENT NAME 
        //Example : U1T1-printlnVsPrint --> [U1T1] or [U3] or [U1P1]
        const assignmentPrefixMatch = assignmentTitle.match(/u\d(?:[pt]\d)?/i);
        const assignmentTitlePrefix = assignmentPrefixMatch ? assignmentPrefixMatch[0] : '';
        if (assignmentPrefix === '') {
            return {
                score: 0,
                output: `❌ Assignment Prefix is empty `
            };
        }
        if (assignmentPrefix.toLowerCase() !== assignmentTitlePrefix.toLowerCase()) {
            return {
                score: 0,
                output: `❌ Repository name prefix ${assignmentTitlePrefix} does not match assignment prefix ${assignmentPrefix}`
            };
        }
        await cloneRepo(url, path); //returns a promise since cloneRepo is async function
    } catch (cloneError) {
        console.error("Error cloning repo:", cloneError);
        throw cloneError;
    }
    //returns the score and output 
    try {
        let results = await gradeJavaSubmission(path);
        let finalScore = calculateLateScore(submittedAt, dueDate, results.score);
        results = {
            ...results, //keep original results (output)
            score: finalScore, //score with applied late penalty
            rawScore: results.score //raw Score (no penalty applied)
        }
        return results;
    } catch (err) {
        console.error("Error grading submission:", err);
        return {
            score: 0,
            rawScore: 0,
            output: `❌ Failed to grade submission: ${err.message}`
        };
    }
};

//UPDATE GITHUB SUBMISSION WHEN SUBMITTING
const upsertGithubSubmission = async (req, res) => {
    const { submissionId, url, assignmentId, userId, assignmentTitle, dueDate } = req.body;
    let result = { score: -1, output: 'null' };
    const submittedAt = new Date(); //create the submission date
    const path = `./uploads/${Date.now()}`; //where repo will be cloned to locally

    result = await scoreGithubSubmission(url, path, assignmentTitle, submittedAt, dueDate);

    try {
        const submission = await prisma.submission.upsert({
            where: {
                userId_assignmentId: {
                    userId: Number(userId),
                    assignmentId: Number(assignmentId)
                }
            },
            create: {
                language: 'java',
                score: Number(result.score),
                rawScore: Number(result.rawScore),
                url,
                assignmentId: Number(assignmentId),
                userId: Number(userId),
                submittedAt
            },
            update: {
                score: Number(result.score),
                rawScore: Number(result.rawScore),
                url,
                submittedAt
            }
        });

        res.json({
            ...submission,
            result
        }); // return the updated or new submission along with the result (message and score)

    } catch (err) {
        console.error('Error in upsertGithubSubmission: ', err);
        res.status(500).json({ error: 'Failed to save submission' });
    }
};

//UPDATE OR CREATE LAB SUBMISSION WHEN SUBMITTING
const upsertLabSubmission = async (req, res) => {
    throw new Error ('Lab submission endpoint is currently disabled until we can stabilize the grading system. Please contact your instructor if you have any questions or concerns about your lab submission.');
    const { assignmentId, userId, dueDate, score } = req.body;
    const submittedAt = new Date(); //create the submission date
    let finalPercent = calculateLateScore(submittedAt, dueDate, score);

    try {
        const submission = await prisma.submission.upsert({
            where: {
                userId_assignmentId: {
                    userId: Number(userId),
                    assignmentId: Number(assignmentId)
                }
            },
            create: {
                score: Number(finalPercent),
                rawScore: Number(score),
                assignmentId: Number(assignmentId),
                userId: Number(userId),
                submittedAt
            },
            update: {
                score: Number(finalPercent),
                rawScore: Number(score),
                submittedAt
            }
        });
        res.json({
            ...submission
        }); // return the updated or new submission along with the result (message and score)

    } catch (err) {
        console.error('Error in upsertGithubSubmission: ', err);
        res.status(500).json({ error: 'Failed to save submission' });
    }

};

const requestSubmissionRegradeDueDate = async (req, res) => {
    const { assignmentId } = req.body;
    if (!assignmentId) return res.status(400).json({ error: 'assignmentId is required' });

    await submissionRegradeDueDateQueue.add('submission-regrade-duedate', { assignmentId: Number(assignmentId) });
    return res.json({ status: 'queued' });

};

//WHEN USER CLICKS DRY RUN BUTTON, queue is called to regrade submissions
const requestSubmissionRegrade = async (req, res) => {
    const { assignmentId, dryRun, sectionId, submissionIds, showLatePenalty } = req.body;

    if (!assignmentId) return res.status(400).json({ error: 'assignmentId is required' });
    if (!sectionId) return res.status(400).json({ error: 'sectionId is required' });

    const job = await submissionRegradeQueue.add('submission-regrade', {
        assignmentId: Number(assignmentId),
        sectionId: Number(sectionId),
        submissionIds: submissionIds || null, // null means all submissions
        dryRun
    }, {
        removeOnComplete: false, removeOnFail: false
    });

    console.log('Queued regrade job', job.id, 'for assignment', assignmentId, 'section', sectionId, 
                submissionIds ? `(${submissionIds.length} selected)` : '(all)');
    return res.json({ jobId: job.id, message: 'Regrade queued' });
};

//this is used to print dry regrade LOGS
const getSubmissionRegradeStatus = async (req, res) => {
    try {
        const jobId = req.params.jobId;
        const job = await submissionRegradeQueue.getJob(jobId);
        if (!job) return res.status(404).json({ error: 'Job not found' });

        const state = await job.getState(); // waiting | active | completed | failed

        let logs = [];
        if (typeof submissionRegradeQueue.getJobLogs === 'function') {
            const logsResponse = await submissionRegradeQueue.getJobLogs(jobId).catch(() => ({ logs: [] }));
            logs = logsResponse?.logs || [];
        }

        const result = job.returnvalue ?? null;

        return res.json({
            state,
            logs,
            result
        });
    } catch (err) {
        console.error('Error getting submission regrade status', err);
        return res.status(500).json({ error: err.message || 'Failed to fetch regrade status' });
    }
};

//admin manual override will ignore the late penalty. it changes the score late penalty is applied to
const manualUpdateSubmissionGrade = async (req, res) => {
    try {
        const { submissionId, score } = req.body;
        const updatedSubmission = await prisma.submission.update({
            where: {
                id: Number(submissionId)
            },
            data: { //a manual update 
                score: Number(score)
            }
        });
        return res.json(updatedSubmission);
    } catch (err) {
        console.error('Error updating submission grade: ', err);
        return res.status(500).json({ error: 'Failed to update grade' });
    }
};

const getSubmission = async (req, res) => {
    const { id } = req.params;

    try {
        //find the submission by id
        const submission = await prisma.submission.findUnique({
            where: { id: Number(id) }
        });
        if (!submission) {
            return res.status(404)({ error: 'Submission not found' });
        }
        res.json(submission);
    } catch (err) {
        res.status(500).json({ error: 'Server error' });
    }
};

const getAllSubmissions = async (req, res) => {
    try {
        const { role, isSuperAdmin, adminSectionIds, sectionId, id: userId } = req.user;
        
        // Student: see only their own submissions
        if (role === 'student') {
            const submissions = await prisma.submission.findMany({
                where: { userId: userId },
                include: {
                    user: { include: { section: true } },
                    assignment: { select: { isDraft: true } }
                }
            });
            return res.json(submissions);
        }
        
        // Super admin: see all submissions
        if (isSuperAdmin) {
            const submissions = await prisma.submission.findMany({
                include: {
                    user: { include: { section: true } },
                    assignment: { select: { isDraft: true } }
                }
            });
            return res.json(submissions);
        }
        
        // Regular admin: see submissions from students in their sections
        const submissions = await prisma.submission.findMany({
            where: {
                user: { sectionId: { in: adminSectionIds || [] } }
            },
            include: {
                user: { include: { section: true } },
                assignment: { select: { isDraft: true } }
            }
        });
        return res.json(submissions);
        
    } catch (err) {
        console.log(err);
        res.status(500).json({ error: 'Failed to fetch' });
    }
};

//will only delete submissions by assignmentId
const deleteSubmissions = async (req, res) => {
    const { assignmentId } = req.params;
    if (!assignmentId) return res.status(400).json({ error: 'Missing assignmentId' });

    try {
        await prisma.submission.deleteMany({
            where: { assignmentId: Number(assignmentId) }
        });
        return res.json({ message: 'Submissions deleted successfully' });

    } catch (err) {
        console.log('error in deleteSubmissions', err.message);
        return res.status(500).json({ error: 'Failed to fetch' });
    }
}

//CLEAR THE REGRADE QUEUE.
//if admin made a mistake and queued the wrong regrade, they can clear the queue
const clearRegradeQueue = async (req, res) => {
    try{
        await submissionRegradeQueue.obliterate({ force: true });
        return res.json({ message: 'Queue cleared' });
    }catch(err){
        console.error('Error clearing queue', err);
        return res.status(500).json({ error: err.message });
    }
}

module.exports = {
    verifyGithubOwnership,
    getAllSubmissions,
    getSubmission,
    manualUpdateSubmissionGrade,
    upsertLabSubmission,
    upsertGithubSubmission,
    scoreGithubSubmission,
    deleteSubmissions,
    calculateLateScore,
    requestSubmissionRegradeDueDate,
    requestSubmissionRegrade,
    getSubmissionRegradeStatus,
    clearRegradeQueue
};