'use client';

import { useState, useEffect, useRef } from 'react';
import type { Project, Task, Method } from '@/lib/types';
import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';
import { TaskBoardNode } from './task-board-node';
import { Button } from './ui/button';
import { Layout } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';

type NodeRect = {
    id: string;
    rect: {
        left: number;
        top: number;
        width: number;
        height: number;
    };
};

/**
 * TaskRow - 看板中的单行任务链
 * 职责：实时获取当前任务下的 Methods，并将其节点引用反馈给父组件。
 */
function TaskRow({ 
    task, 
    nodeRefs, 
    isCollapsed, 
    onToggleCollapse 
}: { 
    task: Task; 
    nodeRefs: React.MutableRefObject<Map<string, HTMLDivElement>>;
    isCollapsed: boolean;
    onToggleCollapse: () => void;
}) {
    const { user } = useUser();
    const firestore = useFirestore();

    const methodsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !task.projectId || !task.id) return null;
        return query(
            collection(firestore, 'users', user.uid, 'projects', task.projectId, 'tasks', task.id, 'methods'),
            orderBy('createdAt', 'asc')
        );
    }, [firestore, user?.uid, task.projectId, task.id]);

    const { data: methodsData } = useCollection<Method>(methodsQuery);
    const methods = methodsData || [];

    return (
        <div className="flex items-center gap-12 group/row">
            {/* Task Node */}
            <div 
                ref={el => { if (el) nodeRefs.current.set(task.id, el); }}
                className="relative flex-shrink-0"
            >
                <TaskBoardNode
                    id={task.id}
                    title={task.name}
                    description={task.problemDescription}
                    type="task"
                    onToggleCollapse={onToggleCollapse}
                    isCollapsed={isCollapsed}
                    methodCount={methods.length}
                />
            </div>

            {/* Sequential Methods Chain */}
            {!isCollapsed && methods.length > 0 && (
                <div className="flex items-center gap-12">
                    {methods.map(method => (
                        <div 
                            key={method.id}
                            ref={el => { if (el) nodeRefs.current.set(method.id, el); }}
                            className="relative flex-shrink-0"
                        >
                            <TaskBoardNode
                                id={method.id}
                                title={method.name}
                                description={method.description}
                                type="method"
                            />
                        </div>
                    ))}
                </div>
            )}
        </div>
    );
}

export function ProjectBoard({ project }: { project: Project }) {
    const [collapsedTasks, setCollapsedTasks] = useState<Set<string>>(new Set());
    const [nodePositions, setNodePositions] = useState<NodeRect[]>([]);
    const containerRef = useRef<HTMLDivElement>(null);
    const nodeRefs = useRef<Map<string, HTMLDivElement>>(new Map());

    const toggleTaskCollapse = (taskId: string) => {
        setCollapsedTasks(prev => {
            const next = new Set(prev);
            if (next.has(taskId)) next.delete(taskId);
            else next.add(taskId);
            return next;
        });
    };

    const measureNodes = () => {
        if (!containerRef.current) return;
        const containerRect = containerRef.current.getBoundingClientRect();
        const positions: NodeRect[] = [];

        nodeRefs.current.forEach((el, id) => {
            if (el && document.body.contains(el)) {
                const rect = el.getBoundingClientRect();
                positions.push({
                    id,
                    rect: {
                        width: rect.width,
                        height: rect.height,
                        left: rect.left - containerRect.left + containerRef.current.scrollLeft,
                        top: rect.top - containerRect.top + containerRef.current.scrollTop,
                    }
                });
            }
        });
        setNodePositions(positions);
    };

    // 使用 ResizeObserver 监听容器尺寸变化，自动触发重绘（当异步加载的方法节点出现时）
    useEffect(() => {
        measureNodes();
        const observer = new ResizeObserver(measureNodes);
        if (containerRef.current) observer.observe(containerRef.current);
        
        // 初次加载或任务列表变动时多测几次
        const timer = setTimeout(measureNodes, 500);
        
        return () => {
            observer.disconnect();
            clearTimeout(timer);
        };
    }, [collapsedTasks, project.tasks]);

    const renderLines = () => {
        const lines: React.ReactNode[] = [];
        const getPos = (id: string) => nodePositions.find(p => p.id === id);

        project.tasks.forEach((task, index) => {
            const taskPos = getPos(task.id);
            if (!taskPos) return;

            // 1. Task to Next Task (Vertical sequence)
            if (index < project.tasks.length - 1) {
                const nextTask = project.tasks[index + 1];
                const nextTaskPos = getPos(nextTask.id);
                if (nextTaskPos) {
                    const x = taskPos.rect.left + taskPos.rect.width / 2;
                    const y1 = taskPos.rect.top + taskPos.rect.height;
                    const y2 = nextTaskPos.rect.top;
                    
                    if (!isNaN(x) && !isNaN(y1) && !isNaN(y2)) {
                        lines.push(
                            <line 
                                key={`task-line-${task.id}`} 
                                x1={x} y1={y1} x2={x} y2={y2} 
                                stroke="hsl(var(--primary))" 
                                strokeWidth="2" 
                                strokeDasharray="4 4"
                                className="opacity-40"
                            />
                        );
                    }
                }
            }

            // 2. Task to Method Chain (Horizontal)
            // 获取当前任务的所有方法节点（通过 ID 匹配）
            // 注意：由于 methods 是异步加载的，这里需要实时根据 nodePositions 判断
            const rowMethods = Array.from(nodeRefs.current.keys()).filter(id => id.startsWith(`method-${task.id}`));
            
            // 为了简化绘制逻辑，我们假设 TaskRow 组件中已经包含了 methods 逻辑
            // 下面的逻辑将绘制 Task -> 第一个 Method，以及 Method -> Method
            
            // 由于异步加载，我们无法直接在这里访问 task.methods
            // 但我们可以通过 nodeRefs 中的 ID 命名约定来推断
            // 提示：此处逻辑目前依赖于 TaskRow 渲染时的 refs。
        });

        return lines;
    };

    return (
        <Card className="overflow-hidden border-none shadow-none bg-transparent">
            <CardHeader className="flex flex-row items-center justify-between border-b bg-card rounded-t-lg">
                <div>
                    <CardTitle className="font-headline flex items-center gap-2">
                        <Layout className="w-5 h-5 text-primary" />
                        Flow Map View
                    </CardTitle>
                </div>
                <Button variant="outline" size="sm" onClick={() => setCollapsedTasks(new Set())}>
                    Expand All
                </Button>
            </CardHeader>
            <CardContent className="p-0">
                <div 
                    ref={containerRef}
                    className="relative w-full h-[75vh] bg-slate-50/50 dark:bg-slate-950/20 overflow-auto p-12 pattern-grid rounded-b-lg"
                    style={{
                        backgroundImage: 'radial-gradient(circle, #cbd5e1 1px, transparent 1px)',
                        backgroundSize: '40px 40px'
                    }}
                >
                    {/* SVG 连线层 */}
                    {/* 提示：由于异步加载，连线逻辑推荐放在 TaskRow 中或使用更通用的 Ref 映射 */}
                    <svg className="absolute inset-0 pointer-events-none overflow-visible w-full h-full">
                        {/* 暂由测绘后的 nodePositions 驱动绘制 */}
                    </svg>

                    <div className="flex flex-col gap-16 relative z-10 min-w-max">
                        {project.tasks.map((task) => (
                            <TaskRow 
                                key={task.id}
                                task={task}
                                nodeRefs={nodeRefs}
                                isCollapsed={collapsedTasks.has(task.id)}
                                onToggleCollapse={() => toggleTaskCollapse(task.id)}
                            />
                        ))}
                    </div>
                </div>
            </CardContent>
        </Card>
    );
}
