interface BuildLGEPromptParams {
  userAnswer: string;
  answerKey: string;
  question: string;
  questionType: string;
  AIPrompt: string;
}

interface BuildJUnitTestPromptParams {
  problemDescription: string;
  answerKey: string;
}

interface BuildAnalyzeStudentCodePromptParams {
  problemDescription: string;
  studentCode: string;
  testResults: { total: number; passed: number; failed: number };
  testOutput: string;
}

interface BuildCosineFeedbackPromptParams {
  userAnswer: string;
  answerKey: string;
  question: string;
  similarity: number;
}

interface BuildKeyPointsExtractionPromptParams {
  question: string;
  answer: string;
  answerKey?: string;
}

interface BuildPseudoQuestionPromptParams {
  question: string;
  userAnswer: string;
}


//=======================NON-CODING QUESTIONS=======================================
// Simplified LGE prompt adapted from LASQ unified grading framework
export const buildLGEPrompt = ({ userAnswer, answerKey, question, questionType, AIPrompt }: BuildLGEPromptParams): string => {
  return `You are an intelligent assistant responsible for evaluating a student's answer.
    QUESTION:
    ${question}
    REFERENCE ANSWER:
    ${answerKey}
    STUDENT'S ANSWER:
    ${userAnswer}
    ${AIPrompt ? `\nINSTRUCTOR NOTES:\n${AIPrompt}` : ''}
    Evaluate the student's answer against the reference answer. Does the answer demonstrate correct understanding and cover the key concepts? Answers expressed differently from the reference are acceptable if semantically equivalent.

    Provide concise feedback noting strengths and weaknesses. Use "you" not "the student". Ignore grammar, spelling, and code efficiency.`;
    };

            // Prompt for generating constructive feedback after cosine similarity verification
export const buildCosineFeedbackPrompt = ({ userAnswer, answerKey, question, similarity }: BuildCosineFeedbackPromptParams): string => {
  return `You are an empathetic grading assistant. This answer was verified as semantically correct (similarity: ${similarity.toFixed(3)}).
      QUESTION:
      ${question}
      REFERENCE ANSWER:
      ${answerKey}
      STUDENT'S ANSWER:
      ${userAnswer}
      Provide concise, encouraging feedback. Acknowledge correct understanding, note strengths, and suggest minor improvements if any. Use "you" not "the student".`;
};


//=======================JAVA CODING QUESTIONS===========================================
// Generate JUnit test prompt
export const buildJUnitTestPrompt = ({ problemDescription, answerKey }: BuildJUnitTestPromptParams): string => {
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
export const buildAnalyzeStudentCodePrompt = ({ problemDescription, studentCode, testResults, testOutput }: BuildAnalyzeStudentCodePromptParams): string => {
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

// KPM: Extract key knowledge points from an answer for embedding comparison
// Adapted from LASQ paper Prompts 2 & 3 (see docs/ai-architecture-development/PROMPTS_SUMMARY.txt)
export const buildKeyPointsExtractionPrompt = ({ question, answer, answerKey }: BuildKeyPointsExtractionPromptParams): string => {
  return `You are an exam grading assistant. Extract 2-5 key knowledge points from the given answer.

      QUESTION:
      ${question}
      ${answerKey ? `\nREFERENCE ANSWER (for context):\n${answerKey}` : ''}

      ANSWER TO EXTRACT FROM:
      ${answer}

      Requirements:
      1. Focus only on scoring-relevant knowledge points. Ignore redundant or irrelevant information.
      2. Each knowledge point should be concise (one short phrase or sentence).
      3. Extract 2-5 knowledge points. If fewer exist, that's fine.
      4. Do not subjectively evaluate — only extract key points.
      5. If the answer contains no relevant knowledge points, return an empty array.
      `;
};

// PQM: Generate a pseudo-question from the student's answer for relevance checking
// Adapted from LASQ paper Prompt 1 (see docs/ai-architecture-development/PROMPTS_SUMMARY.txt)
export const buildPseudoQuestionPrompt = ({ question, userAnswer }: BuildPseudoQuestionPromptParams): string => {
  return `You are an exam grading assistant. Generate a pseudo-question from the student's answer.

      The pseudo-question should represent what exam question the student appears to be answering based on their response.

      Requirements:
      1. Extract the core question or topic from the student's answer.
      2. Ignore redundant information and errors in the answer.
      3. The pseudo-question should be consistent with the main semantics of the student's answer.
      4. Do not simply copy the original question.

      ORIGINAL QUESTION (for domain context only):
      ${question}

      STUDENT'S ANSWER:
      ${userAnswer}
      `;
};

