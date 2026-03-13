const { callLLM, callEmbeddingModel } = require('../llm/llmClient');
const { buildLGEPrompt, buildCosineFeedbackPrompt, buildKeyPointsExtractionPrompt, buildPseudoQuestionPrompt } = require('../prompts/gradingPrompts');
const { parseTextFromHtml } = require('../../utils/parseHtml');
import { prepareGradingInputs } from '../../utils/prepareGradingInputs';


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
  breakdown: { answerQuality: string; textSimilarity?: number; keyPointsSimilarity?: number; pseudoQuestionSimilarity?: number } | null;
}

interface CosineSimilarityVerification {
  similarity: number;
  answerQuality: 'PASS' | 'FAIL';
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
  answerQuality?: string;
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

//=============EMBEDDING MODEL (TSM)=============
export const calculateEmbeddingSimilarity = async (text1: string, text2: string): Promise<number> => {
  try {
    const embedding = await callEmbeddingModel({ input: [text1, text2] });
    let dotProduct = 0;
    for (let i = 0; i < embedding[0].length; i++) {
      dotProduct += embedding[0][i] * embedding[1][i];
    }
    let magnitudeA = 0;
    for (let i = 0; i < embedding[0].length; i++) {
      magnitudeA += embedding[0][i] * embedding[0][i];
    }
    magnitudeA = Math.sqrt(magnitudeA);

    let magnitudeB = 0;
    for (let i = 0; i < embedding[1].length; i++) {
      magnitudeB += embedding[1][i] * embedding[1][i];
    }
    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0;

    return dotProduct / (magnitudeA * magnitudeB);
  } catch (err) {
    console.error('Error calculating embedding similarity', err.response?.data);
    console.error(err.response?.message);
    return 0;
  }
}

export const verifyWithCosineSimilarity = async (userAnswer: string, answerKey: string): Promise<CosineSimilarityVerification> => {
  try {
    const similarity = await calculateEmbeddingSimilarity(userAnswer, answerKey);
    console.log('Cosine similarity verification:', similarity);
    const answerQuality = similarity >= 0.6 ? 'PASS' : 'FAIL';
    return { similarity, answerQuality };
  } catch (err) {
    console.error('Error in verifyWithCosineSimilarity:', err);
    return { similarity: -1, answerQuality: 'FAIL' };
  }
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
        description: 'Grade the student response with pass/fail and feedback',
        parameters: {
          type: 'object',
          properties: {
            answerQuality: { type: 'string', enum: ['pass', 'fail'] },
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

  const [lgeResult, kpmResult, pqmResult, tsmResult] = await Promise.all([
    evaluateWithLLM({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs }),
    matchKeyPoints(question, userAnswer, answerKey),
    matchPseudoQuestion(question, userAnswer),
    verifyWithCosineSimilarity(userAnswer, answerKey),
  ]);

  if (!lgeResult.success) {
    throw new Error(`LGE model failed — ${lgeResult.error || 'unknown error'}`);
  }

  const lgeScore = lgeResult.answerQuality === 'pass' ? 1 : 0;
  let feedback = lgeResult.feedback || '';

  const fusedScore = (
    FUSION_WEIGHTS.lge * lgeScore +
    FUSION_WEIGHTS.kpm * kpmResult.similarity +
    FUSION_WEIGHTS.tsm * tsmResult.similarity +
    FUSION_WEIGHTS.pqm * pqmResult.similarity
  );

  const answerQuality = fusedScore >= FUSION_PASS_THRESHOLD ? 'PASS' : 'FAIL';
  const score = answerQuality === 'PASS' ? 1 : 0;
  const result = answerQuality;

  const breakdown = {
    answerQuality,
    textSimilarity: tsmResult.similarity,
    keyPointsSimilarity: kpmResult.similarity,
    pseudoQuestionSimilarity: pqmResult.similarity,
  };

  console.log('Grading fusion:', {
    lge: lgeScore,
    tsm: tsmResult.similarity.toFixed(3),
    kpm: kpmResult.similarity.toFixed(3),
    pqm: pqmResult.similarity.toFixed(3),
    fusedScore: fusedScore.toFixed(3),
    result,
  });

  if (lgeScore === 0 && answerQuality === 'PASS') {
    try {
      const feedbackPrompt = buildCosineFeedbackPrompt({
        userAnswer, answerKey, question, similarity: fusedScore
      });
      const raw = await callLLM({
        messages: [
          { role: 'system', content: 'You are an empathetic grading assistant.' },
          { role: 'user', content: feedbackPrompt },
        ],
        temperature: 0.3,
        maxTokens: 1000,
        tools: [{ type: 'function', function: {
          name: 'provide_feedback',
          description: 'Provide encouraging feedback for the student',
          parameters: {
            type: 'object',
            properties: { feedback: { type: 'string', description: 'Feedback for the student written in markdown. Use bullet points or numbered lists to separate distinct points.' } },
            required: ['feedback']
          }
        }}],
        timeout: timeoutMs,
      });
      const feedbackResponse = JSON.parse(raw);
      feedback = feedbackResponse.feedback || 'Your answer demonstrates correct understanding of the key concepts.';
    } catch (err) {
      console.error('Error generating fusion override feedback:', err.response?.data || err.message);
      feedback = 'Your answer demonstrates correct understanding of the key concepts, though expressed differently than the expected response.';
    }
  }

  return { score, result, feedback, breakdown };
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
