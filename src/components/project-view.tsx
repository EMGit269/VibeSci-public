
'use client';

import { useState, useEffect, useTransition } from 'react';
import type { Project, Task, AnalysisResult } from '@/lib/types';
import { CardHeader, CardTitle, CardDescription } from "@/components/ui/card";
import { CreateTaskDialog } from "@/components/create-task-dialog";
import { EditProjectDialog } from "@/components/edit-project-dialog";
import { NavLink } from "@/components/nav-link";
import { FileText, KanbanSquare, LayoutList, Loader2, BookOpenText, Trash2, ShieldAlert, Sparkles, Zap, AlertCircle, Wrench, X, CheckSquare } from "lucide-react";
import { Tabs, TabsList, TabsTrigger, TabsContent } from '@/components/ui/tabs';
import { ProjectBoard } from './project-board';
import { ProjectPlanning } from './project-planning';
import { Button } from './ui/button';
import { Checkbox } from './ui/checkbox';
import { Alert, AlertTitle, AlertDescription } from '@/components/ui/alert';
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger 
} from '@/components/ui/context-menu';
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { useRouter, usePathname } from 'next/navigation';
import { useUser, useFirestore, useCollection, useMemoFirebase, deleteDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';

export function ProjectView({ project, children }: { project: Project, children: React.ReactNode }) {
    const [mounted, setMounted] = useState(false);
    const { toast } = useToast();
    const router = useRouter();
    const pathname = usePathname();
    const [isPending, startTransition] = useTransition();
    const [isAiLoading, setIsAiLoading] = useState(false);
    const { user } = useUser();
    const firestore = useFirestore();

    const [isManageMode, setIsBatchMode] = useState(false);
    const [selectedTaskIds, setSelectedTaskIds] = useState<Set<string>>(new Set());
    const [showBatchDeleteConfirm, setShowBatchDeleteConfirm] = useState(false);

    const tasksQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !project.id) return null;
        return query(
            collection(firestore, 'users', user.uid, 'projects', project.id, 'tasks'),
            orderBy('createdAt', 'asc')
        );
    }, [firestore, user?.uid, project.id]);

    const { data: tasksData, isLoading: isTasksLoading } = useCollection<Task>(tasksQuery);
    const tasks = tasksData || [];

    const [taskToDelete, setTaskToDelete] = useState<{ id: string, name: string } | null>(null);

    useEffect(() => {
        setMounted(true);
    }, []);

    const handleIgnoreError = (idx: number) => {
        if (!user || !firestore) return;
        const current = project.ignoredErrorIndices || [];
        updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'projects', project.id), {
            ignoredErrorIndices: [...current, idx]
        });
    };

    const handleIgnoreWarning = (idx: number) => {
        if (!user || !firestore) return;
        const current = project.ignoredWarningIndices || [];
        updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'projects', project.id), {
            ignoredWarningIndices: [...current, idx]
        });
    };

    const handleClearAnalysis = () => {
        if (!user || !firestore) return;
        updateDocumentNonBlocking(doc(firestore, 'users', user.uid, 'projects', project.id), {
            analysisResult: null,
            ignoredErrorIndices: [],
            ignoredWarningIndices: []
        });
    };

    const handleFixIssues = async () => {
        if (!project.analysisResult || !user || !firestore) return;
        
        const ignoredErrors = new Set(project.ignoredErrorIndices || []);
        const ignoredWarnings = new Set(project.ignoredWarningIndices || []);

        const activeErrors = project.analysisResult.errors.filter((_, idx) => !ignoredErrors.has(idx));
        const activeWarnings = project.analysisResult.warnings.filter((_, idx) => !ignoredWarnings.has(idx));

        if (activeErrors.length === 0 && activeWarnings.length === 0) return;

        setIsAiLoading(true);
        try {
            const errorsText = activeErrors.map(e => `- Error in ${e.step}: ${e.explanation}`).join('\n');
            const warningsText = activeWarnings.map(w => `- Warning in ${w.step}: ${w.explanation}`).join('\n');
            
            const instruction = `Refine the research plan to fix these issues:\n\n${errorsText}\n\n${warningsText}\n\n重要提示：若无大的改动或无必要，请尽量不要修改原来任务（Task）的名字，以保持项目结构一致。`;

            const response = await fetch('/api/planning/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentMarkdown: project.planningMarkdown || '',
                    instruction,
                }),
            });

            if (!response.ok) throw new Error('Failed to fetch stream');

            const reader = response.body?.getReader();
            const decoder = new TextDecoder();
            let accumulatedMarkdown = '';

            if (reader) {
                while (true) {
                    const { done, value } = await reader.read();
                    if (done) break;
                    accumulatedMarkdown += decoder.decode(value, { stream: true });
                }
                
                const projectRef = doc(firestore, 'users', user.uid, 'projects', project.id);
                updateDocumentNonBlocking(projectRef, { 
                    planningMarkdown: accumulatedMarkdown,
                    analysisResult: null,
                    ignoredErrorIndices: [],
                    ignoredWarningIndices: []
                });
                
                toast({ title: "Issues Fixed!", description: "AI has resolved the detected issues." });
            }
        } catch (e) {
            toast({ title: "Fix Failed", variant: "destructive" });
        } finally {
            setIsAiLoading(false);
        }
    };

    const activeErrors = project.analysisResult?.errors.filter((_, idx) => !(project.ignoredErrorIndices || []).includes(idx)) || [];
    const activeWarnings = project.analysisResult?.warnings.filter((_, idx) => !(project.ignoredWarningIndices || []).includes(idx)) || [];
    const hasVisibleIssues = activeErrors.length > 0 || activeWarnings.length > 0;

    const handleDeleteTask = () => {
      if (!taskToDelete || !user || !firestore) return;

      startTransition(async () => {
        const taskRef = doc(firestore, 'users', user.uid, 'projects', project.id, 'tasks', taskToDelete.id);
        deleteDocumentNonBlocking(taskRef);
        
        toast({ title: 'Task Deleted', description: `"${taskToDelete.name}" was removed.` });
        setTaskToDelete(null);
        if (pathname.includes(taskToDelete.id)) {
          router.push(`/dashboard/project/${project.id}`);
        }
      });
    };

    const handleBatchDelete = () => {
        if (selectedTaskIds.size === 0 || !user || !firestore) return;

        startTransition(async () => {
            selectedTaskIds.forEach(id => {
                const taskRef = doc(firestore, 'users', user.uid, 'projects', project.id, 'tasks', id);
                deleteDocumentNonBlocking(taskRef);
            });

            toast({ 
                title: 'Tasks Deleted', 
                description: `Successfully removed ${selectedTaskIds.size} tasks.` 
            });

            const isViewingDeleted = Array.from(selectedTaskIds).some(id => pathname.includes(id));
            if (isViewingDeleted) {
                router.push(`/dashboard/project/${project.id}`);
            }

            setSelectedTaskIds(new Set());
            setShowBatchDeleteConfirm(false);
            setIsBatchMode(false);
        });
    };

    const toggleTaskSelection = (id: string) => {
        const next = new Set(selectedTaskIds);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedTaskIds(next);
    };

    const toggleSelectAll = () => {
        if (selectedTaskIds.size === tasks.length) {
            setSelectedTaskIds(new Set());
        } else {
            setSelectedTaskIds(new Set(tasks.map(t => t.id)));
        }
    };

    if (!mounted) {
        return (
            <div className="flex flex-col gap-6">
                <div className="flex justify-between items-start -m-6 p-6 bg-card border-b">
                    <div className="flex-1">
                        <CardHeader className="p-0">
                            <CardTitle className="font-headline text-3xl">{project.name}</CardTitle>
                            <CardHeader className="p-0">
                                <CardTitle className="font-headline text-3xl">{project.name}</CardTitle>
                                <CardDescription className="text-md pt-1">{project.description}</CardDescription>
                            </CardHeader>
                        </CardHeader>
                    </div>
                </div>
                <div className="h-10 w-[300px] bg-muted animate-pulse rounded-md" />
            </div>
        );
    }

    return (
        <div className="flex flex-col min-h-full pb-12">
            <div className="flex justify-between items-start mb-6 -m-6 p-6 bg-card border-b gap-4">
                 <div className="flex-1 min-w-0">
                    <CardHeader className="p-0">
                        <CardTitle className="font-headline text-3xl block truncate" title={project.name}>{project.name}</CardTitle>
                        <CardDescription className="text-md pt-1 line-clamp-1">{project.description}</CardDescription>
                    </CardHeader>
                </div>
                <div className="flex items-center gap-2 shrink-0">
                    <EditProjectDialog project={project} />
                    <CreateTaskDialog projectId={project.id} />
                </div>
            </div>

            <Tabs defaultValue="planning-view" className="w-full">
                <TabsList className="grid grid-cols-3 md:w-[450px] mb-6">
                    <TabsTrigger 
                        value="planning-view" 
                        className="data-[state=active]:bg-primary data-[state=active]:text-primary-foreground font-semibold"
                    >
                        <BookOpenText className="w-4 h-4 mr-2" />
                        Planning
                    </TabsTrigger>
                    <TabsTrigger value="list-view">
                        <LayoutList className="w-4 h-4 mr-2" />
                        List View
                    </TabsTrigger>
                    <TabsTrigger value="board-view">
                        <KanbanSquare className="w-4 h-4 mr-2" />
                        Board View
                    </TabsTrigger>
                </TabsList>

                <TabsContent value="planning-view">
                    <ProjectPlanning 
                        projectId={project.id} 
                        initialMarkdown={project.planningMarkdown}
                    />
                </TabsContent>

                <TabsContent value="list-view">
                    <div className="grid md:grid-cols-[280px_1fr] gap-6 items-start">
                        <aside className="flex flex-col gap-4 overflow-hidden border rounded-lg p-4 bg-card/50">
                            <div className="flex items-center justify-between px-2 mb-1">
                                <h2 className="font-bold text-lg font-headline tracking-tight">Tasks</h2>
                                <Button 
                                    variant="ghost" 
                                    size="sm" 
                                    className={cn("h-7 px-2 text-xs", isManageMode ? "text-primary bg-primary/10" : "text-muted-foreground")}
                                    onClick={() => {
                                        setIsBatchMode(!isManageMode);
                                        setSelectedTaskIds(new Set());
                                    }}
                                >
                                    {isManageMode ? 'Done' : 'Manage'}
                                </Button>
                            </div>

                            {isManageMode && tasks.length > 0 && (
                                <div className="flex items-center justify-between px-2 py-2 bg-muted/30 rounded-md animate-in fade-in slide-in-from-top-1 duration-200">
                                    <div className="flex items-center gap-2">
                                        <Checkbox 
                                            id="select-all" 
                                            checked={selectedTaskIds.size === tasks.length && tasks.length > 0}
                                            onCheckedChange={toggleSelectAll}
                                        />
                                        <label htmlFor="select-all" className="text-xs font-medium cursor-pointer">
                                            {selectedTaskIds.size === tasks.length ? 'Unselect All' : 'Select All'}
                                        </label>
                                    </div>
                                    {selectedTaskIds.size > 0 && (
                                        <Button 
                                            variant="destructive" 
                                            size="sm" 
                                            className="h-7 px-2 text-[10px] uppercase font-bold"
                                            onClick={() => setShowBatchDeleteConfirm(true)}
                                        >
                                            <Trash2 className="h-3 w-3 mr-1" />
                                            Delete ({selectedTaskIds.size})
                                        </Button>
                                    )}
                                </div>
                            )}

                            <nav className="flex flex-col gap-1">
                                {isTasksLoading ? (
                                    <div className="space-y-2 p-2">
                                        {[1, 2, 3].map(i => <div key={i} className="h-8 bg-muted animate-pulse rounded" />)}
                                    </div>
                                ) : tasks.length > 0 ? tasks.map(task => (
                                    <div key={task.id} className="flex items-center gap-2 group relative">
                                        {isManageMode && (
                                            <div className="animate-in slide-in-from-left-2 duration-200">
                                                <Checkbox 
                                                    checked={selectedTaskIds.has(task.id)}
                                                    onCheckedChange={() => toggleTaskSelection(task.id)}
                                                />
                                            </div>
                                        )}
                                        <ContextMenu>
                                            <ContextMenuTrigger asChild>
                                                <div className="flex-1 min-w-0">
                                                    <NavLink href={`/dashboard/project/${project.id}/task/${task.id}`} isTaskLink>
                                                        <FileText className="h-4 w-4 shrink-0" />
                                                        <span className="truncate">{task.name}</span>
                                                    </NavLink>
                                                </div>
                                            </ContextMenuTrigger>
                                            {!isManageMode && (
                                                <ContextMenuContent className="w-40">
                                                    <ContextMenuItem 
                                                        className="text-destructive focus:text-destructive gap-2"
                                                        onClick={() => setTaskToDelete({ id: task.id, name: task.name })}
                                                    >
                                                        <Trash2 className="h-4 w-4" />
                                                        Delete Task
                                                    </ContextMenuItem>
                                                </ContextMenuContent>
                                            )}
                                        </ContextMenu>
                                    </div>
                                )) : (
                                    <div className="text-center py-6 px-4 border border-dashed rounded-lg">
                                        <p className="text-sm text-muted-foreground">No tasks yet.</p>
                                    </div>
                                )}
                            </nav>
                        </aside>
                        <div className="min-w-0">
                            {children}
                        </div>
                    </div>
                </TabsContent>

                <TabsContent value="board-view">
                    <ProjectBoard project={{ ...project, tasks }} />
                </TabsContent>
            </Tabs>

            {project.analysisResult && (
                <div className="mt-12 p-6 bg-muted/40 rounded-xl border-2 border-dashed border-border/50 space-y-4 animate-in fade-in slide-in-from-bottom-4 duration-500">
                    <div className="flex items-center justify-between mb-2">
                        <div className="flex items-center gap-2">
                            <h3 className="font-headline font-bold text-lg flex items-center gap-2">
                                <Sparkles className="w-4 h-4 text-primary" />
                                Persistent Audit Results
                            </h3>
                        </div>
                        <div className="flex items-center gap-2">
                            {hasVisibleIssues && (
                                <Button
                                    size="sm"
                                    onClick={handleFixIssues}
                                    disabled={isAiLoading}
                                    className="bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white h-8 gap-2 shadow-sm border-none"
                                >
                                    {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Zap className="w-4 h-4" />}
                                    Fix Issues
                                </Button>
                            )}
                            <Button 
                                variant="ghost" 
                                size="sm" 
                                onClick={handleClearAnalysis} 
                                className="h-8 text-xs hover:bg-destructive/10 hover:text-destructive transition-colors"
                            >
                                <X className="h-3 w-3 mr-1" />
                                Close
                            </Button>
                        </div>
                    </div>

                    {!hasVisibleIssues && (
                        <div className="text-center py-6 text-green-600 font-medium bg-green-50 dark:bg-green-900/10 rounded-lg border border-green-200 dark:border-green-900/30">
                            <CheckSquare className="w-8 h-8 mx-auto mb-2 opacity-50" />
                            All issues resolved or ignored.
                        </div>
                    )}

                    {project.analysisResult.errors.map((error, idx) => !(project.ignoredErrorIndices || []).includes(idx) && (
                        <Alert variant="destructive" key={`error-${idx}`} className="bg-destructive/5 relative group border-2">
                            <AlertCircle className="h-4 w-4" />
                            <AlertTitle className="font-bold flex items-center justify-between">
                                <span>Error: {error.step}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleIgnoreError(idx)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </AlertTitle>
                            <AlertDescription>
                                {error.explanation}
                            </AlertDescription>
                        </Alert>
                    ))}

                    {project.analysisResult.warnings.map((warning, idx) => !(project.ignoredWarningIndices || []).includes(idx) && (
                        <Alert key={`warning-${idx}`} className="border-2 border-yellow-500/50 bg-yellow-500/5 text-yellow-800 dark:text-yellow-200 relative group">
                            <Wrench className="h-4 w-4 text-yellow-600" />
                            <AlertTitle className="font-bold flex items-center justify-between">
                                <span>Warning: {warning.step}</span>
                                <Button
                                    variant="ghost"
                                    size="icon"
                                    className="h-6 w-6 opacity-0 group-hover:opacity-100 transition-opacity"
                                    onClick={() => handleIgnoreWarning(idx)}
                                >
                                    <X className="h-3 w-3" />
                                </Button>
                            </AlertTitle>
                            <AlertDescription>
                                {warning.explanation}
                            </AlertDescription>
                        </Alert>
                    ))}
                </div>
            )}

            <AlertDialog open={!!taskToDelete} onOpenChange={(open) => !open && setTaskToDelete(null)}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Delete Task?</AlertDialogTitle>
                        <AlertDialogDescription>
                            Are you sure you want to delete <strong>"{taskToDelete?.name}"</strong>? This will permanently remove all associated methods and code.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteTask();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete Task
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>

            <AlertDialog open={showBatchDeleteConfirm} onOpenChange={setShowBatchDeleteConfirm}>
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>Batch Delete Tasks?</AlertDialogTitle>
                        <AlertDialogDescription>
                            You are about to delete <strong>{selectedTaskIds.size} tasks</strong>. All data associated with these tasks will be permanently lost. This action cannot be undone.
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isPending}>Cancel</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault();
                                handleBatchDelete();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isPending}
                        >
                            {isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            Delete Selected
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
