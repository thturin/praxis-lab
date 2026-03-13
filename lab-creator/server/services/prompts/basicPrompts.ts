interface BuildBasicGradingPromptParams {
  question: string;
  aiPrompt: string;
  studentAnswer: string;
}

export const buildBasicGradingPrompt = ({ question, aiPrompt, studentAnswer }: BuildBasicGradingPromptParams): string => {
  return `You are an empathetic grading assistant.

QUESTION:
${question}

GRADING DIRECTIONS:
${aiPrompt}

STUDENT'S ANSWER:
${studentAnswer}

Follow the grading directions exactly to determine if the student passes or fails.
Feedback must directly state what the student did or did not provide — for example: "You provided X" or "You did not provide X". Keep it brief and factual. Use "you" not "the student".`;
};
