import { NextRequest, NextResponse } from 'next/server';
import { getAiParams } from '@/ai/genkit';
import { runSkill } from '@/ai/skills/skill-manager';

export const runtime = 'nodejs';
export const dynamic = 'force-dynamic';

interface ToolCallEvent {
  type: 'thinking' | 'tool_call' | 'tool_result' | 'final' | 'error';
  content: string;
  toolName?: string;
  toolResult?: any;
}

export async function POST(request: NextRequest) {
  const encoder = new TextEncoder();
  
  const stream = new ReadableStream({
    async start(controller) {
      const sendEvent = (data: ToolCallEvent) => {
        controller.enqueue(encoder.encode(`data: ${JSON.stringify(data)}\n\n`));
      };

      try {
        const body = await request.json();
        
        if (!body || !body.type) {
          sendEvent({ type: 'error', content: 'Missing agent type' });
          controller.close();
          return;
        }

        const { type, input } = body;
        const userInput = input?.input || input?.query || JSON.stringify(input);
        
        sendEvent({
          type: 'thinking',
          content: `正在分析任务：理解用户需求并制定执行计划...`
        });

        await new Promise(resolve => setTimeout(resolve, 500));

        let skillType = type;
        if (type === 'langchain') {
          skillType = input?.skillType || 'project-analysis';
        }

        sendEvent({
          type: 'thinking',
          content: `选择技能类型：【${skillType}】，准备执行任务...`
        });

        sendEvent({
          type: 'tool_call',
          content: `准备调用 ${skillType} 技能`,
          toolName: skillType
        });

        const { model: selectedModel, config } = await getAiParams();
        
        console.log('[Agent Stream] Selected model:', selectedModel);
        console.log('[Agent Stream] Config:', JSON.stringify(config));
        
        sendEvent({
          type: 'thinking',
          content: `使用 AI 模型：${selectedModel}，开始执行...`
        });

        try {
          console.log('[Agent Stream] Running skill:', skillType, 'with input:', JSON.stringify(input));
          const result = await runSkill({ type: skillType as any, input });
          console.log('[Agent Stream] Skill result:', JSON.stringify(result));

          if (result.success) {
            sendEvent({
              type: 'tool_result',
              content: `技能执行成功`,
              toolName: skillType,
              toolResult: result.data
            });

            sendEvent({
              type: 'thinking',
              content: `任务完成，正在整理结果...`
            });

            const finalContent = typeof result.data === 'string' 
              ? result.data 
              : JSON.stringify(result.data, null, 2);

            sendEvent({
              type: 'final',
              content: finalContent
            });
          } else {
            sendEvent({
              type: 'error',
              content: result.error || '技能执行失败'
            });
          }
        } catch (toolError: any) {
          console.error('Tool execution error:', toolError);
          sendEvent({
            type: 'error',
            content: `执行错误：${toolError.message || '未知错误'}`
          });
        }

      } catch (error: any) {
        console.error('Agent stream error:', error);
        sendEvent({
          type: 'error',
          content: `Agent 执行失败：${error.message || '未知错误'}`
        });
      } finally {
        controller.close();
      }
    }
  });

  return new Response(stream, {
    headers: {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      'Connection': 'keep-alive',
      'X-Accel-Buffering': 'no',
    },
  });
}