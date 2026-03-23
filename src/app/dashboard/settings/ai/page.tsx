'use client';

import { useState, useEffect } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Label } from '@/components/ui/label';
import { useToast } from '@/hooks/use-toast';
import { Loader2, Plus, Trash2, Key, Globe, Cpu, Bot, ChevronLeft, Save, Sparkles, ShieldCheck } from 'lucide-react';
import { useUser, useFirestore, useCollection, useMemoFirebase, addDocumentNonBlocking, deleteDocumentNonBlocking, setDocumentNonBlocking, useDoc } from '@/firebase';
import { collection, query, orderBy, doc } from 'firebase/firestore';
import Link from 'next/link';
import { cn } from '@/lib/utils';

export default function AISettingsPage() {
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  
  const [isAdding, setIsAdding] = useState(false);
  const [loading, setLoading] = useState(false);
  const [geminiLoading, setGeminiLoading] = useState(false);
  const [defaultModelLoading, setDefaultModelLoading] = useState(false);

  // Custom Model Form State
  const [name, setName] = useState('');
  const [modelId, setModelId] = useState('');
  const [apiKey, setApiKey] = useState('');
  const [baseUrl, setBaseUrl] = useState('');

  // Gemini Override State
  const [geminiKey, setGeminiKey] = useState('');
  const [defaultModel, setDefaultModel] = useState('googleai/gemini-3.1-flash-lite-preview');

  const modelsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'users', user.uid, 'aiModelConfigs'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const geminiConfigRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return doc(firestore, 'users', user.uid, 'settings', 'gemini');
  }, [firestore, user?.uid]);

  const { data: models, isLoading } = useCollection(modelsQuery);
  const { data: geminiSettings } = useDoc(geminiConfigRef);

  useEffect(() => {
    if (geminiSettings?.apiKey) {
      setGeminiKey(geminiSettings.apiKey);
    }
  }, [geminiSettings]);

  // Load default model from cookies on mount
  useEffect(() => {
    const loadDefaultModel = () => {
      try {
        // 在客户端使用document.cookie读取cookies
        const cookieString = document.cookie;
        const cookies = cookieString.split('; ');
        for (const cookie of cookies) {
          const [name, value] = cookie.split('=');
          if (name === 'preferred-ai-model') {
            setDefaultModel(decodeURIComponent(value));
            break;
          }
        }
      } catch (e) {
        console.error('Error loading default model:', e);
      }
    };
    loadDefaultModel();
  }, []);

  const handleSetDefaultModel = async (model: string) => {
    setDefaultModelLoading(true);
    try {
      const { setSelectedModelAction } = await import('@/app/actions');
      const result = await setSelectedModelAction(model);
      if (result.success) {
        setDefaultModel(model);
        toast({ title: '默认模型已更新', description: '新的默认模型已应用。' });
      } else {
        toast({ title: '更新失败', variant: 'destructive' });
      }
    } catch (e) {
      toast({ title: '更新失败', variant: 'destructive' });
    } finally {
      setDefaultModelLoading(false);
    }
  };

  const handleSaveGeminiKey = async () => {
    if (!user || !firestore) return;
    setGeminiLoading(true);
    try {
      const ref = doc(firestore, 'users', user.uid, 'settings', 'gemini');
      setDocumentNonBlocking(ref, { 
        apiKey: geminiKey,
        updatedAt: new Date().toISOString()
      }, { merge: true });

      // 自动同步到cookies
      const { syncGeminiKeyToCookieAction } = await import('@/app/actions');
      await syncGeminiKeyToCookieAction(geminiKey);

      toast({ title: 'Gemini 设置已保存', description: '科研流将优先使用您的私有 API Key。' });
    } catch (e) {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setGeminiLoading(false);
    }
  };

  const handleAddModel = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!user || !firestore) return;

    if (!name || !modelId || !apiKey) {
      toast({ title: '信息不完整', description: '名称、模型 ID 和 API Key 为必填项。', variant: 'destructive' });
      return;
    }

    setLoading(true);
    try {
      const modelsRef = collection(firestore, 'users', user.uid, 'aiModelConfigs');
      await addDocumentNonBlocking(modelsRef, {
        name,
        modelId,
        apiKey,
        baseUrl: baseUrl || 'https://api.openai.com/v1',
        createdAt: new Date().toISOString(),
      });

      // 自动同步到cookies
      const { saveCustomAiSettingsAction } = await import('@/app/actions');
      await saveCustomAiSettingsAction({
        apiKey,
        baseUrl: baseUrl || 'https://api.openai.com/v1',
        modelId
      });

      toast({ title: '配置已添加', description: `"${name}" 现已在模型列表中可用。` });
      setIsAdding(false);
      setName('');
      setModelId('');
      setApiKey('');
      setBaseUrl('');
    } catch (e) {
      toast({ title: '保存失败', variant: 'destructive' });
    } finally {
      setLoading(false);
    }
  };

  const handleDelete = (id: string) => {
    if (!user || !firestore) return;
    const modelRef = doc(firestore, 'users', user.uid, 'aiModelConfigs', id);
    deleteDocumentNonBlocking(modelRef);
    toast({ title: '配置已移除' });
  };

  const formatApiKey = (key: string) => {
    if (!key || key.length <= 8) return '••••••••';
    return `${key.slice(0, 4)}••••${key.slice(-4)}`;
  };

  return (
    <div className="max-w-5xl mx-auto space-y-8 pb-20 animate-in fade-in duration-500">
      <div className="flex items-center gap-4 border-b pb-6">
        <Button variant="ghost" size="icon" asChild className="rounded-full">
          <Link href="/dashboard">
            <ChevronLeft className="h-5 w-5" />
          </Link>
        </Button>
        <div className="flex flex-col gap-1">
          <h1 className="font-headline text-4xl font-bold tracking-tight">AI 模型库</h1>
          <p className="text-muted-foreground text-sm">管理您的 API 访问点和科研推理设置。</p>
        </div>
      </div>

      <div className="grid gap-8 lg:grid-cols-[1fr_350px]">
        <div className="space-y-8">
          {/* Gemini 设置卡片 */}
          <Card className="border-2 border-indigo-100 dark:border-indigo-900/30 overflow-hidden">
            <CardHeader className="bg-indigo-50/50 dark:bg-indigo-900/10">
              <div className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-indigo-600" />
                <CardTitle className="font-headline text-xl">Gemini 原生设置</CardTitle>
              </div>
              <CardDescription>配置您的私有 Gemini API Key 以解锁更稳定的科研流体验。</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-2">
                <Label className="text-xs font-bold uppercase text-muted-foreground flex items-center gap-2">
                  <Key className="h-3 w-3" /> Gemini API Key
                </Label>
                <div className="flex gap-2">
                  <Input 
                    type="password" 
                    placeholder="AIza..." 
                    value={geminiKey} 
                    onChange={(e) => setGeminiKey(e.target.value)} 
                    className="font-mono text-sm"
                  />
                  <Button onClick={handleSaveGeminiKey} disabled={geminiLoading} className="bg-indigo-600 hover:bg-indigo-700">
                    {geminiLoading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Save className="h-4 w-4" />}
                  </Button>
                </div>
                <p className="text-[10px] text-muted-foreground italic">
                  * 留空将默认使用系统的共享额度。
                </p>
              </div>
            </CardContent>
          </Card>

          {/* 默认模型选择卡片 */}
          <Card className="border-2 border-primary/10 overflow-hidden">
            <CardHeader className="bg-primary/5">
              <div className="flex items-center gap-2">
                <Cpu className="h-5 w-5 text-primary" />
                <CardTitle className="font-headline text-xl">默认模型选择</CardTitle>
              </div>
              <CardDescription>选择您希望在整个应用中默认使用的AI模型。</CardDescription>
            </CardHeader>
            <CardContent className="pt-6 space-y-4">
              <div className="space-y-4">
                <div className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/30 transition-colors cursor-pointer" onClick={() => handleSetDefaultModel('googleai/gemini-3.1-flash-lite-preview')}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-indigo-100 dark:bg-indigo-900/30 rounded-lg">
                      <Sparkles className="h-5 w-5 text-indigo-600" />
                    </div>
                    <div>
                      <h3 className="font-medium">系统默认 (Gemini)</h3>
                      <p className="text-xs text-muted-foreground">googleai/gemini-3.1-flash-lite-preview</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {defaultModel === 'googleai/gemini-3.1-flash-lite-preview' && (
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                    )}
                    {defaultModelLoading && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
                <div className="flex items-center justify-between p-3 border rounded-lg hover:border-primary/30 transition-colors cursor-pointer" onClick={() => handleSetDefaultModel('custom/model')}>
                  <div className="flex items-center gap-3">
                    <div className="p-2 bg-primary/10 rounded-lg">
                      <Bot className="h-5 w-5 text-primary" />
                    </div>
                    <div>
                      <h3 className="font-medium">自定义模型</h3>
                      <p className="text-xs text-muted-foreground">使用您添加的OpenAI兼容模型</p>
                    </div>
                  </div>
                  <div className="flex items-center">
                    {defaultModel === 'custom/model' && (
                      <ShieldCheck className="h-5 w-5 text-green-600" />
                    )}
                    {defaultModelLoading && (
                      <Loader2 className="h-4 w-4 animate-spin text-muted-foreground" />
                    )}
                  </div>
                </div>
              </div>
            </CardContent>
          </Card>

          {/* 自定义模型列表 */}
          <div className="space-y-6">
            <div className="flex items-center justify-between">
              <h2 className="text-xl font-bold font-headline flex items-center gap-2">
                <Bot className="h-5 w-5 text-primary" />
                已保存的配置
              </h2>
              <Button onClick={() => setIsAdding(!isAdding)} variant={isAdding ? "secondary" : "default"} size="sm" className="gap-2">
                {isAdding ? <><Loader2 className="h-4 w-4" /> 取消</> : <><Plus className="h-4 w-4" /> 添加新模型</>}
              </Button>
            </div>

            {isLoading ? (
              <div className="space-y-4">
                <div className="h-32 bg-muted animate-pulse rounded-xl" />
                <div className="h-32 bg-muted animate-pulse rounded-xl" />
              </div>
            ) : models && models.length > 0 ? (
              <div className="grid gap-4">
                {models.map((model: any) => (
                  <Card key={model.id} className="border-2 hover:border-primary/20 transition-all group overflow-hidden">
                    <CardHeader className="flex flex-row items-center justify-between pb-2">
                      <div className="space-y-1">
                        <CardTitle className="font-headline text-lg">{model.name}</CardTitle>
                        <CardDescription className="font-mono text-[10px] uppercase tracking-wider">{model.modelId}</CardDescription>
                      </div>
                      <Button 
                        variant="ghost" 
                        size="icon" 
                        className="text-muted-foreground hover:text-destructive"
                        onClick={() => handleDelete(model.id)}
                      >
                        <Trash2 className="h-4 w-4" />
                      </Button>
                    </CardHeader>
                    <CardContent className="grid grid-cols-2 gap-4 pt-2">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Globe className="h-3.5 w-3.5" />
                        <span className="truncate">{model.baseUrl}</span>
                      </div>
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <Key className="h-3.5 w-3.5" />
                        <span>{formatApiKey(model.apiKey)}</span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>
            ) : (
              <div className="flex flex-col items-center justify-center py-20 border-2 border-dashed rounded-2xl bg-muted/5">
                <Bot className="h-12 w-12 text-muted-foreground/30 mb-4" />
                <p className="text-muted-foreground font-medium">尚未添加自定义模型。</p>
              </div>
            )}
          </div>
        </div>

        {isAdding && (
          <div className="space-y-6 animate-in slide-in-from-right-4 duration-300">
            <Card className="border-2 shadow-xl sticky top-24">
              <CardHeader className="bg-primary/5 border-b">
                <CardTitle className="font-headline text-xl">新配置</CardTitle>
                <CardDescription>支持 OpenAI 兼容格式 (ChatGPT, Qwen, DeepSeek 等)。</CardDescription>
              </CardHeader>
              <form onSubmit={handleAddModel}>
                <CardContent className="space-y-4 pt-6">
                  <div className="space-y-2">
                    <Label htmlFor="name" className="text-[10px] font-bold uppercase text-muted-foreground">显示名称</Label>
                    <Input id="name" placeholder="例如：我的 DeepSeek" value={name} onChange={(e) => setName(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="modelId" className="text-[10px] font-bold uppercase text-muted-foreground">模型 ID</Label>
                    <Input id="modelId" placeholder="例如：deepseek-chat" value={modelId} onChange={(e) => setModelId(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="apiKey" className="text-[10px] font-bold uppercase text-muted-foreground">API Key</Label>
                    <Input id="apiKey" type="password" placeholder="sk-..." value={apiKey} onChange={(e) => setApiKey(e.target.value)} required />
                  </div>
                  <div className="space-y-2">
                    <Label htmlFor="baseUrl" className="text-[10px] font-bold uppercase text-muted-foreground">Base URL</Label>
                    <Input id="baseUrl" placeholder="https://api.openai.com/v1" value={baseUrl} onChange={(e) => setBaseUrl(e.target.value)} />
                  </div>
                </CardContent>
                <CardFooter className="border-t bg-muted/5 pt-4">
                  <Button type="submit" className="w-full shadow-lg" disabled={loading}>
                    {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Save className="h-4 w-4 mr-2" />}
                    保存配置
                  </Button>
                </CardFooter>
              </form>
            </Card>
          </div>
        )}
      </div>
    </div>
  );
}
