'use server';

// 简单的内存缓存，用于存储搜索结果
const searchCache = new Map<string, { data: any; timestamp: number }>();
const CACHE_TTL = 3600000; // 缓存过期时间（1小时）

// MCP Server 实现，处理 Semantic Scholar API 调用
export async function handleMcpRequest(request: { tool: string; parameters: any }) {
  const { tool, parameters } = request;

  switch (tool) {
    case 'searchAcademicPapers':
      return await searchAcademicPapers(parameters);
    default:
      return {
        success: false,
        error: `Unknown tool: ${tool}`
      };
  }
}

// 搜索学术论文
async function searchAcademicPapers(parameters: { query: string; fields?: string[]; maxResults?: number }) {
  try {
    const { query, fields = ['title', 'abstract', 'authors', 'publicationDate'], maxResults = 5 } = parameters;
    
    // 生成缓存键
    const cacheKey = `${query}_${maxResults}`;
    
    // 检查缓存
    const cachedResult = searchCache.get(cacheKey);
    const now = Date.now();
    
    if (cachedResult && (now - cachedResult.timestamp) < CACHE_TTL) {
      console.log('Using cached search result for query:', query);
      return {
        success: true,
        data: cachedResult.data
      };
    }
    
    const apiUrl = `https://api.semanticscholar.org/graph/v1/paper/search?query=${encodeURIComponent(query)}&limit=${maxResults}&fields=title,abstract,authors,publicationDate`;
    
    console.log('Semantic Scholar API URL:', apiUrl);
    
    // 尝试获取 API 密钥（从环境变量或配置中）
    const apiKey = process.env.SEMANTIC_SCHOLAR_API_KEY;
    console.log('Semantic Scholar API Key:', apiKey ? 'Set' : 'Not set');
    
    const headers: HeadersInit = {
      'Accept': 'application/json'
    };
    
    // 如果有 API 密钥，添加到请求头
    if (apiKey) {
      headers['x-api-key'] = apiKey;
    }
    
    // 添加重试机制
    let response;
    let retryCount = 0;
    const maxRetries = 3;
    const retryDelay = 1000; // 1秒
    
    while (retryCount < maxRetries) {
      try {
        // 使用 AbortController 实现超时
        const controller = new AbortController();
        const timeoutId = setTimeout(() => controller.abort(), 10000); // 10秒超时
        
        try {
          response = await fetch(apiUrl, {
            method: 'GET',
            headers,
            signal: controller.signal
          });
        } finally {
          clearTimeout(timeoutId);
        }
        break;
      } catch (fetchError) {
        console.error(`Fetch attempt ${retryCount + 1} failed:`, fetchError);
        retryCount++;
        if (retryCount < maxRetries) {
          console.log(`Retrying in ${retryDelay}ms...`);
          await new Promise(resolve => setTimeout(resolve, retryDelay));
        } else {
          throw fetchError;
        }
      }
    }
    
    console.log('Semantic Scholar API response status:', response?.status);
    
    // 获取并打印响应头，帮助诊断问题
    if (response) {
      const responseHeaders = Array.from(response.headers.entries());
      console.log('Semantic Scholar API response headers:', responseHeaders);
      
      if (!response.ok) {
        // 获取错误响应的内容，帮助诊断问题
        const errorText = await response.text();
        console.error('Semantic Scholar API error response:', errorText);
        throw new Error(`API request failed with status ${response.status}: ${errorText}`);
      }
      
      const data = await response.json();
      console.log('Semantic Scholar API response data:', data);
      
      let formattedResults: string;
      if (data.data && data.data.length > 0) {
        // 格式化搜索结果
        formattedResults = `我理解您想搜索关于"${query}"的学术论文。以下是搜索结果：\n\n## 搜索结果\n\n`;
        
        data.data.forEach((paper: any, index: number) => {
          const title = paper.title || 'No title';
          const authors = paper.authors ? paper.authors.map((author: any) => author.name).join(', ') : 'Unknown authors';
          const publicationDate = paper.publicationDate || 'Unknown date';
          const abstract = paper.abstract || 'No abstract available';
          
          formattedResults += `${index + 1}. **Title: ${title}**\n`;
          formattedResults += `   - Authors: ${authors}\n`;
          formattedResults += `   - Publication Date: ${publicationDate}\n`;
          formattedResults += `   - Abstract: ${abstract}\n\n`;
        });
        
        formattedResults += `## 搜索提示\n- 尝试使用更具体的关键词以获得更相关的结果\n- 可以指定特定的研究领域或时间范围\n- 考虑使用布尔运算符（AND, OR, NOT）来优化搜索`;
      } else {
        formattedResults = `我理解您想搜索关于"${query}"的学术论文。\n\n## 搜索结果\n\n未找到相关论文。请尝试使用不同的关键词或更具体的搜索条件。\n\n## 搜索提示\n- 尝试使用更具体的关键词以获得更相关的结果\n- 可以指定特定的研究领域或时间范围\n- 考虑使用布尔运算符（AND, OR, NOT）来优化搜索`;
      }
      
      // 缓存结果
      searchCache.set(cacheKey, { data: formattedResults, timestamp: now });
      
      return {
        success: true,
        data: formattedResults
      };
    } else {
      throw new Error('No response from API after multiple attempts');
    }
  } catch (apiError) {
    console.error('Error with Semantic Scholar API:', apiError);
    
    // API调用失败时，返回明确的错误信息
    return {
      success: true,
      data: `我理解您想搜索关于"${parameters.query}"的学术论文。\n\n## 搜索结果\n\n搜索失败：无法连接到学术论文数据库。请稍后再试或检查网络连接。\n\n## 搜索提示\n- 确保您的网络连接正常\n- 尝试使用更具体的关键词以获得更相关的结果\n- 可以指定特定的研究领域或时间范围\n- 考虑使用布尔运算符（AND, OR, NOT）来优化搜索`
    };
  }
}
