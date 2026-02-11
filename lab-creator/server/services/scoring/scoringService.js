//enforce json response from LLM API
const parseScoreFeedback = (raw) => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const score = Number(parsed?.score);
    const feedback = typeof parsed?.feedback === 'string' ? parsed.feedback.trim() : '';

    if (Number.isFinite(score) && score >= 0 && score <= 1 && feedback.length > 0) {
      return { score, feedback };
    }
  } catch (err) {
    console.warn('DeepSeek parse error', err.message);
  }

  return { score: 0, feedback: 'Model response malformed or empty' };
};

const parseBinaryRubricResponse = (raw) => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;

    const answerQuality = String(parsed?.answerQuality).toLowerCase();
    const compliance = String(parsed?.compliance).toLowerCase();
    const feedback = typeof parsed?.feedback === 'string' ? parsed.feedback.trim() : '';

    // Validate all criteria are pass or fail
    const validValues = ['pass', 'fail'];
    if (!validValues.includes(answerQuality) || !validValues.includes(compliance)) {
      console.warn('Invalid criterion values:', { answerQuality, compliance });
      return null;
    }

    if (feedback.length === 0) {
      console.warn('Empty feedback');
      return null;
    }

    return { answerQuality, compliance, feedback };
  } catch (err) {
    console.warn('Binary rubric response parse error', err.message);
  }

  return null;
};

const calculateBinaryScore = (rubricScores) => {
  const allPass =
    rubricScores.answerQuality === 'PASS' &&
    rubricScores.compliance === 'PASS';

  const score = allPass ? 1.0 : 0.0;
  const result = allPass ? 'PASS' : 'FAIL';

  return {
    score,
    result,
    breakdown: {
      answerQuality: rubricScores.answerQuality,
      compliance: rubricScores.compliance
    }
  };
};

// Computes final score from graded results
//this is used in gradeController.js regradeSession redis
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

module.exports = { parseScoreFeedback, parseBinaryRubricResponse, calculateBinaryScore, computeFinalScore };
