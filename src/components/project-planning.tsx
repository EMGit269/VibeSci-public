'use client';

import { useState, useEffect, useRef } from 'react';
import { diffLines } from 'diff';
import { analyzePlanningAction } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Save, Eye, Edit3, Loader2, CheckCircle2, Sparkles, RefreshCw, ShieldAlert, X, CheckSquare, ChevronDown, ChevronUp } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import {
    Dialog,
    DialogContent,
    DialogDescription,
    DialogHeader,
    DialogTitle,
    DialogFooter,
} from '@/components/ui/dialog';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUser, useFirestore, updateDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection, getDocs } from 'firebase/firestore';
import Editor from '@monaco-editor/react';
import { useTheme } from 'next-themes';

function parseMarkdownToRoadmap(markdown: string) {
  const tasks: { name: string; problemDescription: string; methods: { name: string; description: string }[] }[] = [];
  const lines = markdown.split('\n');
  
  let currentTask: any = null;
  let currentMethod: any = null;
  let capturingFor: 'task' | 'method' | null = null;

  for (let line of lines) {
    const trimmedLine = line.trim();
    if (!trimmedLine) continue;

    const taskMatch = trimmedLine.match(/^(?:#\s*)?Task[:\s]+(.*)/i);
    const methodMatch = trimmedLine.match(/^(?:##\s*)?Method[:\s]+(.*)/i);

    if (taskMatch) {
      currentTask = { name: taskMatch[1].trim(), problemDescription: '', methods: [] };
      tasks.push(currentTask);
      currentMethod = null;
      capturingFor = 'task';
    } else if (methodMatch && currentTask) {
      currentMethod = { name: methodMatch[1].trim(), description: '' };
      currentTask.methods.push(currentMethod);
      capturingFor = 'method';
    } else {
      if (capturingFor === 'task' && currentTask) {
        const cleanContent = trimmedLine.replace(/^(?:problem description|problem)[:\s]+/i, '').trim();
        currentTask.problemDescription += (currentTask.problemDescription ? ' ' : '') + cleanContent;
      } else if (capturingFor === 'method' && currentMethod) {
        currentMethod.description += (currentMethod.description ? '\n' : '') + trimmedLine;
      }
    }
  }
  return tasks;
}

interface ProjectPlanningProps {
    projectId: string;
    initialMarkdown?: string;
}

export function ProjectPlanning({ 
    projectId, 
    initialMarkdown,
}: ProjectPlanningProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const { theme } = useTheme();

    const [markdown, setMarkdown] = useState(initialMarkdown || '');
    const [instruction, setInstruction] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);
    const [selectedText, setSelectedText] = useState('');
    const [textareaRef, setTextareaRef] = useState<HTMLTextAreaElement | null>(null);
    const [showDiff, setShowDiff] = useState(false);
    const [diffResult, setDiffResult] = useState<any[]>([]);
    const [showInlineDiff, setShowInlineDiff] = useState(false);
    const [originalMarkdownBeforeEdit, setOriginalMarkdownBeforeEdit] = useState<string>('');
    const [diffPopupHeight, setDiffPopupHeight] = useState(200);
    const [isResizing, setIsResizing] = useState(false);
    const editorRef = useRef<any>(null);
    const decorationsRef = useRef<string[]>([]);
    const diffContainerRef = useRef<HTMLDivElement>(null);

    const [showSyncConfirm, setShowSyncConfirm] = useState(false);
    const [syncPlan, setSyncState] = useState<{
        newTasks: any[],
        mergeTasks: { taskId: string, taskName: string, newMethods: any[] }[]
    } | null>(null);

    useEffect(() => {
        if (initialMarkdown !== undefined && !hasChanges && !isAiLoading) {
            setMarkdown(initialMarkdown);
        }
    }, [initialMarkdown, hasChanges, isAiLoading]);

    const handleSave = async (content?: string) => {
        if (!user || !firestore) return;
        
        setIsSaving(true);
        const textToSave = content !== undefined ? content : markdown;
        
        try {
            const projectRef = doc(firestore, 'users', user.uid, 'projects', projectId);
            updateDocumentNonBlocking(projectRef, { planningMarkdown: textToSave });
            
            setHasChanges(false);
            if (content === undefined) {
                toast({
                    title: 'Plan Saved',
                    description: 'Roadmap updated.',
                });
            }
        } catch (e) {
            toast({
                title: 'Save Failed',
                description: 'Could not update planning.',
                variant: 'destructive',
            });
        } finally {
            setIsSaving(false);
        }
    };

    const handleTextSelection = () => {
        // 优先使用Monaco Editor的选中文本
        if (editorRef.current) {
            const editor = editorRef.current;
            const selection = editor.getSelection();
            if (selection && !selection.isEmpty()) {
                const selectedValue = editor.getModel()?.getValueInRange(selection) || '';
                setSelectedText(selectedValue);
                return;
            }
        }
        // 回退到textarea
        if (textareaRef) {
            const selection = textareaRef.value.substring(
                textareaRef.selectionStart,
                textareaRef.selectionEnd
            );
            setSelectedText(selection);
        }
    };

    // 应用行内差异高亮
    const applyInlineDiffToEditor = (originalContent: string, finalContent: string, selectionStart?: number, selectionEnd?: number) => {
        if (!editorRef.current) return;
        
        const editor = editorRef.current;
        const model = editor.getModel();
        if (!model) return;

        // 清除之前的装饰
        if (decorationsRef.current.length > 0) {
            editor.deltaDecorations(decorationsRef.current, []);
            decorationsRef.current = [];
        }

        const decorations: any[] = [];
        
        // 确定要比较的内容范围
        let originalLinesToCompare: string[];
        let finalLinesToCompare: string[];
        let startLineNumber: number;
        
        if (selectionStart !== undefined && selectionEnd !== undefined && selectionEnd > selectionStart) {
            // 如果只修改了选中部分，获取选中部分所在的行范围
            const startPosition = model.getPositionAt(selectionStart);
            const endPosition = model.getPositionAt(selectionEnd);
            startLineNumber = startPosition.lineNumber;
            
            // 获取原始选中部分的行
            const originalLines = originalContent.split('\n');
            originalLinesToCompare = originalLines.slice(startLineNumber - 1, endPosition.lineNumber);
            
            // 获取最终内容中对应的行（从startLineNumber开始）
            const finalLines = finalContent.split('\n');
            const endLineInFinal = startLineNumber - 1 + originalLinesToCompare.length;
            finalLinesToCompare = finalLines.slice(startLineNumber - 1, endLineInFinal);
        } else {
            // 如果修改了整个内容，比较所有行
            originalLinesToCompare = originalContent.split('\n');
            finalLinesToCompare = finalContent.split('\n');
            startLineNumber = 1;
        }
        
        // 比较行并标记差异
        const maxLines = Math.max(originalLinesToCompare.length, finalLinesToCompare.length);
        
        for (let i = 0; i < maxLines; i++) {
            const originalLine = originalLinesToCompare[i] || '';
            const finalLine = finalLinesToCompare[i] || '';
            
            // 如果行内容不同，标记为修改
            if (originalLine !== finalLine) {
                const lineNumber = startLineNumber + i;
                decorations.push({
                    range: new (window as any).monaco.Range(lineNumber, 1, lineNumber, 1),
                    options: {
                        isWholeLine: true,
                        className: 'diff-line-added',
                        glyphMarginClassName: 'diff-glyph-added',
                        overviewRuler: {
                            color: { dark: '#4caf50', light: '#4caf50' },
                            position: 1
                        }
                    }
                });
            }
        }

        // 应用新的装饰
        if (decorations.length > 0) {
            decorationsRef.current = editor.deltaDecorations([], decorations);
        }
    };

    // 清除行内差异高亮
    const clearInlineDiff = () => {
        if (editorRef.current && decorationsRef.current.length > 0) {
            editorRef.current.deltaDecorations(decorationsRef.current, []);
            decorationsRef.current = [];
        }
        setShowInlineDiff(false);
    };

    // 接受修改方案 - 清除高亮但保留修改
    const acceptChanges = () => {
        clearInlineDiff();
        setOriginalMarkdownBeforeEdit('');
        toast({ title: "已采取修改方案" });
    };

    // 撤销修改 - 回到修改前的内容
    const revertChanges = () => {
        if (originalMarkdownBeforeEdit) {
            setMarkdown(originalMarkdownBeforeEdit);
            setHasChanges(true);
            handleSave(originalMarkdownBeforeEdit);
            clearInlineDiff();
            setOriginalMarkdownBeforeEdit('');
            toast({ title: "已回到修改前的方案" });
        }
    };

    // 差异弹窗大小调整相关函数
    const handleResizeStart = (e: React.MouseEvent) => {
        setIsResizing(true);
        e.preventDefault();
    };

    const handleResize = (e: MouseEvent) => {
        if (!isResizing || !diffContainerRef.current) return;
        
        const container = diffContainerRef.current;
        const rect = container.getBoundingClientRect();
        const newHeight = e.clientY - rect.top;
        
        // 限制最小和最大高度
        if (newHeight >= 100 && newHeight <= 500) {
            setDiffPopupHeight(newHeight);
        }
    };

    const handleResizeEnd = () => {
        setIsResizing(false);
    };

    // 添加全局鼠标事件监听器
    useEffect(() => {
        if (isResizing) {
            document.addEventListener('mousemove', handleResize);
            document.addEventListener('mouseup', handleResizeEnd);
        }
        
        return () => {
            document.removeEventListener('mousemove', handleResize);
            document.removeEventListener('mouseup', handleResizeEnd);
        };
    }, [isResizing]);

    const runRefinement = async (currentMarkdown: string, customInstruction: string, selectedText?: string) => {
        setIsAiLoading(true);
        setIsEditing(true);
        
        try {
            // 保存原始内容
            const originalContent = currentMarkdown;
            setOriginalMarkdownBeforeEdit(originalContent);
            
            // 获取选中文本在原始文本中的位置
            let selectionStart = 0;
            let selectionEnd = 0;
            
            // 优先使用Monaco Editor的选中文本位置
            if (editorRef.current && selectedText) {
                const editor = editorRef.current;
                const selection = editor.getSelection();
                if (selection && !selection.isEmpty()) {
                    const model = editor.getModel();
                    if (model) {
                        // 将Monaco的行/列位置转换为字符串索引
                        const startOffset = model.getOffsetAt(selection.getStartPosition());
                        const endOffset = model.getOffsetAt(selection.getEndPosition());
                        selectionStart = startOffset;
                        selectionEnd = endOffset;
                    }
                }
            } else if (textareaRef && selectedText) {
                // 回退到textarea
                selectionStart = textareaRef.selectionStart;
                selectionEnd = textareaRef.selectionEnd;
            }
            
            // 分析选中内容的结构，提取上下文信息
            let contextInfo = '';
            if (selectedText) {
                // 检查选中内容是否包含结构标记
                const hasTaskStructure = selectedText.includes('Task:') || selectedText.includes('# Task');
                const hasMethodStructure = selectedText.includes('Method:') || selectedText.includes('## Method');
                const hasProcessStructure = selectedText.includes('Process:') || selectedText.includes('### Process');
                
                if (hasTaskStructure || hasMethodStructure || hasProcessStructure) {
                    contextInfo = '注意：选中内容包含结构标记（如Task、Method、Process等），请保持这些结构标记不变，只修改其内容部分。';
                }
                if (hasTaskStructure) {
                    contextInfo += '特别注意：尽量不要修改Task的文字，非必要不修改Task名称。';
                }
            }
            
            // 发送全文内容和要修改的片段给AI，让AI获得完整上下文
            const response = await fetch('/api/planning/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentMarkdown: currentMarkdown, // 发送全文内容
                    instruction: selectedText 
                        ? `请修改以下在完整文档中选中的文本片段，保持原有结构和格式不变。\n\n完整文档："${currentMarkdown}"\n\n选中片段："${selectedText}"\n\n修改要求：${customInstruction}。${contextInfo}重要：只返回修改后的片段内容，不要返回完整文档，不要添加任何额外的结构或格式，不要重复原有的结构标记。` 
                        : customInstruction,
                    selectedText: selectedText,
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch stream');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let modifiedText = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    modifiedText += decoder.decode(value, { stream: true });
                }
                
                // 硬编码方式：只替换选中的部分
                let finalMarkdown;
                if (selectedText && selectionStart !== undefined && selectionEnd !== undefined && selectionEnd > selectionStart) {
                    // 去除AI可能返回的额外内容，只保留修改后的部分
                    modifiedText = modifiedText.trim();
                    // 替换选中的部分
                    finalMarkdown = currentMarkdown.substring(0, selectionStart) + modifiedText + currentMarkdown.substring(selectionEnd);
                } else {
                    // 如果没有选中的部分，使用完整的修改结果
                    finalMarkdown = modifiedText;
                }
                
                // 应用行内差异高亮
                setShowInlineDiff(true);
                applyInlineDiffToEditor(originalContent, finalMarkdown, selectionStart, selectionEnd);
                
                setMarkdown(finalMarkdown);
                setHasChanges(true);
                handleSave(finalMarkdown);
                return true;
            }
        } catch (error) {
            console.error('Error refining plan:', error);
            toast({ title: "AI Error", variant: "destructive" });
        } finally {
            setIsAiLoading(false);
        }
        return false;
    };

    const handleAskAi = async () => {
        if (!instruction.trim()) return;
        const success = await runRefinement(markdown, instruction, selectedText);
        if (success) {
            setInstruction('');
            setSelectedText('');
            toast({ title: selectedText ? "Selected text refined!" : "Plan refined!" });
        }
    };

    const handleAnalyze = async () => {
        if (!markdown.trim() || !user || !firestore) return;
        setIsAnalyzing(true);
        
        const result = await analyzePlanningAction(markdown);
        if (result.success && result.analysis) {
            const projectRef = doc(firestore, 'users', user.uid, 'projects', projectId);
            updateDocumentNonBlocking(projectRef, {
                analysisResult: result.analysis,
                ignoredErrorIndices: [],
                ignoredWarningIndices: []
            });
            toast({ title: "Audit Complete", description: "Audit panel mounted." });
        } else {
            toast({ title: "Audit Failed", variant: "destructive" });
        }
        setIsAnalyzing(false);
    };

    const [showTaskChangeConfirm, setShowTaskChangeConfirm] = useState(false);
    const [taskChangeInfo, setTaskChangeInfo] = useState<{
        changedTasks: { oldName: string, newName: string }[],
        deletedTasks: string[],
        newTasks: any[]
    } | null>(null);

    const checkExistingTasksAndPrepareSync = async () => {
        if (!markdown.trim() || !user || !firestore) return;

        setIsSyncing(true);
        try {
            const parsedTasks = parseMarkdownToRoadmap(markdown);
            if (parsedTasks.length === 0) {
                toast({ title: "Sync Failed", description: "No Tasks found in Markdown.", variant: "destructive" });
                setIsSyncing(false);
                return;
            }

            const tasksRef = collection(firestore, 'users', user.uid, 'projects', projectId, 'tasks');
            const tasksSnap = await getDocs(tasksRef);
            const existingTasksMap = new Map();
            const existingTaskNames = new Set();
            tasksSnap.docs.forEach(doc => {
                const name = doc.data().name;
                existingTasksMap.set(name.trim().toLowerCase(), { id: doc.id, name: name });
                existingTaskNames.add(name.trim().toLowerCase());
            });

            const newTasksToCreate: any[] = [];
            const tasksToMerge: { taskId: string, taskName: string, newMethods: any[] }[] = [];
            const changedTasks: { oldName: string, newName: string }[] = [];
            const deletedTasks: string[] = [];

            // 检查新增和修改的任务
            for (const pTask of parsedTasks) {
                const normalizedName = pTask.name.trim().toLowerCase();
                if (existingTasksMap.has(normalizedName)) {
                    const existing = existingTasksMap.get(normalizedName);
                    // 检查任务名称是否完全相同（大小写敏感）
                    if (existing.name !== pTask.name) {
                        // 任务名称有变化
                        changedTasks.push({ oldName: existing.name, newName: pTask.name });
                    } else {
                        // 任务名称相同，检查是否有新方法
                        const methodsRef = collection(firestore, 'users', user.uid, 'projects', projectId, 'tasks', existing.id, 'methods');
                        const methodsSnap = await getDocs(methodsRef);
                        const existingMethods = new Set(methodsSnap.docs.map(d => d.data().name.trim().toLowerCase()));
                        
                        const uniqueNewMethods = pTask.methods.filter(m => !existingMethods.has(m.name.trim().toLowerCase()));
                        
                        if (uniqueNewMethods.length > 0) {
                            tasksToMerge.push({
                                taskId: existing.id,
                                taskName: existing.name,
                                newMethods: uniqueNewMethods
                            });
                        }
                    }
                } else {
                    // 新任务
                    newTasksToCreate.push(pTask);
                }
            }

            // 检查删除的任务
            for (const [normalizedName, taskInfo] of existingTasksMap) {
                const taskExists = parsedTasks.some(pTask => pTask.name.trim().toLowerCase() === normalizedName);
                if (!taskExists) {
                    deletedTasks.push(taskInfo.name);
                }
            }

            // 检查是否有任务变化
            if (changedTasks.length > 0 || deletedTasks.length > 0) {
                // 显示任务变化确认弹窗
                setTaskChangeInfo({
                    changedTasks,
                    deletedTasks,
                    newTasks: newTasksToCreate
                });
                setShowTaskChangeConfirm(true);
                setIsSyncing(false);
            } else if (tasksToMerge.length > 0) {
                // 只有方法变化，显示合并确认
                setSyncState({ newTasks: newTasksToCreate, mergeTasks: tasksToMerge });
                setShowSyncConfirm(true);
                setIsSyncing(false);
            } else {
                // 没有变化或只有新任务
                await executeFinalSync(newTasksToCreate, []);
            }
        } catch (e) {
            console.error("Prep Sync Error:", e);
            setIsSyncing(false);
        }
    };

    const executeFinalSync = async (newTasks: any[], mergeTasks: { taskId: string, newMethods: any[] }[]) => {
        if (!user) return;
        setIsSyncing(true);
        try {
            const tasksRef = collection(firestore, 'users', user.uid, 'projects', projectId, 'tasks');

            for (const t of newTasks) {
                const docRef = await addDocumentNonBlocking(tasksRef, {
                    projectId,
                    name: t.name,
                    problemDescription: t.problemDescription || "No description provided.",
                    createdAt: new Date().toISOString(),
                });
                
                if (docRef && t.methods.length > 0) {
                    const mRef = collection(firestore, 'users', user.uid, 'projects', projectId, 'tasks', docRef.id, 'methods');
                    for (const m of t.methods) {
                        addDocumentNonBlocking(mRef, { ...m, createdAt: new Date().toISOString() });
                    }
                }
            }

            for (const mTask of mergeTasks) {
                const mRef = collection(firestore, 'users', user.uid, 'projects', projectId, 'tasks', mTask.taskId, 'methods');
                for (const m of mTask.newMethods) {
                    addDocumentNonBlocking(mRef, { ...m, createdAt: new Date().toISOString() });
                }
            }

            toast({ title: "Sync Successful" });
            setShowSyncConfirm(false);
        } catch (e) {
            toast({ title: "Sync Failed", variant: "destructive" });
        } finally {
            setIsSyncing(false);
        }
    };

    const placeholderText = `# Task: 数据预处理
Problem Description: 清理并标准化原始光谱数据，为下游分析做准备。
## Method: 噪声 reduction & 标准化
### Process:
- 应用 Savitzky-Golay 滤波器进行信号平滑
- 实现自适应基线校正算法
- 对所有样本执行最小-最大标准化
- 以标准 HDF5 格式导出清理后的数据集`;

    return (
        <Card className="min-h-[600px] flex flex-col">
            <CardHeader className="flex flex-col gap-4 border-b pb-6">
                <div className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="font-headline text-2xl">Planning</CardTitle>
                        <CardDescription>起草您的路线图。</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="mr-4 flex items-center gap-2 text-xs text-muted-foreground">
                            {isSaving ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> 保存中...</>
                            ) : hasChanges ? (
                                <span className="text-accent">未保存</span>
                            ) : (
                                <><CheckCircle2 className="w-3 h-3 text-green-500" /> 已保存</>
                            )}
                        </div>

                        <Button
                            variant="outline"
                            size="icon"
                            onClick={checkExistingTasksAndPrepareSync}
                            disabled={isSyncing || isEditing || isAiLoading || isAnalyzing}
                            className={cn(
                                "h-8 w-8 transition-all duration-200",
                                (isSyncing || isEditing || isAiLoading || isAnalyzing)
                                    ? "bg-muted text-muted-foreground border-muted cursor-not-allowed opacity-50"
                                    : "border-primary text-primary hover:bg-primary/5 shadow-sm"
                            )}
                            title="同步到任务"
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                        </Button>

                        <Button
                            variant="outline"
                            size="sm"
                            onClick={() => setIsEditing(!isEditing)}
                            disabled={isAiLoading || isAnalyzing}
                            className="h-8 w-24 flex items-center justify-center"
                        >
                            {isEditing ? (
                                <><Eye className="w-4 h-4 mr-2" /> 预览</>
                            ) : (
                                <><Edit3 className="w-4 h-4 mr-2" /> 编辑</>
                            )}
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => handleSave()}
                            disabled={isSaving || !hasChanges || isAiLoading || isAnalyzing}
                            className="h-8"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            保存
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 shadow-inner">
                    <Input
                        placeholder={selectedText ? "让AI修改选中的文本..." : "让AI优化计划..."}
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        className="bg-background border-none focus-visible:ring-0 focus:outline-none flex-1"
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                        disabled={isAiLoading || isAnalyzing}
                    />
                    {selectedText && (
                        <div className="flex items-center gap-1 px-3 py-1 bg-blue-100 text-blue-800 dark:bg-blue-900 dark:text-blue-200 text-xs rounded-md whitespace-nowrap">
                            已选中 {selectedText.length} 个字符
                            <button
                                onClick={() => setSelectedText('')}
                                className="ml-1 hover:bg-blue-200 dark:hover:bg-blue-800 rounded p-0.5 transition-colors"
                                title="取消选择"
                            >
                                <X className="w-3 h-3" />
                            </button>
                        </div>
                    )}
                    <Button
                        onClick={handleAskAi}
                        disabled={isAiLoading || isAnalyzing || !instruction.trim()}
                        className="bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white shadow-sm whitespace-nowrap transition-all duration-300"
                    >
                        {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        {selectedText ? "修改选中部分" : "询问AI"}
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col min-h-[500px]">
                <div className="flex-1 flex flex-col">
                    {isEditing ? (
                        <div className="flex-1 flex flex-col">
                            {/* 差异对比弹窗 */}
                            {showInlineDiff && (
                                <div 
                                    ref={diffContainerRef}
                                    className="mb-4 border border-gray-300 dark:border-gray-700 rounded-lg bg-white dark:bg-gray-900 shadow-lg"
                                    style={{ position: 'relative' }}
                                >
                                    <div className="flex items-center justify-between px-4 py-2 bg-gray-100 dark:bg-gray-800 border-b border-gray-300 dark:border-gray-700 rounded-t-lg">
                                        <span className="text-sm font-medium text-gray-700 dark:text-gray-300">修改对比</span>
                                        <div className="flex items-center gap-2">
                                            <button
                                                onClick={revertChanges}
                                                className="flex items-center gap-1 px-3 py-1 text-xs bg-red-100 dark:bg-red-900/30 text-red-700 dark:text-red-300 rounded hover:bg-red-200 dark:hover:bg-red-900/50 transition-colors"
                                            >
                                                <X className="w-3 h-3" />
                                                回到修改前
                                            </button>
                                            <button
                                                onClick={acceptChanges}
                                                className="flex items-center gap-1 px-3 py-1 text-xs bg-green-100 dark:bg-green-900/30 text-green-700 dark:text-green-300 rounded hover:bg-green-200 dark:hover:bg-green-900/50 transition-colors"
                                            >
                                                <CheckSquare className="w-3 h-3" />
                                                采取修改方案
                                            </button>
                                        </div>
                                    </div>
                                    <div 
                                        className="overflow-auto p-4 space-y-4"
                                        style={{ height: `${diffPopupHeight}px` }}
                                    >
                                        {originalMarkdownBeforeEdit && (() => {
                                            // 使用 diffLines 库生成更准确的差异
                                            const diff = diffLines(originalMarkdownBeforeEdit, markdown, { ignoreWhitespace: false });
                                            const diffElements = [];
                                            
                                            let changeGroup: any[] = [];
                                            
                                            diff.forEach((part, index) => {
                                                if (part.added || part.removed) {
                                                    changeGroup.push(part);
                                                } else if (changeGroup.length > 0) {
                                                    // 当遇到非修改部分且有积累的修改时，渲染修改组
                                                    diffElements.push(
                                                        <div key={`group-${index}`} className="space-y-1 border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800/50">
                                                            {changeGroup.map((change, i) => (
                                                                <div 
                                                                    key={`change-${index}-${i}`} 
                                                                    className={cn(
                                                                        'px-3 py-1.5 rounded text-sm font-mono',
                                                                        change.added 
                                                                            ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                                            : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 line-through'
                                                                    )}
                                                                >
                                                                    <span className={cn(
                                                                        'inline-block w-5 font-bold',
                                                                        change.added 
                                                                            ? 'text-green-600 dark:text-green-400'
                                                                            : 'text-red-600 dark:text-red-400'
                                                                    )}>
                                                                        {change.added ? '+' : '-'}
                                                                    </span>
                                                                    {change.value.split('\n').map((line: string, lineIndex: number) => (
                                                                        line && (
                                                                            <div key={`line-${index}-${i}-${lineIndex}`} className="whitespace-pre-wrap">
                                                                                {line}
                                                                            </div>
                                                                        )
                                                                    ))}
                                                                </div>
                                                            ))}
                                                        </div>
                                                    );
                                                    changeGroup = [];
                                                }
                                            });
                                            
                                            // 处理最后一个修改组
                                            if (changeGroup.length > 0) {
                                                diffElements.push(
                                                    <div key="group-final" className="space-y-1 border border-gray-200 dark:border-gray-700 rounded-lg p-2 bg-gray-50 dark:bg-gray-800/50">
                                                        {changeGroup.map((change, i) => (
                                                            <div 
                                                                key={`change-final-${i}`} 
                                                                className={cn(
                                                                    'px-3 py-1.5 rounded text-sm font-mono',
                                                                    change.added 
                                                                        ? 'bg-green-100 dark:bg-green-900/30 text-green-800 dark:text-green-300'
                                                                        : 'bg-red-100 dark:bg-red-900/30 text-red-800 dark:text-red-300 line-through'
                                                                )}
                                                            >
                                                                <span className={cn(
                                                                    'inline-block w-5 font-bold',
                                                                    change.added 
                                                                        ? 'text-green-600 dark:text-green-400'
                                                                        : 'text-red-600 dark:text-red-400'
                                                                )}>
                                                                    {change.added ? '+' : '-'}
                                                                </span>
                                                                {change.value.split('\n').map((line: string, lineIndex: number) => (
                                                                    line && (
                                                                        <div key={`line-final-${i}-${lineIndex}`} className="whitespace-pre-wrap">
                                                                            {line}
                                                                        </div>
                                                                    )
                                                                ))}
                                                            </div>
                                                        ))}
                                                    </div>
                                                );
                                            }
                                            
                                            return diffElements.length > 0 ? diffElements : (
                                                <div className="text-center py-4 text-gray-500 dark:text-gray-400">
                                                    没有检测到修改
                                                </div>
                                            );
                                        })()}
                                    </div>
                                    {/* 调整大小的手柄 */}
                                    <div 
                                        className="absolute bottom-0 left-0 right-0 h-2 bg-gray-200 dark:bg-gray-700 cursor-resize-y hover:bg-gray-300 dark:hover:bg-gray-600 transition-colors"
                                        onMouseDown={handleResizeStart}
                                    >
                                        <div className="flex justify-center items-center h-full">
                                            <ChevronDown className="w-4 h-4 text-gray-500 dark:text-gray-400" />
                                        </div>
                                    </div>
                                </div>
                            )}
                            {/* 编辑器工具栏 */}
                            <div className="flex items-center justify-between px-3 py-2 bg-gray-100 dark:bg-gray-800 border border-gray-300 dark:border-gray-700 border-b-0 rounded-t-lg">
                                <span className="text-xs text-gray-500 dark:text-gray-400">Markdown Editor</span>
                            </div>
                            <div className="flex-1 border border-gray-300 dark:border-gray-700 rounded-b-lg" style={{ minHeight: showInlineDiff ? '300px' : '500px' }}>
                                <Editor
                                    height="500px"
                                    defaultLanguage="markdown"
                                    value={markdown}
                                    onChange={(value) => {
                                        setMarkdown(value || '');
                                        setHasChanges(true);
                                    }}
                                    onMount={(editor, monaco) => {
                                        editorRef.current = editor;
                                        // 监听选中文本的变化
                                        editor.onDidChangeCursorSelection(() => {
                                            handleTextSelection();
                                        });
                                        
                                        // 定义差异高亮的CSS样式
                                        monaco.editor.defineTheme('diff-light', {
                                            base: 'vs',
                                            inherit: true,
                                            rules: [],
                                            colors: {}
                                        });
                                        
                                        // 添加自定义CSS
                                        const style = document.createElement('style');
                                        style.textContent = `
                                            .diff-line-added {
                                                background-color: rgba(76, 175, 80, 0.2) !important;
                                                border-left: 3px solid #4caf50 !important;
                                            }
                                            .diff-line-removed {
                                                background-color: rgba(244, 67, 54, 0.2) !important;
                                                border-left: 3px solid #f44336 !important;
                                            }
                                            .diff-glyph-added::before {
                                                content: '+';
                                                color: #4caf50;
                                                font-weight: bold;
                                                margin-left: 5px;
                                            }
                                            .diff-glyph-removed::before {
                                                content: '-';
                                                color: #f44336;
                                                font-weight: bold;
                                                margin-left: 5px;
                                            }
                                        `;
                                        document.head.appendChild(style);
                                    }}
                                    options={{
                                        minimap: { enabled: false },
                                        lineNumbers: 'on',
                                        wordWrap: 'on',
                                        automaticLayout: true,
                                        fontSize: 14,
                                        fontFamily: 'monospace',
                                        readOnly: isAiLoading || isAnalyzing,
                                        scrollBeyondLastLine: false,
                                        renderWhitespace: 'selection',
                                        tabSize: 2,
                                        insertSpaces: true,
                                        glyphMargin: true,
                                    }}
                                    theme={theme === 'dark' ? 'vs-dark' : 'vs-light'}
                                />
                            </div>
                        </div>
                    ) : (
                        <div className="p-8 prose prose-slate dark:prose-invert max-w-none overflow-auto min-h-[400px]">
                            {markdown ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                            ) : (
                                <div className="text-center py-20 text-muted-foreground italic">
                                    尚未起草计划。
                                </div>
                            )}
                        </div>
                    )}
                </div>

                <div className="p-4 border-t bg-muted/20 flex justify-start">
                    <Button
                        onClick={handleAnalyze}
                        disabled={isAiLoading || isAnalyzing || !markdown.trim()}
                        className="bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white shadow-sm whitespace-nowrap transition-all duration-300 border-none"
                    >
                        {isAnalyzing ? (
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> 分析中...</>
                        ) : (
                            <><ShieldAlert className="w-4 h-4 mr-2" /> 分析逻辑</>
                        )}
                    </Button>
                </div>
            </CardContent>

            <Dialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>确认同步 & 合并</DialogTitle>
                        <DialogDescription>
                            找到同名任务。合并方法？
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {syncPlan?.mergeTasks.map((m, i) => (
                            <div key={i} className="p-3 bg-muted/50 rounded-lg border text-xs">
                                <p className="font-bold">任务: <span className="text-primary">{m.taskName}</span></p>
                                <ul className="mt-1 space-y-1">
                                    {m.newMethods.map((nm, j) => (
                                        <li key={j} className="text-muted-foreground">• + 方法: {nm.name}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowSyncConfirm(false)}>取消</Button>
                        <Button
                            onClick={() => executeFinalSync(syncPlan!.newTasks, syncPlan!.mergeTasks)}
                            disabled={isSyncing}
                            className="bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white"
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            同步 & 合并
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>

            {/* 任务变化确认弹窗 */}
            <Dialog open={showTaskChangeConfirm} onOpenChange={setShowTaskChangeConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>任务变化确认</DialogTitle>
                        <DialogDescription>
                            检测到任务有变化，是否要同步这些变化？
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {taskChangeInfo && taskChangeInfo.changedTasks && taskChangeInfo.changedTasks.length > 0 && (
                            <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                                <p className="font-bold text-yellow-800 dark:text-yellow-300 mb-2">修改的任务：</p>
                                <ul className="space-y-2 text-sm">
                                    {taskChangeInfo.changedTasks.map((task, i) => (
                                        <li key={i}>
                                            <span className="line-through text-muted-foreground">{task.oldName}</span>
                                            <span className="mx-2">→</span>
                                            <span className="text-primary">{task.newName}</span>
                                        </li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {taskChangeInfo && taskChangeInfo.deletedTasks && taskChangeInfo.deletedTasks.length > 0 && (
                            <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                                <p className="font-bold text-red-800 dark:text-red-300 mb-2">删除的任务：</p>
                                <ul className="space-y-1 text-sm">
                                    {taskChangeInfo.deletedTasks.map((taskName, i) => (
                                        <li key={i} className="line-through text-muted-foreground">• {taskName}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                        {taskChangeInfo && taskChangeInfo.newTasks && taskChangeInfo.newTasks.length > 0 && (
                            <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                                <p className="font-bold text-green-800 dark:text-green-300 mb-2">新增的任务：</p>
                                <ul className="space-y-1 text-sm">
                                    {taskChangeInfo.newTasks.map((task, i) => (
                                        <li key={i} className="text-green-700 dark:text-green-300">• {task.name}</li>
                                    ))}
                                </ul>
                            </div>
                        )}
                    </div>
                    <DialogFooter className="flex flex-col sm:flex-row gap-2">
                        <Button variant="secondary" onClick={() => setShowTaskChangeConfirm(false)} className="flex-1">取消</Button>
                        <Button
                            onClick={() => {
                                // 直接同步变化
                                setShowTaskChangeConfirm(false);
                                // 这里需要实现同步逻辑，包括更新任务名称和删除任务
                                // 简化处理：创建新任务并删除旧任务
                                if (taskChangeInfo) {
                                    // 先创建新任务和新增任务
                                    const allNewTasks = [...taskChangeInfo.newTasks];
                                    executeFinalSync(allNewTasks, []);
                                }
                            }}
                            disabled={isSyncing}
                            className="bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white flex-1"
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            同步变化
                        </Button>
                        <Button
                            variant="outline"
                            onClick={() => {
                                // 复制为另一个项目的逻辑
                                setShowTaskChangeConfirm(false);
                                toast({ title: "复制为另一个项目功能开发中" });
                            }}
                            className="flex-1"
                        >
                            复制为另一个项目
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
            

        </Card>
    );
}