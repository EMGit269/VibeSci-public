'use client';
import { useState, useActionState } from 'react';
import { useFormStatus } from 'react-dom';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle, DialogTrigger, DialogFooter, DialogClose } from '@/components/ui/dialog';
import { Form, FormControl, FormField, FormItem, FormLabel, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Sparkles } from 'lucide-react';
import { generateCodeAction } from '@/app/actions';
import { cn } from '@/lib/utils';

const generateCodeSchema = z.object({
  codeRequirements: z.string().min(10, 'Requirements must be at least 10 characters'),
  taskId: z.string(),
  methodId: z.string(),
  projectId: z.string(),
});

function SubmitButton() {
  const { pending } = useFormStatus();
  return (
    <Button 
      type="submit" 
      disabled={pending} 
      className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white transition-all duration-300"
    >
      {pending ? (<><Sparkles className="mr-2 h-4 w-4 animate-pulse" /> Generating...</>) : (<><Sparkles className="mr-2 h-4 w-4" /> Generate Code</>)}
    </Button>
  );
}

export function GenerateCodeDialog({ taskId, methodId, projectId }: { taskId: string, methodId: string, projectId: string }) {
  const [open, setOpen] = useState(false);
  const { toast } = useToast();
  
  const form = useForm<z.infer<typeof generateCodeSchema>>({
    resolver: zodResolver(generateCodeSchema),
    defaultValues: {
      codeRequirements: '',
      taskId,
      methodId,
      projectId,
    },
  });

  const actionWithToast = async (prevState: any, formData: FormData) => {
    const result = await generateCodeAction(prevState, formData);
    if (result.message.includes('success')) {
      toast({ title: 'Success', description: result.message });
      setOpen(false);
      form.reset();
    } else {
      toast({ title: 'Error', description: result.message, variant: 'destructive' });
    }
    return result;
  };

  const [state, formAction] = useActionState(actionWithToast, { message: '', errors: {} });

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button className="bg-gradient-to-r from-blue-600 to-indigo-600 hover:from-blue-700 hover:to-indigo-700 text-white shadow-sm transition-all duration-300">
            <Sparkles className="mr-2 h-4 w-4" />
            Generate New Code Version
        </Button>
      </DialogTrigger>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Generate Code</DialogTitle>
          <DialogDescription>
            Provide requirements for the AI to generate a new code snippet or improve upon the last one.
          </DialogDescription>
        </DialogHeader>
        <Form {...form}>
          <form action={formAction} className="space-y-4">
            <input type="hidden" name="taskId" value={taskId} />
            <input type="hidden" name="methodId" value={methodId} />
            <input type="hidden" name="projectId" value={projectId} />
            <FormField
              control={form.control}
              name="codeRequirements"
              render={({ field }) => (
                <FormItem>
                  <FormLabel>Code Requirements</FormLabel>
                  <FormControl>
                    <Textarea
                      placeholder="e.g., 'Refactor to use a class structure' or 'Add error handling for file I/O'."
                      {...field}
                      rows={5}
                      className="focus-visible:ring-0 focus:outline-none"
                    />
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />
            <DialogFooter>
               <DialogClose asChild>
                <Button type="button" variant="secondary">Cancel</Button>
              </DialogClose>
              <SubmitButton />
            </DialogFooter>
          </form>
        </Form>
      </DialogContent>
    </Dialog>
  );
}
