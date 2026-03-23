
'use client';

import { useState } from 'react';
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogFooter,
} from '@/components/ui/dialog';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { saveCustomAiSettingsAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Key, Globe, Cpu } from 'lucide-react';

interface CustomModelSettingsDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
}

export function CustomModelSettingsDialog({ open, onOpenChange }: CustomModelSettingsDialogProps) {
  const [loading, setLoading] = useState(false);
  const { toast } = useToast();

  const handleSave = async (e: React.FormEvent<HTMLFormElement>) => {
    e.preventDefault();
    setLoading(true);
    
    const formData = new FormData(e.currentTarget);
    const data = {
      apiKey: formData.get('apiKey') as string,
      baseUrl: formData.get('baseUrl') as string || undefined,
      modelId: formData.get('modelId') as string,
    };

    if (!data.apiKey || !data.modelId) {
      toast({
        title: 'Missing Information',
        description: 'API Key and Model ID are required.',
        variant: 'destructive',
      });
      setLoading(false);
      return;
    }

    const result = await saveCustomAiSettingsAction(data);
    if (result.success) {
      toast({
        title: 'Settings Saved',
        description: 'Your custom AI model configuration has been updated.',
      });
      onOpenChange(false);
    } else {
      toast({
        title: 'Save Failed',
        description: 'Failed to update custom model settings.',
        variant: 'destructive',
      });
    }
    setLoading(false);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="sm:max-w-[425px]">
        <DialogHeader>
          <DialogTitle className="font-headline">Custom AI Model Settings</DialogTitle>
          <DialogDescription>
            Configure an OpenAI-compatible provider (ChatGPT, Qwen, DeepSeek, etc.).
          </DialogDescription>
        </DialogHeader>
        <form onSubmit={handleSave} className="space-y-4 py-4">
          <div className="space-y-2">
            <Label htmlFor="modelId" className="flex items-center gap-2">
              <Cpu className="h-4 w-4" />
              Model ID
            </Label>
            <Input 
              id="modelId" 
              name="modelId" 
              placeholder="e.g., gpt-4o, qwen-max, deepseek-chat" 
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="apiKey" className="flex items-center gap-2">
              <Key className="h-4 w-4" />
              API Key
            </Label>
            <Input 
              id="apiKey" 
              name="apiKey" 
              type="password" 
              placeholder="Enter your API Key" 
              required
            />
          </div>
          <div className="space-y-2">
            <Label htmlFor="baseUrl" className="flex items-center gap-2">
              <Globe className="h-4 w-4" />
              Base URL (Optional)
            </Label>
            <Input 
              id="baseUrl" 
              name="baseUrl" 
              placeholder="e.g., https://api.openai.com/v1" 
            />
            <p className="text-[10px] text-muted-foreground italic">
              Leave blank for standard OpenAI. Required for Qwen/DeepSeek/etc.
            </p>
          </div>
          <DialogFooter className="pt-4">
            <Button type="submit" disabled={loading} className="w-full">
              {loading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              Save Configuration
            </Button>
          </DialogFooter>
        </form>
      </DialogContent>
    </Dialog>
  );
}
