const { Queue } = require('bullmq');
const { redisOptions } = require('../config/redis');

const assignmentDeletionQueue = new Queue('assignment-deletion', {
  connection: redisOptions
});

module.exports = { assignmentDeletionQueue };