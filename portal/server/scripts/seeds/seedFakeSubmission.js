const path = require('path');
const { PrismaClient } = require('@prisma/client');
// Load envs from repo root (.env) so Docker/compose values are reused
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
const axios = require('axios');

const SECTION_ID = 18; // set SECTION_CODE "100"-> name: "TEST"
const ASSIGNMENT_ID = 35; // set to your test assignment id "test_1"
const COUNT = 30;
const LAB_ID = 31;



const prismaPortal = new PrismaClient();

const main = async () => {
    // sessions for the given lab id
    const { data: sessions } = await axios.get(`${process.env.LAB_CREATOR_API_URL}/session/get-sessions/labId`, {
        params:{ labId:LAB_ID }
    });
    if(!sessions) return console.error('no sessions found for labId:',LAB_ID);
    console.log(sessions);
    // TODO: extract raw scores and create submissions per session
    for(const session of sessions){
        const rawScore = session.finalScore.percent || -1;
        const userId = session.userId;
        if(!userId) continue; //skip
        
        const submission = await prismaPortal.submission.upsert({
            where:{
                userId_assignmentId:{userId,assignmentId:ASSIGNMENT_ID}
            },
            update:{
                rawScore:Number(rawScore),
                score:Number(rawScore),
                submittedAt:new Date()
            },
            create:{
                userId,
                assignmentId:ASSIGNMENT_ID,
                rawScore:Number(rawScore),
                score:Number(rawScore),
                submittedAt:new Date()
            },
        });
        if(!submission) console.error('error creating/updating submission for userId: ',userId);
        console.log('Submission created for userId',userId);
    }
};

main()
    .catch((err) => {
        console.error(err);
        process.exit(1);
    })
    .finally(async () => {
        await prismaPortal.$disconnect();
    });