import express, { Router } from 'express';
const router: Router = express.Router();

const {
    generateTestsForJavaQuestion,
    gradeJavaCodeDeepSeek,
    regradeSession,
    gradeQuestionDeepSeek,
    calculateScore,
    gradeQuestionOllama
} = require('../controllers/gradeController');

//ROOT localhost:4000/api/grade
router.post('/deepseek', gradeQuestionDeepSeek);
router.post('/java', gradeJavaCodeDeepSeek);
router.post('/java/generate-tests', generateTestsForJavaQuestion);
router.post('/ollama', gradeQuestionOllama);
router.post('/calculate-score', calculateScore);
router.post('/regrade', regradeSession);

export = router;
