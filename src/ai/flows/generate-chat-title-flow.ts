'use server';
/**
 * @fileOverview 会话标题自动生成流。
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateTitleInputSchema = z.object({
  userMessage: z.string().describe('用户的第一条消息'),
  assistantResponse: z.string().describe('AI 的第一条回复'),
});

const GenerateTitleOutputSchema = z.object({
  title: z.string().describe('生成的精简标题'),
});

const titlePrompt = ai.definePrompt({
  name: 'generateTitlePrompt',
  input: { schema: GenerateTitleInputSchema },
  output: { schema: GenerateTitleOutputSchema },
  prompt: `你是一个专业的科研秘书。请根据以下对话内容的片段，总结出一个简短但专业的会话标题。

【用户提问】：
{{{userMessage}}}

【助手回复】：
{{{assistantResponse}}}

【要求】：
1. 标题长度控制在 5-15 个字之间。
2. 优先体现核心技术名词或研究主题。
3. 严禁使用“关于...的讨论”这种废话。
4. 直接输出标题，不要带引号。`,
});

export async function generateChatTitle(input: { userMessage: string; assistantResponse: string }): Promise<string> {
  try {
    console.log('Generating chat title with input:', input);
    const { model, config } = await getAiParams();
    console.log('Using model:', model, 'config:', config);
    
    // 对于自定义模型（如DeepSeek），使用直接的HTTP请求
    if (model === 'custom/model') {
      console.log('Using custom model for title generation');
      const response = await fetch(config.baseUrl + '/chat/completions', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'Authorization': `Bearer ${config.apiKey}`
        },
        body: JSON.stringify({
          model: config.model,
          messages: [
            {
              role: 'system',
              content: '你是一个专业的科研秘书。请根据以下对话内容的片段，总结出一个简短但专业的会话标题。标题长度控制在5-15个字之间，优先体现核心技术名词或研究主题，严禁使用"关于...的讨论"这种废话，直接输出标题，不要带引号。'
            },
            {
              role: 'user',
              content: `【用户提问】：${input.userMessage}\n\n【助手回复】：${input.assistantResponse}`
            }
          ],
          max_tokens: 50,
          temperature: 0.7
        })
      });
      
      if (!response.ok) {
        throw new Error(`Custom model API error: ${response.statusText}`);
      }
      
      const data = await response.json();
      console.log('Custom model response:', data);
      
      if (data.choices && data.choices[0] && data.choices[0].message) {
        const title = data.choices[0].message.content.trim();
        console.log('Generated title from custom model:', title);
        return title;
      } else {
        throw new Error('Invalid response from custom model');
      }
    }
    
    // 对于Google AI模型，使用Genkit
    const { output } = await titlePrompt(input, { model, config });
    console.log('Title prompt output:', output);
    const title = output?.title || input.userMessage.substring(0, 20);
    console.log('Generated title:', title);
    return title;
  } catch (error) {
    console.error('Error generating chat title:', error);
    return input.userMessage.substring(0, 20);
  }
}
