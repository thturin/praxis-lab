import { matchKeyPoints, matchPseudoQuestion } from './textGradingService';
import { generateFusionFeedback } from './feedbackService';

export interface GradeBasicQuestionParams {
  userAnswer: string;
  answerKey: string;
  question: string;
  studentImageTexts?: string[];
  adminImageText?: string;
  adminKeyImageText?: string;
}

export interface GradeBasicQuestionResult {
  score: number;
  feedback: string;
}

const BASIC_WEIGHTS = { kpm: 0.65, pqm: 0.35 };
const BASIC_PASS_THRESHOLD = 0.65;

// This function grades a basic question by combining the results of key point matching and pseudo-question matching.
// // It then generates feedback based on the fused score.
export const gradeBasicQuestion = async ({ userAnswer, answerKey, question }: GradeBasicQuestionParams): Promise<GradeBasicQuestionResult> => {
  const [kpmResult, pqmResult] = await Promise.all([
    matchKeyPoints(question, userAnswer, answerKey),
    matchPseudoQuestion(question, userAnswer),
  ]);

  const fusedScore = (
    BASIC_WEIGHTS.kpm * kpmResult.similarity +
    BASIC_WEIGHTS.pqm * pqmResult.similarity
  );

  const score = fusedScore >= BASIC_PASS_THRESHOLD ? 1 : 0;

  console.log('Basic grading fusion:', {
    kpm: kpmResult.similarity.toFixed(3),
    pqm: pqmResult.similarity.toFixed(3),
    fusedScore: fusedScore.toFixed(3),
    score: score ? 'PASS' : 'FAIL',
  });


  const feedback = await generateFusionFeedback({ userAnswer, answerKey, question, fusedScore, timeoutMs: 20000 });

  return { score, feedback };
};
