'use server';

// MCP Client 实现，用于调用远程 MCP Server
export async function callMcpTool(tool: string, parameters: any) {
  try {
    // 调用远程 MCP Server
    // 注意：这里需要根据实际部署的 MCP Server 地址进行修改
    const mcpServerUrl = 'http://localhost:8000'; // 默认端口，实际部署时需要修改
    
    console.log('Calling remote MCP Server at:', mcpServerUrl);
    console.log('Tool:', tool);
    console.log('Parameters:', parameters);
    
    const response = await fetch(`${mcpServerUrl}/call`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({
        tool,
        parameters
      })
    });
    
    console.log('Remote MCP Server response status:', response.status);
    
    if (!response.ok) {
      const errorText = await response.text();
      console.error('Remote MCP Server error response:', errorText);
      throw new Error(`MCP Server request failed with status ${response.status}: ${errorText}`);
    }
    
    const result = await response.json();
    console.log('Remote MCP Server response:', result);
    return result;
  } catch (error) {
    console.error('Error calling remote MCP tool:', error);
    
    // 如果远程调用失败，回退到本地调用
    console.log('Falling back to local MCP Server');
    try {
      const { handleMcpRequest } = await import('./server');
      const result = await handleMcpRequest({ tool, parameters });
      console.log('Local MCP Server response:', result);
      return result;
    } catch (localError) {
      console.error('Error calling local MCP tool:', localError);
      return {
        success: false,
        error: localError instanceof Error ? localError.message : 'Failed to call MCP tool'
      };
    }
  }
}
