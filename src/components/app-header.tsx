
'use client';
import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
  DropdownMenuSub,
  DropdownMenuSubTrigger,
  DropdownMenuSubContent,
  DropdownMenuPortal,
} from '@/components/ui/dropdown-menu';
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
  SelectGroup,
  SelectLabel,
} from '@/components/ui/select';
import { Button } from './ui/button';
import { Avatar, AvatarFallback, AvatarImage } from './ui/avatar';
import { SidebarTrigger, useSidebar } from './ui/sidebar';
import { setSelectedModelAction, saveCustomAiSettingsAction } from '@/app/actions';
import { useToast } from '@/hooks/use-toast';
import { Bot, Settings, Moon, Sun, Monitor, Check, LogOut, User as UserIcon, Cpu, Sparkles, Zap } from 'lucide-react';
import { useTheme } from 'next-themes';
import { useAuth, useUser, useFirestore, useCollection, useMemoFirebase } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import { signOut } from 'firebase/auth';
import { cn } from '@/lib/utils';

const AVATAR_MAP: Record<string, string> = {
  '>_o': 'from-blue-600 to-indigo-600',
  'o_o': 'from-emerald-600 to-teal-600',
  '^__^': 'from-amber-600 to-orange-600',
  '*_*': 'from-purple-600 to-pink-600',
  '-_-': 'from-slate-600 to-gray-600',
};

export function AppHeader() {
  const [mounted, setMounted] = useState(false);
  const [currentModel, setCurrentModel] = useState('googleai/gemini-3.1-flash-lite-preview');
  const { toast } = useToast();
  const { setTheme, theme } = useTheme();
  const { user } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { state, isMobile } = useSidebar();

  const modelsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'users', user.uid, 'aiModelConfigs'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: customModels } = useCollection(modelsQuery);

  useEffect(() => {
    setMounted(true);
  }, []);

  const handleModelChange = async (value: string) => {
    setCurrentModel(value);
    
    if (value.startsWith('library/')) {
      const configId = value.split('/')[1];
      const config = (customModels || []).find((m: any) => m.id === configId);
      if (config) {
        await saveCustomAiSettingsAction({
          apiKey: config.apiKey,
          baseUrl: config.baseUrl,
          modelId: config.modelId
        });
        await setSelectedModelAction('custom/model');
        toast({ title: 'Model Switched', description: `Using library model: ${config.name}` });
      }
    } else {
      await setSelectedModelAction(value);
      toast({
        title: 'Model Switched',
        description: `Now using ${value.split('/').pop()}`,
      });
    }
  };

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
      toast({ title: 'Logged out' });
    } catch (error) {
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };

  const isSymbolAvatar = user?.photoURL && AVATAR_MAP[user.photoURL];
  const symbolGradient = isSymbolAvatar ? AVATAR_MAP[user!.photoURL!] : 'bg-primary/5';

  const leftClass = !mounted || isMobile 
    ? "left-0" 
    : (state === "collapsed" ? "left-[var(--sidebar-width-icon)]" : "left-[var(--sidebar-width)]");

  return (
    <header className={cn(
      "fixed top-0 right-0 z-30 flex h-14 items-center gap-4 border-b bg-card/95 backdrop-blur supports-[backdrop-filter]:bg-card/60 px-6 lg:h-[60px] transition-all duration-200",
      leftClass
    )}>
      <SidebarTrigger />
      
      <div className="w-full flex-1 flex items-center justify-end px-4 gap-4">
        {mounted && (
          <div className="flex items-center gap-2">
            <Bot className="h-4 w-4 text-muted-foreground" />
            <Select value={currentModel} onValueChange={handleModelChange}>
              <SelectTrigger className="w-[280px] h-9 border-none bg-muted/50 focus:ring-0 focus:outline-none text-xs">
                <SelectValue placeholder="Select AI Model" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1.5 flex items-center gap-1.5">
                    <Sparkles className="h-3 w-3" /> Built-in Models
                  </SelectLabel>
                  <SelectItem value="googleai/gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</SelectItem>
                  <SelectItem value="googleai/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1.5 border-t mt-1 flex items-center gap-1.5">
                    <Zap className="h-3 w-3 text-blue-500" /> DeepSeek (Native)
                  </SelectLabel>
                  <SelectItem value="deepseek/deepseek-chat">DeepSeek Chat (V3)</SelectItem>
                  <SelectItem value="deepseek/deepseek-reasoner">DeepSeek Reasoner (R1)</SelectItem>
                </SelectGroup>
                
                {customModels && customModels.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[10px] uppercase font-bold text-muted-foreground px-2 py-1.5 border-t mt-1 flex items-center gap-1.5">
                      <Cpu className="h-3 w-3" /> Your Library
                    </SelectLabel>
                    {customModels.map((m: any) => (
                      <SelectItem key={m.id} value={`library/${m.id}`}>
                        {m.name}
                      </SelectItem>
                    ))}
                  </SelectGroup>
                )}
              </SelectContent>
            </Select>
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-muted-foreground hover:text-primary transition-colors"
              asChild
            >
              <Link href="/dashboard/settings/ai">
                <Settings className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        )}
      </div>

      {mounted ? (
        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <Button variant="ghost" size="icon" className="rounded-full relative">
              <Avatar className="h-8 w-8 border">
                {user?.photoURL && user.photoURL.startsWith('http') && <AvatarImage src={user.photoURL} alt="User avatar" />}
                <AvatarFallback className={cn("text-white text-[8px] font-bold flex items-center justify-center", isSymbolAvatar ? cn("bg-gradient-to-br", symbolGradient) : "bg-primary/5 text-primary")}>
                  {user?.photoURL && !user.photoURL.startsWith('http') ? user.photoURL : <UserIcon className="h-4 w-4" />}
                </AvatarFallback>
              </Avatar>
            </Button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-64">
            <DropdownMenuLabel className="flex flex-col">
              <span className="font-bold">{user?.displayName || 'My Account'}</span>
              <span className="text-[10px] text-muted-foreground font-normal truncate">{user?.email || 'Anonymous'}</span>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/dashboard/profile" className="cursor-pointer">Profile Settings</Link>
            </DropdownMenuItem>
            <DropdownMenuItem asChild>
              <Link href="/dashboard/settings/ai" className="cursor-pointer">AI Model Library</Link>
            </DropdownMenuItem>
            <DropdownMenuSeparator />
            <DropdownMenuSub>
              <DropdownMenuSubTrigger className="flex items-center gap-2">
                <Monitor className="h-4 w-4" />
                <span>Theme</span>
              </DropdownMenuSubTrigger>
              <DropdownMenuPortal>
                <DropdownMenuSubContent>
                  <DropdownMenuItem onClick={() => setTheme("light")}>Light</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("dark")}>Dark</DropdownMenuItem>
                  <DropdownMenuItem onClick={() => setTheme("system")}>System</DropdownMenuItem>
                </DropdownMenuSubContent>
              </DropdownMenuPortal>
            </DropdownMenuSub>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={handleLogout} className="text-destructive focus:text-destructive gap-2 cursor-pointer">
              <LogOut className="h-4 w-4" />
              <span>Log Out</span>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      ) : (
        <div className="h-10 w-10 rounded-full bg-muted animate-pulse" />
      )}
    </header>
  );
}
