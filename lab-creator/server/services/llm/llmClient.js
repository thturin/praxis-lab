const axios = require('axios');

const PROVIDERS = {
  deepseek: {
    url: 'https://api.deepseek.com/chat/completions',
    getKey: () => process.env.DEEPSEEK_API_KEY,
    defaultModel: 'deepseek-chat',
  }
};

/** //
 * 
 * @param {{ provider?: string, model?: string, messages: Array, temperature?: number, maxTokens?: number, responseFormat?: object, timeout?: number }} opts */

async function callLLM({ provider = 'deepseek', model, messages, temperature = 0.2, maxTokens = 500, responseFormat, timeout = 20000 }) {
  const config = PROVIDERS[provider];
  if (!config) throw new Error(`Unknown LLM provider: ${provider}`);

  const apiKey = config.getKey();
  if (!apiKey) throw new Error(`API key not configured for provider: ${provider}`);

  const body = {
    model: model || config.defaultModel,
    messages,
    temperature,
    max_tokens: maxTokens,
  };
  if (responseFormat) body.response_format = responseFormat;

  const response = await axios.post(config.url, body, {
    headers: {
      Authorization: `Bearer ${apiKey}`,
      'Content-Type': 'application/json',
    },
    timeout,
  });

  return response.data?.choices?.[0]?.message?.content || '';
}

module.exports = { callLLM };
