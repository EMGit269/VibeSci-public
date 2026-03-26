import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { cookies } from 'next/headers';
import { decrypt } from '@/lib/encryption';

/**
 * 全局 Genkit 实例。
 * 默认使用共享 Key，运行时通过 getAiParams 动态覆盖。
 */
// 从环境变量获取默认 API Key
const defaultApiKey = process.env.GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: defaultApiKey }), // 设置默认apiKey
  ],
  model: 'googleai/gemini-3.1-flash-lite-preview',
});

/**
 * 运行时助手：根据用户设置获取实时 AI 参数。
 * 支持用户自定义 Gemini Key 及自定义 OpenAI 兼容模型。
 */
export async function getAiParams() {
  const cookieStore = await cookies();
  const selectedModel = cookieStore.get('preferred-ai-model')?.value || 'googleai/gemini-3.1-flash-lite-preview';
  
  // 1. 检查是否选择了自定义模型或DeepSeek模型
  if (selectedModel === 'custom/model' || selectedModel.startsWith('deepseek/')) {
    const encryptedApiKey = cookieStore.get('custom-api-key')?.value || cookieStore.get('deepseek-api-key')?.value;
    const baseUrl = cookieStore.get('custom-base-url')?.value || 'https://api.deepseek.com/v1';
    const modelId = cookieStore.get('custom-model-id')?.value || selectedModel.replace('deepseek/', '');

    if (encryptedApiKey && modelId) {
      // 解密API Key
      const apiKey = decrypt(encryptedApiKey);
      // 对于自定义模型或DeepSeek模型，我们需要使用不同的处理方式
      console.log('Using custom model configuration:', { modelId, baseUrl });
      return {
        model: 'custom/model', // 使用自定义模型标识
        config: {
          apiKey,
          baseUrl: baseUrl || 'https://api.deepseek.com/v1',
          model: modelId,
          temperature: 0.7,
          max_tokens: 8192 // 增加最大输出token数
        }
      };
    } else {
      throw new Error('Custom model configuration is incomplete. Please check your settings.');
    }
  }

  // 2. 检查是否有用户私有的 Gemini Key (从 cookies 获取，通常由 actions 同步自 Firestore)
  const encryptedUserGeminiKey = cookieStore.get('user-gemini-key')?.value;
  const userGeminiKey = encryptedUserGeminiKey ? decrypt(encryptedUserGeminiKey) : null;

  const apiKey = userGeminiKey || defaultApiKey;
  if (!apiKey) {
    throw new Error('No API Key found. Please set your API Key in settings.');
  }

  console.log('Using model:', selectedModel);
  return {
    model: selectedModel as any,
    config: {
      temperature: 0.7,
      apiKey,
      maxOutputTokens: 8192 // 增加最大输出token数
    }
  };
}
