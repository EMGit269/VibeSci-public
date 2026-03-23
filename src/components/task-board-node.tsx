
'use client';

import { Card, CardDescription, CardHeader, CardTitle } from './ui/card';
import { cn } from '@/lib/utils';
import { FileText, Wrench, ChevronRight, ChevronDown } from 'lucide-react';

type NodeProps = {
    id: string;
    title: string;
    description: string;
    type: 'task' | 'method';
    isCollapsed?: boolean;
    onToggleCollapse?: () => void;
    methodCount?: number;
};

export function TaskBoardNode({ 
    title, 
    description, 
    type, 
    isCollapsed,
    onToggleCollapse,
    methodCount = 0
}: NodeProps) {
    const isExpanded = type === 'task' && !isCollapsed && methodCount > 0;

    return (
        <Card 
            onClick={() => type === 'task' && methodCount > 0 && onToggleCollapse?.()}
            className={cn(
                "w-72 transition-all duration-300 border-l-4 select-none",
                type === 'task' 
                    ? "border-l-primary bg-card" 
                    : "border-l-accent bg-card/90",
                type === 'task' && methodCount > 0 && "cursor-pointer hover:shadow-md hover:border-l-primary/80",
                isExpanded 
                    ? "scale-[1.05] shadow-xl ring-2 ring-primary/10 z-10" 
                    : "scale-100 shadow-sm z-0",
                "opacity-100"
            )}
        >
            <CardHeader className="p-4 space-y-2">
                <div className="flex items-center justify-between">
                    <div className="flex items-center gap-3 overflow-hidden">
                        <div className={cn(
                            "p-1.5 rounded-md flex-shrink-0",
                            type === 'task' ? 'bg-primary/10 text-primary' : 'bg-accent/10 text-accent-foreground'
                        )}>
                            {type === 'task' ? <FileText className="h-4 w-4" /> : <Wrench className="h-4 w-4" />}
                        </div>
                        <CardTitle className="text-sm font-headline truncate leading-tight">
                            {title}
                        </CardTitle>
                    </div>
                    
                    {type === 'task' && methodCount > 0 && (
                        <div className="text-muted-foreground ml-2 flex-shrink-0">
                            {isCollapsed ? (
                                <div className="flex items-center">
                                    <span className="text-[10px] font-bold mr-1">{methodCount}</span>
                                    <ChevronRight className="h-3 w-3" />
                                </div>
                            ) : (
                                <ChevronDown className="h-3 w-3" />
                            )}
                        </div>
                    )}
                </div>
                <CardDescription className="line-clamp-2 text-xs leading-relaxed">
                    {description}
                </CardDescription>
            </CardHeader>
        </Card>
    );
}
