const { callLLM } = require('../llm/llmClient');
const { buildCosineFeedbackPrompt } = require('../prompts/gradingPrompts');

interface GenerateFusionFeedbackParams {
  userAnswer: string;
  answerKey: string;
  question: string;
  fusedScore: number;
  questionType?: string;
  timeoutMs?: number;
}

// Called when LGE fails but fusion score passes —
// generates feedback explaining why the answer is considered correct
// based on semantic similarity rather than LGE judgement.
// Also called for image-analysis questions where feedback is always fusion-based.
export const generateFusionFeedback = async ({
  userAnswer,
  answerKey,
  question,
  fusedScore,
  questionType,
  timeoutMs = 20000,
}: GenerateFusionFeedbackParams): Promise<string> => {
  try {
    const feedbackPrompt = buildCosineFeedbackPrompt({ userAnswer, answerKey, question, similarity: fusedScore, questionType });

    const raw = await callLLM({
      messages: [
        { role: 'system', content: 'You are an empathetic grading assistant.' },
        { role: 'user', content: feedbackPrompt },
      ],
      temperature: 0.3,
      maxTokens: 1000,
      tools: [{ type: 'function', function: {
        name: 'provide_feedback',
        description: 'Provide encouraging feedback for the student',
        parameters: {
          type: 'object',
          properties: { feedback: { type: 'string', description: 'Feedback for the student written in markdown. Use bullet points or numbered lists to separate distinct points.' } },
          required: ['feedback']
        }
      }}],
      timeout: timeoutMs,
    });
    const parsed = JSON.parse(raw);
    return parsed.feedback || 'Your answer demonstrates correct understanding of the key concepts.';
  } catch (err: any) {
    console.error('Error generating fusion override feedback:', err.response?.data || err.message);
    return 'Your answer demonstrates correct understanding of the key concepts, though expressed differently than the expected response.';
  }
};
