const { Queue } = require('bullmq');
const { redisOptions } = require('../config/redis');

const submissionGradeQueue = new Queue('submission-grade', {
  connection: redisOptions
});



module.exports = { submissionGradeQueue };