// In a real application, this would be a database.
// For this example, we're using a simple in-memory store.

import { initialProjectsData } from '@/lib/data';
import type { Project, Task, Method, CodeSnippet, ChatSession } from '@/lib/types';
import type { GenerateCodeForTaskMethodOutput } from '@/ai/flows/generate-code-for-task-method-flow';

let projects: Project[] = [...initialProjectsData];
let chatSessions: ChatSession[] = [];

// Helper to create a deep copy to prevent mutations from affecting the "database"
const deepCopy = <T>(data: T): T => JSON.parse(JSON.stringify(data));

// Helper to generate a unique ID with random suffix to avoid key collisions
const generateId = (prefix: string) => `${prefix}-${Date.now()}-${Math.floor(Math.random() * 1000000)}`;

export async function getProjects(): Promise<Project[]> {
  return Promise.resolve(deepCopy(projects));
}

export async function getProject(id: string): Promise<Project | undefined> {
  const project = projects.find(p => p.id === id);
  if (!project) return Promise.resolve(undefined);
  return Promise.resolve(deepCopy(project));
}

export async function addProject(projectData: Omit<Project, 'id' | 'tasks' | 'createdAt'>): Promise<Project> {
  const newProject: Project = {
    ...projectData,
    id: generateId('proj'),
    tasks: [],
    createdAt: new Date().toISOString(),
  };
  projects = [newProject, ...projects];
  return Promise.resolve(deepCopy(newProject));
}

export async function updateProjectPlanning(projectId: string, markdown: string): Promise<void> {
  projects = projects.map(p => {
    if (p.id === projectId) {
      return { ...p, planningMarkdown: markdown };
    }
    return p;
  });
  return Promise.resolve();
}

export async function deleteProject(projectId: string): Promise<void> {
  projects = projects.filter(p => p.id !== projectId);
  return Promise.resolve();
}

export async function getTask(taskId: string, projectId?: string): Promise<Task | undefined> {
    if (projectId) {
        const project = projects.find(p => p.id === projectId);
        if (project) {
            const task = project.tasks.find(t => t.id === taskId);
            if (task) {
                return Promise.resolve(deepCopy(task));
            }
        }
        return Promise.resolve(undefined);
    }
    
    for (const project of projects) {
        const task = project.tasks.find(t => t.id === taskId);
        if (task) {
            return Promise.resolve(deepCopy(task));
        }
    }
    return Promise.resolve(undefined);
}

export async function addTask(projectId: string, taskData: Omit<Task, 'id' | 'methods' | 'createdAt' | 'projectId'>): Promise<Task> {
  const newTask: Task = {
    ...taskData,
    id: generateId('task'),
    projectId: projectId,
    methods: [],
    createdAt: new Date().toISOString(),
  };

  projects = projects.map(p => {
    if (p.id === projectId) {
      return {
        ...p,
        tasks: [...p.tasks, newTask]
      };
    }
    return p;
  });
  
  return Promise.resolve(deepCopy(newTask));
}

export async function deleteTask(projectId: string, taskId: string): Promise<void> {
  projects = projects.map(p => {
    if (p.id === projectId) {
      return {
        ...p,
        tasks: p.tasks.filter(t => t.id !== taskId)
      };
    }
    return p;
  });
  return Promise.resolve();
}

export async function addMethod(taskId: string, methodData: Omit<Method, 'id' | 'codeSnippets'>): Promise<Method> {
  const newMethod: Method = {
    ...methodData,
    id: generateId(`method-${taskId}`),
    codeSnippets: [],
  };

  projects = projects.map(project => ({
    ...project,
    tasks: project.tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          methods: [...task.methods, newMethod]
        };
      }
      return task;
    })
  }));
  
  return Promise.resolve(deepCopy(newMethod));
}

export async function updateMethod(taskId: string, methodId: string, updates: Partial<Method>): Promise<void> {
    projects = projects.map(project => ({
        ...project,
        tasks: project.tasks.map(task => {
            if (task.id === taskId) {
                return {
                    ...task,
                    methods: task.methods.map(m => {
                        if (m.id === methodId) {
                            return { ...m, ...updates };
                        }
                        return m;
                    })
                };
            }
            return task;
        })
    }));
    return Promise.resolve();
}

export async function deleteMethod(taskId: string, methodId: string): Promise<void> {
  projects = projects.map(project => ({
    ...project,
    tasks: project.tasks.map(task => {
      if (task.id === taskId) {
        return {
          ...task,
          methods: task.methods.filter(m => m.id !== methodId)
        };
      }
      return task;
    })
  }));
  return Promise.resolve();
}

export async function addCodeSnippet(
    taskId: string, 
    methodId: string, 
    snippetData: GenerateCodeForTaskMethodOutput
): Promise<CodeSnippet> {
    const newSnippet: CodeSnippet = {
        id: generateId(`snippet-${methodId}`),
        version: snippetData.version,
        purpose: snippetData.purpose,
        code: snippetData.code,
        notesAndTradeoffs: snippetData.notesAndTradeoffs,
        createdAt: new Date().toISOString(),
    };

    projects = projects.map(project => ({
        ...project,
        tasks: project.tasks.map(task => {
            if (task.id === taskId) {
                return {
                    ...task,
                    methods: task.methods.map(method => {
                        if (method.id === methodId) {
                            const updatedSnippets = [newSnippet, ...method.codeSnippets];
                            updatedSnippets.sort((a, b) => b.version.localeCompare(a.version, undefined, { numeric: true }));
                            return {
                                ...method,
                                codeSnippets: updatedSnippets
                            };
                        }
                        return method;
                    })
                };
            }
            return task;
        })
    }));

    return Promise.resolve(deepCopy(newSnippet));
}

export async function updateCodeSnippetFromAI(
    taskId: string,
    methodId: string,
    snippetId: string,
    snippetData: GenerateCodeForTaskMethodOutput
): Promise<void> {
    projects = projects.map(project => ({
        ...project,
        tasks: project.tasks.map(task => {
            if (task.id === taskId) {
                return {
                    ...task,
                    methods: task.methods.map(method => {
                        if (method.id === methodId) {
                            return {
                                ...method,
                                codeSnippets: method.codeSnippets.map(s => 
                                    s.id === snippetId ? { 
                                        ...s, 
                                        code: snippetData.code, 
                                        purpose: snippetData.purpose,
                                        notesAndTradeoffs: snippetData.notesAndTradeoffs,
                                        version: snippetData.version 
                                    } : s
                                )
                            };
                        }
                        return method;
                    })
                };
            }
            return task;
        })
    }));
    return Promise.resolve();
}

export async function updateCodeSnippet(
    taskId: string,
    methodId: string,
    snippetId: string,
    code: string
): Promise<void> {
    projects = projects.map(project => ({
        ...project,
        tasks: project.tasks.map(task => {
            if (task.id === taskId) {
                return {
                    ...task,
                    methods: task.methods.map(method => {
                        if (method.id === methodId) {
                            return {
                                ...method,
                                codeSnippets: method.codeSnippets.map(s => 
                                    s.id === snippetId ? { ...s, code } : s
                                )
                            };
                        }
                        return method;
                    })
                };
            }
            return task;
        })
    }));
    return Promise.resolve();
}

export async function updateCodeSnippetNotes(
    taskId: string,
    methodId: string,
    snippetId: string,
    notes: string
): Promise<void> {
    projects = projects.map(project => ({
        ...project,
        tasks: project.tasks.map(task => {
            if (task.id === taskId) {
                return {
                    ...task,
                    methods: task.methods.map(method => {
                        if (method.id === methodId) {
                            return {
                                ...method,
                                codeSnippets: method.codeSnippets.map(s => 
                                    s.id === snippetId ? { ...s, notesAndTradeoffs: notes } : s
                                )
                            };
                        }
                        return method;
                    })
                };
            }
            return task;
        })
    }));
    return Promise.resolve();
}

export async function addDocumentationToSnippet(
  taskId: string,
  methodId: string,
  snippetId: string,
  documentation: string,
  developerComments: string
): Promise<CodeSnippet> {
  let updatedSnippet: CodeSnippet | undefined;

  projects = projects.map(project => ({
      ...project,
      tasks: project.tasks.map(task => {
          if (task.id === taskId) {
              return {
                  ...task,
                  methods: task.methods.map(method => {
                      if (method.id === methodId) {
                          const newSnippets = method.codeSnippets.map(snippet => {
                              if (snippet.id === snippetId) {
                                  updatedSnippet = {
                                      ...snippet,
                                      documentation,
                                      developerComments,
                                  };
                                  return updatedSnippet;
                              }
                              return snippet;
                          });
                          return { ...method, codeSnippets: newSnippets };
                      }
                      return method;
                  })
              };
          }
          return task;
      })
  }));

  if (!updatedSnippet) {
    throw new Error("Snippet not found to add documentation");
  }

  return Promise.resolve(deepCopy(updatedSnippet));
}

// Chat Session Management
export async function getChatSessions(): Promise<ChatSession[]> {
  return Promise.resolve(deepCopy(chatSessions).sort((a, b) => b.updatedAt.localeCompare(a.updatedAt)));
}

export async function saveChatSession(session: ChatSession): Promise<void> {
  const index = chatSessions.findIndex(s => s.id === session.id);
  if (index >= 0) {
    chatSessions[index] = session;
  } else {
    chatSessions.push(session);
  }
  return Promise.resolve();
}

export async function getChatSession(id: string): Promise<ChatSession | undefined> {
  const session = chatSessions.find(s => s.id === id);
  return Promise.resolve(session ? deepCopy(session) : undefined);
}

export async function deleteChatSession(id: string): Promise<void> {
  chatSessions = chatSessions.filter(s => s.id !== id);
  return Promise.resolve();
}
