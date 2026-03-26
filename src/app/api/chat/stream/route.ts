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
    console.log('Received chat request:', { message: message.substring(0, 50) + '...', historyLength: history?.length, hasKnowledgeContext: !!knowledgeContext });
    
    try {
      const { model, config } = await getAiParams();
      console.log('AI params obtained:', { model, hasApiKey: !!config.apiKey });

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
    console.log('Generating stream with model:', model);
    
    const encoder = new TextEncoder();
    let readableStream: ReadableStream;
    
    // 处理自定义模型
    if (model === 'custom/model') {
      console.log('Using custom model API:', { baseUrl: config.baseUrl, modelId: config.model });
      
      // 构造OpenAI兼容的请求
      const messages = [
        {
          role: 'system',
          content: "你是一个名叫小塞 (Sai) 的 AI 科研助理。你拥有极强的语义追踪能力。请结合提供的【科研背景摘要】和【参考知识切片】理解当前意图，并给出专业、客观、简洁的回答。重要准则：1. 直接回答用户，严禁提及、确认或复述‘背景摘要’、‘已知信息’、‘参考切片’等后台指令内容；2. 保持回答简洁，只输出关键信息，避免冗余；3. 确保对话流畅自然。如果知识切片与问题无关，请按常规逻辑回答。\n\n你可以使用以下工具来帮助你回答问题：\n1. runAgent: 运行各种agent来处理复杂任务\n   - 参数: { type: 'project-analysis' | 'code-generation' | 'documentation' | 'project-creation', input: any }\n   - 示例: { name: 'runAgent', parameters: { type: 'project-analysis', input: { projectDescription: '使用momepy进行城市形态聚类的项目' } } }"
        }
      ];
      
      // 添加历史消息
      if (historyMessages.length > 0) {
        historyMessages.forEach(msg => {
          messages.push({
            role: msg.role === 'user' ? 'user' : 'assistant',
            content: msg.content
          });
        });
      }
      
      // 添加当前消息
      messages.push({
        role: 'user',
        content: finalPrompt
      });
      
      const openAIRequest = {
        model: config.model,
        messages: messages,
        stream: true,
        temperature: config.temperature || 0.7,
        max_tokens: config.max_tokens || 8192 // 增加最大输出token数
      };
      
      let response;
      let retries = 3;
      let lastError: any;
      
      while (retries > 0) {
        try {
          response = await fetch(`${config.baseUrl}/chat/completions`, {
            method: 'POST',
            headers: {
              'Content-Type': 'application/json',
              'Authorization': `Bearer ${config.apiKey}`
            },
            body: JSON.stringify(openAIRequest),
            signal: AbortSignal.timeout(30000) // 30秒超时
          });
          
          if (!response.ok) {
            throw new Error(`API request failed with status ${response.status}: ${await response.text()}`);
          }
          
          break;
        } catch (error: any) {
          lastError = error;
          retries--;
          console.log(`Custom model request failed, retrying ${retries} more times:`, error.message);
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
          }
        }
      }
      
      if (!response) {
        const errorMessage = lastError ? lastError.message : 'Failed to connect to custom model after multiple attempts';
        const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
        
        if (isTimeoutError) {
          throw new Error('网络连接超时，请检查您的网络连接或使用代理服务器。');
        } else {
          throw new Error(`连接到自定义AI服务失败: ${errorMessage}`);
        }
      }
      
      // 处理自定义模型的流式响应
      const reader = response.body?.getReader();
      if (!reader) {
        throw new Error('No response body from custom model');
      }
      
      readableStream = new ReadableStream({
        async start(controller) {
          try {
            const decoder = new TextDecoder();
            let buffer = '';
            
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              buffer += decoder.decode(value, { stream: true });
              
              // 处理SSE格式的响应
              const lines = buffer.split('\n');
              for (const line of lines) {
                if (line.startsWith('data: ')) {
                  const data = line.slice(6);
                  if (data === '[DONE]') {
                    break;
                  }
                  try {
                    const json = JSON.parse(data);
                    if (json.choices && json.choices[0] && json.choices[0].delta && json.choices[0].delta.content) {
                      const content = json.choices[0].delta.content;
                      controller.enqueue(encoder.encode(content));
                    }
                  } catch (e) {
                    console.error('Error parsing custom model response:', e);
                  }
                }
              }
              
              // 保留未处理的部分
              if (lines.length > 0) {
                const lastLine = lines[lines.length - 1];
                if (!lastLine.startsWith('data: ')) {
                  buffer = lastLine;
                } else {
                  buffer = '';
                }
              }
            }
          } catch (e) {
            console.error('Custom model streaming error:', e);
            const errorMsg = e instanceof Error ? e.message : 'Unknown error';
            let friendlyErrorMsg = errorMsg;
            
            if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
              friendlyErrorMsg = '网络连接超时，请检查您的网络连接或使用代理服务器。';
            } else if (errorMsg.includes('fetch failed')) {
              friendlyErrorMsg = '无法连接到自定义AI服务，请检查您的网络连接和API Key配置。';
            } else if (errorMsg.includes('API key')) {
              friendlyErrorMsg = 'API Key无效或已过期，请在设置中更新您的API Key。';
            }
            
            controller.enqueue(encoder.encode(`\n\n[小塞出了一点小状况: ${friendlyErrorMsg}]`));
          } finally {
            controller.close();
          }
        }
      });
    } else {
      // 处理Google AI模型
      // 增加超时时间并实现重试机制
      let stream;
      let retries = 3;
      let lastError: any;
      
      while (retries > 0) {
        try {
          const { stream: newStream } = ai.generateStream({
            model,
            config: {
              ...config,
              timeout: 30000, // 增加超时时间到30秒
            },
            system: "你是一个名叫小塞 (Sai) 的 AI 科研助理。你拥有极强的语义追踪能力。请结合提供的【科研背景摘要】和【参考知识切片】理解当前意图，并给出专业、客观、简洁的回答。重要准则：1. 直接回答用户，严禁提及、确认或复述‘背景摘要’、‘已知信息’、‘参考切片’等后台指令内容；2. 保持回答简洁，只输出关键信息，避免冗余；3. 确保对话流畅自然。如果知识切片与问题无关，请按常规逻辑回答。\n\n你可以使用以下工具来帮助你回答问题：\n1. runAgent: 运行各种agent来处理复杂任务\n   - 参数: { type: 'project-analysis' | 'code-generation' | 'documentation' | 'project-creation', input: any }\n   - 示例: { name: 'runAgent', parameters: { type: 'project-analysis', input: { projectDescription: '使用momepy进行城市形态聚类的项目' } } }",
            prompt: finalPrompt,
          });
          stream = newStream;
          break;
        } catch (error: any) {
          lastError = error;
          retries--;
          console.log(`Stream generation failed, retrying ${retries} more times:`, error.message);
          if (retries > 0) {
            await new Promise(resolve => setTimeout(resolve, 2000)); // 等待2秒后重试
          }
        }
      }
      
      if (!stream) {
        const errorMessage = lastError ? lastError.message : 'Failed to generate stream after multiple attempts';
        const isTimeoutError = errorMessage.includes('timeout') || errorMessage.includes('Timeout');
        
        if (isTimeoutError) {
          throw new Error('网络连接超时，请检查您的网络连接或使用代理服务器。如果您在中国大陆，可能需要使用VPN才能访问Google AI服务。');
        } else {
          throw new Error(`连接到AI服务失败: ${errorMessage}`);
        }
      }

      readableStream = new ReadableStream({
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
            let friendlyErrorMsg = errorMsg;
            
            if (errorMsg.includes('timeout') || errorMsg.includes('Timeout')) {
              friendlyErrorMsg = '网络连接超时，请检查您的网络连接或使用代理服务器。如果您在中国大陆，可能需要使用VPN才能访问Google AI服务。';
            } else if (errorMsg.includes('fetch failed')) {
              friendlyErrorMsg = '无法连接到AI服务，请检查您的网络连接和API Key配置。';
            } else if (errorMsg.includes('API key')) {
              friendlyErrorMsg = 'API Key无效或已过期，请在设置中更新您的API Key。';
            }
            
            controller.enqueue(encoder.encode(`\n\n[小塞出了一点小状况: ${friendlyErrorMsg}]`));
          } finally {
            controller.close();
          }
        }
      });
    }

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (paramsError: any) {
    console.error('Error getting AI params:', paramsError);
    return new Response(`[小塞出了一点小状况: ${paramsError.message}]`, { status: 500 });
  }
} catch (error) {
  console.error('Chat stream setup failure:', error);
  return new Response('Failed to initialize stream', { status: 500 });
}
}
