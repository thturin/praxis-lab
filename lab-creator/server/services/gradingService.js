const axios = require('axios');
const { compileAndRunJavaWithTests } = require('./dockerExecutionService')

//enforce json response from deepseek api called in gradeWithDeepSeek
const parseScoreFeedback = (raw) => { //enforce json return from deepseek
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


// Generate JUnit test code using DeepSeek API
const generateJUnitTests = async ({ problemDescription, answerKey }) => {
  // Generate JUnit test code based on problem description and examples
  console.log('=== generateJUnitTests START ===');
  //console.log('answerKey:', answerKey);
  const prompt = `You are a Java testing expert. Create JUnit 5 test code for this programming problem:

            Problem Description:
              ${problemDescription}

              Answer Key:
              ${answerKey}

              Requirements:
              1. Create a complete JUnit 5 test class named "SolutionTest"
              2. Assume the student's class is named "Solution" with appropriate methods
              3. If there are test cases, they will included in problem description or answerKey. If 
              there are n test cases provided, create test cases that test all scenarios and edge cases.
              4. Use assertions from org.junit.jupiter.api.Assertions
              5. Return ONLY the Java code - no markdown, no explanations

              Test class template:
              import org.junit.jupiter.api.Test;
              import static org.junit.jupiter.api.Assertions.*;

              public class SolutionTest {
                  @Test
                  public void testExample1() {
                      Solution solution = new Solution();
                      // Add test logic
                  }
              }
              IMPORTANT: 
              -The student code will always be renamed to class "Solution" before execution. 
              You MUST use "new Solution(...)" for all object instantiation, even if the answer key 
              shows a different class name like "Student" or "Calculator".
              `;

  try {
    const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a Java testing expert. Generate only valid Java code.' },
        { role: 'user', content: prompt }
      ],
      temperature: 0.2,
      max_tokens: 1500
    }, {
      headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
                'Content-Type': 'application/json' },
      timeout: 60000 //60 seconds 
    });

    console.log('DeepSeek API Response Status:', response.status);
    console.log('DeepSeek Response Data:', JSON.stringify(response.data, null, 2));

    const testCode = response.data?.choices?.[0]?.message?.content || '';
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

// Analyze student code and test results to provide score and feedback DEEP SEEK API
const analyzeStudentCode = async ({ problemDescription, studentCode, testResults, testOutput }) => {
  // Analyze student code against test code to provide feedback

  const prompt = `Grade this Java programming submission:

            Problem: ${problemDescription}
            
            The student's class and constructor name is "Solution" because the 
            code was renamed for grading purposes.Do not mention this in your feedback.
            The class does not have to be named the same as in the problem description.
  
            Student Code:
            ${studentCode.substring(0, 2000)}

            Test Results:
            - Total Tests: ${testResults.total}
            - Passed: ${testResults.passed}
            - Failed: ${testResults.failed}

            Test Output:
            ${testOutput.substring(0, 1000)}

            Provide:
            1. Overall score (0-1) - calculate it by the number of passed tests over total tests.
            2. Constructive feedback on what worked and what didn't
            3. Specific suggestions for improvement of the student's code (not the test cases)
            4. Wrap feedback and suggestion in the same key "feedback"

            IMPORTANT:
            - Use "You" not "the student" in feedback.

            Respond with JSON: { "score": number, "feedback": string }`;
  //console.log('PROMPT',prompt);


  const response = await axios.post('https://api.deepseek.com/chat/completions', {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: 'You are an empathetic Java instructor. Respond only with JSON.' },
      { role: 'user', content: prompt }
    ],
    response_format: { type: 'json_object' },
    temperature: 0.3,
    max_tokens: 1000 //3-4 chars per token 
  }, {
    headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    timeout: 20000
  });

  return JSON.parse(response.data.choices[0].message.content);

};

//java type question graing with with deepseek api
const gradeJavaCode = async ({ studentCode, problemDescription, testCode }) => {
  // console.log(typeof (studentCode));
  // console.log(typeof (problemDescription));
  // console.log(testCode);
  // console.log(typeof (testCode));
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


//LLM MODEL PROMPT FOR NON-CODING QUESTIONS - BINARY PASS/FAIL RUBRIC
// Binary Pass/Fail rubric for all non-Java questions
const BINARY_RUBRIC = {
  name: "Binary Pass/Fail Rubric",
  criteria: [
    {
      name: "answerQuality",
      description: "PASS: Semantically equivalent to expected answer - demonstrates correct understanding and produces equivalent outcomes, even if expressed or structured differently. Includes all required elements. FAIL: Incorrect logic, missing key concepts, or produces different/wrong outcomes."
    },
    {
      name: "compliance",
      description: "PASS: Contains all required elements clearly. Structural variations (e.g., different organization, additional context) are acceptable if core content is present. FAIL: Missing required elements, unclear/confusing presentation."

    }
  ]
};


//Updated prompt to reduce hallucinations by removing subjective language and adding explicit "grade only what's written" constraint
const buildBinaryRubricPrompt = ({ userAnswer, answerKey, question, questionType, AIPrompt }) => {
  const rubric = BINARY_RUBRIC;

  let rubricSection = `\nGRADING RUBRIC (Binary Pass/Fail - ALL must pass):\n\n`;
  rubric.criteria.forEach((criterion, idx) => {
    rubricSection += `${idx + 1}. ${criterion.name}:\n   ${criterion.description}\n\n`;
  });

  const basePrompt = AIPrompt || '';

  return `You are an empathetic, and fair grading assistant. Evaluate this student response using binary criteria.

      QUESTION:
      ${question}

      ANSWER KEY/EXPECTED RESPONSE:
      ${answerKey}

      STUDENT'S ANSWER:
      ${userAnswer}
      ${rubricSection}
      ${basePrompt ? `\nINSTRUCTOR NOTES:\n${basePrompt}` : ''}

      GRADING INSTRUCTIONS:

      1. Evaluate each criterion independently as PASS or FAIL
      2. For answerQuality: Check if student answered the question completely and correctly. If the question asks for explanation/reasoning/examples, those must be present and specific.
      3. For compliance: Check if student followed format/length/constraint instructions in the question. Ignore grammar/spelling errors.
      4. For the overall result: BOTH criteria must PASS for overall PASS
      5. If EITHER criterion fails, the overall result is FAIL
      6. Provide specific feedback explaining which criteria passed/failed and why. Provide constructive suggestions for improvement.

      IMPORTANT:
      - Use "You" not "the student" in feedback.
      - Respond ONLY with valid JSON: { "answerQuality": "pass|fail", "compliance": "pass|fail", "feedback": string }
      - Feedback should identify which criteria failed and provide positive, constructive guidance (≤1000 characters)
      - Do not penalize for grammar or spelling errors.
      - Accept examples that demonstrate understanding, even if brief.
      - If response is empty, mark both criteria as fail
      -When  the student's answer contains code, do not judge upon O(n) complexity and how efficient the algorithm is.
      - When the student's answer contains code, evaluate correctness by tracing execution with test inputs, not by comparing code structure or algorithm to the answer key. Different approaches (e.g., swaps vs. store-and-shift, iterative vs. recursive, different loop structures) that produce the correct output must PASS.
      `;
      
};

const calculateBinaryScore = (rubricScores) => {
  const allPass =
    rubricScores.answerQuality === 'pass' &&
    rubricScores.compliance === 'pass';

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

const gradeWithBinaryRubric = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }) => {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const prompt = buildBinaryRubricPrompt({ userAnswer, answerKey, question, questionType, AIPrompt });

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a strict but fair grading assistant that responds ONLY with JSON.' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_object',
      },
      temperature: 0.2,
      max_tokens: 400,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: timeoutMs,
    }
  );

  const raw = response.data?.choices?.[0]?.message?.content || '';
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


//OLD LOGIC NOT BEING USED ANYMORE 
// Build prompt for DeepSeek grading NON CODING QUESTIONS
const buildPrompt = ({ userAnswer, answerKey, question, questionType, AIPrompt }) => {
  const basePrompt = AIPrompt || '';

  return `compare the student's answer to the answer key. 
            Answer Key: ${answerKey}
            Student Answer: ${userAnswer}
            Question: ${question}
            Question Type: ${questionType}
            AI Prompt: ${basePrompt}.
            You are an empathetic grading assistant that responds only with a 
            JSON object with EXACTLY { "score": number, "feedback": string }. 
            Compare the student answer to the answer key, look for misconceptions, 
            and explain how to correct them. Mention the specific concept they misunderstood, 
            point toward the right reasoning, and suggest one next step (e.g., revisit a definition or example).
            Be kind, concise, and avoid grammar penalties. Feedback should be ≤1000 characters.
            The response will be be in html but ignore all html artifacts and just analyze the text.
            Is the student's answer correct, give a score from 0 to 1 and a brief feedback.
            If the response is empty, just respond with 'response is empty' `;
};

//Gets called in gradeController.js /deepseek api gradeQuestionDeepSeek and regradeSession
const gradeWithDeepSeek = async ({ userAnswer, answerKey, question, questionType, AIPrompt, timeoutMs = 20000 }) => {
  if (!process.env.DEEPSEEK_API_KEY) {
    throw new Error('DEEPSEEK_API_KEY is not configured');
  }

  const prompt = buildPrompt({ userAnswer, answerKey, question, questionType, AIPrompt });

  const response = await axios.post(
    'https://api.deepseek.com/chat/completions',
    {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are a grading assistant that responds ONLY with a single JSON object.' },
        { role: 'user', content: prompt },
      ],
      response_format: {
        type: 'json_object',
      },
      temperature: 0.2,
      max_tokens: 350,
    },
    {
      headers: {
        Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}`,
        'Content-Type': 'application/json',
      },
      timeout: timeoutMs,
    }
  );

  const raw = response.data?.choices?.[0]?.message?.content || '';
  //return { score: 0, feedback: 'Model response malformed or empty' };
  return parseScoreFeedback(raw);
};


module.exports = { gradeWithBinaryRubric, gradeJavaCode, parseScoreFeedback, buildPrompt, gradeWithDeepSeek, computeFinalScore, generateJUnitTests, parseBinaryRubricResponse, calculateBinaryScore, BINARY_RUBRIC };

