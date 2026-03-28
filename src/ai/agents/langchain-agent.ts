import { ChatOpenAI } from '@langchain/openai';
import { createAgent, tool } from 'langchain';
import { runSkill } from '@/ai/skills/skill-manager';
import { getAiParams } from '@/ai/genkit';

// 创建技能工具
const skillTool = tool(
  async ({ skillType, input: skillInput }) => {
    const result = await runSkill({ type: skillType, input: skillInput });
    return JSON.stringify(result);
  },
  {
    name: 'runSkill',
    description: '运行技能，用于执行各种任务，如项目分析、代码生成、文档生成、项目创建和科研代码管理',
    schema: {
      type: 'object',
      properties: {
        skillType: {
          type: 'string',
          description: '技能类型，如 project-analysis, code-generation, document-generation, project-creation, research-code-management'
        },
        input: {
          type: 'object',
          description: '技能输入参数'
        }
      },
      required: ['skillType', 'input']
    }
  }
);

// 运行 LangChain agent
export async function runLangChainAgent(sessionId: string, input: string, chatHistory: any[], modelType?: string) {
  try {
    // 获取全局模型设置
    const { model: selectedModel, config } = await getAiParams();
    
    // 根据全局模型设置构建模型配置
    let modelConfig: string;
    
    if (selectedModel.startsWith('googleai/')) {
      // Google Gemini 模型
      const geminiModelName = selectedModel.replace('googleai/', 'gemini-');
      modelConfig = `google:${geminiModelName}`;
    } else if (selectedModel.startsWith('deepseek/')) {
      // DeepSeek 模型
      const deepseekModelName = selectedModel.replace('deepseek/', '');
      modelConfig = `deepseek:${deepseekModelName}`;
    } else if (selectedModel === 'custom/model') {
      // 自定义模型
      modelConfig = `openai:${config.model}`;
    } else {
      // 默认使用 OpenAI
      modelConfig = `openai:${process.env.OPENAI_API_KEY || 'gpt-4o'}`;
    }

    console.log('Using model for LangChain agent:', modelConfig);

    // 创建 agent
    const agent = createAgent({
      model: modelConfig,
      tools: [skillTool],
    });
    
    // 构建消息历史
    const messages = [];
    
    // 添加系统提示
    messages.push({
      role: 'system' as const,
      content: `你是一个专业的科研助手，负责帮助用户完成各种科研任务。

任务规划步骤：
1. 首先分析用户的请求，理解任务的具体需求
2. 制定一个详细的任务规划，包括需要执行的步骤和使用的工具
3. 按照规划逐步执行任务，调用相应的工具获取信息
4. 整合所有获取的信息，提供一个全面、专业的回答

工具使用指南：
- runSkill：用于执行各种技能任务，如项目分析、代码生成、文档生成、项目创建和科研代码管理

输出格式要求：
请按照以下板块结构输出：

## 任务规划
- 分析用户需求
- 制定执行计划

## 执行过程
- 调用工具的名称和目的
- 执行步骤和结果

## 结果总结
- 整合所有获取的信息
- 提供专业、全面的回答

回答要求：
- 保持专业、准确的科研语言
- 提供详细的分析和解释
- 确保回答全面覆盖用户的需求
- 在回答中引用获取的信息
- 不要使用"我调用了什么工具"这样的表述，而是以客观的方式描述执行过程`
    });
    
    // 添加历史对话
    if (chatHistory) {
      chatHistory.forEach(msg => {
        messages.push({
          role: msg.role as 'user' | 'assistant',
          content: msg.content
        });
      });
    }
    
    // 添加当前输入
    messages.push({ role: 'user' as const, content: input });
    
    // 执行 agent
    const result = await agent.invoke({ messages });
    
    // 从结果中获取最后一条消息作为输出
    const output = result.messages[result.messages.length - 1]?.content || 'No response';
    
    return {
      success: true,
      data: output,
    };
  } catch (error) {
    console.error('Error running LangChain agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run LangChain agent',
    };
  }
}
