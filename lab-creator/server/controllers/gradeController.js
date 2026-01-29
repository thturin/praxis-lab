require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { gradeWithBinaryRubric, generateJUnitTests, computeFinalScore, gradeJavaCode} = require('../services/gradingService');
const {parseCodeFromHtml,parseTextFromHtml} = require('../services/parseHtml');
const prisma = new PrismaClient();


//calculate final score from gradingService computerFinalScore and update session
//called from frontend after all questions graded
// also called from regradeSession after regrading
const calculateScore = async (req, res) => {
    console.log('--------calculating score-----------');
    console.time('calculateScore');
    const { gradedResults, labId, userId } = req.body;
    //console.log(Array.isArray(gradedResults));
    if (!gradedResults) return res.status(400).json({ error: 'gradedResults is missing' });
    // console.log('HERE ARE THE GRADED RESULTS ->>>>',gradedResults);
    const finalScore = computeFinalScore(gradedResults);
    console.log(finalScore);

    try {
        console.time('prismaUpdate');
        const updatedSession = await prisma.session.update({
            where: { labId_userId: { labId, userId } },
            data: { finalScore, gradedResults }
        });
        console.timeEnd('prismaUpdate');
        console.timeEnd('calculateScore');
        //console.log(updatedSession);
        return res.json({ session: updatedSession });
    } catch (err) {
        console.error('Error in calculateScore', err);
        return res.status(500).json({ error: 'error calculating score' });
    }
};

const generateTestsForJavaQuestion = async (req, res) => {
    const { problemDescription, answerKey } = req.body;
    const parsedProblemDescription = parseTextFromHtml(problemDescription);
    const parsedAnswerKey = parseCodeFromHtml(answerKey);
    console.log('Generating tests for Java question...');
    console.log('Problem Description:', parsedProblemDescription);
    console.log('Answer Key:', parsedAnswerKey);
    try {
        const testCode = await generateJUnitTests({ problemDescription: parsedProblemDescription, answerKey: parsedAnswerKey });
        console.log('Generated JUnit tests:');
        console.log(testCode);
        return res.json({ testCode });
    } catch (err) {
        console.error('Error generating tests for Java question', err.message);
        console.error('error stack', err.stack);
        return res.status(500).json({ error: 'Failed to generate tests' });
    }
};
//grade a single question using DeepSeek API
//filters out empty answers and missing answer keys
//calls gradeWithDeepseek from gradingService
const gradeQuestionDeepSeek = async (req, res) => {
    const { userAnswer, answerKey, question, questionType, AIPrompt } = req.body;
    const hasUserAnswer = Boolean(userAnswer && userAnswer.trim().length > 0);
    const hasAnswerKey = Boolean(answerKey && answerKey.trim().length > 0);
    if (!hasUserAnswer) {
        return res.status(400).json({ score: 0, feedback: 'No response submitted' });
    }
    if (!hasAnswerKey) {
        return res.status(400).json({ score: 1, feedback: 'Answer key missing; awarding full credit' });
    }


    try {
        const result = await gradeWithBinaryRubric({ userAnswer: parseTextFromHtml(userAnswer), answerKey: parseTextFromHtml(answerKey), question: parseTextFromHtml(question), questionType, AIPrompt });
       // const result = await gradeWithDeepSeek({ userAnswer, answerKey, question, questionType, AIPrompt });
        return res.json(result);
    } catch (err) {
        console.log('Error in accessing deep seek api. Request failed.', err.message);
        return res.status(400).json({ error: 'cannot access deep seek api' });
    }
};

const gradeJavaCodeDeepSeek = async (req, res) => {
    const { userAnswer, testCode, question } = req.body;

    try{
        const result = await gradeJavaCode({ 
            studentCode: parseCodeFromHtml(userAnswer), 
            problemDescription: parseTextFromHtml(question), 
            testCode });
        res.json(result);
    }catch(err){
        console.error('Error in gradeJavaCode controller', err.message);
        return res.status(500).json({ 
            error: 'Failed to grade Java code',
            score:0,
            feedback:'An error occurred while grading the code. Please try again later.'
         });
    }
};

//CURRENTLY NOT IMPLEMENTED
const gradeSession = async (req, res) => {
    // Placeholder function for grading a session 
    //this was creating in respect to making grading a session (student facing) in a worker
    //When the time comes to implement it, we can add the logic here
    return res.status(501).json({ error: 'Not implemented yet' });
}

//this is called asynchronously with redis
//YOU ARE NOW USING A PARSED VERSION OF THE HTML 
//THIS MIGHT CAUSE ISSUES IN THE FUTURE? DONT FORGET
const regradeSession = async (req, res) => {
    const { labId, userId, responses, questionLookup, dryRun = true, aiPrompt, includeLatePenalty = false } = req.body;
    if (!labId || !userId || !responses || !questionLookup) {
        return res.status(400).json({ error: 'labId, userId, responses, questionLookup are required' });
    }

    try {
        const regradedResults = {};

        for (const [questionId, userAnswer] of Object.entries(responses)) {
            const details = questionLookup[questionId];
            if (!details) {
                console.warn(`question metadata missing for id ${questionId} in regradeSession`);
                continue;
            }

            try {
                const result = await gradeWithBinaryRubric({
                    userAnswer: parseCodeFromHtml(userAnswer),
                    answerKey: parseCodeFromHtml(details.key),
                    question: parseTextFromHtml(details.prompt),
                    questionType: details.type,
                    AIPrompt: aiPrompt
                });

                regradedResults[questionId] = {
                    score: result.score,
                    feedback: result.feedback
                };

                //30+ simultaneous deepseek requests get 
                //Error grading question 1765678253268 during regrade getaddrinfo EAI_AGAIN api.deepseek.com
                //add a small delay
                await new Promise(resolve => setTimeout(resolve,500)); //500 ms delay



            } catch (err) {
                console.error(`Error grading question ${questionId} during regrade`, err.message);
            }
        }

        const finalScore = computeFinalScore(regradedResults);

        const responsePayload = {
            gradedResults: regradedResults,
            finalScore,
            rawScore: finalScore.totalScore
        };

        if (dryRun) { //if the admin is doing dryRun, return data
            return res.json(responsePayload);
        }

        const updatedSession = await prisma.session.update({
            where: { labId_userId: { labId, userId } },
            data: { finalScore, gradedResults: regradedResults }
        });

        return res.json({
            ...responsePayload,
            session: updatedSession
        });
    } catch (err) {
        console.error('regradeSession error', err.message);
        return res.status(500).json({ error: 'Failed to regrade lab session' });
    }
};



/// USELESS WITHOUT BETTER HARDWARE 
const gradeQuestionOllama = async (req, res) => {
    // const ollamaHost = process.env.OLLAMA_HOST;
    // try {
    //     const { model = 'deepseek-coder:6.7b', temperature = 0.2, userAnswer, answerKey, question, questionType, AIPrompt } = req.body;
    //     const hasUserAnswer = Boolean(userAnswer && userAnswer.trim().length > 0);
    //     const hasAnswerKey = Boolean(answerKey && answerKey.trim().length > 0);

    //     if (!hasUserAnswer) {
    //         return res.status(400).json({ score: 0, feedback: 'No response submitted' });
    //     }
    //     if (!hasAnswerKey) {
    //         return res.status(400).json({ score: 1, feedback: 'Answer key missing; awarding full credit' });
    //     }
    //     if (!model) {
    //         return res.status(400).json({ error: 'model missing' });
    //     }

    //     const response = await axios.post(`${ollamaHost}/api/generate`, {
    //         model,
    //         prompt: buildPrompt({ userAnswer, answerKey, question, questionType, AIPrompt }),
    //         temperature
    //     });

    //     // Only return the payload, not the full axios response (which is circular)
    //     return res.json(response.data);

    // } catch (err) {
    //     console.error('Ollama request failed', err.message);
    //     return res.status(502).json({ error: 'Failed to reach Ollama', detail: err.message });
    // }
};



module.exports = { generateTestsForJavaQuestion,gradeJavaCodeDeepSeek,gradeSession,regradeSession, gradeQuestionDeepSeek, calculateScore,gradeQuestionOllama };