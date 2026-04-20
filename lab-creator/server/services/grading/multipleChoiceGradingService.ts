const { callLLM } = require('../llm/llmClient');
const { parseTextFromHtml } = require('../../utils/parseHtml');
import { buildMultipleChoiceFeedbackPrompt } from '../prompts/multipleChoicePrompts';
import { prepareGradingInputs } from '../../utils/prepareGradingInputs';

export interface GradeMultipleChoiceParams {
  userAnswer: string;
  answerKey: string;
  question: string;
  adminImageText?: string;
  studentImageTexts?: string[];
}

export interface GradeMultipleChoiceResult {
  score: number;
  feedback: string;
}

export const gradeMultipleChoiceQuestion = async ({ userAnswer, answerKey, question, adminImageText, studentImageTexts }: GradeMultipleChoiceParams): Promise<GradeMultipleChoiceResult> => {
  const { effectiveAnswer, effectiveQuestion } = prepareGradingInputs({ userAnswer, question, studentImageTexts, adminImageText });

  const normalizedStudent = effectiveAnswer.trim().toLowerCase();
  const normalizedKey = parseTextFromHtml(answerKey).trim().toLowerCase();

  if (!normalizedStudent) return { score: 0, feedback: 'No response submitted' };
  if (!normalizedKey) return { score: 1, feedback: 'Answer key missing; awarding full credit' };

  // Score is determined by exact match — LLM is only called for feedback
  const score = normalizedStudent === normalizedKey ? 1 : 0;
  const parsedQuestion = effectiveQuestion;

  const prompt = buildMultipleChoiceFeedbackPrompt({
    question: parsedQuestion,
    answerKey: normalizedKey,
    studentAnswer: normalizedStudent,
  });

  console.log('here is the prompt for MC grading: ', prompt);

  const raw = await callLLM({
    provider: 'deepseek',
    messages: [
      { role: 'system', content: 'You are an empathetic grading assistant.' },
      { role: 'user', content: prompt },
    ],
    temperature: 0.2,
    maxTokens: 1000,
    tools: [{ type: 'function', function: {
      name: 'grade_response',
      description: 'Return the score and feedback for a multiple choice answer',
      parameters: {
        type: 'object',
        properties: {
          score: { type: 'integer', description: '1 if correct, 0 if incorrect' },
          feedback: { type: 'string', description: 'Feedback for the student written in markdown. Use bullet points or numbered lists to separate distinct points.' }
        },
        required: ['score', 'feedback']
      }
    }}],
    timeout: 30000,
  });

 

  const parsed = JSON.parse(raw);
  // Score comes from exact match; feedback comes from LLM
  return { score, feedback: parsed.feedback };
};
