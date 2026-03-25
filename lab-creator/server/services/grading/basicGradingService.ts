const { callLLM } = require('../llm/llmClient');
import { buildBasicGradingPrompt } from '../prompts/basicPrompts';
import { prepareGradingInputs } from '../../utils/prepareGradingInputs';

export interface GradeBasicQuestionParams {
  userAnswer: string;
  aiPrompt: string;
  question: string;
  adminImageText?: string;
  studentImageText?: string[];
}

export interface GradeBasicQuestionResult {
  score: number;
  feedback: string;
}


//studentImageTexts == studentImageAnalysis.text-extraction
export const gradeBasicQuestion = async ({ userAnswer, aiPrompt, question, adminImageText, studentImageText }: GradeBasicQuestionParams): Promise<GradeBasicQuestionResult> => {
  const { effectiveAnswer, effectiveQuestion } = prepareGradingInputs({ userAnswer, question, studentImageText, adminImageText });
  if (!effectiveAnswer.trim()) return { score: 0, feedback: 'Response is empty for basic question' };
  if (!aiPrompt?.trim()) return { score: 1, feedback: 'No grading directions provided; awarding full credit' };

  const prompt = buildBasicGradingPrompt({
    question: effectiveQuestion,
    aiPrompt,
    studentAnswer: effectiveAnswer,
  });
  let raw;

  try {
    raw = await callLLM({
      provider: 'deepseek',
      messages: [
        { role: 'system', content: 'You are an empathetic grading assistant.' },
        { role: 'user', content: prompt },
      ],
      temperature: 0.2,
      maxTokens: 500,
      tools: [{
        type: 'function', function: {
          name: 'grade_response',
          description: 'Grade the student response as pass or fail based on the grading directions',
          parameters: {
            type: 'object',
            properties: {
              score: { type: 'integer', description: '1 if pass, 0 if fail' },
              feedback: { type: 'string', description: 'Brief feedback stating what the student did or did not provide, written in markdown.' }
            },
            required: ['score', 'feedback']
          }
        }
      }],
      timeout: 20000,
    });

  }catch(err){
    console.error('Error grading basic question:', err.response?.data || err.message);
    return { score: 0, feedback: 'Error during grading. Please review your answer and try again.' };
  }



  const parsed = JSON.parse(raw);
  return { score: parsed.score, feedback: parsed.feedback };
};
