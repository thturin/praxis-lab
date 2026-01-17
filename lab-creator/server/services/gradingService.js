const axios = require('axios');


//enforce json response from deepseek api called in gradeWithDeepSeek
const parseScoreFeedback = (raw) => { //enforce json return from deepseek
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const score = Number(parsed?.score);
    const feedback = typeof parsed?.feedback === 'string' ? parsed.feedback.trim().slice(0, 400) : '';

    if (Number.isFinite(score) && score >= 0 && score <= 1 && feedback.length > 0) {
      return { score, feedback };
    }
  } catch (err) {
    console.warn('DeepSeek parse error', err.message);
  }

  return { score: 0, feedback: 'Model response malformed or empty' };
};

const buildPrompt = ({ userAnswer, answerKey, question, questionType, AIPrompt }) => {
  const basePrompt = AIPrompt || '';

  return `compare the student's answer to the answer key. 
            Answer Key: ${answerKey}
            Student Answer: ${userAnswer}
            Question: ${question}
            Question Type: ${questionType}
            AI Prompt: ${basePrompt}.
            You are an empathetic grading assistant that responds only with a 
            JSON object with EXACTLY { "score": number, "feedback": string }. 
            Compare the student answer to the answer key, look for misconceptions, 
            and explain how to correct them. Mention the specific concept they misunderstood, 
            point toward the right reasoning, and suggest one next step (e.g., revisit a definition or example).
            Be kind, concise, and avoid grammar penalties. Feedback should be ≤500 characters.
            The response will be be in html but ignore all html artifacts and just analyze the text.
            Is the student's answer correct, give a score from 0 to 1 and a brief feedback.
            If the response is empty, just respond with 'response is empty' `;
};


//Gets called in gradeController.js /deepseek api gradeQuestionDeepSeek and regradeSession
const gradeWithDeepSeek = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }) => {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const prompt = buildPrompt({ userAnswer, answerKey, question, questionType, AIPrompt });

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a grading assistant that responds ONLY with a single JSON object.' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_object',
      },
      temperature: 0.2,
      max_tokens: 200,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: timeoutMs,
    }
  );

  const raw = response.data?.choices?.[0]?.message?.content || '';
  //return { score: 0, feedback: 'Model response malformed or empty' };
  return parseScoreFeedback(raw);
};

const computeFinalScore = (gradedResults) => {
  const maxPoints = Object.keys(gradedResults || {}).length;
  const awardedPoints = Object.values(gradedResults || {}).reduce((sum, result) => sum + (result?.score || 0), 0);
  //[1,2,3].reduce((sum, n) => sum + n, 0) → 6
  return {
    percent: maxPoints ? ((awardedPoints / maxPoints) * 100).toFixed(1) : '0.0',
    maxScore: maxPoints,
    totalScore: awardedPoints,
  };
};

module.exports = { parseScoreFeedback, buildPrompt, gradeWithDeepSeek, computeFinalScore };
