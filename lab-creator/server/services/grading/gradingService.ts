const { callLLM, callEmbeddingModel } = require('../llm/llmClient');
const { compileAndRunJavaWithTests } = require('../docker/dockerExecutionService');
const { buildLGEPrompt, buildJUnitTestPrompt, buildAnalyzeStudentCodePrompt, buildCosineFeedbackPrompt, buildKeyPointsExtractionPrompt, buildPseudoQuestionPrompt } = require('../prompts/gradingPrompts');



interface GenerateJUnitTestsParams {
  problemDescription: string;
  answerKey: string;
}

interface AnalyzeStudentCodeParams {
  problemDescription: string;
  studentCode: string;
  testResults: any;
  testOutput: string;
}

interface GradeJavaCodeParams {
  studentCode: string;
  problemDescription: string;
  testCode: string;
}

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

//=============EMBEDDING MODEL (TSM)=============
export const calculateEmbeddingSimilarity = async (text1: string, text2: string): Promise<number> => {
  try {
    //console.log('==============look here', [text1, text2]);
    const embedding = await callEmbeddingModel({ input: [text1, text2] });
    // Calculate cosine similarity between the two embeddings
    //cosine similarity = (A . B) / (||A|| * ||B||)
    // dot product (A*B) => extracts the similarities of the two vectors. IT ignores the differences
    //refer to this video https://www.youtube.com/watch?v=FrDAU2N0FEg&t=369s
    //(||A|| * ||B||) => normalizes the dot product to a value -1 to 1.
    //console.log(embedding[0],embedding[1]);
    //const dotProduct = embedding[0].reduce((sum, value, i) => sum + value * embedding[1][i], 0);
    //The dot product is: A[0]*B[0] + A[1]*B[1] + A[2]*B[2] + ...
    let dotProduct = 0;
    for (let i = 0; i < embedding[0].length; i++) {
      dotProduct += embedding[0][i] * embedding[1][i];
    }
    //const magnitudeA = Math.sqrt(embedding[0].reduce((sum, value) => sum + value * value, 0));
    let magnitudeA = 0;
    for (let i = 0; i < embedding[0].length; i++) {
      magnitudeA += embedding[0][i] * embedding[0][i];
    }
    magnitudeA = Math.sqrt(magnitudeA);

    //const magnitudeB = Math.sqrt(embedding[1].reduce((sum, value) => sum + value * value, 0));
    let magnitudeB = 0;
    for (let i = 0; i < embedding[1].length; i++) {
      magnitudeB += embedding[1][i] * embedding[1][i];
    }

    magnitudeB = Math.sqrt(magnitudeB);

    if (magnitudeA === 0 || magnitudeB === 0) return 0; // Avoid division by zero

    return dotProduct / (magnitudeA * magnitudeB);

    //cosine similarity visualization: https://www.youtube.com/watch?v=FrDAU2N0FEg&t=369s
    //Cosine similarity basics:
    // Scores range from -1 to 1. In practice with embeddings you'll see 0 to 1.
    // 0.9 to 1.0: Nearly identical semantic meaning. Answer key and student submission are functionally equivalent.
    // 0.7 to 0.89: Strong similarity. Same core logic, possibly different implementation or variable names.
    // 0.5 to 0.69: Moderate similarity. Related concepts but different approaches or missing pieces.
    // Below 0.5: Weak or no semantic relationship.
  } catch (err) {
    console.error('Error calculating embedding similarity', err.response?.data);
    console.error(err.response?.message);
    return 0; // Return 0 similarity on error to avoid false positives
  }
}

export const verifyWithCosineSimilarity = async (userAnswer: string, answerKey: string): Promise<CosineSimilarityVerification> => {
  try {
    const similarity = await calculateEmbeddingSimilarity(userAnswer, answerKey);
    console.log('Cosine similarity verification:', similarity);
    const answerQuality = similarity >= 0.6 ? 'PASS' : 'FAIL';
    return {
      similarity,
      answerQuality
    };
  } catch (err) {
    console.error('Error in verifyWithCosineSimilarity:', err);
    return {
      similarity: -1,
      answerQuality: 'FAIL'
    };
  }
}

//=============KEY POINTS MATCHING (KPM) =============
// Extracts key knowledge points from an answer using LLM, returns array of concise phrases
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

// Extracts key points from both answers, embeds them, and compares via cosine similarity
interface KeyPointsMatchResult {
  similarity: number;
  studentPoints: string[];
  referencePoints: string[];
}

export const matchKeyPoints = async (question: string, userAnswer: string, answerKey: string): Promise<KeyPointsMatchResult> => {
  try {
    // Extract key points from both answers in parallel
    const [studentPoints, referencePoints] = await Promise.all([
      extractKeyPoints(question, userAnswer, answerKey),
      extractKeyPoints(question, answerKey)
    ]);

    console.log('KPM student points:', studentPoints);
    //console.log('KPM reference points:', referencePoints);

    if (studentPoints.length === 0 || referencePoints.length === 0) {
      return { similarity: 0, studentPoints, referencePoints };
    }

    // Join key points into single strings and compare embeddings
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
// Generates a pseudo-question from student answer, then compares with original question via embeddings
interface PseudoQuestionMatchResult {
  similarity: number;
  pseudoQuestion: string;
}

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
// Primary scorer — uses LLM to evaluate answerQuality and provide feedback
interface LGEResult {
  success: boolean;
  answerQuality?: string;
  feedback?: string;
  error?: string;
}

export const evaluateWithLLM = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }: GradeParams): Promise<LGEResult> => {
  try {
    console.log('Here is the question:', question);
    const prompt = buildLGEPrompt({ userAnswer, answerKey, question, questionType, AIPrompt });
    const raw = await callLLM({
      provider: 'deepseek',
      messages: [
        { role: 'system', content: 'You are a fair grading assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 400,
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
    const parsed = JSON.parse(raw);
    console.log('---LGE parsed response:', parsed);
    //return success with parsed results or failure with error message
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
// Runs all 4 modules in parallel (LGE, KPM, PQM, TSM) then fuses results
// Approximates the paper's cross-module deep fusion (Transformer encoder + MLP + sigmoid)
// with weighted scoring. Weights derived from ablation study (Table 4) --> take a look at read-me.pdf in docs:
//   LGE & KPM removal caused largest performance drops → highest weights
//   PQM & TSM had smaller individual impact → lower weights

// Fusion weights — tune these based on grading accuracy observations
const FUSION_WEIGHTS = { lge: 0.35, kpm: 0.30, tsm: 0.20, pqm: 0.15 };
const FUSION_PASS_THRESHOLD = 0.5;

export const gradeWithFusion = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }: GradeParams): Promise<GradingResult> => {

  // Run all 4 modules in parallel (shared embedding layer = Voyage across TSM/KPM/PQM)
  const [lgeResult, kpmResult, pqmResult, tsmResult] = await Promise.all([
    evaluateWithLLM({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs }),
    matchKeyPoints(question, userAnswer, answerKey),
    matchPseudoQuestion(question, userAnswer),
    verifyWithCosineSimilarity(userAnswer, answerKey),
  ]);

  // If LGE failed entirely (API error), abort — can't grade without the primary scorer
  if (!lgeResult.success) {
    throw new Error(`LGE model failed — ${lgeResult.error || 'unknown error'}`);
  }

  const lgeScore = lgeResult.answerQuality === 'pass' ? 1 : 0;
  let feedback = lgeResult.feedback || '';

  // Weighted fusion: approximate cross-module deep fusion (paper Section 4.6)
  // Each module produces a 0-1 signal, combined via fixed weights
  const fusedScore = (
    FUSION_WEIGHTS.lge * lgeScore +
    FUSION_WEIGHTS.kpm * kpmResult.similarity +
    FUSION_WEIGHTS.tsm * tsmResult.similarity +
    FUSION_WEIGHTS.pqm * pqmResult.similarity
  );

  // Binary decision from fused score (paper: sigmoid → threshold)
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

  // If fusion overrode LGE's FAIL (embedding modules rescued the grade), generate encouraging feedback
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
        maxTokens: 400,
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





///=============CODE QUESTIONS GRADING WITH JUNIT TESTS + LLM FEEDBACK ANALYSIS =============
// Generate JUnit test code using LLM
export const generateJUnitTests = async ({ problemDescription, answerKey }: GenerateJUnitTestsParams): Promise<string> => {
  console.log('=== generateJUnitTests START ===');
  const prompt = buildJUnitTestPrompt({ problemDescription, answerKey });

  try {
    const testCode = await callLLM({
      messages: [
        { role: 'system', content: 'You are a Java testing expert. Generate only valid Java code.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      maxTokens: 1500,
      timeout: 60000
    });

    console.log('Test code preview:', testCode.substring(0, 300));

    let cleanedTestCode = testCode.replace(/```java|```/g, '').trim(); // Remove markdown if present

    /// WHEN WE RUN THE TESTS IN DOCKER SANDBOX, THE STUDENT CODE IS RENAMED TO "SOLUTION"
    //THE GENERATED TESTS MUST INSTANTIATE "SOLUTION" INSTEAD OF THE ORIGINAL CLASS NAME
    //POST PROCESS: replace original class name with "Solution"
    // Extract class name from answerKey (e.g., "public class ActivityTracker")
    const classNameMatch = answerKey.match(/public\s+class\s+(\w+)/);
    if (classNameMatch && classNameMatch[1] !== 'Solution') {
      const originalClassName = classNameMatch[1];
      cleanedTestCode = cleanedTestCode.replace(new RegExp(originalClassName, 'g'), 'Solution');
      console.log(`Replaced class name "${originalClassName}" with "Solution" in generated tests`);
    }

    console.log('=== generateJUnitTests SUCCESS ===');
    return cleanedTestCode;

  } catch (err: any) {
    console.error('=== ERROR in generateJUnitTests ===');
    console.error('Error message:', err.message);
    console.error('Error stack:', err.stack);

    if (err.response) {
      console.error('API Response Status:', err.response.status);
      console.error('API Response Headers:', err.response.headers);
      console.error('API Response Data:', JSON.stringify(err.response.data, null, 2));
    } else if (err.request) {
      console.error('Request was made but no response received');
      console.error('Request details:', {
        url: err.config?.url,
        method: err.config?.method,
        timeout: err.config?.timeout
      });
    } else {
      console.error('Error setting up request:', err.message);
    }

    throw err;
  }
};

// Analyze student code and test results to provide score and feedback
export const analyzeStudentCode = async ({ problemDescription, studentCode, testResults, testOutput }: AnalyzeStudentCodeParams) => {
  const prompt = buildAnalyzeStudentCodePrompt({ problemDescription, studentCode, testResults, testOutput });

  const raw = await callLLM({
    messages: [
      { role: 'system', content: 'You are an empathetic Java instructor.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    maxTokens: 1000,
    tools: [{ type: 'function', function: {
      name: 'grade_code',
      description: 'Grade student code with a score and feedback',
      parameters: {
        type: 'object',
        properties: {
          score: { type: 'number' },
          feedback: { type: 'string' }
        },
        required: ['score', 'feedback']
      }
    }}],
    timeout: 20000
  });

  return JSON.parse(raw);

};

//final grading function that orchestrates the entire process for Java code questions: generates tests, runs them, analyzes results, and returns final score and feedback
export const gradeJavaCode = async ({ studentCode, problemDescription, testCode }: GradeJavaCodeParams) => {
  let executionResult;
  try {
    console.log('Running code in Docker lab-creator-container...');
    executionResult = await compileAndRunJavaWithTests({ studentCode, testCode, timeout: 60000 });
  } catch (err: any) {
    console.error('Docker execution failed', err.message);
    throw new Error('Failed to compile or run your code. Check for syntax errors.');
  }

  console.log('Execution result:', executionResult)

  try {
    console.log('Analyzing student code and test results for grading...');
    const gradingResults = await analyzeStudentCode({
      problemDescription,
      studentCode,
      testResults: executionResult.testResults,
      testOutput: executionResult.stdout
    });
    return {
      gradingResults,
      testResults: executionResult.testResults,
      generatedTests: testCode
    };
  } catch (err: any) {
    console.error('LLM analysis failed', err.message);

    throw new Error('Code ran successfully but grading analysis failed. Please try again.');
  }
}



//module.exports = { gradeWithFusion, gradeJavaCode, computeFinalScore, generateJUnitTests, calculateEmbeddingSimilarity };
