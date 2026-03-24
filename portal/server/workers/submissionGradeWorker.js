// const { Worker } = require('bullmq');
// const axios = require('axios').default;
// const { PrismaClient } = require('@prisma/client');
// const { redisOptions } = require('../config/redis');
// const { calculateLateScore } = require('../controllers/submissionController');
// const { scoreGithubSubmission } = require('../controllers/submissionController');
// const prisma = new PrismaClient();
// const path = require('path');

// //CURRENTLY NOT IN USE

// //redis BullMQ has no http involved (no requests or responses)
// //controllers respond to API calls, workers handle background tasks.

// const worker = new Worker('submission-grade', async job => {
//    // Placeholder for submission grading logic
//     // This worker would handle grading submissions as needed

//     }

// //     // Update progress to 100% when done
// //     await job.updateProgress(100);
// //     console.log(`Completed regrading ${submissions.length} submissions`);

// //     if (dryRun) {
// //         return { summaries: dryRunSummaries, count: dryRunSummaries.length };
// //     }
// //     return { success: true, count: submissions.length };

// // }, {
// //     connection: redisOptions,
// //     lockDuration: 300000, // 5 minutes (not 30000 = 30s)
// //     concurrency: 1
// // });

// // worker.on('completed', job => console.log('Submission regrade (full) completed', job.id));
// // worker.on('failed', (job, err) => console.error('Submission regrade (full) failed', job?.id, err));

// // module.exports = { workerDueDate, worker };

