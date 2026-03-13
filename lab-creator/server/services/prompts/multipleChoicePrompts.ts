interface BuildMultipleChoiceFeedbackPromptParams {
  question: string;
  answerKey: string;
  studentAnswer: string;
}

export const buildMultipleChoiceFeedbackPrompt = ({ question, answerKey, studentAnswer }: BuildMultipleChoiceFeedbackPromptParams): string => {
  const isCorrect = studentAnswer.trim().toLowerCase() === answerKey.trim().toLowerCase();
  return `You are an empathetic grading assistant. A student answered a multiple choice question.

    QUESTION:
    ${question}

    CORRECT ANSWER: ${answerKey.toUpperCase()}
    STUDENT'S ANSWER: ${studentAnswer.toUpperCase()}
    RESULT: ${isCorrect ? 'Correct' : 'Incorrect'}

        ${isCorrect
          ? 'Explain why the student is correct and suggest areas to explore..'
          : 'The student is incorrect. Do NOT reveal the correct answer. Instead, ' +
            'provide concise feedback noting strengths and areas to explore. ' +
            'Help them think through the concept without giving it away. Use "you" not "the student". Keep feedback concise.'
        }
      `;
    };
