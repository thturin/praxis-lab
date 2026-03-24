const axios = require('axios');
require('dotenv').config();
const { PrismaClient } = require('@prisma/client');

const prisma = new PrismaClient();


const deleteSession = async (req, res) => {
    const { labId } = req.params;
    if (!labId) return res.status(400).json({ error: 'missing assignment Id' });

    try {
        await prisma.session.deleteMany({
            where: { labId: Number(labId) }
        });
        return res.json({ message: 'Session deleted successfully' });
    } catch (err) {
        console.error('Error deleting session:', err);
        res.status(500).json({ error: 'Failed to delete session' });
    }
    return res.json({ message: 'Assignment and associated data deleted successfully' });
}


const saveSession = async (req, res) => {
    const { session } = req.body;
    const { responses, gradedResults, finalScore, studentImageTexts, userId, labId, labTitle, username } = session;
    if (!labId || !userId) {
        return res.status(400).json({ error: 'Missing labId or userId' });
    }

    try {
        // Check if session exists to preserve responses during updates
        const existingSession = await prisma.session.findUnique({
            where: { labId_userId: { labId, userId } }
        });

        // Build update data - preserve existing data if new data is empty
        // This prevents accidental data loss when auto-save sends empty data
        //WHAT THE PROBLEM WAS. SOMETIMES RESPONSES, GRADEDRESULTS WERE EMPTY OBJECT{}
        //THE EMPTY OBJECT WOULD BE SENT TO THE BACKEND AND OVERWRITE THE EXISTING DATA
        //SO NOW WE ONLY UPDATE IF THE NEW DATA IS NON-EMPTY

        //This could be a problem if we want to intentionally clear data, but for now this is safer
        const updateData = {
            labTitle,
            username
        };

        // Only update responses if non-empty OR it's a new session
        if (responses && Object.keys(responses).length > 0) {
            updateData.responses = responses;
        } else if (!existingSession) {
            updateData.responses = responses || {};
        }

        // Only update gradedResults if non-empty OR it's a new session
        // This prevents wiping graded data when client sends empty gradedResults
        if (gradedResults && Object.keys(gradedResults).length > 0) {
            updateData.gradedResults = gradedResults;
        } else if (!existingSession) {
            updateData.gradedResults = gradedResults || {};
        }

        // Only update finalScore if non-empty and totalScore > 0 OR it's a new session
        //totalScore should always be greater than 0 for a valid score. If not, there are no questions present in the lab
        // This prevents wiping final score when client sends empty finalScore
        if (finalScore && Object.keys(finalScore).length > 0 && finalScore.totalScore>0) {
            updateData.finalScore = finalScore;
        } else if (!existingSession) {
            updateData.finalScore = finalScore || {};
        }

        if (studentImageTexts && Object.keys(studentImageTexts).length > 0) {
            updateData.studentImageTexts = studentImageTexts;
        } else if (!existingSession) {
            updateData.studentImageTexts = {};
        }

        //upsert updates if session exists, or create if it does not
        const newSession = await prisma.session.upsert({
            where: { labId_userId: { labId, userId } },
            update: updateData,
            create: {
                labId,
                labTitle,
                username,
                userId,
                responses: responses || {},
                gradedResults: gradedResults || {},
                finalScore: finalScore || {},
                studentImageTexts: studentImageTexts || {}
            }
        });
        return res.json({ message: 'Session Saved', newSession });
    } catch (err) {
        console.error('Error in saveSession()->', err);
        return res.json({ error: 'Could not save session' });
    }
};

const getSessions = async (req, res) => {
    try {
        const sessions = await prisma.session.findMany();
        return res.json(sessions);
    } catch (err) {
        console.error('Error in getSessions()->', err);
        return res.status(500).json({ error: 'Could not get sessions' });
    }
}

const getSessionsByLabId = async (req, res) => {
    const { labId } = req.query;
    if (!labId) return res.status(400).json({ error: 'missing labId`   ' });
    try {
        const sessions = await prisma.session.findMany({
            where: { labId: Number(labId) }
        });
        return res.json(sessions);
    } catch (err) {
        console.error('Error in getSessionsByAssignmentId()->', err);
        return res.status(500).json({ error: 'Could not get sessions by assignmentId' });
    }

}

const manualGradeSessionQuestion = async (req, res) => {
    const { id } = req.params;
    const { questionId, score } = req.body;
    if (!questionId || score === undefined) return res.status(400).json({ error: 'missing questionId or score' });
    if (!id) return res.status(400).json({ error: 'missing id' });
    try {
        const session = await prisma.session.findUnique({
            where: { id: id }
        });

        const gradedResults = session.gradedResults || {};
        //update gradedResults with new data from req.body
        if (!gradedResults[questionId]) {
            return res.status(400).json({ error: `No existing graded result for questionId ${questionId}` });
        }
        gradedResults[questionId] = { score };

        // Recalculate final score
        const totalScore = Object.values(gradedResults).reduce((sum, result) => sum + (result.score || 0), 0);
        const maxScore = Object.keys(gradedResults).length; // Or get from lab config
        const percent = maxScore > 0 ? ((totalScore / maxScore) * 100).toFixed(2) : 0;
        const finalScore = {
            totalScore,
            maxScore,
            percent
        };

        let newSession = await prisma.session.update({
            where: { id: id },
            data: { gradedResults, finalScore}
        });
        return res.json(newSession);

    } catch (err) {
        console.error('Error in getSessionById()->', err);
        return res.status(500).json({ error: 'Could not get session by id' });
    }
};

const loadSession = async (req, res) => {
    const { labId } = req.params;
    const { userId, username, title } = req.query;

    try {
        let session = await prisma.session.findUnique({
            where: { labId_userId: { labId: Number(labId), userId: Number(userId) } }
        });

        if (!session) {
            console.log('No session found, creating new one');
            session = await prisma.session.create({
                data: {
                    labTitle: title,
                    labId: Number(labId),
                    userId: Number(userId),
                    username,
                    responses: {},
                    gradedResults: {},
                    finalScore: {},
                }
            });

        } else {
            // console.log('session already exists->',JSON.stringify(session));
        }
        //console.log(JSON.stringify(session));
        return res.json({ session });
    } catch (err) {
        console.error('Error in getSession()->', err);
        return res.json(500).json({ error: 'Count not get session' });
    }
}

module.exports = { manualGradeSessionQuestion, saveSession, loadSession, getSessions, deleteSession, getSessionsByLabId };