'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
  DialogFooter,
  DialogClose,
} from '@/components/ui/dialog';
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from '@/components/ui/form';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { PlusCircle, Loader2 } from 'lucide-react';
import type { Task } from '@/lib/types';
import { SuggestMethodsDialog } from './suggest-methods-dialog';
import { useUser, useFirestore, addDocumentNonBlocking } from '@/firebase';
import { collection } from 'firebase/firestore';

const taskSchema = z.object({
  name: z.string().min(3, 'Task name must be at least 3 characters'),
  problemDescription: z.string().min(10, 'Problem description must be at least 10 characters'),
  projectId: z.string(),
});

export function CreateTaskDialog({ projectId }: { projectId: string }) {
  const { user } = useUser();
  const firestore = useFirestore();
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [newlyCreatedTask, setNewlyCreatedTask] = useState<Task | null>(null);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof taskSchema>>({
    resolver: zodResolver(taskSchema),
    defaultValues: {
      name: '',
      problemDescription: '',
      projectId,
    },
  });

  const onSubmit = async (values: z.infer<typeof taskSchema>) => {
    if (!user || !firestore) return;

    setLoading(true);
    try {
      const tasksRef = collection(firestore, 'users', user.uid, 'projects', projectId, 'tasks');
      const docRef = await addDocumentNonBlocking(tasksRef, {
        ...values,
        createdAt: new Date().toISOString(),
      });

      if (docRef) {
        toast({ title: 'Success', description: 'Task created successfully!' });
        setNewlyCreatedTask({
          id: docRef.id,
          ...values,
          createdAt: new Date().toISOString(),
        } as Task);
        setOpen(false);
        form.reset();
      }
    } catch (e) {
      toast({ title: 'Error', description: 'Failed to create task.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <Dialog open={open} onOpenChange={setOpen}>
        <DialogTrigger asChild>
          <Button size="sm" className="gap-1">
            <PlusCircle className="h-4 w-4" />
            New Task
          </Button>
        </DialogTrigger>
        <DialogContent className="sm:max-w-[425px]">
          <DialogHeader>
            <DialogTitle className="font-headline">Create New Task</DialogTitle>
            <DialogDescription>
              Define a new research task for this project.
            </DialogDescription>
          </DialogHeader>
          <Form {...form}>
            <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
              <FormField
                control={form.control}
                name="name"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Task Name</FormLabel>
                    <FormControl>
                      <Input placeholder="e.g., Image Classification" {...field} />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <FormField
                control={form.control}
                name="problemDescription"
                render={({ field }) => (
                  <FormItem>
                    <FormLabel>Problem Description</FormLabel>
                    <FormControl>
                      <Textarea
                        placeholder="Describe the problem this task aims to solve."
                        {...field}
                      />
                    </FormControl>
                    <FormMessage />
                  </FormItem>
                )}
              />
              <DialogFooter>
                <DialogClose asChild>
                  <Button type="button" variant="secondary" disabled={loading}>Cancel</Button>
                </DialogClose>
                <Button type="submit" disabled={loading}>
                  {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : 'Create Task'}
                </Button>
              </DialogFooter>
            </form>
          </Form>
        </DialogContent>
      </Dialog>
      {newlyCreatedTask && (
        <SuggestMethodsDialog
          task={newlyCreatedTask}
          open={!!newlyCreatedTask}
          onOpenChange={() => setNewlyCreatedTask(null)}
        />
      )}
    </>
  );
}
