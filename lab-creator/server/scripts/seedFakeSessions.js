// @ts-nocheck
const path = require('path');
// Load envs from repo root (.env) so Docker/compose values are reused
require('dotenv').config({ path: path.join(__dirname, '..', '..', '..', '.env') });
const axios = require('axios');
const { PrismaClient } = require('@prisma/client');
const { Q1_Variants, Q2_Variants, Q3_Variants } = require('./variants');
const { gradeWithBinaryRubric } = require('../services/grading/gradingService');
const { computeFinalScore } = require('../services/scoring/scoringService');

const labDbUrl = process.env.LABCREATOR_DATABASE_URL || process.env.DATABASE_URL;

if (!labDbUrl) {
  throw new Error('Missing LABCREATOR_DATABASE_URL (or DATABASE_URL) in root .env');
}


const prisma = new PrismaClient({ datasources: { db: { url: labDbUrl } } });
const PORTAL_API_URL = process.env.PORTAL_API_URL || 'http://portal-api:5000';


const LAB_ID = 31;
const LAB_TITLE = 'Test_1';
const COUNT = 30;

const QUESTION_IDS = {
  q1: '1765677952441',
  q2: '1765678234439',
  q3: '1765678253268',
};

// Grader for seed data using DeepSeek (one call per question). Consider cost/time.
const gradeSeedResponses = async (responses, lab) => {
  const gradedResults = {};
  const blocks = Array.isArray(lab.blocks) ? lab.blocks : [];
  //Array.isArray safeguards the grading loop because blocks is coming from a JSON field. Maybe it 
  //won't be an array
  const aiPrompt = lab.aiPrompt;

  for (const [questionId, userAnswer] of Object.entries(responses)) {
    let answerKey = '';
    let question = '';
    let questionType = '';

    // find matching block/subQuestion
    for (const block of blocks) {
      const hasSubQuestions = Array.isArray(block.subQuestions) && block.subQuestions.length > 0;

      if (block.blockType === 'question' && block.isScored && block.id === questionId) {
        answerKey = block.key;
        question = block.prompt;
        questionType = block.type;
        break;
      }

      if (hasSubQuestions) {
        const match = block.subQuestions.find((sq) => sq.id === questionId && sq.isScored);
        if (match) {
          answerKey = match.key;
          question = match.prompt;
          questionType = match.type;
          break;
        }
      }
    }

    if (!answerKey) {
      gradedResults[questionId] = {
        score: 1,
        feedback: 'Auto-awarded: no answer key provided',
      };
      continue;
    }

    try {
      const result = await gradeWithBinaryRubric({
        userAnswer,
        answerKey,
        question,
        questionType,
        AIPrompt: aiPrompt,
      });
      console.log('here is the result',result);
      gradedResults[questionId] = result;
    } catch (err) {
      console.error(`DeepSeek grading failed for question ${questionId}:`, err.message);
      gradedResults[questionId] = {
        score: 0,
        feedback: 'Grading failed; defaulting to 0',
      };
    }
  }

  const finalScore = computeFinalScore(gradedResults);
  return { gradedResults, finalScore };
};

 const seedFakeSessions = async () =>{
  const lab = await prisma.lab.findUnique({ where: { id: LAB_ID } });
  if (!lab) {
    console.error(`Lab ${LAB_ID} (${LAB_TITLE}) not found. Aborting.`);
    return;
  }

  await prisma.session.deleteMany({ where: { labId: LAB_ID } });
  
  //FOR SANITY we are doing an http request becasue we do not haev access to the db because 
/// our prisma client is linked to the lab-creator-db schema console..(prisma)
  const users = await axios.get(`${PORTAL_API_URL}/api/users/section`, {
    params: { sectionId: 18 }
  });  

  // const portalUsers = await prismaPortal.user.findMany({
  //   where: { username: { startsWith: 'dev-student-' } },
  //   select: { id: true, username: true },
  // });
  if(!users) console.log('Error, could not get users');
  const portalUserMap = new Map(users.data.map((u) => [u.username, u.id]));
  const now = new Date();
  const data = [];

  for (let idx = 0; idx < COUNT; idx++) {
    const n = idx + 1;
    const username = `dev-stud-${n}`;
    const resp = {
      [QUESTION_IDS.q1]: Q1_Variants[idx % Q1_Variants.length],
      [QUESTION_IDS.q2]: Q2_Variants[idx % Q2_Variants.length],
      [QUESTION_IDS.q3]: Q3_Variants[idx % Q3_Variants.length],
    };

    const userId = portalUserMap.get(username);
    if (!userId) {
      console.warn(`Portal user missing for ${username}; falling back to synthetic id ${1000 + n}`);
    }

    const { gradedResults, finalScore } = await gradeSeedResponses(resp, lab);

    data.push({
      labId: LAB_ID,
      labTitle: LAB_TITLE,
      username,
      userId: userId ?? 1000 + n,
      responses: resp,
      gradedResults,
      finalScore,
      createdAt: new Date(now.getTime() - n * 60 * 1000),
      lastModified: now,
    });
  }

  await prisma.session.createMany({ data });

  console.log(`Seeded ${COUNT} sessions for lab ${LAB_ID} (${LAB_TITLE}).`);
}

seedFakeSessions() //execute when calling node 
  .catch((err) => {
    console.error(err);
    process.exit(1);
  })
  .finally(async () => {
    await prisma.$disconnect();

  });