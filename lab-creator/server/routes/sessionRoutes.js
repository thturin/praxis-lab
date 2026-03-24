const express = require('express');
const router = express.Router();
const {manualGradeSessionQuestion,loadSession, saveSession, getSessions, deleteSession,getSessionsByLabId} = require('../controllers/sessionController');

//ROOT localhost:4000/api/session
router.post('/save-session', saveSession);
router.get('/load-session/:labId',loadSession);
router.get('/get-sessions',getSessions);

//get-sessions/labId?labId=1
router.get('/get-sessions/labId',getSessionsByLabId);
router.delete('/delete-session/:labId',deleteSession);

//get-graded-results/sessionId?sessionId=1
router.put('/override-score/sessionId/:id', manualGradeSessionQuestion);

module.exports = router;