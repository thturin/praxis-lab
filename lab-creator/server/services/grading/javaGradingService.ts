const { callLLM } = require('../llm/llmClient');
const { compileAndRunJavaWithTests } = require('../docker/dockerExecutionService');
const { buildJUnitTestPrompt, buildAnalyzeStudentCodePrompt } = require('../prompts/gradingPrompts');
const { parseTextFromHtml, parseCodeFromHtml } = require('../../utils/parseHtml');


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

export interface GradeJavaQuestionParams {
  userAnswer: string;
  testCode: string;
  question: string;
  imageText?: string;
}

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

    let cleanedTestCode = testCode.replace(/```java|```/g, '').trim();

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
      name: 'provide_feedback',
      description: 'Provide feedback on the student code submission',
      parameters: {
        type: 'object',
        properties: { //does not return a score, that is calculate beforehand
          feedback: { type: 'string' }
        },
        required: ['feedback']
      }
    }}],
    //increased timeout for LLM analysis since it can be complex and we want to avoid grading failures due to timeouts
    //timeout can create error abort signal
    timeout: 60000
  });

  return JSON.parse(raw);
};

export const gradeJavaCode = async ({ studentCode, problemDescription, testCode }: GradeJavaCodeParams) => {
  let executionResult;
  try {
    console.log('Running code in Docker lab-creator-container...');
    executionResult = await compileAndRunJavaWithTests({ studentCode, testCode, timeout: 60000 });
  } catch (err: any) {
    console.error('Docker execution failed', err.message);
    throw new Error('Failed to compile or run your code. Check for syntax errors.');
  }

  const { passed = 0, totalTests = 0 } = executionResult.testResults ?? {};
  const score = totalTests > 0 ? Math.round((passed / totalTests) * 100) / 100 : 0;

  try {
    console.log('Analyzing student code and test results for grading...');
    const llmResult = await analyzeStudentCode({
      problemDescription: problemDescription ?? '',
      studentCode: studentCode ?? '',
      testResults: executionResult.testResults ?? {},
      testOutput: executionResult.stdout ?? ''
    });
    console.log('Grading results from LLM:', llmResult);

    return {
      gradingResults: { score, feedback: llmResult.feedback },
      testResults: executionResult.testResults,
      generatedTests: testCode
    };
  } catch (err: any) {
    console.error('LLM analysis failed', err.message);
    throw new Error('Code ran successfully but grading analysis failed. Please try again.');
  }
};

// Shared grading logic for a single Java code question.
// Used by both gradeJavaQuestion (per-request) and regradeSession (batch).
export const gradeJavaQuestionService = async (params: GradeJavaQuestionParams) => {
  const { userAnswer, testCode, question, imageText } = params;

  let problemDescription = parseTextFromHtml(question);
  if (imageText?.trim()) problemDescription += `\n\n[Image text]: ${imageText.trim()}`;

  return gradeJavaCode({
    studentCode: parseCodeFromHtml(userAnswer),
    problemDescription,
    testCode
  });
};
