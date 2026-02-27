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
