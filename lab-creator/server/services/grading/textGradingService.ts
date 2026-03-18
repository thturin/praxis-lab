const { callLLM } = require('../llm/llmClient');
const { buildLGEPrompt, buildKeyPointsExtractionPrompt, buildPseudoQuestionPrompt } = require('../prompts/gradingPrompts');
import { generateFusionFeedback } from './feedbackService';
import { prepareGradingInputs } from '../../utils/prepareGradingInputs';
import { calculateEmbeddingSimilarity, verifyWithCosineSimilarity } from './embeddingService';


interface GradeParams {
  userAnswer: string;
  answerKey: string;
  question: string;
  questionType: string;
  AIPrompt: string;
  timeoutMs?: number;
}

interface GradingResult {
  score: number;
  result: string;
  feedback: string;
}

interface KeyPointsMatchResult {
  similarity: number;
  studentPoints: string[];
  referencePoints: string[];
}

interface PseudoQuestionMatchResult {
  similarity: number;
  pseudoQuestion: string;
}

interface LGEResult {
  success: boolean;
  score?: number; // 1 = pass, 0 = fail
  feedback?: string;
  error?: string;
}

export interface GradeTextQuestionParams {
  userAnswer: string;
  answerKey: string;
  question: string;
  questionType: string;
  studentImageTexts?: string[];
  adminImageText?: string;
  adminKeyImageText?: string;
}

export interface GradeTextQuestionResult {
  score: number;
  feedback: string;
  skipped?: boolean;
}

//=============KEY POINTS MATCHING (KPM) =============
const extractKeyPoints = async (question: string, answer: string, answerKey?: string): Promise<string[]> => {
  const prompt = buildKeyPointsExtractionPrompt({ question, answer, answerKey });
  const raw = await callLLM({
    messages: [
      { role: 'system', content: 'You are an exam grading assistant.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    maxTokens: 300,
    tools: [{ type: 'function', function: {
      name: 'extract_key_points',
      description: 'Extract key knowledge points from an answer',
      parameters: {
        type: 'object',
        properties: {
          keyPoints: { type: 'array', items: { type: 'string' } }
        },
        required: ['keyPoints']
      }
    }}],
    timeout: 15000
  });
  const parsed = JSON.parse(raw);
  return parsed.keyPoints || [];
};

export const matchKeyPoints = async (question: string, userAnswer: string, answerKey: string): Promise<KeyPointsMatchResult> => {
  try {
    const [studentPoints, referencePoints] = await Promise.all([
      extractKeyPoints(question, userAnswer, answerKey),
      extractKeyPoints(question, answerKey)
    ]);

    console.log('KPM student points:', studentPoints);

    if (studentPoints.length === 0 || referencePoints.length === 0) {
      return { similarity: 0, studentPoints, referencePoints };
    }

    const studentText = studentPoints.join('; ');
    const referenceText = referencePoints.join('; ');
    const similarity = await calculateEmbeddingSimilarity(studentText, referenceText);

    console.log('KPM similarity:', similarity);
    return { similarity, studentPoints, referencePoints };
  } catch (err) {
    console.error('Error in matchKeyPoints:', err.message);
    return { similarity: 0, studentPoints: [], referencePoints: [] };
  }
};

//=============PSEUDO-QUESTION MATCHING (PQM) =============
export const matchPseudoQuestion = async (question: string, userAnswer: string): Promise<PseudoQuestionMatchResult> => {
  try {
    const prompt = buildPseudoQuestionPrompt({ question, userAnswer });
    const raw = await callLLM({
      messages: [
        { role: 'system', content: 'You are an exam grading assistant.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.3,
      maxTokens: 200,
      tools: [{ type: 'function', function: {
        name: 'generate_pseudo_question',
        description: 'Generate a pseudo-question from the student answer',
        parameters: {
          type: 'object',
          properties: {
            pseudoQuestion: { type: 'string' }
          },
          required: ['pseudoQuestion']
        }
      }}],
      timeout: 15000
    });

    const parsed = JSON.parse(raw);
    const pseudoQuestion = parsed.pseudoQuestion || '';

    if (!pseudoQuestion) {
      return { similarity: 0, pseudoQuestion: '' };
    }

    console.log('PQM pseudo-question:', pseudoQuestion);
    const similarity = await calculateEmbeddingSimilarity(pseudoQuestion, question);
    console.log('PQM similarity:', similarity);

    return { similarity, pseudoQuestion };
  } catch (err) {
    console.error('Error in matchPseudoQuestion:', err.message);
    return { similarity: 0, pseudoQuestion: '' };
  }
};

//=============LLM-BASED GENERAL EVALUATION (LGE)=============
export const evaluateWithLLM = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }: GradeParams): Promise<LGEResult> => {
  try {
    console.log('===================question for LGE===========================:\n', question);
    console.log('\n===================end of question for LGE===========================\n');
    console.log('===============user answer for LGE:===========================\n', userAnswer);
    console.log('===================end of answer for LGE===========================\n');
    const prompt = buildLGEPrompt({ userAnswer, answerKey, question, questionType, AIPrompt });
    const raw = await callLLM({
      provider: 'deepseek',
      messages: [
        { role: 'system', content: 'You are a fair grading assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 1000,
      tools: [{ type: 'function', function: {
        name: 'grade_response',
        description: 'Grade the student response with 1 (pass) or 0 (fail) and feedback',
        parameters: {
          type: 'object',
          properties: {
            score: { type: 'integer', enum: [1, 0] },
            feedback: { type: 'string', description: 'Feedback for the student written in markdown. Use bullet points or numbered lists to separate distinct points.' }
          },
          required: ['answerQuality', 'feedback']
        }
      }}],
      timeout: timeoutMs,
    });
    let parsed;
    try {
      parsed = JSON.parse(raw);
    } catch {
      console.error('LGE JSON parse failed (response likely truncated). Raw:', raw);
      return { success: false, error: 'LGE response was truncated — increase maxTokens or shorten feedback' };
    }
    console.log('*****************LGE parsed response:*****************************', parsed);
    return { success: true, ...parsed };
  } catch (err: any) {
    const status = err.response?.status;
    const apiError = err.response?.data?.error?.message || err.response?.data?.error || err.response?.data;
    let errorMsg: string;

    if (err.code === 'ECONNABORTED' || err.message?.includes('timeout')) {
      errorMsg = `LGE timed out after ${timeoutMs}ms`;
    } else if (err.code === 'ENOTFOUND' || err.code === 'ECONNREFUSED') {
      errorMsg = `LGE cannot reach API: ${err.code}`;
    } else if (status === 401 || status === 403) {
      errorMsg = `LGE auth error (${status}): check API key`;
    } else if (status === 404) {
      errorMsg = `LGE model not found (404): check provider/model config`;
    } else if (status === 429) {
      errorMsg = `LGE rate limited (429): try again shortly`;
    } else if (status && status >= 500) {
      errorMsg = `LGE provider server error (${status})`;
    } else if (apiError) {
      errorMsg = `LGE API error: ${typeof apiError === 'string' ? apiError : JSON.stringify(apiError)}`;
    } else {
      errorMsg = `LGE error: ${err.message || 'unknown'}`;
    }

    console.error(errorMsg);
    return { success: false, error: errorMsg };
  }
};

//=============ORCHESTRATOR: GRADE NON-CODING QUESTIONS =============
const FUSION_WEIGHTS = { lge: 0.35, kpm: 0.30, tsm: 0.20, pqm: 0.15 };
const FUSION_PASS_THRESHOLD = 0.5;

export const gradeWithFusion = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }: GradeParams): Promise<GradingResult> => {

  // Run all grading components in parallel
  const [lgeResult, kpmResult, pqmResult, tsmResult] = await Promise.all([
    evaluateWithLLM({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs }),
    matchKeyPoints(question, userAnswer, answerKey),
    matchPseudoQuestion(question, userAnswer),
    verifyWithCosineSimilarity(userAnswer, answerKey),
  ]);

  if (!lgeResult.success) {
    throw new Error(`LGE model failed — ${lgeResult.error || 'unknown error'}`);
  }

  const lgeScore = lgeResult.score ?? 0;
  let feedback = lgeResult.feedback || '';

  const fusedScore = (
    FUSION_WEIGHTS.lge * lgeScore +
    FUSION_WEIGHTS.kpm * kpmResult.similarity +
    FUSION_WEIGHTS.tsm * tsmResult.similarity +
    FUSION_WEIGHTS.pqm * pqmResult.similarity
  );

  const score = fusedScore >= FUSION_PASS_THRESHOLD ? 1 : 0;

  console.log('Grading fusion:', {
    lge: lgeScore,
    tsm: tsmResult.similarity.toFixed(3),
    kpm: kpmResult.similarity.toFixed(3),
    pqm: pqmResult.similarity.toFixed(3),
    fusedScore: fusedScore.toFixed(3),
    score: score ? 'PASS' : 'FAIL',
  });

  if (lgeScore === 0 && score === 1) { //initial LGE fails but fusion passes — generate feedback explaining the pass
    feedback = await generateFusionFeedback({ userAnswer, answerKey, question, fusedScore, timeoutMs });
  }

  return { score, result: score ? 'PASS' : 'FAIL', feedback };
};

// Shared grading logic for a single text question.
// Used by both gradeQuestion (per-request) and regradeSession (batch).
export const gradeTextQuestion = async (params: GradeTextQuestionParams): Promise<GradeTextQuestionResult> => {
  const { userAnswer, answerKey, question, questionType, studentImageTexts, adminImageText, adminKeyImageText } = params;

  const { effectiveAnswer, effectiveQuestion, effectiveAnswerKey } = prepareGradingInputs({ userAnswer, question, studentImageTexts, adminImageText, answerKey, adminKeyImageText });

  if (!effectiveAnswer.trim()) return { score: 0, feedback: 'No response submitted', skipped: true };
  if (!effectiveAnswerKey?.trim()) return { score: 1, feedback: 'Answer key missing; awarding full credit', skipped: true };

  const result = await gradeWithFusion({ userAnswer: effectiveAnswer, answerKey: effectiveAnswerKey, question: effectiveQuestion, questionType, AIPrompt: '' });
  return { score: result.score, feedback: result.feedback };
};
