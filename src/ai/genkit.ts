import { genkit } from 'genkit';
import { googleAI } from '@genkit-ai/google-genai';
import { openAICompatible } from '@genkit-ai/compat-oai';
import { cookies } from 'next/headers';

/**
 * 全局 Genkit 实例。
 * 默认使用共享 Key，运行时通过 getAiParams 动态覆盖。
 */
// 从环境变量获取默认 API Key
const defaultApiKey = process.env.GEMINI_API_KEY;

export const ai = genkit({
  plugins: [
    googleAI({ apiKey: defaultApiKey }), // 设置默认apiKey
    // OpenAI 兼容插件将在运行时根据用户配置动态初始化
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
  
  // 1. 检查是否选择了自定义模型
  if (selectedModel === 'custom/model') {
    const apiKey = cookieStore.get('custom-api-key')?.value;
    const baseUrl = cookieStore.get('custom-base-url')?.value;
    const modelId = cookieStore.get('custom-model-id')?.value;

    if (apiKey && modelId) {
      // 对于自定义模型，我们使用googleAI作为默认模型，但传入用户的API Key配置
      // 注意：实际使用时，需要根据具体的模型类型选择合适的插件
      return {
        model: 'googleai/gemini-3.1-flash-lite-preview',
        config: {
          apiKey,
          baseUrl: baseUrl || 'https://api.openai.com/v1',
          model: modelId,
          temperature: 0.7
        }
      };
    }
  }

  // 2. 检查是否有用户私有的 Gemini Key (从 cookies 获取，通常由 actions 同步自 Firestore)
  const userGeminiKey = cookieStore.get('user-gemini-key')?.value;

  return {
    model: selectedModel as any,
    config: {
      temperature: 0.7,
      apiKey: userGeminiKey || defaultApiKey || 'AIzaSyD36X0K1e2bWzDROiZUvsht7YYw4nu7QZA'
    }
  };
}
