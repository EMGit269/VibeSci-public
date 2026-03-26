import { z } from 'zod';
import { initializeFirebaseServer } from '@/firebase/server';
import { collection, addDoc } from 'firebase/firestore';

// 项目创建输入模式
export const ProjectCreationInputSchema = z.object({
  projectName: z.string().min(1, '项目名称不能为空'),
  projectDescription: z.string().min(1, '项目描述不能为空'),
  tasks: z.array(
    z.object({
      name: z.string().min(1, '任务名称不能为空'),
      problemDescription: z.string().min(1, '任务描述不能为空'),
      methods: z.array(
        z.object({
          name: z.string().min(1, '方法名称不能为空'),
          description: z.string().min(1, '方法描述不能为空'),
          codeSnippets: z.array(
            z.object({
              version: z.string().optional(),
              purpose: z.string().optional(),
              code: z.string().optional(),
              notesAndTradeoffs: z.string().optional()
            })
          ).optional()
        })
      ).optional()
    })
  ).optional()
});

// 项目创建输出模式
export const ProjectCreationOutputSchema = z.object({
  projectId: z.string(),
  projectName: z.string(),
  tasks: z.array(
    z.object({
      taskId: z.string(),
      taskName: z.string(),
      methods: z.array(
        z.object({
          methodId: z.string(),
          methodName: z.string()
        })
      )
    })
  )
});

export type ProjectCreationInput = z.infer<typeof ProjectCreationInputSchema>;
export type ProjectCreationOutput = z.infer<typeof ProjectCreationOutputSchema>;

// 项目创建Agent
export async function createProject(input: ProjectCreationInput): Promise<ProjectCreationOutput> {
  try {
    const { firestore } = await initializeFirebaseServer();
    
    // 1. 创建项目
    const projectsRef = collection(firestore, 'projects');
    const newProject = {
      name: input.projectName,
      description: input.projectDescription,
      createdAt: new Date().toISOString()
    };
    
    const projectDocRef = await addDoc(projectsRef, newProject);
    const projectId = projectDocRef.id;

    // 2. 创建任务和方法
    const tasks = [];

    if (input.tasks && input.tasks.length > 0) {
      for (const taskData of input.tasks) {
        // 创建任务
        const tasksRef = collection(firestore, 'tasks');
        const newTask = {
          projectId: projectId,
          name: taskData.name,
          problemDescription: taskData.problemDescription
        };
        
        const taskDocRef = await addDoc(tasksRef, newTask);
        const taskId = taskDocRef.id;
        
        const methods = [];
        
        if (taskData.methods && taskData.methods.length > 0) {
          for (const methodData of taskData.methods) {
            // 创建方法
            const methodsRef = collection(firestore, 'methods');
            const newMethod = {
              taskId: taskId,
              name: methodData.name,
              description: methodData.description
            };
            
            const methodDocRef = await addDoc(methodsRef, newMethod);
            methods.push({
              methodId: methodDocRef.id,
              methodName: methodData.name,
            });
          }
        }

        tasks.push({
          taskId: taskId,
          taskName: taskData.name,
          methods: methods,
        });
      }
    }

    return {
      projectId: projectId,
      projectName: input.projectName,
      tasks: tasks,
    };
  } catch (error) {
    console.error('项目创建失败:', error);
    throw new Error('项目创建失败，请检查输入参数和网络连接');
  }
}
