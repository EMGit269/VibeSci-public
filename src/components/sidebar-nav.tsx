'use client';
import { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Sparkles, LayoutGrid, Network, Folder, History, Copy, Trash2, Loader2 } from 'lucide-react';
import { 
  SidebarMenu, 
  SidebarMenuItem, 
  SidebarMenuButton,
} from '@/components/ui/sidebar';
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from '@/components/ui/alert-dialog';
import type { Project } from '@/lib/types';
import { cn } from '@/lib/utils';
import { Button } from '@/components/ui/button';
import { CreateProjectDialog } from '@/components/create-project-dialog';
import { useUser, useFirestore, deleteDocumentNonBlocking, addDocumentNonBlocking } from '@/firebase';
import { doc, collection } from 'firebase/firestore';
import { useToast } from '@/hooks/use-toast';

interface SidebarNavProps {
  projects: Project[];
}

export function SidebarNav({ projects }: SidebarNavProps) {
    const pathname = usePathname();
    const router = useRouter();
    const { user } = useUser();
    const firestore = useFirestore();
    const { toast } = useToast();
    const searchParams = useSearchParams();
    const [mounted, setMounted] = useState(false);
    
    // 状态管理：当前待删除的项目
    const [projectToDelete, setProjectToDelete] = useState<Project | null>(null);
    const [isDeleting, setIsDeleting] = useState(false);

    useEffect(() => {
        setMounted(true);
    }, []);

    // 核心修复：当弹窗关闭时，显式恢复页面的交互权限
    useEffect(() => {
        if (!projectToDelete) {
            const timer = setTimeout(() => {
                document.body.style.pointerEvents = 'auto';
                document.documentElement.style.pointerEvents = 'auto';
            }, 100);
            return () => clearTimeout(timer);
        }
    }, [projectToDelete]);

    if (!mounted) return null;

    const isChatActive = pathname.startsWith('/dashboard/chat');
    const isHistoryOpen = searchParams.get('history') === 'true';

    const toggleHistory = (e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        
        const params = new URLSearchParams(searchParams.toString());
        if (isHistoryOpen) {
            params.delete('history');
        } else {
            params.set('history', 'true');
        }
        
        router.push(`/dashboard/chat?${params.toString()}`);
    };

    const handleCopyProject = async (project: Project, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        if (!user || !firestore) return;
        
        try {
            const projectsRef = collection(firestore, 'users', user.uid, 'projects');
            await addDocumentNonBlocking(projectsRef, {
                name: `${project.name} (Copy)`,
                description: project.description,
                planningMarkdown: project.planningMarkdown || "",
                createdAt: new Date().toISOString(),
            });
            toast({ title: "项目已复制", description: `已创建 "${project.name}" 的副本。` });
        } catch (e) {
            toast({ title: "复制失败", variant: "destructive" });
        }
    };

    const handleDeleteClick = (project: Project, e: React.MouseEvent) => {
        e.preventDefault();
        e.stopPropagation();
        setProjectToDelete(project);
    };

    const handleDeleteConfirm = async () => {
        if (!user || !firestore || !projectToDelete) return;
        
        setIsDeleting(true);
        try {
            const projectId = projectToDelete.id;
            const projectRef = doc(firestore, 'users', user.uid, 'projects', projectId);
            
            // 先尝试重定向，避免 404
            if (pathname.includes(projectId)) {
                router.push('/dashboard');
            }

            deleteDocumentNonBlocking(projectRef);
            toast({ title: "项目已删除", description: "该科研项目已被永久移除。" });
            
            setProjectToDelete(null);
        } catch (e) {
            toast({ title: "删除失败", variant: "destructive" });
        } finally {
            setIsDeleting(false);
        }
    };

    return (
        <div className="space-y-6">
            <SidebarMenu className="px-3 gap-2 group-data-[collapsible=icon]:px-1 group-data-[collapsible=icon]:gap-2 transition-all">
                {/* 小塞 (Sai) */}
                <SidebarMenuItem>
                    <div className="relative group/sai">
                      <SidebarMenuButton 
                        asChild 
                        isActive={isChatActive} 
                        tooltip="小塞 >_o" 
                        className={cn(
                          "h-10 transition-all duration-300 px-3 rounded-lg group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!size-10",
                          isChatActive 
                            ? "bg-gradient-to-r from-[#5F6AD1] to-[#C181F9] text-white font-bold hover:opacity-90 pr-10 group-data-[collapsible=icon]:pr-0" 
                            : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                        )}
                      >
                          <Link href="/dashboard/chat" prefetch={false} className="flex flex-row items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                              <Sparkles className={cn("shrink-0 h-4 w-4", isChatActive ? "text-white" : "text-indigo-600 dark:text-indigo-400")} />
                              <span className="text-sm ml-3 group-data-[collapsible=icon]:hidden">小塞 {">_o"}</span>
                          </Link>
                      </SidebarMenuButton>
                      
                      <div className="absolute right-3 top-1/2 -translate-y-1/2 flex items-center gap-1 group-data-[collapsible=icon]:hidden">
                         <Button
                           variant="ghost"
                           size="icon"
                           onClick={toggleHistory}
                           className={cn(
                             "h-6 w-6 rounded-md flex items-center justify-center transition-colors hover:bg-white/20",
                             isChatActive ? (isHistoryOpen ? "bg-white/30 text-white" : "text-white/80") : "text-slate-300 dark:text-slate-500 hover:text-indigo-600 dark:hover:text-indigo-400"
                           )}
                         >
                            <History className="h-3.5 w-3.5" />
                         </Button>
                      </div>
                    </div>
                </SidebarMenuItem>

                {/* Dashboard */}
                <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === '/dashboard'} 
                      tooltip="Dashboard"
                      className={cn(
                        "h-10 px-3 transition-all duration-200 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!size-10",
                        pathname === '/dashboard' ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      )}
                    >
                        <Link href="/dashboard" prefetch={false} className="flex flex-row items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                            <LayoutGrid className="shrink-0 h-4 w-4" />
                            <span className="text-sm ml-3 group-data-[collapsible=icon]:hidden">Dashboard</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>

                {/* 知识图谱 */}
                <SidebarMenuItem>
                    <SidebarMenuButton 
                      asChild 
                      isActive={pathname === '/dashboard/knowledge'} 
                      tooltip="知识图谱"
                      className={cn(
                        "h-10 px-3 transition-all duration-200 group-data-[collapsible=icon]:px-0 group-data-[collapsible=icon]:!p-0 group-data-[collapsible=icon]:!size-10",
                        pathname === '/dashboard/knowledge' ? "bg-slate-100 dark:bg-slate-800 text-slate-900 dark:text-slate-50 font-bold" : "hover:bg-slate-100 dark:hover:bg-slate-800 text-slate-600 dark:text-slate-300"
                      )}
                    >
                        <Link href="/dashboard/knowledge" prefetch={false} className="flex flex-row items-center group-data-[collapsible=icon]:justify-center group-data-[collapsible=icon]:gap-0">
                            <Network className="shrink-0 h-4 w-4" />
                            <span className="text-sm ml-3 group-data-[collapsible=icon]:hidden">知识图谱</span>
                        </Link>
                    </SidebarMenuButton>
                </SidebarMenuItem>
            </SidebarMenu>

            {/* 我的项目 */}
            <div className="group-data-[collapsible=icon]:hidden">
                <div className="px-6 py-2 flex items-center justify-between">
                  <h2 className="text-xs uppercase font-bold text-slate-400 dark:text-slate-500 tracking-widest">
                    我的项目
                  </h2>
                  <CreateProjectDialog variant="icon" />
                </div>

                <SidebarMenu className="px-3 gap-1 transition-all">
                    {projects.map((project) => (
                      <SidebarMenuItem key={project.id} className="group/project relative">
                        <SidebarMenuButton 
                          asChild 
                          isActive={pathname.includes(project.id)} 
                          tooltip={project.name}
                          className={cn(
                            "h-9 px-3 transition-all pr-16",
                            pathname.includes(project.id) 
                              ? "bg-indigo-50 dark:bg-indigo-900/20 text-indigo-600 dark:text-indigo-400" 
                              : "text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800"
                          )}
                        >
                          <Link href={`/dashboard/project/${project.id}`} className="flex items-center">
                            <Folder className="shrink-0 h-4 w-4 text-indigo-400 dark:text-indigo-500" />
                            <span className="text-xs ml-3 truncate">{project.name}</span>
                          </Link>
                        </SidebarMenuButton>
                        
                        {/* 悬停显示的直接操作按钮：复制 & 删除 */}
                        <div className="absolute right-2 top-1/2 -translate-y-1/2 flex items-center gap-0.5 opacity-0 group-hover/project:opacity-100 transition-all">
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-slate-400 hover:text-indigo-600 hover:bg-white dark:hover:bg-slate-700"
                                onClick={(e) => handleCopyProject(project, e)}
                                title="复制项目"
                            >
                                <Copy className="h-3.5 w-3.5" />
                            </Button>
                            <Button 
                                variant="ghost" 
                                size="icon" 
                                className="h-7 w-7 text-slate-400 hover:text-destructive hover:bg-white dark:hover:bg-slate-700"
                                onClick={(e) => handleDeleteClick(project, e)}
                                title="删除项目"
                            >
                                <Trash2 className="h-3.5 w-3.5" />
                            </Button>
                        </div>
                      </SidebarMenuItem>
                    ))}
                    
                    {projects.length === 0 && (
                      <SidebarMenuItem className="px-3 py-4 text-center">
                        <p className="text-[10px] text-slate-400 dark:text-slate-500 italic">暂无活跃项目</p>
                      </SidebarMenuItem>
                    )}
                </SidebarMenu>
            </div>

            {/* 统一的删除确认弹窗（放在循环外，避免多次实例化） */}
            <AlertDialog 
                open={!!projectToDelete} 
                onOpenChange={(open) => !open && !isDeleting && setProjectToDelete(null)}
            >
                <AlertDialogContent>
                    <AlertDialogHeader>
                        <AlertDialogTitle>确认删除该项目？</AlertDialogTitle>
                        <AlertDialogDescription>
                            此操作将永久移除项目 <strong>"{projectToDelete?.name}"</strong> 及其包含的所有任务和研究数据。该过程无法撤销。
                        </AlertDialogDescription>
                    </AlertDialogHeader>
                    <AlertDialogFooter>
                        <AlertDialogCancel disabled={isDeleting}>取消</AlertDialogCancel>
                        <AlertDialogAction 
                            onClick={(e) => {
                                e.preventDefault();
                                handleDeleteConfirm();
                            }}
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            disabled={isDeleting}
                        >
                            {isDeleting ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
                            确认删除
                        </AlertDialogAction>
                    </AlertDialogFooter>
                </AlertDialogContent>
            </AlertDialog>
        </div>
    );
}
