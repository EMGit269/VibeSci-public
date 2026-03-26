'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Tabs, TabsContent, TabsList, TabsTrigger } from './ui/tabs';
import { Loader2, Send, Sparkles, Paperclip, PenTool, Network, BookOpen, X, Database, BarChart3, MessageSquare } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatSession } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { generateChatTitleAction } from '@/app/actions';
import { Badge } from './ui/badge';
import { AgentPanel } from './agent-panel';

const SUGGESTIONS = [
  "研究计划怎么写？",
  "帮我梳理一下现有文献的逻辑漏洞",
  "如何提高实验的重复性？",
  "这篇论文的核心创新点是什么？",
];

const AVATAR_MAP: Record<string, string> = {
  '>_o': 'bg-gradient-to-br from-blue-600 to-indigo-600',
  'o_o': 'bg-gradient-to-br from-emerald-600 to-teal-600',
  '^__^': 'bg-gradient-to-br from-amber-600 to-orange-600',
  '*_*': 'bg-gradient-to-br from-purple-600 to-pink-600',
  '-_-': 'bg-gradient-to-br from-slate-600 to-gray-600',
};

interface ChatPanelProps {
  onToggleHistory?: () => void;
  isHistoryOpen?: boolean;
}

export function ChatPanel({ onToggleHistory, isHistoryOpen }: ChatPanelProps) {
  const { user } = useUser();
  const firestore = useFirestore();
  const searchParams = useSearchParams();
  const router = useRouter();
  const { toast } = useToast();
  const sessionIdFromUrl = searchParams.get('id');
  const sourceIdFromUrl = searchParams.get('sourceId');
  const sourceNameFromUrl = searchParams.get('sourceName');
  
  const [inputValue, setInputValue] = useState('');
  const [isGenerating, setIsGenerating] = useState(false);
  const [streamingText, setStreamingText] = useState('');
  const [isSearchingKnowledge, setIsSearchingKnowledge] = useState(false);
  const [isAgentMode, setIsAgentMode] = useState(false); // agent模式开关状态
  
  // 关联的知识库状态
  const [linkedSourceId, setLinkedSourceId] = useState<string | null>(null);
  const [linkedSourceName, setLinkedSourceName] = useState<string | null>(null);
  
  const scrollAreaRef = useRef<HTMLDivElement>(null);

  // 监听 URL 关联信息
  useEffect(() => {
    if (sourceIdFromUrl) {
      setLinkedSourceId(sourceIdFromUrl);
      setLinkedSourceName(sourceNameFromUrl);
    }
  }, [sourceIdFromUrl, sourceNameFromUrl]);

  const sessionRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !sessionIdFromUrl) return null;
    return doc(firestore, 'users', user.uid, 'chatSessions', sessionIdFromUrl);
  }, [firestore, user?.uid, sessionIdFromUrl]);

  const { data: sessionData, isLoading: isSessionLoading } = useDoc<ChatSession>(sessionRef);
  const messages = sessionData?.messages || [];

  useEffect(() => {
    if (scrollAreaRef.current) {
        const viewport = scrollAreaRef.current.querySelector('div[data-radix-scroll-area-viewport]');
        if (viewport) {
             viewport.scrollTop = viewport.scrollHeight;
        }
    }
  }, [messages, streamingText, isGenerating]);

  const retrieveRelevantKnowledge = async (queryText: string) => {
    if (!user?.uid || !firestore) return "";
    setIsSearchingKnowledge(true);
    
    try {
      let allRelevantChunks: { content: string; score: number }[] = [];
      const keywords = queryText.toLowerCase().split(/\s+/).filter(k => k.length > 1);

      const calculateRelevanceScore = (content: string, query: string, queryKeywords: string[]) => {
        const contentLower = content.toLowerCase();
        const queryLower = query.toLowerCase();
        
        let score = 0;
        
        // 完全匹配加分
        if (contentLower.includes(queryLower)) {
          score += 5;
        }
        
        // 关键词匹配加分
        queryKeywords.forEach(keyword => {
          if (contentLower.includes(keyword)) {
            score += 2;
          }
        });
        
        // 内容长度适中加分
        const length = content.length;
        if (length > 100 && length < 800) {
          score += 1;
        }
        
        return score;
      };

      if (linkedSourceId) {
        // 精准检索关联的库
        const chunksRef = collection(firestore, 'users', user.uid, 'knowledgeSources', linkedSourceId, 'chunks');
        const chunksSnap = await getDocs(query(chunksRef, limit(50)));
        const filtered = chunksSnap.docs
          .map(d => d.data().content as string)
          .map(content => ({
            content,
            score: calculateRelevanceScore(content, queryText, keywords)
          }))
          .filter(item => item.score > 0)
          .sort((a, b) => b.score - a.score);
        allRelevantChunks.push(...filtered);
      } else {
        // 全局模糊检索
        const sourcesRef = collection(firestore, 'users', user.uid, 'knowledgeSources');
        const sourcesSnap = await getDocs(query(sourcesRef, orderBy('createdAt', 'desc'), limit(8)));
        
        for (const sourceDoc of sourcesSnap.docs) {
          const chunksRef = collection(firestore, 'users', user.uid, 'knowledgeSources', sourceDoc.id, 'chunks');
          const chunksSnap = await getDocs(query(chunksRef, limit(20)));
          const filtered = chunksSnap.docs
            .map(d => d.data().content as string)
            .map(content => ({
              content,
              score: calculateRelevanceScore(content, queryText, keywords)
            }))
            .filter(item => item.score > 0)
            .sort((a, b) => b.score - a.score)
            .slice(0, 3); // 每个源最多取3个最相关的
          allRelevantChunks.push(...filtered);
        }
      }

      // 按相关性排序并取前8个
      const topChunks = allRelevantChunks
        .sort((a, b) => b.score - a.score)
        .slice(0, 8)
        .map(item => item.content);

      return topChunks.join("\n\n---\n\n");
    } catch (e) {
      console.error("Knowledge retrieval error:", e);
      return "";
    } finally {
      setIsSearchingKnowledge(false);
    }
  };

  // 分析用户消息，判断是否需要使用agent
  const analyzeMessageForAgent = async (message: string) => {
    try {
      // 这里可以使用更复杂的逻辑来分析消息
      // 例如使用AI模型来判断用户的意图
      // 现在使用简单的关键词匹配
      const lowerMessage = message.toLowerCase();
      
      // 项目分析
      if (lowerMessage.includes('分析') && (lowerMessage.includes('项目') || lowerMessage.includes('结构') || lowerMessage.includes('技术栈'))) {
        return { type: 'project-analysis', input: { projectDescription: message } };
      }
      
      // 代码生成
      if (lowerMessage.includes('生成') && (lowerMessage.includes('代码') || lowerMessage.includes('程序') || lowerMessage.includes('函数'))) {
        return { type: 'code-generation', input: { taskDescription: message } };
      }
      
      // 文档生成
      if (lowerMessage.includes('生成') && (lowerMessage.includes('文档') || lowerMessage.includes('readme') || lowerMessage.includes('使用指南'))) {
        return { type: 'documentation', input: { projectDescription: message } };
      }
      
      // 项目创建
      if (lowerMessage.includes('创建') && (lowerMessage.includes('项目') || lowerMessage.includes('task') || lowerMessage.includes('方法'))) {
        return { type: 'project-creation', input: { projectName: message, projectDescription: message } };
      }
      
      // 学术论文搜索
      if (lowerMessage.includes('搜索') && (lowerMessage.includes('论文') || lowerMessage.includes('学术') || lowerMessage.includes('文献') || lowerMessage.includes('paper') || lowerMessage.includes('academic'))) {
        return { type: 'academic-paper-search', input: { query: message } };
      }
      
      return null;
    } catch (error) {
      console.error('Error analyzing message for agent:', error);
      return null;
    }
  };

  // 使用大模型进行意图识别
  const analyzeMessageForAgentWithLLM = async (message: string) => {
    try {
      const response = await fetch('/api/chat/stream', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          message: `请分析以下用户请求，判断是否需要使用agent，如果需要，请返回对应的agent类型和输入参数。\n\n用户请求：${message}\n\n请按照以下格式返回：\n{"agentType": "project-analysis" | "code-generation" | "documentation" | "project-creation" | "academic-paper-search" | null, "input": {...}}\n\n对于学术论文搜索agent，请确保input包含以下字段：\n- query: 搜索查询词\n- fields: 可选，要返回的字段列表，如["title", "abstract", "authors", "publicationDate"]\n- maxResults: 可选，最大结果数，默认为10`,
          history: [],
          knowledgeContext: ""
        }),
      });

      if (!response.ok) throw new Error('Failed to fetch LLM analysis');

      const reader = response.body?.getReader();
      const decoder = new TextDecoder();
      let analysisText = '';

      if (reader) {
        while (true) {
          const { done, value } = await reader.read();
          if (done) break;
          
          const chunk = decoder.decode(value, { stream: true });
          analysisText += chunk;
        }
      }

      // 尝试解析LLM返回的JSON
      try {
        const analysis = JSON.parse(analysisText);
        if (analysis.agentType && analysis.input) {
          // 确保输入参数格式正确
          let formattedInput = analysis.input;
          
          // 对于项目分析agent，确保有projectDescription字段
          if (analysis.agentType === 'project-analysis') {
            if (formattedInput.user_request) {
              formattedInput.projectDescription = formattedInput.user_request;
            } else if (!formattedInput.projectDescription) {
              formattedInput.projectDescription = message;
            }
          }
          
          // 对于代码生成agent，确保有taskDescription字段
          if (analysis.agentType === 'code-generation' && !formattedInput.taskDescription) {
            formattedInput.taskDescription = message;
          }
          
          // 对于文档生成agent，确保有projectDescription字段
          if (analysis.agentType === 'documentation' && !formattedInput.projectDescription) {
            formattedInput.projectDescription = message;
          }
          
          // 对于项目创建agent，确保有projectName和projectDescription字段
          if (analysis.agentType === 'project-creation') {
            if (!formattedInput.projectName) {
              formattedInput.projectName = message;
            }
            if (!formattedInput.projectDescription) {
              formattedInput.projectDescription = message;
            }
          }
          
          // 对于学术论文搜索agent，确保有必要的字段
          if (analysis.agentType === 'academic-paper-search') {
            if (!formattedInput.query) {
              formattedInput.query = message;
            }
            if (!formattedInput.fields) {
              formattedInput.fields = ['title', 'abstract', 'authors', 'publicationDate'];
            }
            if (!formattedInput.maxResults) {
              formattedInput.maxResults = 5;
            }
          }
          
          return { type: analysis.agentType, input: formattedInput };
        }
      } catch (e) {
        console.error('Error parsing LLM analysis:', e);
        // 如果解析失败，回退到传统的关键词匹配
        return analyzeMessageForAgent(message);
      }

      return null;
    } catch (error) {
      console.error('Error analyzing message with LLM:', error);
      // 如果LLM分析失败，回退到传统的关键词匹配
      return analyzeMessageForAgent(message);
    }
  };

  // 处理agent确认和执行
  const handleAgentConfirmation = async (agentRequest: any, userMsg: ChatMessage, currentHistorySnapshot: ChatMessage[], sessionDocRef: any, initialTitle: string) => {
    // 生成确认消息
    let agentTypeText = '';
    switch (agentRequest.type) {
      case 'project-analysis':
        agentTypeText = '项目分析';
        break;
      case 'code-generation':
        agentTypeText = '代码生成';
        break;
      case 'documentation':
        agentTypeText = '文档生成';
        break;
      case 'project-creation':
        agentTypeText = '项目创建';
        break;
      case 'academic-paper-search':
        agentTypeText = '学术论文搜索';
        break;
      default:
        agentTypeText = 'Agent';
    }

    const confirmationMessage = `我检测到您的请求可能需要使用${agentTypeText}Agent来处理。\n\n正在执行${agentTypeText}Agent...`;

    // 显示确认消息
    setStreamingText(confirmationMessage);

    try {
      // 执行agent，添加超时机制
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 60000); // 60秒超时
      
      const agentResponse = await fetch('/api/agent', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(agentRequest),
        signal: controller.signal
      });
      
      clearTimeout(timeoutId);

      if (!agentResponse.ok) throw new Error('Failed to run agent');

      const agentResult = await agentResponse.json();
      
      if (agentResult.success) {
        // 直接使用agent返回的结果（已经经过大模型整理）
        const assistantFullText = agentResult.data;
        
        setStreamingText(assistantFullText);
        
        const finalMessages = [...currentHistorySnapshot, userMsg, { role: 'assistant', content: assistantFullText }];
        
        console.log('Generating title in handleAgentConfirmation with userMsg:', userMsg.content);
        console.log('Generating title in handleAgentConfirmation with assistantFullText:', assistantFullText);
        
        let finalTitle = sessionData?.title || initialTitle;
        console.log('Initial title in handleAgentConfirmation:', finalTitle);
        
        // 总是生成新的聊天标题，包括历史聊天
        const titleResult = await generateChatTitleAction(userMsg.content, assistantFullText);
        console.log('Title result in handleAgentConfirmation:', titleResult);
        
        if (titleResult.success) {
          finalTitle = titleResult.title;
          console.log('Updated title in handleAgentConfirmation:', finalTitle);
        } else {
          console.log('Title generation failed in handleAgentConfirmation, using fallback:', finalTitle);
        }

        setDocumentNonBlocking(sessionDocRef, {
          title: finalTitle,
          messages: finalMessages,
          updatedAt: new Date().toISOString()
        }, { merge: true });
        
        console.log('Title updated in Firestore in handleAgentConfirmation:', finalTitle);
      } else {
        throw new Error(agentResult.error || 'Agent执行失败');
      }
    } catch (error) {
      console.error('Agent execution error:', error);
      const errorMessage = error instanceof Error ? error.message : 'Agent执行失败';
      setStreamingText(`## Agent执行失败\n\n${errorMessage}\n\n请稍后再试或尝试其他方式。`);
      
      // 保存错误消息到聊天记录
      const finalMessages = [...currentHistorySnapshot, userMsg, { role: 'assistant', content: `## Agent执行失败\n\n${errorMessage}\n\n请稍后再试或尝试其他方式。` }];
      
      setDocumentNonBlocking(sessionDocRef, {
        title: sessionData?.title || initialTitle,
        messages: finalMessages,
        updatedAt: new Date().toISOString()
      }, { merge: true });
    }
  };

  const streamMessage = async (message: string) => {
    if (!message.trim() || isGenerating || !user || !firestore) return;

    // 分析消息，判断是否需要使用agent
    let agentRequest = null;
    try {
      // 总是使用大模型进行意图识别
      agentRequest = await analyzeMessageForAgentWithLLM(message);
    } catch (error) {
      console.error('Error with LLM analysis, falling back to keyword matching:', error);
      // 如果大模型分析失败，回退到传统关键词匹配
      agentRequest = await analyzeMessageForAgent(message);
    }
    
    const currentHistorySnapshot = [...messages];
    const sessionId = sessionIdFromUrl || `chat-${Date.now()}`;
    const userMsg: ChatMessage = { role: 'user', content: message };
    
    const updatedMessagesWithUser = [...currentHistorySnapshot, userMsg];
    const sessionDocRef = doc(firestore, 'users', user.uid, 'chatSessions', sessionId);
    
    const initialTitle = currentHistorySnapshot.length === 0 ? message.substring(0, 40) : (sessionData?.title || '科研会话');

    setDocumentNonBlocking(sessionDocRef, {
      id: sessionId,
      title: initialTitle,
      messages: updatedMessagesWithUser,
      updatedAt: new Date().toISOString()
    }, { merge: true });

    if (!sessionIdFromUrl) {
      const params = new URLSearchParams(searchParams.toString());
      params.set('id', sessionId);
      router.push(`/dashboard/chat?${params.toString()}`, { scroll: false });
    }

    setInputValue('');
    setIsGenerating(true);
    setStreamingText('');

    try {
      // 如果需要使用agent
      if (agentRequest) {
        if (isAgentMode) {
          // 处理agent确认和执行
          await handleAgentConfirmation(agentRequest, userMsg, currentHistorySnapshot, sessionDocRef, initialTitle);
        } else {
          // 在非agent模式下，先获取正常回答，然后让大模型判断是否需要添加提醒
          // 只有在关联了知识库的情况下才进行检索
          const knowledgeContext = linkedSourceId ? await retrieveRelevantKnowledge(message) : "";

          const response = await fetch('/api/chat/stream', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              message,
              history: currentHistorySnapshot,
              knowledgeContext
            }),
          });

          if (!response.ok) throw new Error('Failed to fetch stream');

          const reader = response.body?.getReader();
          const decoder = new TextDecoder();
          let assistantFullText = '';

          if (reader) {
            while (true) {
              const { done, value } = await reader.read();
              if (done) break;
              
              const chunk = decoder.decode(value, { stream: true });
              assistantFullText += chunk;
              setStreamingText(assistantFullText);
            }
          }

          // 直接在回答末尾添加关于Agent模式的提醒，不需要专门判断
          const reminderText = "\n\n---\n\n**提示**：开启Agent模式可以获得更专业的学术论文搜索和分析功能，提供更准确、更全面的研究支持。";
          assistantFullText += reminderText;
          setStreamingText(assistantFullText);

          // 更新会话数据
          const finalMessages = [...updatedMessagesWithUser, { role: 'assistant', content: assistantFullText }];
          
          // 生成新的聊天标题
          console.log('Generating title with message:', message);
          console.log('Generating title with assistantFullText:', assistantFullText);
          let finalTitle = sessionData?.title || initialTitle;
          const titleResult = await generateChatTitleAction(message, assistantFullText);
          console.log('Title result:', titleResult);
          if (titleResult.success) {
            finalTitle = titleResult.title;
          }
          console.log('Updated title:', finalTitle);
          
          setDocumentNonBlocking(sessionDocRef, {
            messages: finalMessages,
            title: finalTitle,
            updatedAt: new Date().toISOString()
          }, { merge: true });
        }
      } else {
        // 正常聊天流程
        // 只有在关联了知识库的情况下才进行检索
        const knowledgeContext = linkedSourceId ? await retrieveRelevantKnowledge(message) : "";

        const response = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message,
            history: currentHistorySnapshot,
            knowledgeContext
          }),
        });

        if (!response.ok) throw new Error('Failed to fetch stream');

        const reader = response.body?.getReader();
        const decoder = new TextDecoder();
        let assistantFullText = '';

        if (reader) {
          while (true) {
            const { done, value } = await reader.read();
            if (done) break;
            
            const chunk = decoder.decode(value, { stream: true });
            assistantFullText += chunk;
            setStreamingText(assistantFullText);
          }
          
          // 检查是否包含工具调用请求
          try {
            // 尝试解析响应，检查是否有工具调用
            // 这里需要根据实际的模型响应格式进行调整
            
            // 检查是否包含runAgent相关的内容
            if (assistantFullText.includes('runAgent')) {
              // 尝试提取完整的工具调用JSON
              let toolcallStr = '';
              
              // 检查是否包含Markdown代码块
              const codeBlockMatch = assistantFullText.match(/```json[\s\S]*?```/);
              if (codeBlockMatch) {
                // 提取代码块内容
                const codeBlock = codeBlockMatch[0];
                // 移除代码块标记
                toolcallStr = codeBlock.replace(/```json\s*/, '').replace(/\s*```/, '');
                console.log('Found tool call in code block:', toolcallStr);
              } else {
                // 尝试解析整个响应为JSON
                try {
                  const parsedResponse = JSON.parse(assistantFullText);
                  if (parsedResponse.name === 'runAgent' && parsedResponse.parameters) {
                    toolcallStr = assistantFullText;
                  }
                } catch (e) {
                  // 如果整个响应不是有效的JSON，尝试提取其中的JSON部分
                  console.log('Whole response is not JSON, trying to extract JSON');
                  
                  // 找到JSON的开始和结束位置
                  const startIndex = assistantFullText.indexOf('{');
                  const endIndex = assistantFullText.lastIndexOf('}');
                  
                  if (startIndex !== -1 && endIndex !== -1) {
                    toolcallStr = assistantFullText.substring(startIndex, endIndex + 1);
                  }
                }
              }
              
              if (toolcallStr) {
                try {
                  const toolcall = JSON.parse(toolcallStr);
                  if (toolcall.name === 'runAgent') {
                    console.log('Found tool call:', toolcall);
                    
                    // 调用工具API
                    const toolResponse = await fetch('/api/chat/tool', {
                      method: 'POST',
                      headers: { 'Content-Type': 'application/json' },
                      body: JSON.stringify({ toolcall }),
                    });
                    
                    if (toolResponse.ok) {
                      const toolResult = await toolResponse.json();
                      if (toolResult.success) {
                        console.log('Tool execution success:', toolResult);
                        
                        // 将工具执行结果发送给模型，获取最终响应
                        const finalResponse = await fetch('/api/chat/stream', {
                          method: 'POST',
                          headers: { 'Content-Type': 'application/json' },
                          body: JSON.stringify({
                            message: `工具执行结果：\n${JSON.stringify(toolResult.result, null, 2)}`,
                            history: [...currentHistorySnapshot, userMsg, { role: 'assistant', content: assistantFullText }],
                            knowledgeContext: ""
                          })
                        });
                        
                        if (finalResponse.ok) {
                          const finalReader = finalResponse.body?.getReader();
                          if (finalReader) {
                            let finalText = '';
                            while (true) {
                              const { done, value } = await finalReader.read();
                              if (done) break;
                              const chunk = decoder.decode(value, { stream: true });
                              finalText += chunk;
                              setStreamingText(finalText);
                            }
                            assistantFullText = finalText;
                            console.log('Final response received:', assistantFullText);
                          }
                        }
                      } else {
                        console.error('Tool execution failed:', toolResult.error);
                      }
                    } else {
                      console.error('Tool API request failed:', toolResponse.status);
                    }
                  }
                } catch (e) {
                  console.error('Error parsing tool call:', e);
                }
              }
            }
          } catch (e) {
            console.error('Error checking for tool calls:', e);
          }

          const finalMessages = [...updatedMessagesWithUser, { role: 'assistant', content: assistantFullText }];
          
          console.log('Generating title with message:', message);
          console.log('Generating title with assistantFullText:', assistantFullText);
          
          let finalTitle = sessionData?.title || initialTitle;
          console.log('Initial title:', finalTitle);
          
          // 总是生成新的聊天标题，包括历史聊天
          const titleResult = await generateChatTitleAction(message, assistantFullText);
          console.log('Title result:', titleResult);
          
          if (titleResult.success) {
            finalTitle = titleResult.title;
            console.log('Updated title:', finalTitle);
          } else {
            console.log('Title generation failed, using fallback:', finalTitle);
          }

          setDocumentNonBlocking(sessionDocRef, {
            title: finalTitle,
            messages: finalMessages,
            updatedAt: new Date().toISOString()
          }, { merge: true });
          
          console.log('Title updated in Firestore:', finalTitle);
        }
      }
    } catch (error) {
      console.error('Error streaming chat:', error);
      toast({ title: '连接错误', description: '无法连接到小塞，请稍后再试。', variant: 'destructive' });
    } finally {
      setIsGenerating(false);
      setStreamingText('');
    }
  };

  const handleFormSubmit = (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    if (!inputValue.trim()) return;
    streamMessage(inputValue);
  };

  const handleUnlinkSource = () => {
    setLinkedSourceId(null);
    setLinkedSourceName(null);
    const params = new URLSearchParams(searchParams.toString());
    params.delete('sourceId');
    params.delete('sourceName');
    router.replace(`/dashboard/chat?${params.toString()}`, { scroll: false });
  };

  const isInitial = messages.length === 0 && !streamingText && !isGenerating;

  if (isSessionLoading && sessionIdFromUrl) {
    return (
      <div className="flex flex-1 items-center justify-center">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <div className="flex flex-col h-full bg-background relative overflow-hidden">
      <div className="flex-1 flex flex-col overflow-hidden">
        <ScrollArea className="flex-1 px-4 md:px-6 bg-slate-50/30 dark:bg-slate-950/30" ref={scrollAreaRef}>
          {isInitial ? (
            <div className="min-h-full flex flex-col items-center justify-center max-w-4xl mx-auto text-center py-12 md:py-20 space-y-8 md:space-y-12 animate-in fade-in zoom-in duration-700">
              <div className="space-y-4 md:space-y-6">
                <div className="flex flex-col items-center justify-center gap-2 md:gap-4">
                   <div className="relative">
                      <span className="text-4xl md:text-7xl font-bold bg-clip-text text-transparent bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] animate-pulse">
                        {">_o"}
                      </span>
                      <Sparkles className="absolute -top-3 -right-4 md:-top-4 md:-right-6 text-yellow-400 h-6 w-6 md:h-8 md:w-8 animate-bounce" />
                   </div>
                   <h1 className="text-2xl md:text-5xl lg:text-6xl font-headline font-bold tracking-tight text-slate-900 dark:text-slate-100 leading-tight">
                     你好，我是小塞~<br className="hidden md:block" />
                     今天想研究什么~
                   </h1>
                </div>
              </div>

              <div className="w-full max-w-3xl space-y-6 md:space-y-8">
                <div className="relative group">
                  <form 
                    onSubmit={handleFormSubmit}
                    className="flex flex-col gap-2 p-4 md:p-6 bg-card border-2 border-slate-100 dark:border-slate-800 rounded-[24px] md:rounded-[32px] shadow-xl md:shadow-2xl focus-within:border-indigo-200 dark:focus-within:border-indigo-500/50 focus-within:ring-4 md:focus-within:ring-8 focus-within:ring-indigo-50 dark:focus-within:ring-indigo-500/10 transition-all duration-500"
                  >
                    <textarea
                      name="message"
                      value={inputValue}
                      onChange={(e) => setInputValue(e.target.value)}
                      placeholder="问问小塞..."
                      rows={isHistoryOpen ? 2 : 3}
                      className="w-full resize-none bg-transparent border-none focus:ring-0 focus:outline-none text-base md:text-xl placeholder:text-slate-300 dark:placeholder:text-slate-600 px-1 md:px-2 leading-relaxed text-slate-900 dark:text-slate-100"
                      onKeyDown={(e) => {
                        if (e.key === 'Enter' && !e.shiftKey) {
                          e.preventDefault();
                          e.currentTarget.form?.requestSubmit();
                        }
                      }}
                    />
                    <div className="flex flex-wrap items-center justify-between border-t border-slate-50 dark:border-slate-800/50 pt-3 md:pt-4 mt-1 md:mt-2 px-1 gap-3">
                      <div className="flex flex-wrap items-center gap-2 md:gap-3">
                        <Badge variant="secondary" className="bg-indigo-50 dark:bg-indigo-900/20 text-[#5F6AD1] hover:bg-indigo-100 dark:hover:bg-indigo-900/30 cursor-pointer py-0.5 md:py-1 px-2 md:px-3 border-none flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs">
                          <PenTool className="h-3 w-3 md:h-3.5 md:w-3.5" />
                          Skill 科研计划生成
                        </Badge>
                        
                        {linkedSourceName ? (
                          <Badge 
                            variant="secondary" 
                            className="bg-blue-600 text-white hover:bg-blue-700 cursor-pointer py-0.5 md:py-1 px-2 md:px-3 border-none flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs transition-all animate-in zoom-in-95"
                          >
                            <Network className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            {linkedSourceName}
                            <X className="h-3 w-3 ml-1 hover:scale-125 transition-transform" onClick={(e) => { e.stopPropagation(); handleUnlinkSource(); }} />
                          </Badge>
                        ) : (
                          <Badge variant="secondary" className="bg-slate-100 dark:bg-slate-800 text-slate-400 py-0.5 md:py-1 px-2 md:px-3 border-none flex items-center gap-1 md:gap-1.5 text-[10px] md:text-xs">
                            <Database className="h-3 w-3 md:h-3.5 md:w-3.5" />
                            未关联库
                          </Badge>
                        )}
                      </div>
                      <div className="flex items-center gap-2 md:gap-4 ml-auto">
                        <Button type="button" variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-10 md:w-10 text-slate-400 dark:text-slate-500 hover:bg-slate-50 dark:hover:bg-slate-800">
                          <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                        <Button 
                          type="button" 
                          variant="ghost" 
                          size="icon" 
                          className={cn(
                            "rounded-full h-8 w-8 md:h-10 md:w-10 transition-all duration-300",
                            isAgentMode 
                              ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                              : "text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                          )}
                          onClick={() => setIsAgentMode(!isAgentMode)}
                          title={isAgentMode ? "关闭Agent模式" : "开启Agent模式"}
                        >
                          <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                        </Button>
                        <Button 
                          type="submit" 
                          size="icon" 
                          className={cn(
                            "rounded-full h-10 w-10 md:h-12 md:w-12 transition-all duration-500",
                            inputValue.trim() && !isGenerating 
                              ? "bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white shadow-lg shadow-indigo-200 dark:shadow-none hover:scale-110" 
                              : "bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-500"
                          )}
                          disabled={isGenerating || !inputValue.trim()}
                        >
                          {isGenerating ? <Loader2 className="animate-spin h-5 w-5 md:h-6 md:w-6" /> : <Send className="h-5 w-5 md:h-6 md:w-6" />}
                        </Button>
                      </div>
                    </div>
                  </form>
                </div>

                <div className="grid grid-cols-1 sm:grid-cols-2 gap-2 md:gap-3 max-w-2xl mx-auto px-2">
                  {SUGGESTIONS.map((s, i) => (
                    <button
                      key={i}
                      onClick={() => streamMessage(s)}
                      className="flex items-center justify-center px-4 py-2.5 md:px-6 md:py-3 bg-card hover:bg-indigo-50/50 dark:hover:bg-indigo-900/10 border border-slate-100 dark:border-slate-800 rounded-full text-xs md:text-sm font-medium text-slate-500 dark:text-slate-400 transition-all hover:border-[#5F6AD1] hover:text-[#5F6AD1] hover:shadow-sm text-center"
                    >
                      <span className="truncate">猜你想问：{s}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
          ) : (
            <div className="space-y-6 md:space-y-8 py-6 md:py-10 max-w-4xl mx-auto">
              {messages.map((message, index) => (
                <div key={index} className={cn("flex items-start gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500", message.role === 'user' ? 'justify-end' : '')}>
                  {message.role === 'assistant' && (
                    <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border bg-gradient-to-br from-[#5F6AD1] to-[#C181F9] flex items-center justify-center text-white text-[10px] md:text-xs font-bold shrink-0 shadow-lg">
                      {">_o"}
                    </div>
                  )}
                  <div className={cn(
                      "rounded-2xl md:rounded-3xl px-4 py-3 md:px-6 md:py-4 max-w-[90%] md:max-w-[85%] shadow-sm leading-relaxed text-sm md:text-base",
                      message.role === 'user'
                        ? 'bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white rounded-tr-none'
                        : 'bg-card border rounded-tl-none text-slate-800 dark:text-slate-200'
                    )}
                  >
                    <div className={cn(
                      "prose prose-sm dark:prose-invert max-w-none", 
                      message.role === 'user' ? 'prose-invert !text-white' : ''
                    )}>
                      <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {message.content}
                      </ReactMarkdown>
                    </div>
                  </div>
                  {message.role === 'user' && (
                    <Avatar className="w-8 h-8 md:w-10 md:h-10 border shrink-0 shadow-md">
                      {user?.photoURL && user.photoURL.startsWith('http') ? (
                        <AvatarImage src={user.photoURL} alt={user.displayName || 'Me'} />
                      ) : (
                        <AvatarFallback className={cn(
                          "text-white text-[10px] md:text-xs font-bold flex items-center justify-center",
                          user?.photoURL && AVATAR_MAP[user.photoURL] ? AVATAR_MAP[user.photoURL] : "bg-slate-100 dark:bg-slate-800 text-slate-600 dark:text-slate-400"
                        )}>
                          {user?.photoURL && !user.photoURL.startsWith('http') ? user.photoURL : (user?.displayName?.[0] || 'ME')}
                        </AvatarFallback>
                      )}
                    </Avatar>
                  )}
                </div>
              ))}
              
              {(streamingText || isGenerating) && (
                <div className="flex items-start gap-3 md:gap-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                  <div className="w-8 h-8 md:w-10 md:h-10 rounded-full border bg-gradient-to-br from-[#5F6AD1] to-[#C181F9] flex items-center justify-center text-white text-[10px] md:text-xs font-bold shrink-0 shadow-lg">
                    {">_o"}
                  </div>
                  <div className="rounded-2xl md:rounded-3xl px-4 py-3 md:px-6 md:py-4 max-w-[90%] md:max-w-[85%] bg-card border rounded-tl-none shadow-sm min-h-[50px] md:min-h-[60px]">
                    {streamingText ? (
                      <div className="prose prose-sm max-w-none text-slate-800 dark:text-slate-200 text-sm md:text-base">
                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                          {streamingText}
                        </ReactMarkdown>
                      </div>
                    ) : (
                      <div className="flex items-center gap-2 h-6">
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#5F6AD1] rounded-full animate-bounce [animation-delay:-0.3s]"></span>
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#5F6AD1] rounded-full animate-bounce [animation-delay:-0.15s]"></span>
                        <span className="w-1.5 h-1.5 md:w-2 md:h-2 bg-[#5F6AD1] rounded-full animate-bounce"></span>
                      </div>
                    )}
                  </div>
                </div>
              )}
            </div>
          )}
        </ScrollArea>
        {!isInitial && (
          <div className="p-4 md:p-6 border-t bg-card">
            <form 
              onSubmit={handleFormSubmit}
              className="max-w-4xl mx-auto flex flex-col gap-2"
            >
              {linkedSourceName && (
                <div className="flex items-center gap-2 px-2 animate-in slide-in-from-bottom-1 duration-300">
                  <Badge className="bg-blue-600 text-white border-none py-0.5 h-5 flex items-center gap-1 text-[10px]">
                    <Network className="h-3 w-3" />
                    正在检索：{linkedSourceName}
                    <X className="h-3 w-3 ml-1 hover:scale-125 transition-transform cursor-pointer" onClick={handleUnlinkSource} />
                  </Badge>
                </div>
              )}
              <div className="flex items-end gap-2 md:gap-3 bg-card border-2 border-slate-100 dark:border-slate-800 rounded-[20px] md:rounded-[24px] p-2 md:p-3 shadow-xl focus-within:border-indigo-200 dark:focus-within:border-indigo-500/50 transition-all">
                <textarea
                  name="message"
                  value={inputValue}
                  onChange={(e) => setInputValue(e.target.value)}
                  placeholder="继续问问小塞..."
                  rows={1}
                  className="flex-1 bg-transparent border-none focus:ring-0 focus:outline-none min-h-[40px] md:min-h-[44px] py-2 md:py-3 px-2 md:px-3 resize-none text-base md:text-lg text-slate-900 dark:text-slate-100"
                  onKeyDown={(e) => {
                    if (e.key === 'Enter' && !e.shiftKey) {
                      e.preventDefault();
                      e.currentTarget.form?.requestSubmit();
                    }
                  }}
                />
                <div className="flex items-center gap-1.5 md:gap-2 pb-1 pr-1">
                  <Button type="button" variant="ghost" size="icon" className="rounded-full h-8 w-8 md:h-10 md:w-10 text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400">
                    <Paperclip className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button 
                    type="button" 
                    variant="ghost" 
                    size="icon" 
                    className={cn(
                      "rounded-full h-8 w-8 md:h-10 md:w-10 transition-all duration-300",
                      isAgentMode 
                        ? "bg-indigo-100 dark:bg-indigo-900/30 text-indigo-600 dark:text-indigo-400" 
                        : "text-slate-400 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                    )}
                    onClick={() => setIsAgentMode(!isAgentMode)}
                    title={isAgentMode ? "关闭Agent模式" : "开启Agent模式"}
                  >
                    <BarChart3 className="h-4 w-4 md:h-5 md:w-5" />
                  </Button>
                  <Button 
                    type="submit" 
                    size="icon" 
                    className={cn(
                      "rounded-full h-8 w-8 md:h-10 md:w-10 transition-all duration-300",
                      inputValue.trim() 
                        ? "bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white shadow-lg" 
                        : "bg-slate-100 dark:bg-white/5 text-slate-300 dark:text-slate-500"
                    )}
                    disabled={isGenerating || !inputValue.trim()}
                  >
                    {isGenerating ? <Loader2 className="animate-spin h-4 w-4 md:h-5 md:w-5" /> : <Send className="h-4 w-4 md:h-5 md:w-5" />}
                  </Button>
                </div>
              </div>
            </form>
          </div>
        )}
      </div>
    </div>
  );
}
