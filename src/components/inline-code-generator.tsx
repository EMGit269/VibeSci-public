
'use client';
import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { z } from 'zod';
import { useToast } from '@/hooks/use-toast';
import { Button } from '@/components/ui/button';
import { Form, FormControl, FormField, FormItem, FormMessage } from '@/components/ui/form';
import { Textarea } from '@/components/ui/textarea';
import { Switch } from '@/components/ui/switch';
import { Label } from '@/components/ui/label';
import { Sparkles, Loader2 } from 'lucide-react';
import { generateCodeAction } from '@/app/actions';
import { useUser, useFirestore, addDocumentNonBlocking, updateDocumentNonBlocking } from '@/firebase';
import { collection, doc, getDoc } from 'firebase/firestore';

const generateCodeSchema = z.object({
  codeRequirements: z.string().min(5, 'Requirements must be at least 5 characters'),
  isNewVersion: z.boolean().default(true),
});

export function InlineCodeGenerator({ 
  taskId, 
  methodId, 
  projectId,
  snippetId 
}: { 
  taskId: string, 
  methodId: string, 
  projectId: string,
  snippetId?: string 
}) {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [loading, setLoading] = useState(false);
  const [isNewVersion, setIsNewVersion] = useState(true);
  
  const form = useForm<z.infer<typeof generateCodeSchema>>({
    resolver: zodResolver(generateCodeSchema),
    defaultValues: {
      codeRequirements: '',
      isNewVersion: true,
    },
  });

  const onSubmit = async (values: z.infer<typeof generateCodeSchema>) => {
    if (!user || !firestore) return;
    
    setLoading(true);
    try {
      const taskRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId);
      const methodRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId, 'methods', methodId);
      
      const [taskSnap, methodSnap] = await Promise.all([getDoc(taskRef), getDoc(methodRef)]);
      
      const taskData = taskSnap.data();
      const methodData = methodSnap.data();

      let existingCode = '';
      if (snippetId) {
        const snippetRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId, 'methods', methodId, 'codeSnippets', snippetId);
        const snippetSnap = await getDoc(snippetRef);
        existingCode = snippetSnap.data()?.code || '';
      }

      const result = await generateCodeAction({
        taskName: taskData?.name || "Research Module",
        problemDescription: taskData?.problemDescription || "Scientific task",
        methodName: methodData?.name || "Technical approach",
        codeRequirements: values.codeRequirements,
        existingCodeContext: existingCode || undefined
      });

      if (!result.success || !result.data) throw new Error(result.error);

      const snippetsRef = collection(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId, 'methods', methodId, 'codeSnippets');
      
      if (values.isNewVersion) {
        await addDocumentNonBlocking(snippetsRef, {
          version: result.data.version,
          purpose: result.data.purpose,
          code: result.data.code,
          notesAndTradeoffs: result.data.notesAndTradeoffs,
          createdAt: new Date().toISOString(),
        });
      } else if (snippetId) {
        const snippetRef = doc(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId, 'methods', methodId, 'codeSnippets', snippetId);
        updateDocumentNonBlocking(snippetRef, {
          code: result.data.code,
          purpose: result.data.purpose,
          notesAndTradeoffs: result.data.notesAndTradeoffs,
          version: result.data.version
        });
      }

      toast({ 
        title: values.isNewVersion ? 'Version Created' : 'Version Updated', 
        description: 'Successfully applied AI refinements.'
      });
      form.reset();
    } catch (e: any) {
      toast({ title: 'Generation Failed', description: e.message, variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="space-y-3 p-4 bg-muted/20 rounded-lg border border-border/50 shadow-sm animate-in fade-in slide-in-from-bottom-2 duration-500">
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)} className="space-y-4">
          <FormField
            control={form.control}
            name="codeRequirements"
            render={({ field }) => (
              <FormItem>
                <FormControl>
                  <Textarea
                    placeholder="Enter requirements (e.g., 'Optimization for high-frequency data', 'Add detailed logging')..."
                    {...field}
                    rows={2}
                    className="bg-background border-border/60 focus-visible:ring-1 focus-visible:ring-primary/20 focus:outline-none resize-none text-sm"
                    disabled={loading}
                  />
                </FormControl>
                <FormMessage />
              </FormItem>
            )}
          />
          
          <div className="flex items-center justify-between">
            <Button 
              type="submit" 
              disabled={loading || !form.watch('codeRequirements')} 
              size="sm"
              className="w-fit bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white shadow-sm transition-all duration-300 font-medium px-6 border-none"
            >
              {loading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Generating...
                </>
              ) : (
                <>
                  <Sparkles className="mr-2 h-4 w-4" />
                  {isNewVersion ? 'Generate New Version' : 'Update Current Version'}
                </>
              )}
            </Button>
            
            <div className="flex items-center space-x-2">
              <Switch 
                id="new-version-mode" 
                checked={isNewVersion}
                onCheckedChange={(checked) => {
                  setIsNewVersion(checked);
                  form.setValue('isNewVersion', checked);
                }}
                disabled={loading}
              />
              <Label htmlFor="new-version-mode" className="text-xs font-medium text-muted-foreground">
                New Version
              </Label>
            </div>
          </div>
        </form>
      </Form>
    </div>
  );
}
