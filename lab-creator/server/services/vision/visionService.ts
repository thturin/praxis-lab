import axios from 'axios';

interface VisionResult {
  text: string;
}

/**
 * Analyze an image using a vision LLM via OpenRouter.
 * Extracts text from handwritten work, circuit diagrams, screenshots, etc.
 */
export async function analyzeImage(base64Data: string, mimeType: string): Promise<VisionResult> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) throw new Error('OPEN_ROUTER_API_KEY is not configured');

  const prompt = `Extract and transcribe all text from this image exactly as written. Return only the transcribed text, nothing else.`;

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'google/gemini-2.0-flash-lite-001',
      messages: [
        {
          role: 'user',
          content: [
            { type: 'text', text: prompt },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      max_tokens: 1000,
      temperature: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 30000,
    }
  );

  const text = response.data?.choices?.[0]?.message?.content || '';
  return { text };
}

