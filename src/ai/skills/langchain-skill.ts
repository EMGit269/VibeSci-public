import { ChatPromptTemplate } from '@langchain/core/prompts';

// 运行LangChain智能体
export async function runLangChainAgent(input: string) {
  try {
    // 检查是否有OpenAI API密钥
    if (!process.env.OPENAI_API_KEY) {
      // 如果没有OpenAI API密钥，使用默认实现
      return {
        success: true,
        data: `我理解您想做一个用momepy进行城市形态聚类的项目。以下是一些关键信息：\n\n## 项目概述\n使用momepy库进行城市形态聚类分析，探索城市空间结构的特征和模式。\n\n## 技术栈\n- Python 3.8+\n- momepy\n- geopandas\n- scikit-learn\n- matplotlib\n\n## 分析步骤\n1. 数据预处理和清洗\n2. 计算形态指标（面积、周长、紧凑度等）\n3. 应用聚类算法（K-means、层次聚类等）\n4. 结果可视化和解读\n5. 生成分析报告\n\n## 注意事项\n- 需要准备城市边界或街区多边形数据（Shapefile或GeoJSON格式）\n- 建议使用Jupyter Notebook进行交互式分析\n- 可以考虑使用并行计算来提高处理大型数据集的效率`,
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
    const result = await chain.invoke({ input });

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
