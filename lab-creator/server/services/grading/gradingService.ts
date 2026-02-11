const { callLLM, callEmbeddingModel } = require('../llm/llmClient');
const { compileAndRunJavaWithTests } = require('../docker/dockerExecutionService');
const { buildBinaryRubricPrompt, buildJUnitTestPrompt, buildAnalyzeStudentCodePrompt, buildCosineFeedbackPrompt } = require('../prompts/gradingPrompts');
const { parseScoreFeedback, parseBinaryRubricResponse, calculateBinaryScore, computeFinalScore } = require('../scoring/scoringService');


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

interface GradeWithBinaryRubricParams {
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
  breakdown: { answerQuality: string; compliance: string } | null;
}

interface CosineSimilarityVerification {
  similarity: number;
  answerQuality: 'PASS' | 'FAIL';
}

//=============Embedded Model=============
const calculateEmbeddingSimilarity = async (text1: string, text2: string): Promise<number> => {
  try {
    console.log('==============look here', [text1, text2]);
    const embedding = await callEmbeddingModel({ input: [text1, text2] });
    // Calculate cosine similarity between the two embeddings
    //cosine similarity = (A . B) / (||A|| * ||B||)
    // dot product (A*B) => extracts the similarities of the two vectors. IT ignores the differences
    //refer to this video https://www.youtube.com/watch?v=FrDAU2N0FEg&t=369s
    //(||A|| * ||B||) => normalizes the dot product to a value -1 to 1.

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
    return 0; // Return 0 similarity on error to avoid false positives
  }
}

///=============CODE QUESTIONS GRADING WITH JUNIT TESTS + LLM FEEDBACK ANALYSIS =============
// Generate JUnit test code using LLM
const generateJUnitTests = async ({ problemDescription, answerKey }: GenerateJUnitTestsParams): Promise<string> => {
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
const analyzeStudentCode = async ({ problemDescription, studentCode, testResults, testOutput }: AnalyzeStudentCodeParams) => {
  const prompt = buildAnalyzeStudentCodePrompt({ problemDescription, studentCode, testResults, testOutput });
  console.log('PROMPT', prompt);


  const raw = await callLLM({
    messages: [
      { role: 'system', content: 'You are an empathetic Java instructor. Respond only with JSON.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.3,
    maxTokens: 1000,
    responseFormat: { type: 'json_object' },
    timeout: 20000
  });

  return JSON.parse(raw);

};

//java type question grading with deepseek api
const gradeJavaCode = async ({ studentCode, problemDescription, testCode }: GradeJavaCodeParams) => {

  try {
    //2. execute student code against generated tests in docker sandbox
    console.log('Running code in Docker lab-creator-container...');
    const executionResult = await compileAndRunJavaWithTests({ studentCode, testCode, timeout: 60000 });
    //console.log('Execution result:', executionResult);

    //3. parse test Results for feedback and suggestions and score
    console.log('Analyzing student code and test results for grading...');
    const gradingResults = await analyzeStudentCode({
      problemDescription,
      studentCode,
      testResults: executionResult.testResults,
      testOutput: executionResult.stdout
    });


    return {
      gradingResults: parseScoreFeedback(JSON.stringify(gradingResults)),//{ score, feedback }
      testResults: executionResult.testResults, //testResults from junit/maven
      generatedTests: testCode // junit test code generated
    };


  } catch (err: any) {
    console.error('Error in GradeJavaCode', err.message);
    throw new Error('Failed to grade Java code');
  }
}



//=============NON-CODING QUESTIONS GRADING WITH DEEPSEEK API USING BINARY RUBRIC METHOD =============
//non-coding question grading with deepseek API using binary rubric method

const verifyWithCosineSimilarity = async (userAnswer: string, answerKey: string): Promise<CosineSimilarityVerification> => {
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

const gradeWithBinaryRubric = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }: GradeWithBinaryRubricParams): Promise<GradingResult> => {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  let prompt = buildBinaryRubricPrompt({ userAnswer, answerKey, question, questionType, AIPrompt });
  let raw;
  try {
    raw = await callLLM({
      messages: [
        { role: 'system', content: 'You are a fair grading assistant that responds ONLY with JSON.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 400,
      responseFormat: { type: 'json_object' },
      timeout: timeoutMs,
    });
  } catch (err) {
    console.error('Error calling LLM for grading:', err.response?.data || err.message);
    return { score: 0, result: 'FAIL', feedback: 'Error during grading process', breakdown: null };
  }

  const rubricScores = parseBinaryRubricResponse(raw);

  if (!rubricScores) {
    return { score: 0, result: 'FAIL', feedback: 'Model response malformed or empty', breakdown: null };
  }

  let { score, result, breakdown } = calculateBinaryScore(rubricScores);
  let feedback = rubricScores.feedback;

  // Second verification with cosine similarity if binary rubric failed on answer quality
  if (breakdown.answerQuality !== 'PASS') {
    try {
      const verification = await verifyWithCosineSimilarity(userAnswer, answerKey);
      console.log('Cosine similarity verification result:', verification);

      if (verification.answerQuality === 'PASS') {
        console.log(`Overriding binary rubric with cosine similarity (${verification.similarity.toFixed(3)})`);

        // Update score, result and breakdown answerQuality
        score = 1;
        result = 'PASS';
        breakdown.answerQuality = 'PASS';

        // Generate constructive feedback using the new prompt
        //only the feedback will be updated here.
        try {
          prompt = buildCosineFeedbackPrompt({
            userAnswer,
            answerKey,
            question,
            similarity: verification.similarity
          });

          const feedbackRaw = await callLLM({
            messages: [
              { role: 'system', content: 'You are an empathetic grading assistant that responds ONLY with JSON.' },
              { role: 'user', content: prompt },
            ],
            temperature: 0.3,
            maxTokens: 300,
            responseFormat: { type: 'json_object' },
            timeout: timeoutMs,
          });

          const feedbackResponse = JSON.parse(feedbackRaw);
          feedback = feedbackResponse.feedback || 'Your answer demonstrates correct understanding of the key concepts.';

        } catch (err) {
          console.error('Error generating cosine similarity feedback:', err.response?.data || err.message);
          feedback = 'Your answer demonstrates correct understanding of the key concepts, though expressed differently than the expected response.';
        }
      }
    } catch (err) {
      console.error('Error during cosine similarity verification:', err.response?.data || err.message);
    }
  }

  return {
    score,
    result,
    feedback,
    breakdown
  };
};

module.exports = { gradeWithBinaryRubric, gradeJavaCode, computeFinalScore, generateJUnitTests, calculateEmbeddingSimilarity };
