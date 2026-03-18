import axios from 'axios';

interface VisionResult {
  text: string;
}

export interface ImageAnalysis {
  text_extraction: string;
  visual_components: {
    elements: Array<{
      id: string;
      type: string;
      description: string;
      attributes: {
        state: string;
      };
    }>;
  };
  logical_flow: {
    process_type: string;
    steps: Array<{
      order: number;
      action: string;
      dependencies: string[];
    }>;
  };
  analytical_summary: {
    primary_function: string;
    identified_pattern: string;
    noted_anomalies_or_constraints: string[];
  };
}

/**
 * Extract text from an image using a vision LLM via OpenRouter.
 * Use for handwritten work, code screenshots, or any image where only text is needed.
 */
export async function extractImage(base64Data: string, mimeType: string): Promise<VisionResult> {
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

/**
 * Analyze an image using a vision LLM via OpenRouter.
 * Returns structured JSON analysis including text extraction, visual components,
 * logical flow, and analytical summary. Used for grading image-based questions.
 */
export async function analyzeImage(base64Data: string, mimeType: string): Promise<ImageAnalysis> {
  const apiKey = process.env.OPEN_ROUTER_API_KEY;
  if (!apiKey) throw new Error('OPEN_ROUTER_API_KEY is not configured');

  const response = await axios.post(
    'https://openrouter.ai/api/v1/chat/completions',
    {
      model: 'google/gemini-2.0-flash-lite-001',
      messages: [
        {
          role: 'user',
          content: [
            {
              type: 'text',
              text: 'Analyze this image thoroughly and return a structured analysis.'
            },
            {
              type: 'image_url',
              image_url: {
                url: `data:${mimeType};base64,${base64Data}`,
              },
            },
          ],
        },
      ],
      tools: [
        {
          type: 'function',
          function: {
            name: 'analyze_image',
            description: 'Return a structured analysis of the image',
            parameters: {
              type: 'object',
              properties: {
                text_extraction: {
                  type: 'string',
                  description: 'All raw text found in the image, transcribed verbatim'
                },
                visual_components: {
                  type: 'object',
                  properties: {
                    elements: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          id: { type: 'string', description: 'Short unique identifier for this element' },
                          type: { type: 'string', description: 'Type of element (e.g. D_flip_flop, AND_gate, node, decision)' },
                          description: { type: 'string', description: 'What this element does in context' },
                          attributes: {
                            type: 'object',
                            properties: {
                              state: { type: 'string', description: 'Current or default state of the element' }
                            },
                            required: ['state']
                          }
                        },
                        required: ['id', 'type', 'description', 'attributes']
                      }
                    }
                  },
                  required: ['elements']
                },
                logical_flow: {
                  type: 'object',
                  properties: {
                    process_type: { type: 'string', description: 'e.g. sequential, conditional, parallel' },
                    steps: {
                      type: 'array',
                      items: {
                        type: 'object',
                        properties: {
                          order: { type: 'integer' },
                          action: { type: 'string', description: 'What happens at this step' },
                          dependencies: { type: 'array', items: { type: 'string' } }
                        },
                        required: ['order', 'action', 'dependencies']
                      }
                    }
                  },
                  required: ['process_type', 'steps']
                },
                analytical_summary: {
                  type: 'object',
                  properties: {
                    primary_function: { type: 'string', description: 'What this diagram/image does overall' },
                    identified_pattern: { type: 'string', description: 'Design pattern or structure recognized' },
                    noted_anomalies_or_constraints: {
                      type: 'array',
                      items: { type: 'string' },
                      description: 'Any anomalies, edge cases, or constraints observed'
                    }
                  },
                  required: ['primary_function', 'identified_pattern', 'noted_anomalies_or_constraints']
                }
              },
              required: ['text_extraction', 'visual_components', 'logical_flow', 'analytical_summary']
            }
          }
        }
      ],
      tool_choice: { type: 'function', function: { name: 'analyze_image' } },
      max_tokens: 2000,
      temperature: 0.1,
    },
    {
      headers: {
        Authorization: `Bearer ${apiKey}`,
        'Content-Type': 'application/json',
      },
      timeout: 45000,
    }
  );

  const raw = response.data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments
    || response.data?.choices?.[0]?.message?.content
    || '';


  return JSON.parse(raw) as ImageAnalysis;
}

// {                                                                                                                                                           
//     "text_extraction": "All raw text found in the image, transcribed verbatim...",                                                                            
//     "visual_components": {                                                                                                                                    
//       "elements": [
//         {                                                                                                                                                     
//           "id": "FF1",
//           "type": "D_flip_flop",                                                                                                                              
//           "description": "First stage storage element, triggered on rising clock edge",                                                                       
//           "attributes": {                                                                                                                                     
//             "state": "active"                                                                                                                                 
//           }                                                                                                                                                   
//         }         
//       ]
//     },
//     "logical_flow": {
//       "process_type": "sequential",                                                                                                                           
//       "steps": [                                                                                                                                              
//         {                                                                                                                                                     
//           "order": 1,                                                                                                                                         
//           "action": "Data enters FF1 on rising clock edge",
//           "dependencies": []                                                                                                                                  
//         },                                                                                                                                                    
//         {                                                                                                                                                     
//           "order": 2,                                                                                                                                         
//           "action": "FF1 output shifts to FF2 on next clock cycle",
//           "dependencies": ["FF1"]                                                                                                                             
//         }
//       ]                                                                                                                                                       
//     },            
//     "analytical_summary": {
//       "primary_function": "4-bit serial-in parallel-out shift register",                                                                                      
//       "identified_pattern": "Linear feedback shift register with AND gate output enable",                                                                     
//       "noted_anomalies_or_constraints": [                                                                                                                     
//         "Pull-up resistor on reset line defaults logic HIGH",                                                                                                 
//         "AND gate enables output only when all flip-flops are set"                                                                                            
//       ]                                                                                                                                                       
//     }             
//   }                            