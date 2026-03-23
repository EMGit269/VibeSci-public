'use client';

import { useState } from 'react';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { Search, Clock, History, X, Trash2, CalendarDays } from 'lucide-react';
import { Input } from '@/components/ui/input';
import { Button } from '@/components/ui/button';
import { ScrollArea } from '@/components/ui/scroll-area';
import type { ChatSession } from '@/lib/types';
import { cn } from '@/lib/utils';
import { useUser, useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';

interface ChatHistorySidebarProps {
  onClose?: () => void;
}

export function ChatHistorySidebar({ onClose }: ChatHistorySidebarProps) {
  const searchParams = useSearchParams();
  const currentId = searchParams.get('id');
  const { user } = useUser();
  const firestore = useFirestore();
  const [searchQuery, setSearchQuery] = useState('');

  const sessionsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'users', user.uid, 'chatSessions'),
      orderBy('updatedAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: history, isLoading } = useCollection<ChatSession>(sessionsQuery);

  const filteredHistory = (history || []).filter(h => 
    h.title.toLowerCase().includes(searchQuery.toLowerCase())
  );

  const handleDeleteSession = (id: string, e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (firestore && user?.uid) {
      const sessionRef = doc(firestore, 'users', user.uid, 'chatSessions', id);
      deleteDocumentNonBlocking(sessionRef);
    }
  };

  // 分组逻辑
  const groupedHistory = filteredHistory.reduce((acc, session) => {
    const date = new Date(session.updatedAt);
    const now = new Date();
    const diffDays = Math.floor((now.getTime() - date.getTime()) / (1000 * 3600 * 24));

    let group = '更早';
    if (diffDays === 0) group = '今天';
    else if (diffDays === 1) group = '昨天';
    else if (diffDays < 7) group = '7天内';

    if (!acc[group]) acc[group] = [];
    acc[group].push(session);
    return acc;
  }, {} as Record<string, ChatSession[]>);

  const groupOrder = ['今天', '昨天', '7天内', '更早'];

  return (
    <div className="flex flex-col h-full bg-sidebar shadow-xl w-full overflow-hidden border-r">
      <div className="px-6 py-6 border-b space-y-4 shrink-0">
        <div className="flex items-center justify-between px-1">
          <div className="flex items-center gap-2">
            <div className="p-1.5 bg-indigo-50 dark:bg-indigo-900/20 rounded-lg">
              <History className="h-4 w-4 text-indigo-600" />
            </div>
            <h3 className="font-headline font-bold text-lg text-slate-800 dark:text-slate-200">历史对话</h3>
          </div>
          <Button variant="ghost" size="icon" className="h-8 w-8 rounded-full hover:bg-slate-100 dark:hover:bg-slate-800" onClick={onClose}>
            <X className="h-4 w-4" />
          </Button>
        </div>
        <div className="relative">
          <Search className="absolute left-3 top-3 h-4 w-4 text-slate-400" />
          <Input
            placeholder="搜索对话记录..."
            className="pl-10 h-11 bg-slate-50 dark:bg-slate-900 border-none rounded-xl focus-visible:ring-2 focus-visible:ring-indigo-100 dark:focus-visible:ring-indigo-900/30 transition-all w-full"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
          />
        </div>
      </div>

      <ScrollArea className="flex-1 w-full overflow-hidden">
        <div className="p-6 space-y-8">
          {isLoading ? (
            <div className="space-y-3">
              {[1, 2, 3, 4, 5].map(i => (
                <div key={i} className="h-14 w-full bg-slate-50 dark:bg-slate-900 animate-pulse rounded-xl" />
              ))}
            </div>
          ) : filteredHistory.length > 0 ? (
            groupOrder.map(group => groupedHistory[group] && groupedHistory[group].length > 0 && (
              <div key={group} className="space-y-2">
                <div className="px-1 flex items-center gap-2 text-[10px] font-bold text-slate-400 uppercase tracking-widest">
                  <CalendarDays className="h-3 w-3" />
                  {group}
                </div>
                <div className="flex flex-col space-y-1">
                  {groupedHistory[group].map((session) => (
                    <Link 
                      key={session.id}
                      href={`/dashboard/chat?id=${session.id}${searchParams.get('history') === 'true' ? '&history=true' : ''}`}
                      className={cn(
                        "flex items-center justify-between gap-3 px-3 py-3 rounded-xl transition-all group relative border border-transparent min-w-0 w-full",
                        currentId === session.id 
                          ? "bg-indigo-50 dark:bg-indigo-900/20 border-indigo-100 dark:border-indigo-900/30 text-indigo-700 dark:text-indigo-400 shadow-sm" 
                          : "hover:bg-slate-50 dark:hover:bg-slate-900 text-slate-600 dark:text-slate-400"
                      )}
                    >
                      <div className="flex-1 min-w-0 overflow-hidden">
                        <p className="text-sm font-semibold truncate leading-tight block">
                          {session.title}
                        </p>
                        <p className="text-[10px] opacity-60 mt-1">
                          {new Date(session.updatedAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </p>
                      </div>
                      <div className="shrink-0">
                        <Button
                          variant="ghost"
                          size="icon"
                          className="h-7 w-7 opacity-0 group-hover:opacity-100 transition-opacity text-slate-400 hover:text-destructive hover:bg-destructive/10 rounded-lg"
                          onClick={(e) => handleDeleteSession(session.id, e)}
                        >
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </div>
                    </Link>
                  ))}
                </div>
              </div>
            ))
          ) : (
            <div className="py-20 text-center space-y-4 px-6">
              <div className="w-16 h-16 bg-slate-50 dark:bg-slate-900 rounded-full flex items-center justify-center mx-auto">
                <History className="h-8 w-8 text-slate-200 dark:text-slate-800" />
              </div>
              <p className="text-sm text-slate-400">暂无对话记录</p>
              <Button variant="outline" asChild size="sm" className="w-full rounded-full border-slate-200 dark:border-slate-800">
                <Link href="/dashboard/chat">发起新对话</Link>
              </Button>
            </div>
          )}
        </div>
      </ScrollArea>
    </div>
  );
}
