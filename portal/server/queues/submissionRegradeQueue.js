const { Queue } = require('bullmq');
const { redisOptions } = require('../config/redis');

const submissionRegradeDueDateQueue = new Queue('submission-regrade-duedate', {
  connection: redisOptions
});

const submissionRegradeQueue = new Queue('submission-regrade', {
  connection: redisOptions
});


module.exports = { submissionRegradeDueDateQueue,submissionRegradeQueue };