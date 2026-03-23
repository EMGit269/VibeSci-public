
'use client';
import { useState, useEffect } from 'react';
import type { Task } from '@/lib/types';
import { suggestMethodsAction } from '@/app/actions';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogFooter } from '@/components/ui/dialog';
import { Checkbox } from '@/components/ui/checkbox';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Lightbulb } from 'lucide-react';
import { ScrollArea } from './ui/scroll-area';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';

type SuggestedMethod = {
    name: string;
    description: string;
};

type SuggestMethodsDialogProps = {
    task: Task;
    open: boolean;
    onOpenChange: (open: boolean) => void;
};

export function SuggestMethodsDialog({ task, open, onOpenChange }: SuggestMethodsDialogProps) {
    const { user } = useUser();
    const firestore = useFirestore();
    const [loading, setLoading] = useState(true);
    const [suggestions, setSuggestions] = useState<SuggestedMethod[]>([]);
    const [selectedMethods, setSelectedMethods] = useState<SuggestedMethod[]>([]);
    const [isSubmitting, setIsSubmitting] = useState(false);
    const { toast } = useToast();

    useEffect(() => {
        if (open && task.name) {
            const fetchSuggestions = async () => {
                setLoading(true);
                const result = await suggestMethodsAction(task.name, task.problemDescription);
                if (result.success && result.data) {
                    setSuggestions(result.data);
                } else {
                    toast({
                        title: 'Error',
                        description: 'Could not fetch AI suggestions.',
                        variant: 'destructive',
                    });
                }
                setLoading(false);
            };
            fetchSuggestions();
        }
    }, [open, task.name, task.problemDescription, toast]);

    const handleCheckboxChange = (method: SuggestedMethod, checked: boolean) => {
        setSelectedMethods(prev =>
            checked ? [...prev, method] : prev.filter(m => m.name !== method.name)
        );
    };

    const handleAddMethods = async () => {
        if (selectedMethods.length === 0) {
            toast({
                title: 'No methods selected',
                description: 'Please select at least one method to add.',
                variant: 'destructive'
            });
            return;
        }

        if (!user || !firestore) return;

        setIsSubmitting(true);
        try {
            const methodsRef = collection(firestore, 'users', user.uid, 'projects', task.projectId, 'tasks', task.id, 'methods');
            
            for (const method of selectedMethods) {
                addDocumentNonBlocking(methodsRef, {
                    ...method,
                    createdAt: new Date().toISOString(),
                });
            }

            toast({
                title: 'Success',
                description: `${selectedMethods.length} methods have been added to your task.`
            });
            onOpenChange(false);
        } catch (e) {
            toast({
                title: 'Error',
                description: 'Failed to add methods.',
                variant: 'destructive'
            });
        } finally {
            setIsSubmitting(false);
        }
    };
    
    const handleClose = () => {
        setLoading(true);
        setSuggestions([]);
        setSelectedMethods([]);
        onOpenChange(false);
    }

    return (
        <Dialog open={open} onOpenChange={handleClose}>
            <DialogContent className="sm:max-w-2xl">
                <DialogHeader>
                    <DialogTitle className="font-headline flex items-center gap-2">
                        <Lightbulb className="w-6 h-6 text-accent" />
                        AI Suggestions for "{task.name}"
                    </DialogTitle>
                    <DialogDescription>
                        Here are some potential methods to solve your problem. Select the ones you'd like to explore.
                    </DialogDescription>
                </DialogHeader>

                {loading ? (
                    <div className="flex flex-col items-center justify-center h-64">
                        <Loader2 className="h-8 w-8 animate-spin text-primary" />
                        <p className="mt-4 text-muted-foreground">Generating suggestions...</p>
                    </div>
                ) : (
                    <ScrollArea className="h-96 pr-6">
                        <div className="space-y-4">
                            {suggestions.map((suggestion, index) => (
                                <div key={index} className="flex items-start space-x-3 p-4 border rounded-lg has-[:checked]:bg-primary/10 has-[:checked]:border-primary transition-colors">
                                    <Checkbox
                                        id={`suggestion-${index}`}
                                        onCheckedChange={(checked) => handleCheckboxChange(suggestion, !!checked)}
                                        checked={selectedMethods.some(m => m.name === suggestion.name)}
                                    />
                                    <Label htmlFor={`suggestion-${index}`} className="flex-1 cursor-pointer">
                                        <span className="font-semibold block">{suggestion.name}</span>
                                        <p className="text-sm text-muted-foreground mt-1">{suggestion.description}</p>
                                    </Label>
                                </div>
                            ))}
                        </div>
                    </ScrollArea>
                )}

                <DialogFooter>
                    <Button type="button" variant="secondary" onClick={handleClose}>Skip</Button>
                    <Button 
                        type="button" 
                        onClick={handleAddMethods} 
                        disabled={loading || isSubmitting || selectedMethods.length === 0}
                        className="bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white shadow-sm transition-all duration-300 border-none"
                    >
                        {isSubmitting && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
                        Add Selected Methods
                    </Button>
                </DialogFooter>
            </DialogContent>
        </Dialog>
    );
}
