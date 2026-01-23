const axios = require('axios');
const { compileAndRunJavaWithTests } = require('./dockerExecutionService')

//enforce json response from deepseek api called in gradeWithDeepSeek
const parseScoreFeedback = (raw) => { //enforce json return from deepseek
  try {
    const parsed = typeof raw === 'string' ? JSON.parse(raw) : raw;
    const score = Number(parsed?.score);
    const feedback = typeof parsed?.feedback === 'string' ? parsed.feedback.trim().slice(0, 400) : '';

    if (Number.isFinite(score) && score >= 0 && score <= 1 && feedback.length > 0) {
      return { score, feedback };
    }
  } catch (err) {
    console.warn('DeepSeek parse error', err.message);
  }

  return { score: 0, feedback: 'Model response malformed or empty' };
};


const generateJUnitTests = async ({ problemDescription, answerKey }) => {
  // Generate JUnit test code based on problem description and examples

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
              IMPORTANT: The student code will always be renamed to class "Solution" before execution. 
              You MUST use "new Solution(...)" for all object instantiation, even if the answer key 
              shows a different class name like "Student" or "Calculator".
    
              `;

  const response = await axios.post('https://api.deepseek.com/chat/completions', {
    model: 'deepseek-chat',
    messages: [
      { role: 'system', content: 'You are a Java testing expert. Generate only valid Java code.' },
      { role: 'user', content: prompt }
    ],
    temperature: 0.2,
    max_tokens: 1500
  }, {
    headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
    timeout: 30000
  });

  const testCode = response.data?.choices?.[0]?.message?.content || '';
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

  return cleanedTestCode;
};

const analyzeStudentCode = async ({ problemDescription, studentCode, testResults, testOutput }) => {
  // Analyze student code against test code to provide feedback
  
  const prompt = `Grade this Java programming submission:

            Problem: ${problemDescription}
            
            The student's class and constructor name is "Solution" because the 
            code was renamed for grading purposes.
  
            Student Code:
            ${studentCode.substring(0, 2000)}

            Test Results:
            - Total Tests: ${testResults.total}
            - Passed: ${testResults.passed}
            - Failed: ${testResults.failed}

            Test Output:
            ${testOutput.substring(0, 1000)}

            Provide:
            1. Overall score (0-1) - award partial credit for partially correct solutions
            2. Constructive feedback on what worked and what didn't
            3. Specific suggestions for improvement
            4. Wrap feedback and suggestion in the same key "feedback"

            Respond with JSON: { "score": number, "feedback": string }`;
            console.log('PROMPT',prompt);


  const response = await axios.post('https://api.deepseek.com/chat/completions', {
      model: 'deepseek-chat',
      messages: [
        { role: 'system', content: 'You are an empathetic Java instructor. Respond only with JSON.' },
        { role: 'user', content: prompt }
      ],
      response_format: { type: 'json_object' },
      temperature: 0.3,
      max_tokens: 600
    }, {
      headers: { Authorization: `Bearer ${process.env.DEEPSEEK_API_KEY}` },
      timeout: 20000
    });

  return JSON.parse(response.data.choices[0].message.content);

};

const gradeJavaCode = async ({ studentCode, problemDescription, answerKey }) => {
  try {
    //1. ask deepseek to generate junit tests
    console.log('Generating JUnit tests via DeepSeek...');
    const testCode = await generateJUnitTests({ problemDescription, answerKey });
    // console.log('Generated JUnit tests:');
    // console.log(testCode);

    //2. execute student code against generated tests in docker sandbox
    console.log('Running code in Docker sandbox...');
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

    //console.log('Grading results:', gradingResults);

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
            Be kind, concise, and avoid grammar penalties. Feedback should be ≤500 characters.
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

module.exports = { gradeJavaCode,parseScoreFeedback, buildPrompt, gradeWithDeepSeek, computeFinalScore, generateJUnitTests };

