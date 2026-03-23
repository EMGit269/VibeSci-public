'use client';
import { useState, useEffect } from 'react';
import type { Task, Method, CodeSnippet } from '@/lib/types';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from './ui/card';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from './ui/select';
import { Button } from './ui/button';
import { Copy, BookOpen, Edit3, Save, X, Loader2, Plus } from 'lucide-react';
import { useToast } from '@/hooks/use-toast';
import { GenerateDocsDialog } from './generate-docs-dialog';
import { Textarea } from './ui/textarea';
import { InlineCodeGenerator } from './inline-code-generator';
import Editor from '@monaco-editor/react';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';

function CodeEditor({ 
    projectId, 
    taskId, 
    methodId, 
    snippet,
    nextVersion,
    onSaveSuccess
}: { 
    projectId: string;
    taskId: string;
    methodId: string;
    snippet?: CodeSnippet;
    nextVersion?: string;
    onSaveSuccess?: () => void;
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isEditing, setIsEditing] = useState(!snippet);
    const [code, setCode] = useState(snippet?.code || '# Write your research code here...');
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (snippet) {
            setCode(snippet.code);
            setIsEditing(false);
        } else {
            setCode('# Write your research code here...');
            setIsEditing(true);
        }
    }, [snippet]);

    const handleCopy = () => {
        navigator.clipboard.writeText(code);
        toast({ title: 'Copied to clipboard!' });
    };

    const handleSave = async () => {
        if (!user || !firestore) return;
        setIsSaving(true);
        
        try {
            if (snippet) {
                const snippetRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId, 'methods', methodId, 'codeSnippets', snippet.id);
                updateDocumentNonBlocking(snippetRef, { code });
                toast({ title: 'Success', description: 'Code snippet updated.' });
                setIsEditing(false);
            } else {
                const snippetsRef = collection(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId, 'methods', methodId, 'codeSnippets');
                await addDocumentNonBlocking(snippetsRef, {
                    version: nextVersion || '1.0',
                    purpose: 'Manual implementation',
                    code,
                    notesAndTradeoffs: 'Manually entered implementation.',
                    createdAt: new Date().toISOString(),
                });
                toast({ title: 'Success', description: `Version ${nextVersion || '1.0'} saved.` });
                onSaveSuccess?.();
            }
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to save code.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <div className="relative bg-zinc-950 rounded-lg overflow-hidden border border-border/50 shadow-inner group">
            <div className="flex items-center justify-between px-4 py-2 bg-zinc-900 border-b border-white/5">
                <div className="flex gap-1.5 items-center">
                    <div className="w-3 h-3 rounded-full bg-red-500/80" />
                    <div className="w-3 h-3 rounded-full bg-yellow-500/80" />
                    <div className="w-3 h-3 rounded-full bg-green-500/80" />
                    {!snippet && <span className="text-[10px] text-white/40 ml-3 font-mono uppercase tracking-widest bg-white/5 px-2 py-0.5 rounded">Drafting v{nextVersion}</span>}
                </div>
                <div className="flex items-center gap-2">
                    {isEditing ? (
                        <div className="flex items-center gap-2">
                             {snippet && (
                                <Button
                                    variant="ghost"
                                    size="sm"
                                    className="h-7 px-2 text-xs text-white/60 hover:text-white"
                                    onClick={() => {
                                        setIsEditing(false);
                                        setCode(snippet.code);
                                    }}
                                >
                                    <X className="h-3.5 w-3.5 mr-1" />
                                    Cancel
                                </Button>
                             )}
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-3 text-xs bg-primary/20 text-primary-foreground hover:bg-primary/30 border border-primary/20"
                                onClick={handleSave}
                                disabled={isSaving}
                            >
                                {isSaving ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1" /> : <Save className="h-3.5 w-3.5 mr-1" />}
                                {snippet ? 'Save Changes' : `Save Version ${nextVersion}`}
                            </Button>
                        </div>
                    ) : (
                        <div className="flex items-center gap-2">
                            <Button
                                variant="ghost"
                                size="sm"
                                className="h-7 px-2 text-xs text-white/60 hover:text-white"
                                onClick={() => setIsEditing(true)}
                            >
                                <Edit3 className="h-3.5 w-3.5 mr-1" />
                                Edit Code
                            </Button>
                            <Button
                                variant="ghost"
                                size="icon"
                                className="h-7 w-7 text-white/60 hover:text-white"
                                onClick={handleCopy}
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                    )}
                </div>
            </div>

            <div className="h-[400px] w-full bg-zinc-950">
                <Editor
                    height="100%"
                    defaultLanguage="python"
                    value={code}
                    theme="vs-dark"
                    onChange={(value) => setCode(value || '')}
                    options={{
                        readOnly: !isEditing,
                        minimap: { enabled: false },
                        fontSize: 14,
                        lineHeight: 24,
                        fontFamily: "'Source Code Pro', monospace",
                        scrollBeyondLastLine: false,
                        automaticLayout: true,
                        padding: { top: 16, bottom: 16 },
                        scrollbar: {
                            vertical: 'visible',
                            horizontal: 'visible',
                            useShadows: false,
                            verticalScrollbarSize: 10,
                            horizontalScrollbarSize: 10
                        }
                    }}
                />
            </div>
        </div>
    );
}

function EditableNotes({ 
    projectId, 
    taskId, 
    methodId, 
    snippet 
}: { 
    projectId: string;
    taskId: string;
    methodId: string;
    snippet: CodeSnippet;
}) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [isEditing, setIsEditing] = useState(false);
    const [notes, setNotes] = useState(snippet.notesAndTradeoffs);
    const [isSaving, setIsSaving] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        setNotes(snippet.notesAndTradeoffs);
        setIsEditing(false);
    }, [snippet]);

    const handleSave = async () => {
        if (!user || !firestore) return;
        setIsSaving(true);
        try {
            const snippetRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId, 'methods', methodId, 'codeSnippets', snippet.id);
            updateDocumentNonBlocking(snippetRef, { notesAndTradeoffs: notes });
            toast({ title: 'Success', description: 'Notes updated.' });
            setIsEditing(false);
        } catch (e) {
            toast({ title: 'Error', description: 'Failed to update notes.', variant: 'destructive' });
        } finally {
            setIsSaving(false);
        }
    };

    return (
        <Card>
            <CardHeader className="py-4 flex flex-row items-center justify-between">
                <CardTitle className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Notes & Tradeoffs</CardTitle>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditing(!isEditing)}
                    className="h-8 px-2 text-primary"
                >
                    {isEditing ? <X className="h-4 w-4 mr-1" /> : <Edit3 className="h-4 w-4 mr-1" />}
                    {isEditing ? 'Cancel' : 'Edit Notes'}
                </Button>
            </CardHeader>
            <CardContent>
                {isEditing ? (
                    <div className="space-y-3">
                        <Textarea 
                            value={notes}
                            onChange={(e) => setNotes(e.target.value)}
                            className="min-h-[100px] text-sm leading-relaxed"
                            placeholder="Enter design choices, assumptions, or tradeoffs..."
                        />
                        <div className="flex justify-end">
                            <Button size="sm" onClick={handleSave} disabled={isSaving}>
                                {isSaving ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                                Save Notes
                            </Button>
                        </div>
                    </div>
                ) : (
                    <p className="text-sm leading-relaxed">{notes || 'No notes provided for this version.'}</p>
                )}
            </CardContent>
        </Card>
    );
}


export function CodeSnippetDisplay({ task, method }: { task: Task, method: Method }) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [selectedSnippetId, setSelectedSnippetId] = useState<string | undefined>(undefined);
    const [isCreatingNew, setIsCreatingNew] = useState(false);

    const snippetsQuery = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !task.projectId || !task.id || !method.id) return null;
        return query(
            collection(firestore, 'users', user.uid, 'projects', task.projectId, 'tasks', task.id, 'methods', method.id, 'codeSnippets'),
            orderBy('version', 'desc')
        );
    }, [firestore, user?.uid, task.projectId, task.id, method.id]);

    const { data: snippetsData, isLoading } = useCollection<CodeSnippet>(snippetsQuery);
    const codeSnippets = snippetsData || [];

    const selectedSnippet = codeSnippets.find(s => s.id === selectedSnippetId);

    useEffect(() => {
        if (codeSnippets.length > 0 && !selectedSnippetId && !isCreatingNew) {
            setSelectedSnippetId(codeSnippets[0].id);
        }
    }, [codeSnippets, selectedSnippetId, isCreatingNew]);
    
    if (isLoading) {
        return (
            <div className="flex justify-center items-center py-12">
                <Loader2 className="h-8 w-8 animate-spin text-primary opacity-50" />
            </div>
        );
    }

    const nextVersion = codeSnippets.length > 0 
        ? (Math.floor(parseFloat(codeSnippets[0].version)) + 1.0).toFixed(1) 
        : "1.0";

    return (
        <div className="space-y-6">
            <div className="flex items-center justify-between">
                {codeSnippets.length > 0 ? (
                    <div className="flex items-center gap-4">
                        <Select 
                            value={isCreatingNew ? 'new' : selectedSnippetId} 
                            onValueChange={(val) => {
                                if (val === 'new') setIsCreatingNew(true);
                                else {
                                    setIsCreatingNew(false);
                                    setSelectedSnippetId(val);
                                }
                            }}
                        >
                            <SelectTrigger className="w-[280px]">
                                <SelectValue placeholder="Select version" />
                            </SelectTrigger>
                            <SelectContent>
                                <SelectItem value="new" className="text-primary font-bold">
                                    <Plus className="w-3 h-3 mr-2 inline" /> New Manual Version
                                </SelectItem>
                                {codeSnippets.map((snippet) => (
                                    <SelectItem key={snippet.id} value={snippet.id}>
                                        Version {snippet.version} ({new Date(snippet.createdAt).toLocaleDateString()})
                                    </SelectItem>
                                ))}
                            </SelectContent>
                        </Select>
                    </div>
                ) : (
                    <div className="text-sm font-medium text-muted-foreground bg-primary/5 px-3 py-1 rounded-full border border-primary/10 flex items-center gap-2">
                        <Edit3 className="w-3 h-3" />
                        Drafting Initial Implementation (v1.0)
                    </div>
                )}
            </div>

            <div className="space-y-6">
                <div className="space-y-2">
                    <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider ml-1">
                        {isCreatingNew ? `New Version (v${nextVersion})` : "Implementation"}
                    </h4>
                    <CodeEditor 
                        projectId={task.projectId} 
                        taskId={task.id} 
                        methodId={method.id} 
                        snippet={isCreatingNew ? undefined : selectedSnippet}
                        nextVersion={nextVersion}
                        onSaveSuccess={() => setIsCreatingNew(false)}
                    />
                </div>

                {!isCreatingNew && selectedSnippet && (
                    <>
                        <InlineCodeGenerator 
                            taskId={task.id} 
                            methodId={method.id} 
                            projectId={task.projectId} 
                            snippetId={selectedSnippet.id}
                        />

                        <EditableNotes 
                            projectId={task.projectId} 
                            taskId={task.id} 
                            methodId={method.id} 
                            snippet={selectedSnippet} 
                        />

                        <Card className="border-primary/10 bg-primary/5">
                            <CardHeader className="flex flex-row items-center justify-between">
                                <div className="space-y-1">
                                    <CardTitle className="flex items-center gap-2 text-lg">
                                        <BookOpen className="w-5 h-5 text-primary"/>
                                        AI Documentation
                                    </CardTitle>
                                    <CardDescription>
                                        {selectedSnippet.documentation ? "Generated documentation for this snippet." : "No documentation generated yet."}
                                    </CardDescription>
                                </div>
                                <GenerateDocsDialog task={task} method={method} snippet={selectedSnippet} />
                            </CardHeader>
                            {selectedSnippet.documentation && (
                                <CardContent>
                                    {selectedSnippet.developerComments && (
                                        <div className="mb-4 p-3 bg-muted/50 rounded-md border border-border/50">
                                            <p className="text-xs font-bold text-muted-foreground uppercase mb-1">Developer Context</p>
                                            <p className="text-sm italic">"{selectedSnippet.developerComments}"</p>
                                        </div>
                                    )}
                                    <div className="prose prose-sm dark:prose-invert max-w-none bg-card p-6 rounded-lg border">
                                        <ReactMarkdown remarkPlugins={[remarkGfm]}>
                                            {selectedSnippet.documentation}
                                        </ReactMarkdown>
                                    </div>
                                </CardContent>
                            )}
                        </Card>
                    </>
                )}

                {isCreatingNew && (
                    <div className="text-xs text-muted-foreground italic px-2 bg-muted/30 p-3 rounded-md border border-dashed">
                        You are in <strong>Manual Draft Mode</strong>. Enter your code and click save to create a new version entry in the project history.
                    </div>
                )}
                
                {codeSnippets.length === 0 && (
                    <InlineCodeGenerator 
                        taskId={task.id} 
                        methodId={method.id} 
                        projectId={task.projectId} 
                    />
                )}
            </div>
        </div>
    );
}
