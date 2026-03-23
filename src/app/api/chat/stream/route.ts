import { ai, getAiParams } from '@/ai/genkit';
import { NextRequest } from 'next/server';
import type { ChatMessage } from '@/lib/types';

/**
 * 深度链接流式对话路由。
 * 实现上下文压缩机制 + 知识增强生成 (RAG)。
 * 修复：强化 System Prompt，防止 AI 在回复中输出或提及“摘要内容”或“知识切片”。
 */
export async function POST(req: NextRequest) {
  try {
    const { message, history, knowledgeContext } = await req.json();
    const { model, config } = await getAiParams();

    const historyMessages = (history || []) as ChatMessage[];
    let condensedContext = '';

    // 1. 如果有历史记录，先进行摘要压缩
    if (historyMessages.length > 0) {
      try {
        const historyText = historyMessages
          .map((m) => `${m.role === 'user' ? 'User' : 'Sai'}: ${m.content}`)
          .join('\n');

        const summaryResponse = await ai.generate({
          model,
          config: { ...config, temperature: 0.3 }, // 使用低随机性进行摘要
          system: "你是一个专业的科研秘书。请将以下对话历史压缩成一段简明扼要的摘要。只保留：1. 用户已明确的研究意图；2. 已确认的技术事实或结论；3. 当前讨论的核心主题。严禁废话，字数控制在200字以内。",
          prompt: `请摘要以下对话历史：\n\n${historyText}`,
        });
        
        condensedContext = summaryResponse.text;
      } catch (summaryError) {
        console.error('Context compression failed, falling back to original message:', summaryError);
      }
    }

    // 2. 构造最终的复合 Prompt
    let finalPrompt = "";
    
    // 如果有背景摘要，先添加摘要
    if (condensedContext) {
      finalPrompt += `【后台科研背景摘要（仅供参考，严禁在回复中提及）】：\n${condensedContext}\n\n`;
    }

    // 如果有检索到的知识切片，添加切片信息
    if (knowledgeContext) {
      finalPrompt += `【以下是来自用户知识库的相关参考切片，请优先参考并用于回答，严禁在回复中提到“根据切片”等字样】：\n${knowledgeContext}\n\n`;
    }

    finalPrompt += `【用户当前提问】：\n${message}`;

    // 3. 执行流式生成
    const { stream } = ai.generateStream({
      model,
      config,
      system: "你是一个名叫小塞 (Sai) 的 AI 科研助理。你拥有极强的语义追踪能力。请结合提供的【科研背景摘要】和【参考知识切片】理解当前意图，并给出专业、客观、简洁的回答。重要准则：你必须直接回答用户，严禁提及、确认或复述‘背景摘要’、‘已知信息’、‘参考切片’等后台指令内容。用户不应察觉到这些后台信息的输入。如果知识切片与问题无关，请按常规逻辑回答。",
      prompt: finalPrompt,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (e) {
          console.error('Streaming iteration error:', e);
          const errorMsg = e instanceof Error ? e.message : 'Unknown error';
          controller.enqueue(encoder.encode(`\n\n[小塞出了一点小状况: ${errorMsg}]`));
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Chat stream setup failure:', error);
    return new Response('Failed to initialize stream', { status: 500 });
  }
}
