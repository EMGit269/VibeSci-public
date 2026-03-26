'use server';

import { callMcpTool } from '../../mcp/client';

// 运行学术论文搜索智能体
export async function runAcademicPaperSearchAgent(input: { query: string; fields?: string[]; maxResults?: number }) {
  try {
    const { query, fields = ['title', 'abstract', 'authors', 'publicationDate'], maxResults = 5 } = input;
    
    // 使用 MCP 客户端调用搜索工具
    const searchResult = await callMcpTool('searchAcademicPapers', { query, fields, maxResults });
    
    if (searchResult.success && 'data' in searchResult) {
      // 将搜索结果发送给大模型进行整理
      try {
        const organizeResponse = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `请整理以下学术论文搜索结果，使其更加友好、易读，并保持关键信息完整。\n\n执行结果:\n${searchResult.data}`,
            history: [],
            knowledgeContext: ""
          }),
        });

        if (organizeResponse.ok) {
          const organizeReader = organizeResponse.body?.getReader();
          if (organizeReader) {
            let organizedResults = '';
            const decoder = new TextDecoder();
            
            while (true) {
              const { done, value } = await organizeReader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              organizedResults += chunk;
            }
            
            return {
              success: true,
              data: organizedResults
            };
          }
        }
      } catch (organizeError) {
        console.error('Error getting organize from LLM:', organizeError);
      }
      
      // 如果大模型整理失败，使用原始结果
      return {
        success: true,
        data: searchResult.data
      };
    } else {
      // 搜索失败时，返回错误信息
      const errorMessage = `我理解您想搜索关于"${query}"的学术论文。\n\n## 搜索结果\n\n搜索失败：${'error' in searchResult ? searchResult.error : '未知错误'}。请稍后再试。\n\n## 搜索提示\n- 尝试使用更具体的关键词以获得更相关的结果\n- 可以指定特定的研究领域或时间范围\n- 考虑使用布尔运算符（AND, OR, NOT）来优化搜索`;
      
      // 将错误信息发送给大模型进行整理
      try {
        const organizeResponse = await fetch('/api/chat/stream', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({
            message: `请整理以下学术论文搜索错误信息，使其更加友好、易读。\n\n执行结果:\n${errorMessage}`,
            history: [],
            knowledgeContext: ""
          }),
        });

        if (organizeResponse.ok) {
          const organizeReader = organizeResponse.body?.getReader();
          if (organizeReader) {
            let organizedResults = '';
            const decoder = new TextDecoder();
            
            while (true) {
              const { done, value } = await organizeReader.read();
              if (done) break;
              const chunk = decoder.decode(value, { stream: true });
              organizedResults += chunk;
            }
            
            return {
              success: true,
              data: organizedResults
            };
          }
        }
      } catch (organizeError) {
        console.error('Error getting organize from LLM:', organizeError);
      }
      
      // 如果大模型整理失败，使用原始错误信息
      return {
        success: true,
        data: errorMessage
      };
    }
  } catch (error) {
    console.error('Error running Academic Paper Search agent:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run Academic Paper Search agent',
    };
  }
}
