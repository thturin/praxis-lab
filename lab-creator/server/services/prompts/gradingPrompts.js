const { BINARY_RUBRIC } = require('./rubrics');

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
      - Consider that student's might show their work in the response. Focus on final answer correctness and completeness.
      `;

};


// Generate JUnit test prompt
const buildJUnitTestPrompt = ({ problemDescription, answerKey }) => {
  return `You are a Java testing expert. Create JUnit 5 test code for this programming problem:

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
};


// Analyze student code prompt for score and feedback
const buildAnalyzeStudentCodePrompt = ({ problemDescription, studentCode, testResults, testOutput }) => {
  return `Grade this Java programming submission:

            Problem: ${problemDescription}

            The student's class and constructor name is "Solution" because the
            code was renamed for grading purposes.Do not mention this in your feedback.
            The class does not have to be named the same as in the problem description.

            Student Code:
            ${studentCode}

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
            - You grade them ONLY based on the provided test results. Do not consider code style, efficiency, or other factors not reflected in the test results.

            Respond with JSON: { "score": number, "feedback": string }`;
};


module.exports = { BINARY_RUBRIC, buildBinaryRubricPrompt, buildJUnitTestPrompt, buildAnalyzeStudentCodePrompt };
