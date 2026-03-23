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
  const { model, config } = await getAiParams();
  const { output } = await titlePrompt(input, { model, config });
  return output?.title || input.userMessage.substring(0, 20);
}
