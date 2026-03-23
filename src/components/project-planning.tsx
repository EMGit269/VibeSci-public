
'use client';

import { useState, useEffect } from 'react';
import { analyzePlanningAction } from '@/app/actions';
import { Card, CardContent, CardHeader, CardTitle, CardDescription } from './ui/card';
import { Textarea } from './ui/textarea';
import { Input } from './ui/input';
import { Button } from './ui/button';
import { Save, Eye, Edit3, Loader2, CheckCircle2, Sparkles, RefreshCw, ShieldAlert, X } from 'lucide-react';
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

    const [markdown, setMarkdown] = useState(initialMarkdown || '');
    const [instruction, setInstruction] = useState('');
    const [isEditing, setIsEditing] = useState(false);
    const [isSaving, setIsSaving] = useState(false);
    const [isAiLoading, setIsAiLoading] = useState(false);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [isSyncing, setIsSyncing] = useState(false);
    const [hasChanges, setHasChanges] = useState(false);

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

    const runRefinement = async (currentMarkdown: string, customInstruction: string) => {
        setIsAiLoading(true);
        setIsEditing(true);
        
        try {
            const response = await fetch('/api/planning/refine', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({
                    currentMarkdown,
                    instruction: customInstruction,
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
                    setMarkdown(accumulatedMarkdown);
                }
                
                setHasChanges(true);
                handleSave(accumulatedMarkdown);
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
        const success = await runRefinement(markdown, instruction);
        if (success) {
            setInstruction('');
            toast({ title: "Plan Refined!" });
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
            tasksSnap.docs.forEach(doc => {
                existingTasksMap.set(doc.data().name.trim().toLowerCase(), { id: doc.id, name: doc.data().name });
            });

            const newTasksToCreate: any[] = [];
            const tasksToMerge: { taskId: string, taskName: string, newMethods: any[] }[] = [];

            for (const pTask of parsedTasks) {
                const normalizedName = pTask.name.trim().toLowerCase();
                if (existingTasksMap.has(normalizedName)) {
                    const existing = existingTasksMap.get(normalizedName);
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
                } else {
                    newTasksToCreate.push(pTask);
                }
            }

            if (tasksToMerge.length > 0) {
                setSyncState({ newTasks: newTasksToCreate, mergeTasks: tasksToMerge });
                setShowSyncConfirm(true);
                setIsSyncing(false);
            } else {
                await executeFinalSync(newTasksToCreate, []);
            }
        } catch (e) {
            console.error("Prep Sync Error:", e);
            setIsSyncing(false);
        }
    };

    const executeFinalSync = async (newTasks: any[], mergeTasks: { taskId: string, newMethods: any[] }[]) => {
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

    const placeholderText = `# Task: Data Preprocessing
Problem Description: Clean and normalize raw spectral data for downstream analysis.
## Method: Noise Reduction & Normalization
### Process:
- Apply Savitzky-Golay filter for signal smoothing
- Implement adaptive baseline correction algorithm
- Perform min-max normalization across all samples
- Export cleaned datasets in standard HDF5 format`;

    return (
        <Card className="min-h-[600px] flex flex-col">
            <CardHeader className="flex flex-col gap-4 border-b pb-6">
                <div className="flex flex-row items-center justify-between">
                    <div className="space-y-1">
                        <CardTitle className="font-headline text-2xl">Planning</CardTitle>
                        <CardDescription>Draft your roadmap.</CardDescription>
                    </div>
                    <div className="flex items-center gap-2">
                        <div className="mr-4 flex items-center gap-2 text-xs text-muted-foreground">
                            {isSaving ? (
                                <><Loader2 className="w-3 h-3 animate-spin" /> Saving...</>
                            ) : hasChanges ? (
                                <span className="text-accent">Unsaved</span>
                            ) : (
                                <><CheckCircle2 className="w-3 h-3 text-green-500" /> Saved</>
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
                            title="Sync to Tasks"
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
                                <><Eye className="w-4 h-4 mr-2" /> Preview</>
                            ) : (
                                <><Edit3 className="w-4 h-4 mr-2" /> Edit</>
                            )}
                        </Button>

                        <Button
                            size="sm"
                            onClick={() => handleSave()}
                            disabled={isSaving || !hasChanges || isAiLoading || isAnalyzing}
                            className="h-8"
                        >
                            <Save className="w-4 h-4 mr-2" />
                            Save
                        </Button>
                    </div>
                </div>

                <div className="flex gap-2 p-2 bg-primary/5 rounded-lg border border-primary/20 shadow-inner">
                    <Input
                        placeholder="Ask AI to refine plan..."
                        value={instruction}
                        onChange={(e) => setInstruction(e.target.value)}
                        className="bg-background border-none focus-visible:ring-0 focus:outline-none"
                        onKeyDown={(e) => e.key === 'Enter' && handleAskAi()}
                        disabled={isAiLoading || isAnalyzing}
                    />
                    <Button
                        onClick={handleAskAi}
                        disabled={isAiLoading || isAnalyzing || !instruction.trim()}
                        className="bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white shadow-sm whitespace-nowrap transition-all duration-300"
                    >
                        {isAiLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4 mr-2" />}
                        Ask AI
                    </Button>
                </div>
            </CardHeader>
            <CardContent className="flex-1 p-0 flex flex-col min-h-[500px]">
                <div className="flex-1 flex flex-col">
                    {isEditing ? (
                        <Textarea
                            value={markdown}
                            onChange={(e) => {
                                setMarkdown(e.target.value);
                                setHasChanges(true);
                            }}
                            placeholder={placeholderText}
                            className="flex-1 resize-none border-none focus-visible:ring-0 focus:outline-none p-6 font-code text-md leading-relaxed min-h-[400px]"
                            disabled={isAiLoading || isAnalyzing}
                        />
                    ) : (
                        <div className="p-8 prose prose-slate dark:prose-invert max-w-none overflow-auto min-h-[400px]">
                            {markdown ? (
                                <ReactMarkdown remarkPlugins={[remarkGfm]}>{markdown}</ReactMarkdown>
                            ) : (
                                <div className="text-center py-20 text-muted-foreground italic">
                                    No plan drafted yet.
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
                            <><Loader2 className="w-4 h-4 animate-spin mr-2" /> Analyzing...</>
                        ) : (
                            <><ShieldAlert className="w-4 h-4 mr-2" /> Analyze Logic</>
                        )}
                    </Button>
                </div>
            </CardContent>

            <Dialog open={showSyncConfirm} onOpenChange={setShowSyncConfirm}>
                <DialogContent>
                    <DialogHeader>
                        <DialogTitle>Confirm Sync & Merge</DialogTitle>
                        <DialogDescription>
                            Existing tasks with the same names found. Merge methods?
                        </DialogDescription>
                    </DialogHeader>
                    <div className="py-4 space-y-4">
                        {syncPlan?.mergeTasks.map((m, i) => (
                            <div key={i} className="p-3 bg-muted/50 rounded-lg border text-xs">
                                <p className="font-bold">Task: <span className="text-primary">{m.taskName}</span></p>
                                <ul className="mt-1 space-y-1">
                                    {m.newMethods.map((nm, j) => (
                                        <li key={j} className="text-muted-foreground">• + Method: {nm.name}</li>
                                    ))}
                                </ul>
                            </div>
                        ))}
                    </div>
                    <DialogFooter>
                        <Button variant="secondary" onClick={() => setShowSyncConfirm(false)}>Cancel</Button>
                        <Button
                            onClick={() => executeFinalSync(syncPlan!.newTasks, syncPlan!.mergeTasks)}
                            disabled={isSyncing}
                            className="bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white"
                        >
                            {isSyncing ? <Loader2 className="w-4 h-4 animate-spin mr-2" /> : <RefreshCw className="w-4 h-4 mr-2" />}
                            Sync & Merge
                        </Button>
                    </DialogFooter>
                </DialogContent>
            </Dialog>
        </Card>
    );
}
