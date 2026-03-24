const express = require('express');//load express
const router = express.Router(); //create a new router object  (mini express app -> for handling routes)
const {
    getSubmissionRegradeStatus,
    requestSubmissionRegradeDueDate,
    requestSubmissionRegrade,
    upsertGithubSubmission, 
    upsertLabSubmission,
    verifyGithubOwnership, 
    getAllSubmissions,
    getSubmission,
    manualUpdateSubmissionGrade,
    deleteSubmissions,
    clearRegradeQueue
} = require('../controllers/submissionController');
const {requireAuth} = require('../middleware/authentication');


//ROOT / ISS LOCALHOST:5000/api
router.get('/submissions', requireAuth, getAllSubmissions); //this pathway is relative to the base path set in app.js (api/submit)
router.get('/submissions/:id', requireAuth, getSubmission);
router.post('/submissions/upsertLab', requireAuth, upsertLabSubmission);
router.post('/submissions/upsertGithub', requireAuth, upsertGithubSubmission);
router.post('/submissions/update-late-grade', requireAuth, requestSubmissionRegradeDueDate);
router.post('/submissions/manual-regrade', requireAuth, manualUpdateSubmissionGrade);
router.post('/submissions/regrade', requireAuth, requestSubmissionRegrade);
router.get('/submissions/regrade/:jobId', requireAuth, getSubmissionRegradeStatus);
router.delete('/submissions/regrade/clear-queue', requireAuth, clearRegradeQueue);
router.post('/verify-github-ownership', requireAuth, verifyGithubOwnership);
router.delete('/submissions/delete-submissions/:assignmentId', requireAuth, deleteSubmissions);

module.exports = router; //export router object so your main server file can use it