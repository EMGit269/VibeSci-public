'use client';

import { useEffect, useRef, useState } from 'react';
import { useSearchParams, useRouter } from 'next/navigation';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { Button } from './ui/button';
import { ScrollArea } from './ui/scroll-area';
import { Loader2, Send, Sparkles, Paperclip, PenTool, Network, BookOpen, X, Database } from 'lucide-react';
import { cn } from '@/lib/utils';
import type { ChatMessage, ChatSession } from '@/lib/types';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, useMemoFirebase, useDoc, setDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDocs, query, limit, orderBy } from 'firebase/firestore';
import { generateChatTitleAction } from '@/app/actions';
import { Badge } from './ui/badge';

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
      let allRelevantChunks: string[] = [];
      const keywords = queryText.toLowerCase().split(/\s+/).filter(k => k.length > 1);

      if (linkedSourceId) {
        // 精准检索关联的库
        const chunksRef = collection(firestore, 'users', user.uid, 'knowledgeSources', linkedSourceId, 'chunks');
        const chunksSnap = await getDocs(query(chunksRef, limit(30)));
        const filtered = chunksSnap.docs
          .map(d => d.data().content as string)
          .filter(content => {
            if (keywords.length === 0) return content.toLowerCase().includes(queryText.toLowerCase());
            return keywords.some(k => content.toLowerCase().includes(k));
          });
        allRelevantChunks.push(...filtered);
      } else {
        // 全局模糊检索
        const sourcesRef = collection(firestore, 'users', user.uid, 'knowledgeSources');
        const sourcesSnap = await getDocs(query(sourcesRef, orderBy('createdAt', 'desc'), limit(5)));
        
        for (const sourceDoc of sourcesSnap.docs) {
          const chunksRef = collection(firestore, 'users', user.uid, 'knowledgeSources', sourceDoc.id, 'chunks');
          const chunksSnap = await getDocs(query(chunksRef, limit(15)));
          const filtered = chunksSnap.docs
            .map(d => d.data().content as string)
            .filter(content => keywords.some(k => content.toLowerCase().includes(k)));
          allRelevantChunks.push(...filtered);
        }
      }

      return allRelevantChunks.slice(0, 5).join("\n\n---\n\n");
    } catch (e) {
      console.error("Knowledge retrieval error:", e);
      return "";
    } finally {
      setIsSearchingKnowledge(false);
    }
  };

  const streamMessage = async (message: string) => {
    if (!message.trim() || isGenerating || !user || !firestore) return;

    const knowledgeContext = await retrieveRelevantKnowledge(message);

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

        const finalMessages = [...updatedMessagesWithUser, { role: 'assistant', content: assistantFullText }];
        
        let finalTitle = sessionData?.title || initialTitle;
        if (currentHistorySnapshot.length === 0) {
          const titleResult = await generateChatTitleAction(message, assistantFullText);
          if (titleResult.success) {
            finalTitle = titleResult.title;
          }
        }

        setDocumentNonBlocking(sessionDocRef, {
          title: finalTitle,
          messages: finalMessages,
          updatedAt: new Date().toISOString()
        }, { merge: true });
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
      <div className="flex items-center gap-2 p-4 border-b bg-card z-10">
         <div className="flex items-center gap-2 text-sm font-bold text-slate-600 dark:text-slate-400 px-2">
            <span>{isInitial ? '新对话' : (sessionData?.title || '正在对话...')}</span>
            {isSearchingKnowledge && (
              <Badge variant="outline" className="ml-2 animate-pulse bg-indigo-50/50 text-indigo-600 border-indigo-200">
                <BookOpen className="h-3 w-3 mr-1" /> 正在搜寻知识库...
              </Badge>
            )}
         </div>
      </div>

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
  );
}
