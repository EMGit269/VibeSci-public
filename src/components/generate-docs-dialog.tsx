'use client';
import { useState, useEffect } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { BookMarked, Loader2 } from 'lucide-react';
import { generateDocsAction } from '@/app/actions';
import type { Task, Method, CodeSnippet } from '@/lib/types';
import { useUser, useFirestore, updateDocumentNonBlocking } from '@/firebase';
import { doc } from 'firebase/firestore';

const generateDocsSchema = z.object({
  developerComments: z.string().optional(),
});

type Props = {
  task: Task;
  method: Method;
  snippet: CodeSnippet;
};

export function GenerateDocsDialog({ task, method, snippet }: Props) {
  const [open, setOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof generateDocsSchema>>({
    resolver: zodResolver(generateDocsSchema),
    defaultValues: {
      developerComments: snippet.developerComments || '',
    },
  });

  useEffect(() => {
    if (open) {
      form.reset({
        developerComments: snippet.developerComments || '',
      });
    }
  }, [open, snippet, form]);

  const onSubmit = async (values: z.infer<typeof generateDocsSchema>) => {
    if (!user || !firestore) return;
    
    setLoading(true);
    try {
      const result = await generateDocsAction({
        code: snippet.code,
        taskDescription: task.problemDescription,
        methodDescription: method.description,
        comments: values.developerComments
      });

      if (!result.success || !result.data) throw new Error(result.error);

      const snippetRef = doc(firestore, 'users', user.uid, 'projects', task.projectId, 'tasks', task.id, 'methods', method.id, 'codeSnippets', snippet.id);
      updateDocumentNonBlocking(snippetRef, {
        documentation: result.data.documentation,
        developerComments: values.developerComments
      });

      toast({ title: 'Success', description: 'Documentation generated successfully!' });
      setOpen(false);
    } catch (e: any) {
      toast({ title: 'Error', description: e.message || 'Failed to generate documentation.', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button 
          variant="outline" 
          size="sm" 
          className="border-blue-500/50 hover:bg-gradient-to-r hover:from-blue-600 hover:to-indigo-600 hover:text-white transition-all duration-300"
        >
            <BookMarked className="mr-2 h-4 w-4" />
            {snippet.documentation ? 'Regenerate' : 'Generate'} Docs
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Generate Documentation</DialogTitle>
          <DialogDescription>
            Add any comments or context for the AI to generate documentation for this code snippet.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
            <FormField
              control={form.control}
              name="developerComments"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Developer Comments (Optional)</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'This implementation is a bit slow, needs optimization later.'"
                      {...field}
                      rows={4}
                      className="focus-visible:ring-0 focus:outline-none"
                      disabled={loading}
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
                {loading ? <Loader2 className="mr-2 h-4 w-4 animate-spin" /> : 'Generate Documentation'}
              </Button>
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
