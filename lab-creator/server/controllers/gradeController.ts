require('dotenv').config();
const { PrismaClient } = require('@prisma/client');
const { generateJUnitTests, gradeJavaQuestionService } = require('../services/grading/javaGradingService');
const { gradeTextQuestion } = require('../services/grading/textGradingService');
const { gradeImageAnalysisWithFusion } = require('../services/grading/imageGradingService');
const { gradeMultipleChoiceQuestion } = require('../services/grading/multipleChoiceGradingService');
const { gradeBasicQuestion } = require('../services/grading/basicGradingService');
const { computeFinalScore } = require('../services/scoring/scoringService');
const { parseCodeFromHtml, parseTextFromHtml } = require('../utils/parseHtml');
const prisma = new PrismaClient();

import type { Request, Response } from 'express';

//calculate final score from gradingService computerFinalScore and update session
//called from frontend after all questions graded
// also called from regradeSession after regrading
export const calculateScore = async (req: Request, res: Response) => {
    console.log('--------calculating score-----------');
    console.time('calculateScore');
    const { gradedResults, labId, userId } = req.body;
    //console.log(Array.isArray(gradedResults));
    if (!gradedResults) return res.status(400).json({ error: 'gradedResults is missing' });
    // console.log('HERE ARE THE GRADED RESULTS ->>>>',gradedResults);
    const finalScore = computeFinalScore(gradedResults);
    console.log(finalScore);
    console.log('--------------------------------');

    try {
        const updatedSession = await prisma.session.update({
            where: { labId_userId: { labId, userId } },
            data: { finalScore, gradedResults }
        });
        return res.json({ session: updatedSession });
    } catch (err) {
        console.error('Error in calculateScore', err);
        return res.status(500).json({ error: 'error calculating score' });
    }
};

export const generateTestsForJavaQuestion = async (req: Request, res: Response) => {
    const { problemDescription, answerKey, imageText } = req.body;
    let parsedProblemDescription = parseTextFromHtml(problemDescription);
    if (imageText && imageText.trim().length > 0) {
        parsedProblemDescription += `\n\n[Image text]: ${imageText.trim()}`;
    }
    const parsedAnswerKey = parseCodeFromHtml(answerKey);
    console.log('Generating tests for Java question...');
    console.log('Problem Description:', parsedProblemDescription);
    console.log('Answer Key:', parsedAnswerKey);
    try {
        const testCode = await generateJUnitTests({ problemDescription: parsedProblemDescription, answerKey: parsedAnswerKey });
        console.log('Generated JUnit tests:');
        console.log(testCode);
        return res.json({ testCode });
    } catch (err: any) {
        console.error('Error generating tests for Java question', err.message);
        console.error('error stack', err.stack);
        return res.status(500).json({ error: 'Failed to generate tests' });
    }
};
//grade a single question using LLM
//filters out empty answers and missing answer keys
//gradecontroller is responsible for parsing HTML and appending image text 
// before sending to gradingService, which is responsible for the actual grading logic (LLM calls, similarity calculations, etc)
export const gradeQuestion = async (req: Request, res: Response) => {
    const { userAnswer, answerKey, question, questionType, adminImageText, adminKeyImageText, adminImageAnalysis, studentImageAnalysis, AIPrompt } = req.body;
    try {
        let result;
        //MULTIPLE CHOICE ..COMPARE ANSWER TO KEY AND AWARD FULL CREDIT IF MATCH, ZERO IF NOT. IF NO ANSWER KEY, AWARD FULL CREDIT AND FEEDBACK INDICATING AUTO-AWARDED
        if (questionType === 'multiple-choice') {
            result = await gradeMultipleChoiceQuestion({ userAnswer, answerKey, question, adminImageText });
        //BASIC QUESTION .."IS IT THERE" OR "HOW MANY ARE THERE" TYPE QUESTIONS WHERE AI PROMPT DEFINES GRADING CRITERIA
        } else if (questionType === 'basic') {
            result = await gradeBasicQuestion({ userAnswer, aiPrompt: AIPrompt, question, adminImageText });
        //IMAGE ANALYSIS QUESTIONS WITH BOTH STUDENT AND ADMIN ANALYSIS AVAILABLE — USE IMAGE FUSION GRADING
        } else if (questionType === 'image-analysis') {
            if (!adminImageAnalysis) return res.status(400).json({ error: 'Admin answer key does not contain an image analysis' });
            if (!studentImageAnalysis) return res.status(400).json({ error: 'Student image analysis not found' });
            result = await gradeImageAnalysisWithFusion({ studentAnalysis: studentImageAnalysis, adminAnalysis: adminImageAnalysis, question });
        } else {
            // Text grading — use text_extraction from studentImageAnalysis if available
            const effectiveStudentImageTexts = studentImageAnalysis ? [studentImageAnalysis.text_extraction] : undefined;
            result = await gradeTextQuestion({ userAnswer, answerKey, question, questionType, studentImageTexts: effectiveStudentImageTexts, adminImageText, adminKeyImageText });
        }
        return res.json(result);
    } catch (err: any) {
        console.error('Grading failed:', err.message);
        return res.status(503).json({ error: 'Grading service temporarily unavailable. Please try again later.' });
    }
};

export const gradeJavaQuestion = async (req: Request, res: Response) => {
    const { userAnswer, testCode, question, imageText } = req.body;
    try {
        const result = await gradeJavaQuestionService({ userAnswer, testCode, question, imageText });
        res.json(result);
    } catch (err: any) {
        console.error('Error in gradeJavaCode controller', err.message);
        return res.status(500).json({
            error: 'Failed to grade Java code',
            score: 0,
            feedback: 'An error occurred while grading the code. Please try again later.'
        });
    }
};

//CURRENTLY NOT IMPLEMENTED
export const gradeSession = async (req: Request, res: Response) => {
    // Placeholder function for grading a session
    //this was creating in respect to making grading a session (student facing) in a worker
    //When the time comes to implement it, we can add the logic here
    return res.status(501).json({ error: 'Not implemented yet' });
}

//this is called asynchronously with redis
//currently dry run and late penalty are disabled
export const regradeSession = async (req: Request, res: Response) => {
    const { labId, userId, responses, dryRun = true, includeLatePenalty = false } = req.body;
    if (!labId || !userId || !responses) {
        return res.status(400).json({ error: 'labId, userId, responses are required' });
    }

    try {
        // Fetch lab and session in parallel
        const [lab, session] = await Promise.all([
            prisma.lab.findUnique({ where: { id: labId } }),
            prisma.session.findUnique({ where: { labId_userId: { labId, userId } } })
        ]);
        if (!lab) return res.status(404).json({ error: `Lab ${labId} not found` });
        // const studentImageTexts: Record<string, string[]> = (session?.studentImageTexts as any) || {}; // deprecated
        const studentImageAnalysis: Record<string, any> = (session?.studentImageAnalysis as any) || {};

        const blocks: any[] = Array.isArray(lab.blocks) ? lab.blocks : [];
        const questionLookup: Record<string, any> = {};

        blocks.forEach((block: any) => {
            if (block.blockType !== 'question') return;
            const scoredSubQuestions = (block.subQuestions || []).filter((sq: any) => sq.isScored);
            if (scoredSubQuestions.length) {
                scoredSubQuestions.forEach((sq: any) => {
                    questionLookup[sq.id] = {
                        ...sq,
                        prompt: block.prompt ? `${block.prompt}\n\n${sq.prompt}` : sq.prompt
                    };
                });
            } else if (block.isScored) {
                questionLookup[block.id] = block;
            }
        });

        const regradedResults: Record<string, any> = {}; // questionId -> { score, feedback, testResults? }

        for (const [questionId, userAnswer] of Object.entries(responses) as [string, any][]) {
            const details = questionLookup[questionId];
            if (!details) {
                console.warn(`question metadata missing for id ${questionId} in regradeSession`);
                continue;
            }

            try {
                let result;

                // Route to appropriate grading function based on question type
                if (details.type === 'code' && details.generatedTestCode) {
                    console.log(`Grading Java code question ${questionId} using JUnit tests`);
                    result = await gradeJavaQuestionService({
                        userAnswer,
                        testCode: details.generatedTestCode,
                        question: details.prompt,
                        imageText: details.imageText
                    });
                    regradedResults[questionId] = {
                        score: result.gradingResults.score,
                        feedback: result.gradingResults.feedback,
                        testResults: result.testResults
                    };

                } else if (details.type === 'multiple-choice') {
                    result = await gradeMultipleChoiceQuestion({
                        userAnswer,
                        answerKey: details.key,
                        question: details.prompt,
                    });
                } else if (details.type === 'basic') {
                    result = await gradeBasicQuestion({
                        userAnswer,
                        aiPrompt: details.aiPrompt,
                        question: details.prompt,
                    });
                } else if (details.type === 'image-analysis') {
                    result = await gradeImageAnalysisWithFusion({
                        studentAnalysis: studentImageAnalysis[questionId],
                        adminAnalysis: details.keyImageAnalysis,
                        question: details.prompt,
                    });
                } else {
                    result = await gradeTextQuestion({
                        userAnswer,
                        answerKey: details.key,
                        question: details.prompt,
                        questionType: details.type,
                        studentImageTexts: studentImageAnalysis[questionId] ? [studentImageAnalysis[questionId].text_extraction] : undefined,
                        adminImageText: details.imageText,
                        adminKeyImageText: details.keyImageText,
                    });
                }

                if (!regradedResults[questionId]) {
                    regradedResults[questionId] = {
                        score: result.score,
                        feedback: result.feedback
                    };
                }

                //30+ simultaneous deepseek requests get
                //Error grading question 1765678253268 during regrade getaddrinfo EAI_AGAIN api.deepseek.com
                //add a small delay
                await new Promise(resolve => setTimeout(resolve, 500)); //500 ms delay

            } catch (err: any) {
                console.error(`Error grading question ${questionId} during regrade`, err.message);
            }
        }

        // Ensure all scored questions appear in results, even if student left them blank
        for (const questionId of Object.keys(questionLookup)) {
            if (!regradedResults[questionId]) {
                regradedResults[questionId] = { score: 0, feedback: 'No response submitted' };
            }
        }

        const finalScore = computeFinalScore(regradedResults);
        const responsePayload = {
            gradedResults: regradedResults,
            finalScore,
            rawScore: finalScore.totalScore
        };

        const updatedSession = await prisma.session.update({
            where: { labId_userId: { labId, userId } },
            data: { finalScore, gradedResults: regradedResults }
        });

        return res.json({
            ...responsePayload,
            session: updatedSession
        });
    } catch (err: any) {
        console.error('regradeSession error', err.message);
        return res.status(500).json({ error: 'Failed to regrade lab session' });
    }
};

/// USELESS WITHOUT BETTER HARDWARE
export const gradeQuestionOllama = async (req: Request, res: Response) => {
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


//module.exports = { generateTestsForJavaQuestion, gradeJavaQuestion, gradeSession, regradeSession, gradeQuestion, calculateScore, gradeQuestionOllama };
