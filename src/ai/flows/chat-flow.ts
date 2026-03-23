
'use server';
/**
 * @fileOverview 深层科研助手对话流（非流式版）。
 * 实现上下文压缩机制，确保长对话下的回复稳定性。
 * 修复：防止 AI 在回复中输出“背景摘要”等字样。
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const MessageSchema = z.object({
  role: z.enum(['user', 'assistant']).describe('消息发送者角色'),
  content: z.string().describe('消息内容'),
});
export type Message = z.infer<typeof MessageSchema>;

const ChatInputSchema = z.object({
  message: z.string().describe('当前用户消息'),
  history: z.array(MessageSchema).optional().describe('历史对话上下文'),
});
export type ChatInput = z.infer<typeof ChatInputSchema>;

const ChatOutputSchema = z.object({
  response: z.string().describe('AI 回复内容'),
  history: z.array(MessageSchema).describe('更新后的对话上下文'),
});
export type ChatOutput = z.infer<typeof ChatOutputSchema>;

export async function chat(input: ChatInput): Promise<ChatOutput> {
  return chatFlow(input);
}

const chatFlow = ai.defineFlow(
  {
    name: 'chatFlow',
    inputSchema: ChatInputSchema,
    outputSchema: ChatOutputSchema,
  },
  async (input) => {
    try {
      const { model, config } = await getAiParams();
      let condensedContext = '';

      // 1. 摘要压缩历史记录
      if (input.history && input.history.length > 0) {
        const historyText = input.history
          .map((m) => `${m.role === 'user' ? 'User' : 'Sai'}: ${m.content}`)
          .join('\n');

        const summary = await ai.generate({
          model,
          config: { ...config, temperature: 0.3 },
          system: "摘要科研对话历史，保留核心方案、事实和用户意图。要求极度精简。",
          prompt: historyText,
        });
        condensedContext = summary.text;
      }

      // 2. 构造 Prompt
      const finalPrompt = condensedContext 
        ? `【后台背景摘要（严禁在回复中提及）】：\n${condensedContext}\n\n【当前消息】：\n${input.message}`
        : input.message;

      const { text } = await ai.generate({
        model,
        config,
        system: "你是一个名叫小塞 (Sai) 的 AI 科研助理。请基于后台背景回答当前问题。重要：直接回答用户，严禁提及‘根据背景’、‘摘要显示’等任何后台处理逻辑内容。",
        prompt: finalPrompt,
      });
      
      const finalResponse = text || '抱歉，我暂时无法处理您的请求。';

      const newHistory = [
        ...(input.history || []),
        { role: 'user', content: input.message },
        { role: 'assistant', content: finalResponse },
      ];

      return {
        response: finalResponse,
        history: newHistory,
      };
    } catch (error) {
      console.error('Chat Flow Error:', error);
      return {
        response: '对话处理过程中出现错误。',
        history: input.history || [],
      };
    }
  }
);
