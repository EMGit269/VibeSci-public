import { ai, getAiParams } from '@/ai/genkit';
import { NextRequest } from 'next/server';

/**
 * 流式调用自定义模型
 */
async function streamWithCustomModel(config: any, system: string, prompt: string) {
  const encoder = new TextEncoder();
  
  return new ReadableStream({
    async start(controller) {
      try {
        const response = await fetch(`${config.baseUrl}/chat/completions`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            'Authorization': `Bearer ${config.apiKey}`,
          },
          body: JSON.stringify({
            model: config.model,
            messages: [
              { role: 'system', content: system },
              { role: 'user', content: prompt },
            ],
            temperature: config.temperature || 0.7,
            max_tokens: config.max_tokens || 8192,
            stream: true,
          }),
        });

        if (!response.ok) {
          const errorText = await response.text();
          throw new Error(`Custom model API error: ${response.status} - ${errorText}`);
        }

        const reader = response.body?.getReader();
        if (!reader) {
          throw new Error('No response body');
        }

        const decoder = new TextDecoder();
        let buffer = '';

        while (true) {
          const { done, value } = await reader.read();
          if (done) break;

          buffer += decoder.decode(value, { stream: true });
          
          // 处理 SSE 格式的流式响应
          const lines = buffer.split('\n');
          buffer = lines.pop() || '';

          for (const line of lines) {
            if (line.startsWith('data: ')) {
              try {
                const chunk = line.slice(6);
                if (chunk === '[DONE]') continue;
                
                const data = JSON.parse(chunk);
                const text = data.choices[0]?.delta?.content;
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              } catch (e) {
                console.error('Error parsing streaming chunk:', e);
              }
            }
          }
        }
      } catch (e) {
        console.error('Custom model streaming error:', e);
        controller.enqueue(encoder.encode(`\n\n## 错误\n\n${e instanceof Error ? e.message : '流式生成失败'}`));
      } finally {
        controller.close();
      }
    },
  });
}

/**
 * AI Planning Refinement Streaming Route
 */
export async function POST(req: NextRequest) {
  try {
    const { currentMarkdown, instruction, selectedText, selectionStart, selectionEnd } = await req.json();
    const { model, config } = await getAiParams();

    const systemPrompt = `你是一位专业的研究策略师和科学架构师。你的目标是帮助研究人员起草高质量、可实施的项目路线图。

CRITICAL FORMATTING RULES (MANDATORY):
- 每个任务必须以："# Task: [任务名称]" 开始 
- 每个任务必须包含 "Problem Description: [描述]" 部分，紧跟在任务名称之后
- 每个任务下的方法必须以："## Method: [方法名称]" 开始
- 方法之后必须是："### Process:" 
- 然后是使用 "- " 的步骤列表

NON-NEGOTIABLE REQUIREMENTS:
- 字段名称为：
# Task:
Problem Description: 
## Method: 
### Process:
字段名称必须始终保持英文

- 不要将字段名称翻译为中文或任何其他语言
- 不要以任何方式修改字段名称
- 字段名称用于系统识别，必须完全按照指定格式保留
- 你可以在这些字段的内容中使用中文，但字段名称本身必须始终为英文

正确格式示例：
# Task: 数据预处理
Problem Description: 清理并标准化原始光谱数据，为下游分析做准备。
## Method: 噪声 reduction & 标准化
### Process:
- 应用 Savitzky-Golay 滤波器进行信号平滑
- 实现自适应基线校正算法
- 对所有样本执行最小-最大标准化
- 以标准 HDF5 格式导出清理后的数据集

绝对不要使用中文字段名，如 "任务:", "问题描述:", "方法:", 或 "过程:"`;

    let userPrompt;
    if (selectedText && selectionStart !== undefined && selectionEnd !== undefined) {
        userPrompt = `当前计划:\n"""\n${currentMarkdown}\n"""\n\n用户选中的文本:\n"""\n${selectedText}\n"""\n\n用户指令:\n"${instruction}"\n\n重要要求：\n1. 只修改用户选中的部分，保持其他内容完全不变\n2. 输出修改后的完整内容，而不是只输出修改的部分\n3. 确保所有字段名称保持英文，格式正确\n4. 不要添加任何额外的解释或说明\n\n请直接输出修改后的完整内容。`;
    } else {
        userPrompt = `当前计划:\n"""\n${currentMarkdown}\n"""\n\n用户指令:\n"${instruction}"\n\n请优化路线图。只输出有效的markdown格式。`;
    }

    let stream;

    // 检查是否为自定义模型或DeepSeek模型
    if (model === 'custom/model' || model.startsWith('deepseek/')) {
      console.log('[Planning Refine] Using custom model streaming directly');
      stream = await streamWithCustomModel(config, systemPrompt, userPrompt);
    } else {
      try {
        console.log('[Planning Refine] Trying Genkit stream with model:', model);
        const { stream: genkitStream } = ai.generateStream({
          model,
          config,
          system: systemPrompt,
          prompt: userPrompt,
        });

        const encoder = new TextEncoder();
        stream = new ReadableStream({
          async start(controller) {
            try {
              for await (const chunk of genkitStream) {
                const text = chunk.text;
                if (text) {
                  controller.enqueue(encoder.encode(text));
                }
              }
            } catch (e) {
              console.error('Genkit stream processing error:', e);
              // 发送错误消息
              controller.enqueue(encoder.encode(`\n\n## 错误\n\n模型调用失败：${e instanceof Error ? e.message : '未知错误'}`));
            } finally {
              controller.close();
            }
          },
        });
      } catch (e) {
        console.error('Genkit initialization error:', e);
        // 回退到自定义模型处理
        console.log('[Planning Refine] Falling back to custom model streaming');
        stream = await streamWithCustomModel(config, systemPrompt, userPrompt);
      }
    }

    return new Response(stream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Planning stream error:', error);
    return new Response('Error refining plan', { status: 500 });
  }
}