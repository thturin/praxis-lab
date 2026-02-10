const { callLLM } = require('../llm/llmClient');
const { compileAndRunJavaWithTests } = require('../docker/dockerExecutionService');
const { buildBinaryRubricPrompt, buildJUnitTestPrompt, buildAnalyzeStudentCodePrompt } = require('../prompts/gradingPrompts');
const { parseScoreFeedback, parseBinaryRubricResponse, calculateBinaryScore, computeFinalScore } = require('../scoring/scoringService');


// Generate JUnit test code using LLM
const generateJUnitTests = async ({ problemDescription, answerKey }) => {
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

  } catch (err) {
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
const analyzeStudentCode = async ({ problemDescription, studentCode, testResults, testOutput }) => {
  const prompt = buildAnalyzeStudentCodePrompt({ problemDescription, studentCode, testResults, testOutput });
  console.log('PROMPT',prompt);


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

//java type question graing with with deepseek api
const gradeJavaCode = async ({ studentCode, problemDescription, testCode }) => {

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


  } catch (err) {
    console.error('Error in GradeJavaCode', err.message);
    throw new Error('Failed to grade Java code');
  }
}




const gradeWithBinaryRubric = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }) => {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const prompt = buildBinaryRubricPrompt({ userAnswer, answerKey, question, questionType, AIPrompt });

  const raw = await callLLM({
    messages: [
      { role: 'system', content: 'You are a strict but fair grading assistant that responds ONLY with JSON.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    maxTokens: 400,
    responseFormat: { type: 'json_object' },
    timeout: timeoutMs,
  });
  const rubricScores = parseBinaryRubricResponse(raw);

  if (!rubricScores) {
    return { score: 0, result: 'FAIL', feedback: 'Model response malformed or empty', breakdown: null };
  }

  const { score, result, breakdown } = calculateBinaryScore(rubricScores);

  return {
    score,
    result,
    feedback: rubricScores.feedback,
    breakdown
  };
};


module.exports = { gradeWithBinaryRubric, gradeJavaCode, computeFinalScore, generateJUnitTests };

