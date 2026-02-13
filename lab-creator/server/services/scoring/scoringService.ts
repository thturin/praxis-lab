interface ScoreFeedback {
  score: number;
  feedback: string;
}

interface RubricScores {
  answerQuality: string;
  compliance: string;
  feedback: string;
}

interface BinaryScoreResult {
  score: number;
  result: string;
  breakdown: {
    answerQuality: string;
    compliance: string;
  };
}

interface GradedResult {
  score?: number;
  feedback?: string;
}

interface FinalScore {
  percent: string;
  maxScore: number;
  totalScore: number;
}

//enforce json response from LLM API
export const parseScoreFeedback = (raw: string | object): ScoreFeedback => {
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const score = Number(parsed?.score);
    const feedback = typeof parsed?.feedback === 'string' ? parsed.feedback.trim() : '';

    if (Number.isFinite(score) && score >= 0 && score <= 1 && feedback.length > 0) {
      return { score, feedback };
    }
  } catch (err: any) {
    console.warn('DeepSeek parse error', err.message);
  }

  return { score: 0, feedback: 'Model response malformed or empty' };
};

export const parseBinaryRubricResponse = (raw: string | object): RubricScores | null => {
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
  } catch (err: any) {
    console.warn('Binary rubric response parse error', err.message);
  }

  return null;
};

export const calculateBinaryScore = (rubricScores: RubricScores): BinaryScoreResult => {
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
export const computeFinalScore = (gradedResults: Record<string, GradedResult>): FinalScore => {
  const maxPoints = Object.keys(gradedResults || {}).length;
  const awardedPoints = Object.values(gradedResults || {}).reduce((sum, result) => sum + (result?.score || 0), 0);
  //[1,2,3].reduce((sum, n) => sum + n, 0) → 6
  return {
    percent: maxPoints ? ((awardedPoints / maxPoints) * 100).toFixed(1) : '0.0',
    maxScore: maxPoints,
    totalScore: awardedPoints,
  };
};

//his is a common TypeScript issue. Because scoringService.ts has no export or 
// import at the top level, TypeScript treats it as a script (global scope) 
// rather than a module. So parseScoreFeedback is seen as 
// a global declaration conflicting with the one in gradingService.ts.
//The fix is to use proper export on each function. 
// Since your tsconfig has "module": "commonjs", tsx compiles export 
// const to exports.foo = ..., so require() still works.
//module.exports = { parseScoreFeedback, parseBinaryRubricResponse, calculateBinaryScore, computeFinalScore };
