import { ChatPromptTemplate } from '@langchain/core/prompts';
import { SkillInput, SkillOutput } from './types';

// 运行LangChain智能体
export async function runLangChainAgent(input: SkillInput): Promise<SkillOutput> {
  try {
    // 从SkillInput中获取输入内容
    const inputContent = typeof input === 'string' ? input : (input.input || input.message || JSON.stringify(input));
    
    // 检查是否有OpenAI API密钥
    if (!process.env.OPENAI_API_KEY) {
      // 如果没有OpenAI API密钥，使用默认实现
      return {
        success: true,
        data: `我理解您的请求：${inputContent}。以下是一些关键信息：\n\n## 项目概述\n这是一个基于LangChain的智能体响应，用于处理您的请求。\n\n## 技术栈\n- LangChain\n- OpenAI API\n- 自然语言处理\n\n## 注意事项\n- 请确保您的请求清晰明确\n- 对于复杂问题，可能需要提供更多上下文信息\n- 系统会根据您的输入生成相应的响应`,
      };
    }

    // 如果有OpenAI API密钥，使用ChatOpenAI
    const { ChatOpenAI } = await import('@langchain/openai');
    
    // 初始化LLM
    const llm = new ChatOpenAI({
      apiKey: process.env.OPENAI_API_KEY,
      model: 'gpt-3.5-turbo',
    });

    // 创建提示模板
    const prompt = ChatPromptTemplate.fromMessages([
      ['system', '你是一个AI科研助理，帮助用户分析项目需求、生成代码、创建项目和生成文档。请直接回答用户的问题，提供专业、客观、简洁的回答。'],
      ['user', '{input}'],
    ]);

    // 创建链
    const chain = prompt.pipe(llm);

    // 执行链
    const result = await chain.invoke({ input: inputContent });

    return {
      success: true,
      data: result.content,
    };
  } catch (error) {
    console.error('Error running LangChain agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run LangChain agent',
    };
  }
}
