
'use client';

import { use } from 'react';
import { TaskView } from '@/components/task-view';
import { useUser, useFirestore, useDoc, useMemoFirebase, useCollection } from '@/firebase';
import { doc, collection, query, orderBy } from 'firebase/firestore';
import { Loader2 } from 'lucide-react';
import type { Task, Method } from '@/lib/types';

export default function TaskPage({ params }: { params: Promise<{ projectId: string, taskId: string }> }) {
  const { taskId, projectId } = use(params);
  const { user } = useUser();
  const firestore = useFirestore();

  const taskRef = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !projectId || !taskId) return null;
    return doc(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId);
  }, [firestore, user?.uid, projectId, taskId]);

  const { data: taskData, isLoading: isTaskLoading } = useDoc<Task>(taskRef);

  // Sub-collection listener for methods
  const methodsQuery = useMemoFirebase(() => {
    if (!firestore || !user?.uid || !projectId || !taskId) return null;
    return query(
      collection(firestore, 'users', user.uid, 'projects', projectId, 'tasks', taskId, 'methods')
    );
  }, [firestore, user?.uid, projectId, taskId]);

  const { data: methodsData, isLoading: isMethodsLoading } = useCollection<Method>(methodsQuery);

  if (isTaskLoading || isMethodsLoading) {
    return (
      <div className="flex flex-1 items-center justify-center h-64">
        <Loader2 className="h-8 w-8 animate-spin text-primary" />
      </div>
    );
  }

  if (!taskData) {
    return null; // Layout handles redirection if task/project is missing
  }

  // Combine task with its methods for the view
  const fullTask = {
    ...taskData,
    methods: methodsData || []
  };

  return <TaskView initialTask={fullTask} />;
}
