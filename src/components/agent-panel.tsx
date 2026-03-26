import { useState } from 'react';
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card';
import { Button } from '@/components/ui/button';
import { Input } from '@/components/ui/input';
import { Textarea } from '@/components/ui/textarea';
import { Label } from '@/components/ui/label';
import { Tabs, TabsContent, TabsList, TabsTrigger } from '@/components/ui/tabs';
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from '@/components/ui/select';
import { useToast } from '@/hooks/use-toast';
import { Loader2, FileCode, FileText, BarChart3 } from 'lucide-react';

interface AgentPanelProps {
  className?: string;
}

export function AgentPanel({ className }: AgentPanelProps) {
  const { toast } = useToast();
  const [activeTab, setActiveTab] = useState('project-analysis');
  const [loading, setLoading] = useState(false);
  const [results, setResults] = useState<any>(null);
  
  // 项目分析表单
  const [projectDescription, setProjectDescription] = useState('');
  const [existingCode, setExistingCode] = useState('');
  const [requirements, setRequirements] = useState('');
  
  // 代码生成表单
  const [taskDescription, setTaskDescription] = useState('');
  const [language, setLanguage] = useState('typescript');
  const [framework, setFramework] = useState('');
  const [codeRequirements, setCodeRequirements] = useState('');
  const [codeExistingCode, setCodeExistingCode] = useState('');
  
  // 文档生成表单
  const [projectName, setProjectName] = useState('');
  const [docProjectDescription, setDocProjectDescription] = useState('');
  const [docCode, setDocCode] = useState('');
  const [features, setFeatures] = useState('');
  const [audience, setAudience] = useState('developers');
  
  // 项目创建表单
  const [createProjectName, setCreateProjectName] = useState('');
  const [createProjectDescription, setCreateProjectDescription] = useState('');
  const [tasks, setTasks] = useState([{
    name: '',
    problemDescription: '',
    methods: [{
      name: '',
      description: ''
    }]
  }]);

  // 添加任务
  const addTask = () => {
    setTasks([...tasks, {
      name: '',
      problemDescription: '',
      methods: [{
        name: '',
        description: ''
      }]
    }]);
  };

  // 删除任务
  const removeTask = (index: number) => {
    const newTasks = [...tasks];
    newTasks.splice(index, 1);
    setTasks(newTasks);
  };

  // 添加方法
  const addMethod = (taskIndex: number) => {
    const newTasks = [...tasks];
    newTasks[taskIndex].methods.push({
      name: '',
      description: ''
    });
    setTasks(newTasks);
  };

  // 删除方法
  const removeMethod = (taskIndex: number, methodIndex: number) => {
    const newTasks = [...tasks];
    newTasks[taskIndex].methods.splice(methodIndex, 1);
    setTasks(newTasks);
  };

  // 更新任务
  const updateTask = (index: number, field: string, value: string) => {
    const newTasks = [...tasks];
    newTasks[index] = {
      ...newTasks[index],
      [field]: value
    };
    setTasks(newTasks);
  };

  // 更新方法
  const updateMethod = (taskIndex: number, methodIndex: number, field: string, value: string) => {
    const newTasks = [...tasks];
    newTasks[taskIndex].methods[methodIndex] = {
      ...newTasks[taskIndex].methods[methodIndex],
      [field]: value
    };
    setTasks(newTasks);
  };

  const handleRunAgent = async () => {
    setLoading(true);
    setResults(null);
    
    try {
      let input: any;
      
      switch (activeTab) {
        case 'project-analysis':
          input = {
            projectDescription,
            existingCode,
            requirements,
          };
          break;
        case 'code-generation':
          input = {
            taskDescription,
            language,
            framework,
            requirements: codeRequirements,
            existingCode: codeExistingCode,
          };
          break;
        case 'documentation':
          input = {
            projectName,
            projectDescription: docProjectDescription,
            code: docCode,
            features: features.split(',').map(f => f.trim()),
            audience,
          };
          break;
        case 'project-creation':
          input = {
            projectName: createProjectName,
            projectDescription: createProjectDescription,
            tasks: tasks
          };
          break;
        default:
          throw new Error('Unknown agent type');
      }

      const response = await fetch('/api/agent', {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
        },
        body: JSON.stringify({
          type: activeTab,
          input,
        }),
      });

      if (!response.ok) {
        const error = await response.json();
        throw new Error(error.error || 'Failed to run agent');
      }

      const data = await response.json();
      setResults(data);
      toast({ title: 'Agent执行成功', description: '已完成分析/生成' });
    } catch (error) {
      console.error('Error running agent:', error);
      toast({ 
        title: '执行失败', 
        description: error instanceof Error ? error.message : '未知错误',
        variant: 'destructive'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <Card className={className}>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <BarChart3 className="h-5 w-5 text-blue-600" />
          AI Agent 工具
        </CardTitle>
        <CardDescription>
          使用AI Agent自动化完成项目梳理、代码编写和文档生成
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs value={activeTab} onValueChange={setActiveTab}>
          <TabsList className="grid grid-cols-4">
            <TabsTrigger value="project-analysis">
              <BarChart3 className="h-4 w-4 mr-2" />
              项目分析
            </TabsTrigger>
            <TabsTrigger value="code-generation">
              <FileCode className="h-4 w-4 mr-2" />
              代码生成
            </TabsTrigger>
            <TabsTrigger value="documentation">
              <FileText className="h-4 w-4 mr-2" />
              文档生成
            </TabsTrigger>
            <TabsTrigger value="project-creation">
              <FileText className="h-4 w-4 mr-2" />
              项目创建
            </TabsTrigger>
          </TabsList>
          
          <TabsContent value="project-analysis" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>项目描述</Label>
              <Textarea 
                placeholder="请描述您的项目..." 
                value={projectDescription} 
                onChange={(e) => setProjectDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>现有代码（可选）</Label>
              <Textarea 
                placeholder="请输入现有代码..." 
                value={existingCode} 
                onChange={(e) => setExistingCode(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>项目需求（可选）</Label>
              <Textarea 
                placeholder="请输入项目需求..." 
                value={requirements} 
                onChange={(e) => setRequirements(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="code-generation" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>任务描述</Label>
              <Textarea 
                placeholder="请描述您需要生成的代码..." 
                value={taskDescription} 
                onChange={(e) => setTaskDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>编程语言</Label>
              <Select value={language} onValueChange={setLanguage}>
                <SelectTrigger>
                  <SelectValue placeholder="选择语言" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="typescript">TypeScript</SelectItem>
                  <SelectItem value="javascript">JavaScript</SelectItem>
                  <SelectItem value="python">Python</SelectItem>
                  <SelectItem value="java">Java</SelectItem>
                  <SelectItem value="csharp">C#</SelectItem>
                  <SelectItem value="go">Go</SelectItem>
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>框架（可选）</Label>
              <Input 
                placeholder="例如：React, Vue, Node.js..." 
                value={framework} 
                onChange={(e) => setFramework(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>具体要求（可选）</Label>
              <Textarea 
                placeholder="请输入具体要求..." 
                value={codeRequirements} 
                onChange={(e) => setCodeRequirements(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>现有代码（可选）</Label>
              <Textarea 
                placeholder="请输入现有代码..." 
                value={codeExistingCode} 
                onChange={(e) => setCodeExistingCode(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
          </TabsContent>
          
          <TabsContent value="documentation" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>项目名称</Label>
              <Input 
                placeholder="请输入项目名称..." 
                value={projectName} 
                onChange={(e) => setProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>项目描述</Label>
              <Textarea 
                placeholder="请描述您的项目..." 
                value={docProjectDescription} 
                onChange={(e) => setDocProjectDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>项目代码（可选）</Label>
              <Textarea 
                placeholder="请输入项目代码..." 
                value={docCode} 
                onChange={(e) => setDocCode(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            <div className="space-y-2">
              <Label>项目功能（可选，用逗号分隔）</Label>
              <Input 
                placeholder="例如：用户认证, 数据存储, API接口..." 
                value={features} 
                onChange={(e) => setFeatures(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>目标受众</Label>
              <Select value={audience} onValueChange={setAudience}>
                <SelectTrigger>
                  <SelectValue placeholder="选择受众" />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="developers">开发者</SelectItem>
                  <SelectItem value="users">普通用户</SelectItem>
                  <SelectItem value="testers">测试人员</SelectItem>
                  <SelectItem value="managers">管理人员</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </TabsContent>
          
          <TabsContent value="project-creation" className="space-y-4 pt-4">
            <div className="space-y-2">
              <Label>项目名称</Label>
              <Input 
                placeholder="请输入项目名称..." 
                value={createProjectName} 
                onChange={(e) => setCreateProjectName(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <Label>项目描述</Label>
              <Textarea 
                placeholder="请描述您的项目..." 
                value={createProjectDescription} 
                onChange={(e) => setCreateProjectDescription(e.target.value)}
                className="min-h-[100px]"
              />
            </div>
            
            <div className="space-y-4">
              <div className="flex justify-between items-center">
                <Label>任务列表</Label>
                <Button 
                  onClick={addTask} 
                  size="sm" 
                  variant="secondary"
                >
                  添加任务
                </Button>
              </div>
              
              {tasks.map((task, taskIndex) => (
                <div key={taskIndex} className="border p-4 rounded-lg space-y-4">
                  <div className="flex justify-between items-start">
                    <h4 className="font-medium">任务 {taskIndex + 1}</h4>
                    <Button 
                      onClick={() => removeTask(taskIndex)} 
                      size="icon" 
                      variant="destructive"
                    >
                      <svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                        <path d="M18 6 6 18"/>
                        <path d="m6 6 12 12"/>
                      </svg>
                    </Button>
                  </div>
                  
                  <div className="space-y-2">
                    <Label>任务名称</Label>
                    <Input 
                      placeholder="请输入任务名称..." 
                      value={task.name} 
                      onChange={(e) => updateTask(taskIndex, 'name', e.target.value)}
                    />
                  </div>
                  
                  <div className="space-y-2">
                    <Label>任务描述</Label>
                    <Textarea 
                      placeholder="请描述任务..." 
                      value={task.problemDescription} 
                      onChange={(e) => updateTask(taskIndex, 'problemDescription', e.target.value)}
                      className="min-h-[80px]"
                    />
                  </div>
                  
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <Label>方法列表</Label>
                      <Button 
                        onClick={() => addMethod(taskIndex)} 
                        size="sm" 
                        variant="secondary"
                      >
                        添加方法
                      </Button>
                    </div>
                    
                    {task.methods.map((method, methodIndex) => (
                      <div key={methodIndex} className="border p-3 rounded-lg space-y-2">
                        <div className="flex justify-between items-start">
                          <h5 className="font-medium text-sm">方法 {methodIndex + 1}</h5>
                          <Button 
                            onClick={() => removeMethod(taskIndex, methodIndex)} 
                            size="icon" 
                            variant="destructive"
                          >
                            <svg xmlns="http://www.w3.org/2000/svg" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                              <path d="M18 6 6 18"/>
                              <path d="m6 6 12 12"/>
                            </svg>
                          </Button>
                        </div>
                        
                        <div className="space-y-2">
                          <Label>方法名称</Label>
                          <Input 
                            placeholder="请输入方法名称..." 
                            value={method.name} 
                            onChange={(e) => updateMethod(taskIndex, methodIndex, 'name', e.target.value)}
                          />
                        </div>
                        
                        <div className="space-y-2">
                          <Label>方法描述</Label>
                          <Textarea 
                            placeholder="请描述方法..." 
                            value={method.description} 
                            onChange={(e) => updateMethod(taskIndex, methodIndex, 'description', e.target.value)}
                            className="min-h-[60px]"
                          />
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              ))}
            </div>
          </TabsContent>
        </Tabs>
        
        <div className="mt-6">
          <Button 
            onClick={handleRunAgent} 
            disabled={loading} 
            className="w-full bg-blue-600 hover:bg-blue-700"
          >
            {loading ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin mr-2" />
                执行中...
              </>
            ) : (
              '执行 Agent'
            )}
          </Button>
        </div>
        
        {results && (
          <div className="mt-6 space-y-4">
            <h3 className="text-lg font-semibold">执行结果</h3>
            
            {activeTab === 'project-analysis' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">项目结构分析</h4>
                  <p className="mt-1 text-sm">{results.projectStructure}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">技术栈分析</h4>
                  <p className="mt-1 text-sm">{results.technologyStack}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">关键组件</h4>
                  <ul className="mt-1 text-sm list-disc pl-5">
                    {results.keyComponents.map((component: string, index: number) => (
                      <li key={index}>{component}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">实施方案</h4>
                  <p className="mt-1 text-sm">{results.implementationPlan}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">潜在挑战</h4>
                  <ul className="mt-1 text-sm list-disc pl-5">
                    {results.potentialChallenges.map((challenge: string, index: number) => (
                      <li key={index}>{challenge}</li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
            
            {activeTab === 'code-generation' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">生成的代码</h4>
                  <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[300px]">
                    <code>{results.code}</code>
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">代码解释</h4>
                  <p className="mt-1 text-sm">{results.explanation}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">依赖项</h4>
                  <ul className="mt-1 text-sm list-disc pl-5">
                    {results.dependencies.map((dependency: string, index: number) => (
                      <li key={index}>{dependency}</li>
                    ))}
                  </ul>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">使用说明</h4>
                  <p className="mt-1 text-sm">{results.usage}</p>
                </div>
              </div>
            )}
            
            {activeTab === 'documentation' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">README文档</h4>
                  <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[200px]">
                    <code>{results.readme}</code>
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">安装指南</h4>
                  <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[200px]">
                    <code>{results.installationGuide}</code>
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">使用指南</h4>
                  <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[200px]">
                    <code>{results.usageGuide}</code>
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">API文档</h4>
                  <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[200px]">
                    <code>{results.apiDocumentation}</code>
                  </pre>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">故障排除</h4>
                  <pre className="mt-1 text-xs bg-gray-100 dark:bg-gray-800 p-3 rounded overflow-auto max-h-[200px]">
                    <code>{results.troubleshooting}</code>
                  </pre>
                </div>
              </div>
            )}
            
            {activeTab === 'project-creation' && (
              <div className="space-y-4">
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">项目创建结果</h4>
                  <p className="mt-1 text-sm">项目 ID: {results.projectId}</p>
                  <p className="mt-1 text-sm">项目名称: {results.projectName}</p>
                </div>
                <div>
                  <h4 className="font-medium text-sm text-muted-foreground">创建的任务</h4>
                  <ul className="mt-1 text-sm list-disc pl-5 space-y-3">
                    {results.tasks.map((task: any, index: number) => (
                      <li key={index}>
                        <div>任务 ID: {task.taskId}</div>
                        <div>任务名称: {task.taskName}</div>
                        <div className="mt-1">
                          <span className="font-medium">方法:</span>
                          <ul className="list-disc pl-5 mt-1 space-y-1">
                            {task.methods.map((method: any, methodIndex: number) => (
                              <li key={methodIndex}>
                                <div>方法 ID: {method.methodId}</div>
                                <div>方法名称: {method.methodName}</div>
                              </li>
                            ))}
                          </ul>
                        </div>
                      </li>
                    ))}
                  </ul>
                </div>
              </div>
            )}
          </div>
        )}
      </CardContent>
    </Card>
  );
}
