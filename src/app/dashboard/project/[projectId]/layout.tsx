'use client';

import { use, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";
import { ProjectView } from "@/components/project-view";
import { useUser, useFirestore, useDoc, useMemoFirebase } from "@/firebase";
import { doc } from "firebase/firestore";
import { Loader2 } from "lucide-react";
import type { Project } from "@/lib/types";

/**
 * ProjectLayout - 项目级数据保护器
 * 实时监听当前项目。修复了“监听太敏感”导致的误跳仪表盘问题。
 */
export default function ProjectLayout({
    children,
    params,
}: {
    children: React.ReactNode
    params: Promise<{ projectId: string }>
}) {
    const { projectId } = use(params);
    const { user } = useUser();
    const firestore = useFirestore();
    const router = useRouter();
    const hasStartedLoading = useRef(false);

    const projectRef = useMemoFirebase(() => {
        if (!firestore || !user?.uid || !projectId) return null;
        return doc(firestore, 'users', user.uid, 'projects', projectId);
    }, [firestore, user?.uid, projectId]);

    const { data: project, isLoading, error } = useDoc<Project>(projectRef);

    // 追踪是否已经历过至少一次加载开始
    if (isLoading) {
        hasStartedLoading.current = true;
    }

    useEffect(() => {
        /**
         * 更加严谨的重定向逻辑：
         * 1. 必须不在加载中 (!isLoading)
         * 2. 且 project 明确为 null (表示文档不存在)
         * 3. 且之前已经尝试过加载 (hasStartedLoading.current)
         * 4. 且没有报错 (!error)
         */
        if (hasStartedLoading.current && !isLoading && project === null && !error && projectId) {
            router.push('/dashboard');
        }
    }, [project, isLoading, error, router, projectId]);

    if (isLoading && !project) {
        return (
            <div className="flex h-full items-center justify-center">
                <Loader2 className="h-8 w-8 animate-spin text-primary" />
            </div>
        );
    }

    if (!project && !isLoading) {
        return null; // 由 useEffect 处理重定向
    }

    return (
        <ProjectView project={project!}>
            {children}
        </ProjectView>
    );
}
