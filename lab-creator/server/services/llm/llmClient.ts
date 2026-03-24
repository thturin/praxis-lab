import axios from 'axios';

interface ProviderConfig {
  url: string;
  getKey: () => string | undefined;
  defaultModel: string;
}

const PROVIDERS: Record<string, ProviderConfig> = {
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    getKey: () => process.env.DEEPSEEK_API_KEY,
    defaultModel: 'deepseek-chat',
  },
  voyager: {
    url: 'https://api.voyageai.com/v1/embeddings',
    getKey: () => process.env.VOYAGER_API_KEY,
    defaultModel: 'voyage-3-lite',
  },
  kevin: {
    url: 'https://chat.sparky.host/v1/chat/completions',
    getKey: () => process.env.BOXY_API_KEY,
    defaultModel: 'justinjja/gpt-oss-120b-Derestricted-MXFP4',
  }
};

interface CallLLMOptions {
  provider?: string;
  model?: string;
  messages: Array<{ role: string; content: string }>;
  temperature?: number;
  maxTokens?: number;
  responseFormat?: object;
  tools?: Array<{ type: string; function: { name: string; description?: string; parameters: object } }>;
  timeout?: number;
}

interface CallEmbeddingOptions {
  provider?: string;
  model?: string;
  input: [string, string];
}

async function callLLM({ provider = 'deepseek', model, messages, temperature = 0.2, maxTokens = 500, responseFormat, tools, timeout = 20000 }: CallLLMOptions): Promise<string> {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown LLM provider: ${provider}`);

  const apiKey = config.getKey();
  if (!apiKey) throw new Error(`API key not configured for provider: ${provider}`);

  const body: Record<string, any> = {
    model: model || config.defaultModel,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseFormat) body.response_format = responseFormat;
  if (tools) {
    body.tools = tools;
    body.tool_choice = { type: 'function', function: { name: tools[0].function.name } };
  }

  const response = await axios.post(config.url, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json'
    },
    timeout,
  });



  // If tools were used, extract the function call arguments.
  // DeepSeek occasionally ignores tool_choice and puts the response in message.content instead.
  if (tools) {
    const toolArgs = response.data?.choices?.[0]?.message?.tool_calls?.[0]?.function?.arguments;
    const content = response.data?.choices?.[0]?.message?.content;
    return toolArgs || content || '';
  }

  return response.data?.choices?.[0]?.message?.content || '';
}

// Normal case (tool_calls present):                                                                                                                                
//   {                                                                                                                                                                
//     "choices": [{                                                                                                                                                  
//       "message": {                                                                                                                                                 
//         "tool_calls": [{                                                                                                                                           
//           "function": {
//             "arguments": "{\"answerQuality\": \"pass\", \"feedback\": \"Good answer.\"}"                                                                           
//           }                                                                                                                                                        
//         }],                                                                                                                                                        
//         "content": null                                                                                                                                            
//       }                                                                                                                                                            
//     }]                                                                                                                                                             
//   }                                                                                                                                                                
//   → tool_calls[0].function.arguments = '{"answerQuality": "pass", "feedback": "Good answer."}' ✅                                                                  
                                                                                                                                                                   
//   Intermittent broken case (DeepSeek ignores tool_choice):                                                                                                         
//   {                                                                                                                                                                
//     "choices": [{                                                                                                                                                  
//       "message": {                                                                                                                                                 
//         "tool_calls": null,                                                                                                                                        
//         "content": "{\"answerQuality\": \"pass\", \"feedback\": \"Good answer.\"}"                                                                                 
//       }                                                                                                                                                            
//     }]                                                                                                                                                             
//   }
//   → tool_calls?.[0]?.function?.arguments = undefined → falls back to '' → JSON.parse('') throws ❌




// Separate function for calling embedding models 
//returns  the two items in the data list as arrays of numbers (the embeddings for the two input texts)
// {
//   "object": "list",
//   "data": [
//     {
//       "object": "embedding",
//       "embedding": [
//         -0.016709786,
//         0.026996311,
//         -0.027496673,
//         "...",
//         -0.012125067
//       ],
//       "index": 0
//     },
//     {
//       "object": "embedding",
//       "embedding": [
//         0.003613521,
//         0.026428301,
//         -0.009491397,
//         "...",
//         -0.028471239
//       ],
//       "index": 1
//     }
//   ],
//   "model": "voyage-4-large",
//   "usage": {
//     "total_tokens": 8
//   }
// }
async function callEmbeddingModel({ provider = 'voyager', model, input }: CallEmbeddingOptions): Promise<[number[], number[]]> {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown LLM provider: ${provider}`);

  const apiKey = config.getKey();
  if (!apiKey) throw new Error(`API key not configured for provider: ${provider}`);

  const body = {
    model: model || config.defaultModel,
    input,
  };

  try{
  const response = await axios.post(config.url, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
  });

  const data = response.data?.data;
  return [data?.[0]?.embedding || [], data?.[1]?.embedding || []];
  }catch(err){
    console.error('Error calling embedding model:', err.response?.data);
    throw err;
  }

}

module.exports = { callLLM, callEmbeddingModel };
