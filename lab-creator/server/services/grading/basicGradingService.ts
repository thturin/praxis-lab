import { evaluateWithLLM, matchKeyPoints, matchPseudoQuestion } from './textGradingService';
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

const BASIC_WEIGHTS = { lge: 0.45, kpm: 0.40, pqm: 0.15 };
const BASIC_PASS_THRESHOLD = 0.5;

export const gradeBasicQuestion = async ({ userAnswer, answerKey, question, studentImageTexts, adminImageText, adminKeyImageText }: GradeBasicQuestionParams): Promise<GradeBasicQuestionResult> => {
  const [lgeResult, kpmResult, pqmResult] = await Promise.all([
    evaluateWithLLM({ userAnswer, answerKey, question, questionType: 'basic', AIPrompt: '', timeoutMs: 20000 }),
    matchKeyPoints(question, userAnswer, answerKey),
    matchPseudoQuestion(question, userAnswer),
  ]);

  if (!lgeResult.success) {
    throw new Error(`LGE failed — ${lgeResult.error || 'unknown error'}`);
  }

  const lgeScore = lgeResult.score ?? 0;
  let feedback = lgeResult.feedback || '';

  const fusedScore = (
    BASIC_WEIGHTS.lge * lgeScore +
    BASIC_WEIGHTS.kpm * kpmResult.similarity +
    BASIC_WEIGHTS.pqm * pqmResult.similarity
  );

  const score = fusedScore >= BASIC_PASS_THRESHOLD ? 1 : 0;

  console.log('Basic grading fusion:', {
    lge: lgeScore,
    kpm: kpmResult.similarity.toFixed(3),
    pqm: pqmResult.similarity.toFixed(3),
    fusedScore: fusedScore.toFixed(3),
    score: score ? 'PASS' : 'FAIL',
  });

  if (lgeScore === 0 && score === 1) {
    feedback = await generateFusionFeedback({ userAnswer, answerKey, question, fusedScore, timeoutMs: 20000 });
  }

  return { score, feedback };
};
