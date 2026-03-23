
'use client';

import { useState } from "react";
import { Project } from "@/lib/types";
import { Card, CardContent, CardDescription, CardHeader, CardTitle, CardFooter } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { FolderKanban, Trash2, Loader2 } from "lucide-react";
import Link from "next/link";
import { 
  ContextMenu, 
  ContextMenuContent, 
  ContextMenuItem, 
  ContextMenuTrigger 
} from "@/components/ui/context-menu";
import { 
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { useToast } from "@/hooks/use-toast";
import { useRouter, usePathname } from "next/navigation";
import { useUser, useFirestore, deleteDocumentNonBlocking } from "@/firebase";
import { doc } from "firebase/firestore";

/**
 * ProjectCardWrapper - 仪表盘项目卡片
 * 封装了右键删除逻辑和删除后的智能重定向。
 */
export function ProjectCardWrapper({ project }: { project: Project }) {
  const { toast } = useToast();
  const router = useRouter();
  const pathname = usePathname();
  const { user } = useUser();
  const firestore = useFirestore();
  const [loading, setLoading] = useState(false);
  const [showDeleteDialog, setShowDeleteDialog] = useState(false);

  const handleDelete = async () => {
    if (!user || !firestore) return;
    
    setLoading(true);
    try {
      // 替代方案：在删除前先执行跳转，防止 404
      if (pathname.includes(project.id)) {
        router.push('/dashboard');
      }

      const projectRef = doc(firestore, 'users', user.uid, 'projects', project.id);
      deleteDocumentNonBlocking(projectRef);
      
      toast({ title: "Project Deleted", description: `"${project.name}" has been removed.` });
      
      // 修复 Radix UI 可能导致的 pointer-events 锁定问题
      setTimeout(() => {
        document.body.style.pointerEvents = 'auto';
      }, 100);
      
      setShowDeleteDialog(false);
    } catch (e) {
      toast({ title: "Error", description: "Failed to delete project.", variant: "destructive" });
    } finally {
      setLoading(false);
    }
  };

  return (
    <>
      <ContextMenu>
        <ContextMenuTrigger>
          <Card className="relative group flex flex-col h-full border-2 hover:border-primary/20 transition-all duration-300">
            <CardHeader>
              <div className="flex items-start justify-between gap-4">
                <div className="space-y-1 flex-1 min-w-0">
                  <CardTitle className="font-headline text-xl truncate" title={project.name}>{project.name}</CardTitle>
                  <CardDescription>Research Project</CardDescription>
                </div>
                <FolderKanban className="h-8 w-8 text-muted-foreground shrink-0" />
              </div>
            </CardHeader>
            <CardContent className="flex-1">
              <p className="text-muted-foreground text-sm line-clamp-3 min-h-[60px]">{project.description}</p>
            </CardContent>
            <CardFooter className="pt-0 mt-auto border-t bg-muted/5 rounded-b-lg">
              <Button asChild size="sm" className="w-full mt-4">
                <Link href={`/dashboard/project/${project.id}`}>View Project</Link>
              </Button>
            </CardFooter>
          </Card>
        </ContextMenuTrigger>
        <ContextMenuContent className="w-48">
          <ContextMenuItem 
            onClick={() => setShowDeleteDialog(true)}
            className="text-destructive focus:text-destructive flex items-center gap-2"
          >
            <Trash2 className="h-4 w-4" />
            Delete Project
          </ContextMenuItem>
        </ContextMenuContent>
      </ContextMenu>

      <AlertDialog open={showDeleteDialog} onOpenChange={setShowDeleteDialog}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you absolutely sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete <strong>"{project.name}"</strong> and all its associated research data. This action cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel disabled={loading}>Cancel</AlertDialogCancel>
            <AlertDialogAction 
              onClick={(e) => {
                e.preventDefault();
                handleDelete();
              }}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
              disabled={loading}
            >
              {loading ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : <Trash2 className="h-4 w-4 mr-2" />}
              Delete Project
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </>
  );
}
