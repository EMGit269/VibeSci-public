'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { FlaskConical, Loader2, Settings, ChevronLeft, ChevronRight, LayoutGrid, User, LogOut, Monitor, Sparkles, Cpu, Zap } from 'lucide-react';
import { 
  SidebarProvider, 
  Sidebar, 
  SidebarHeader, 
  SidebarContent, 
  SidebarFooter,
  useSidebar
} from '@/components/ui/sidebar';
import { SidebarNav } from '@/components/sidebar-nav';
import { useUser, useFirestore, useCollection, useMemoFirebase, useAuth } from '@/firebase';
import { collection, query, orderBy } from 'firebase/firestore';
import type { Project } from '@/lib/types';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue, SelectGroup, SelectLabel } from '@/components/ui/select';
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
  DropdownMenuPortal
} from '@/components/ui/dropdown-menu';
import { Avatar, AvatarFallback, AvatarImage } from '@/components/ui/avatar';
import { useTheme } from 'next-themes';
import { signOut } from 'firebase/auth';
import { useToast } from '@/hooks/use-toast';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { setSelectedModelAction, saveCustomAiSettingsAction } from '@/app/actions';

const AVATAR_MAP: Record<string, string> = {
  '>_o': 'bg-gradient-to-br from-blue-600 to-indigo-600',
  'o_o': 'bg-gradient-to-br from-emerald-600 to-teal-600',
  '^__^': 'bg-gradient-to-br from-amber-600 to-orange-600',
  '*_*': 'bg-gradient-to-br from-purple-600 to-pink-600',
  '-_-': 'bg-gradient-to-br from-slate-600 to-gray-600',
};

function DashboardHeader() {
  const router = useRouter();
  const { toggleSidebar } = useSidebar();
  const { user } = useUser();
  const firestore = useFirestore();
  const { toast } = useToast();
  const [currentModel, setCurrentModel] = useState('googleai/gemini-3.1-flash-lite-preview');

  const modelsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'users', user.uid, 'aiModelConfigs'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: customModels } = useCollection(modelsQuery);

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
        toast({ title: '模型已切换', description: `当前使用：${config.name}` });
      }
    } else {
      await setSelectedModelAction(value);
      toast({
        title: '模型已切换',
        description: `当前使用 ${value.split('/').pop()}`,
      });
    }
  };

  return (
    <header className="sticky top-0 z-40 w-full border-b bg-card">
      <div className="flex items-center h-14 px-6 gap-4">
         <div className="flex items-center gap-2">
            <Button 
              variant="ghost" 
              size="icon" 
              className="h-8 w-8 text-slate-400 hover:text-indigo-600 transition-all active:scale-90"
              onClick={() => toggleSidebar()}
            >
              <LayoutGrid className="h-4 w-4" />
            </Button>
            <div className="flex items-center gap-1 ml-2">
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-slate-300 hover:text-indigo-600 transition-colors"
                onClick={() => router.back()}
              >
                <ChevronLeft className="h-4 w-4" />
              </Button>
              <Button 
                variant="ghost" 
                size="icon" 
                className="h-7 w-7 text-slate-300 hover:text-indigo-600 transition-colors"
                onClick={() => router.forward()}
              >
                <ChevronRight className="h-4 w-4" />
              </Button>
            </div>
         </div>
         
         <div className="flex-1" />

         <div className="flex items-center gap-4">
            <Select value={currentModel} onValueChange={handleModelChange}>
              <SelectTrigger className="h-8 w-[240px] text-[10px] border-slate-200 dark:border-slate-800 bg-background">
                <SelectValue placeholder="选择 AI 模型" />
              </SelectTrigger>
              <SelectContent>
                <SelectGroup>
                  <SelectLabel className="text-[9px] uppercase font-bold text-muted-foreground px-2 py-1 flex items-center gap-1">
                    <Sparkles className="h-3 w-3" /> 内置模型
                  </SelectLabel>
                  <SelectItem value="googleai/gemini-3.1-flash-lite-preview">Gemini 3.1 Flash Lite</SelectItem>
                  <SelectItem value="googleai/gemini-2.5-flash">Gemini 2.5 Flash</SelectItem>
                </SelectGroup>

                <SelectGroup>
                  <SelectLabel className="text-[9px] uppercase font-bold text-muted-foreground px-2 py-1 border-t mt-1 flex items-center gap-1">
                    <Zap className="h-3 w-3 text-blue-500" /> DeepSeek (Native)
                  </SelectLabel>
                  <SelectItem value="deepseek/deepseek-chat">DeepSeek Chat (V3)</SelectItem>
                  <SelectItem value="deepseek/deepseek-reasoner">DeepSeek Reasoner (R1)</SelectItem>
                </SelectGroup>
                
                {customModels && customModels.length > 0 && (
                  <SelectGroup>
                    <SelectLabel className="text-[9px] uppercase font-bold text-muted-foreground px-2 py-1 border-t mt-1 flex items-center gap-1">
                      <Cpu className="h-3 w-3" /> 您的模型库
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
            <Button variant="ghost" size="icon" className="h-8 w-8" asChild>
              <Link href="/dashboard/settings/ai">
                <Settings className="h-4 w-4 text-slate-400 hover:text-indigo-600 transition-colors" />
              </Link>
            </Button>
         </div>
      </div>
    </header>
  );
}

export default function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const { user, isUserLoading } = useUser();
  const auth = useAuth();
  const firestore = useFirestore();
  const router = useRouter();
  const { setTheme } = useTheme();
  const { toast } = useToast();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  const projectsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects'),
      orderBy('createdAt', 'desc')
    );
  }, [firestore, user?.uid]);

  const { data: projects } = useCollection<Project>(projectsQuery);

  useEffect(() => {
    if (!isUserLoading && !user) {
      router.push('/login');
    }
  }, [user, isUserLoading, router]);

  const handleLogout = async () => {
    try {
      await signOut(auth);
      router.push('/login');
      toast({ title: 'Logged out' });
    } catch (error) {
      toast({ title: 'Logout failed', variant: 'destructive' });
    }
  };

  if (isUserLoading || !user) {
    return (
      <div className="flex h-screen w-screen items-center justify-center bg-background">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  return (
    <SidebarProvider>
      <div className="flex h-screen w-full overflow-hidden bg-slate-50 dark:bg-slate-950/50">
        <Sidebar className="border-r z-50 bg-white dark:bg-zinc-950" collapsible="icon">
          <SidebarHeader className="px-1 py-4 transition-all">
            <Link 
              className="flex flex-row items-center gap-2 font-bold text-indigo-600 p-2 rounded-xl bg-indigo-50/30 dark:bg-indigo-900/10 hover:bg-indigo-50 dark:hover:bg-indigo-900/20 transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:gap-0" 
              href="/dashboard"
            >
              <FlaskConical className="h-6 w-6 shrink-0" />
              <span className='group-data-[collapsible=icon]:hidden text-xl tracking-tight font-headline'>VibeSci</span>
            </Link>
          </SidebarHeader>
          <SidebarContent className="py-2">
            <SidebarNav projects={projects || []} />
          </SidebarContent>
          <SidebarFooter className="px-1 py-4 border-t transition-all">
             {mounted && (
               <DropdownMenu>
                 <DropdownMenuTrigger asChild>
                   <button className="flex flex-row items-center gap-3 w-full p-2 rounded-xl hover:bg-slate-100 dark:hover:bg-slate-800 transition-all group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:p-0 group-data-[collapsible=icon]:h-10 group-data-[collapsible=icon]:gap-0">
                     <Avatar className="h-8 w-8 border shrink-0">
                       {user.photoURL && user.photoURL.startsWith('http') ? (
                         <AvatarImage src={user.photoURL} alt={user.displayName || 'User'} />
                       ) : (
                         <AvatarFallback className={cn(
                           "text-white text-[10px] font-bold flex items-center justify-center",
                           user.photoURL && AVATAR_MAP[user.photoURL] ? AVATAR_MAP[user.photoURL] : "bg-primary/10 text-primary"
                         )}>
                           {user.photoURL && !user.photoURL.startsWith('http') ? user.photoURL : <User className="h-4 w-4" />}
                         </AvatarFallback>
                       )}
                     </Avatar>
                     <div className="flex-1 text-left group-data-[collapsible=icon]:hidden overflow-hidden">
                       <p className="text-xs font-bold truncate">{user.displayName || 'Researcher'}</p>
                       <p className="text-[10px] text-muted-foreground truncate">{user.email}</p>
                     </div>
                   </button>
                 </DropdownMenuTrigger>
                 <DropdownMenuContent align="end" side="right" className="w-56 mb-4">
                   <DropdownMenuLabel>My Account</DropdownMenuLabel>
                   <DropdownMenuSeparator />
                   <DropdownMenuItem asChild>
                     <Link href="/dashboard/profile" className="cursor-pointer flex items-center gap-2">
                       <User className="h-4 w-4" />
                       <span>Profile Settings</span>
                     </Link>
                   </DropdownMenuItem>
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
             )}
          </SidebarFooter>
        </Sidebar>

        <div className="flex flex-1 flex-col relative overflow-hidden">
          <DashboardHeader />
          <main className="flex-1 overflow-y-auto p-8 lg:p-12">
            {children}
          </main>
        </div>
      </div>
    </SidebarProvider>
  );
}
