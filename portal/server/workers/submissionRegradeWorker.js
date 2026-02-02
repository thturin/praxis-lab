const { Worker } = require('bullmq');
const axios = require('axios').default;
const { PrismaClient } = require('@prisma/client');
const { redisOptions } = require('../config/redis');
const { calculateLateScore } = require('../controllers/submissionController');
const { scoreGithubSubmission } = require('../controllers/submissionController');
const prisma = new PrismaClient();
const path = require('path');

const workerDueDate = new Worker('submission-regrade-duedate', async job => {
    const { assignmentId } = job.data;
    const submissions = await prisma.submission.findMany({
        where: { assignmentId: Number(assignmentId) },
        include: { assignment: true }
    });
    //loop through each submission and re-calculat the late score 
    for (const submission of submissions) {
        if (!submission.assignment) continue;
        const dueDateString = submission.assignment.dueDate.toISOString();
        const submittedAt = submission.submittedAt;
        const newScore = calculateLateScore(submittedAt, dueDateString, submission.rawScore);
        await prisma.submission.update({
            where: { id: submission.id },
            data: { score: newScore }
        });
    }

}, { connection: redisOptions });


workerDueDate.on('completed', job => console.log('Submission regrade completed', job.id));
workerDueDate.on('failed', (job, err) => console.error('Submission regrade failed', job?.id, err));

//redis BullMQ has no http involved (no requests or responses)
//controllers respond to API calls, workers handle background tasks.

const worker = new Worker('submission-regrade', async job => {
    const { dryRun, assignmentId, sectionId, submissionIds, showLatePenalty } = job.data;
    //we are sending a list of submission id's to regrade, or null for all submissions in the assignment/section
    const dryRunSummaries = [];

    // Fetch all submissions for this assignment and section
    let submissions;
    console.log('submissionIds',submissionIds);
    try {
        const whereClause = { //find all submissions with the selected assignmenrtId and where the users have the selected sectionId
            //also iterate through the submissionIds if not null
            assignmentId: Number(assignmentId),
            user: {
                sectionId: Number(sectionId)
            }
        };

        // If specific submissions selected, filter by IDs, else process all submissions
        // SELECT * FROM Submission 
        // WHERE id IN (1, 5, 10, 23)
        if (submissionIds && submissionIds.length > 0) {
            whereClause.id = { in: submissionIds.map(id => Number(id)) };
        }

        //find the submissions with the whereClause
        submissions = await prisma.submission.findMany({
            where: whereClause,
            include: { assignment: true, user: true }
        });
    } catch (err) {
        console.error('Error fetching submissions for regrade', err.message);
        return { error: err.message };
    }

    // Log the number of submissions to be processed
    const selectionMsg = submissionIds ? `(${submissionIds.length} selected)` : '(all)';
    console.log(`Processing ${submissions.length} submissions ${selectionMsg} for assignment ${assignmentId}, section ${sectionId}`);

    //loop through each submission and regrade based on type
    for (let i = 0; i < submissions.length; i++) {
        const submission = submissions[i];
        const assignment = submission.assignment;
        let summary;

        await job.updateProgress(Math.round((i / submissions.length) * 100));
        console.log(`Regrading submission ${i + 1}/${submissions.length} (user: ${submission.user?.username})`);

        //this code is copied and pasted from lab preview handleSubmit function. 
        try {
            if (assignment.type === 'github') {
                //put github repos into temp directory
                const tempDir = path.join(__dirname, '../tmp', `${submission.id}-${Date.now()}`);

                const result = await scoreGithubSubmission(
                    submission.url,
                    tempDir,
                    submission.submittedAt,
                    assignment.dueDate
                );

                //IF A DRY RUN, DO NOT UPDATE SUBMISSIONS
                // if (dryRun) {
                //     summary = {
                //         submissionId: submission.id,
                //         user: submission.user?.username,
                //         type: 'github',
                //         result
                //     };
                //     await job.log(JSON.stringify(summary));
                //     dryRunSummaries.push(summary);
                // } else {
                    await prisma.submission.update({
                        where: { id: submission.id },
                        data: {
                            rawScore: result.rawScore ?? 0,
                            score: result.score
                        }
                    });
                //}
            }

            if (assignment.type === 'lab') {
                // Load session responses for this student/lab
                const sessionResponse = await axios.get(`${process.env.LAB_CREATOR_API_URL}/session/load-session/${assignment.labId}`, {
                    params: {
                        userId: submission.userId,
                        username: submission.user?.username
                    }
                });
                //need to get aiPrompt
                const labResponse = await axios.get(`${process.env.LAB_CREATOR_API_URL}/lab/load-lab`, {
                    params: { assignmentId: submission.assignmentId }
                });
                if (!labResponse) {
                    console.error(`Lab missing for submission ${submission.id}`);
                    continue;
                }
                const { aiPrompt, blocks = [] } = labResponse.data;

                //filter all questions and sub questions into a single array
                const allQuestions = blocks.flatMap(block => {
                    if (block.blockType !== 'question') return [];
                    const scoredSubQuestions = (block.subQuestions || []).filter(sq => sq.isScored);
                    if (scoredSubQuestions?.length) {
                        return scoredSubQuestions;
                    } else {
                        if (block.isScored) return block;
                    }
                    return [];
                });

                //create a new array of objects that contain the prompt, key, type, and generatedTestCode
                const questionLookup = allQuestions.reduce((acc, question) => {
                    acc[question.id] = {
                        prompt: question.prompt,
                        key: question.key,
                        type: question.type,
                        generatedTestCode: question.generatedTestCode
                    };
                    return acc;
                }, {});

                const session = sessionResponse.data.session;
                if (!session) {
                    console.warn(`Lab session missing for submission ${submission.id}`);
                    continue;
                }

                // Regrade via lab API GRADECONTROLLER
                //regradeSession in gradeController.js
                const regradeResponse = await axios.post(`${process.env.LAB_CREATOR_API_URL}/grade/regrade`, {
                    responses: session.responses,
                    questionLookup,
                    userId: submission.userId,
                    labId: assignment.labId,
                    dryRun,
                    aiPrompt
                });

                const regradeResult = regradeResponse.data || {};

                // if (dryRun) {
                //     summary = {
                //         submissionId: submission.id,
                //         user: submission.user?.username,
                //         type: 'lab',
                //         gradedResults: regradeResult.gradedResults || {},
                //         finalScore: regradeResult.finalScore || null
                //     };
                //     console.log(`User ${submission.user?.username} dryRun summary->>${JSON.stringify(summary)}`);
                //     await job.log(JSON.stringify(summary));
                //     dryRunSummaries.push(summary);
               // } else {
                    //update the submission's rawScore and score
                    const rawScore = Number(regradeResult.finalScore?.percent) || 0;
                    await prisma.submission.update({
                        where: { id: submission.id },
                        data: {
                            rawScore,
                            score: showLatePenalty ? calculateLateScore(submission.submittedAt, assignment.dueDate, rawScore) : rawScore
                        }
                    });
                //}

                if(i<submissions.length-1){
                    await new Promise(resolve => setTimeout(resolve, 2**i));
                }
            }
        } catch (err) {
            console.error('Error processing submission', submission.id, err.message);
            // Continue to next submission instead of stopping
        }
    }

    // Update progress to 100% when done
    await job.updateProgress(100);
    console.log(`Completed regrading ${submissions.length} submissions`);

    // if (dryRun) {
    //     return { summaries: dryRunSummaries, count: dryRunSummaries.length };
    // }
    return { success: true, count: submissions.length };

}, {
    connection: redisOptions,
    lockDuration: 600000, // 10 minutes 
    concurrency: 1
});

worker.on('completed', job => console.log('Submission regrade (full) completed', job.id));
worker.on('failed', (job, err) => console.error('Submission regrade (full) failed', job?.id, err));

module.exports = { workerDueDate, worker };

