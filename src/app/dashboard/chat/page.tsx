'use client';

import { ChatPanel } from "@/components/chat-panel";
import { ChatHistorySidebar } from "@/components/chat-history-sidebar";
import { Card } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { useSearchParams, useRouter } from "next/navigation";

export default function ChatPage() {
  const searchParams = useSearchParams();
  const router = useRouter();
  const showHistory = searchParams.get('history') === 'true';

  const handleToggleHistory = () => {
    const params = new URLSearchParams(searchParams.toString());
    if (showHistory) {
      params.delete('history');
    } else {
      params.set('history', 'true');
    }
    router.push(`/dashboard/chat?${params.toString()}`);
  };

  const handleCloseHistory = () => {
    const params = new URLSearchParams(searchParams.toString());
    params.delete('history');
    router.push(`/dashboard/chat?${params.toString()}`);
  };

  return (
    <div className="flex flex-1 relative h-[calc(100vh-3.5rem)] overflow-hidden -m-8 lg:-m-12">
      {/* 历史记录侧边栏 - 宽度已增加 */}
      <div className={cn(
        "absolute left-0 top-0 bottom-0 z-20 transition-all duration-300 transform border-r bg-sidebar",
        showHistory ? "translate-x-0 w-[350px] md:w-[420px]" : "-translate-x-full w-0"
      )}>
        {showHistory && <ChatHistorySidebar onClose={handleCloseHistory} />}
      </div>

      {/* 主对话区域 - 边距同步调整 */}
      <Card className={cn(
        "flex-1 overflow-hidden flex flex-col border-none shadow-none bg-transparent transition-all duration-300",
        showHistory ? "ml-[350px] md:ml-[420px]" : "ml-0"
      )}>
        <ChatPanel onToggleHistory={handleToggleHistory} isHistoryOpen={showHistory} />
      </Card>
    </div>
  );
}
