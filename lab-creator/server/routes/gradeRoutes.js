const express = require('express');
const router = express.Router();
const {generateTestsForJavaQuestion,gradeJavaCodeDeepSeek, gradeSession,regradeSession,gradeQuestionDeepSeek,calculateScore,gradeQuestionOllama } = require('../controllers/gradeController');


//ROOT localhost:4000/api/grade
router.post('/deepseek', gradeQuestionDeepSeek);
router.post('/java', gradeJavaCodeDeepSeek);
router.post('/java/generate-tests',generateTestsForJavaQuestion);
router.post('/ollama', gradeQuestionOllama);
router.post('/calculate-score',calculateScore);
router.post('/regrade',regradeSession);

//unified endpoint for grading a session after all questions graded
//CURRENTLY NOT IMPLEMENTED 
//router.post('/grade/session',gradeSession);

module.exports = router;