
'use client';

import { useState } from 'react';
import type { Task, Method } from '@/lib/types';
import { Accordion, AccordionContent, AccordionItem, AccordionTrigger } from './ui/accordion';
import { AddMethodDialog } from './add-method-dialog';
import { CodeSnippetDisplay } from './code-snippet-display';
import { Card, CardContent } from './ui/card';
import { Button } from './ui/button';
import { Trash2, Loader2, Edit3, Save, X } from 'lucide-react';
import { Textarea } from './ui/textarea';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
  AlertDialogFooter,
  AlertDialogDescription,
} from '@/components/ui/alert-dialog';
import { useToast } from '@/hooks/use-toast';
import { useUser, useFirestore, updateDocumentNonBlocking, deleteDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';
import ReactMarkdown from 'react-markdown';
import remarkGfm from 'remark-gfm';

function EditableMethodDescription({ 
    projectId, 
    taskId, 
    method 
}: { 
    projectId: string; 
    taskId: string; 
    method: Method 
}) {
    const [isEditing, setIsEditing] = useState(false);
    const [content, setContent] = useState(method.description);
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();

    const handleSave = async () => {
        if (!user || !firestore) return;
        
        const methodRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId, 'methods', method.id);
        updateDocumentNonBlocking(methodRef, { description: content });
        setIsEditing(false);
        toast({ title: 'Success', description: 'Method description updated.' });
    };

    return (
        <div className="space-y-4">
            <div className="flex items-center justify-between">
                <h4 className="text-sm font-semibold text-muted-foreground uppercase tracking-wider">Process</h4>
                <Button 
                    variant="ghost" 
                    size="sm" 
                    onClick={() => setIsEditing(!isEditing)}
                    className="h-8 px-2 text-primary"
                >
                    {isEditing ? <X className="h-4 w-4 mr-1" /> : <Edit3 className="h-4 w-4 mr-1" />}
                    {isEditing ? 'Cancel' : 'Edit Process'}
                </Button>
            </div>
            
            {isEditing ? (
                <div className="space-y-3 animate-in fade-in duration-300">
                    <Textarea 
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="min-h-[150px] font-code text-sm leading-relaxed"
                        placeholder="Describe the technical process steps..."
                    />
                    <div className="flex justify-end">
                        <Button size="sm" onClick={handleSave}>
                            <Save className="h-4 w-4 mr-2" />
                            Save Changes
                        </Button>
                    </div>
                </div>
            ) : (
                <div className="prose prose-sm dark:prose-invert max-w-none bg-muted/30 p-4 rounded-lg border border-border/50">
                    <ReactMarkdown remarkPlugins={[remarkGfm]}>
                        {method.description || '*No detailed execution steps provided.*'}
                    </ReactMarkdown>
                </div>
            )}
        </div>
    );
}

export function MethodsTab({ task }: { task: Task }) {
    const { toast } = useToast();
    const { user } = useUser();
    const firestore = useFirestore();

    const handleDeleteMethod = async (methodId: string, methodName: string) => {
        if (!user || !firestore) return;
        
        const methodRef = doc(firestore, 'users', user.uid, 'projects', task.projectId, 'tasks', task.id, 'methods', methodId);
        deleteDocumentNonBlocking(methodRef);
        toast({
            title: 'Success',
            description: `Method "${methodName}" deleted.`,
        });
    };

    return (
        <Card>
            <CardContent className="pt-6">
                 <div className="flex justify-end mb-4">
                    <AddMethodDialog taskId={task.id} projectId={task.projectId} />
                </div>
                {task.methods && task.methods.length > 0 ? (
                    <Accordion type="single" collapsible className="w-full" defaultValue={`item-${task.methods[0].id}`}>
                        {task.methods.map((method) => (
                            <AccordionItem value={`item-${method.id}`} key={method.id}>
                                <div className="flex items-center justify-between">
                                    <AccordionTrigger className="text-lg font-headline font-bold text-primary hover:no-underline flex-1 text-left">
                                        {method.name}
                                    </AccordionTrigger>
                                    <AlertDialog>
                                        <AlertDialogTrigger asChild>
                                            <Button variant="ghost" size="icon" className="mr-4 text-muted-foreground hover:text-destructive">
                                                <Trash2 className="h-4 w-4" />
                                                <span className="sr-only">Delete Method</span>
                                            </Button>
                                        </AlertDialogTrigger>
                                        <AlertDialogContent>
                                            <AlertDialogHeader>
                                                <AlertDialogTitle>Confirm Method Deletion</AlertDialogTitle>
                                                <AlertDialogDescription>
                                                    Are you sure you want to delete the method <strong>"{method.name}"</strong>? This action will permanently remove all associated code snippets and documentation.
                                                </AlertDialogDescription>
                                            </AlertDialogHeader>
                                            <AlertDialogFooter>
                                                <AlertDialogCancel>Cancel</AlertDialogCancel>
                                                <AlertDialogAction
                                                    onClick={() => handleDeleteMethod(method.id, method.name)}
                                                    className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                                                >
                                                    Confirm Delete
                                                </AlertDialogAction>
                                            </AlertDialogFooter>
                                        </AlertDialogContent>
                                    </AlertDialog>
                                </div>
                                <AccordionContent className="pt-4 space-y-6">
                                    <EditableMethodDescription 
                                        projectId={task.projectId}
                                        taskId={task.id}
                                        method={method}
                                    />
                                    
                                    <CodeSnippetDisplay task={task} method={method} />
                                </AccordionContent>
                            </AccordionItem>
                        ))}
                    </Accordion>
                ) : (
                    <div className="text-center text-muted-foreground py-12">
                        <p>No solution methods defined for this task yet.</p>
                    </div>
                )}
            </CardContent>
        </Card>
    );
}
