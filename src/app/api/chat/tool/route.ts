import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/ai/skills/skill-manager';

/**
 * Tool call API路由
 * 用于处理大模型的工具调用请求
 */
export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body || !body.toolcall) {
      return NextResponse.json(
        { success: false, error: 'Missing toolcall parameter' },
        { status: 400 }
      );
    }

    const { toolcall } = body;
    
    // 处理agent相关的工具调用
    if (toolcall.name === 'runAgent') {
      const { type, input } = toolcall.parameters;
      
      if (!type) {
        return NextResponse.json(
          { success: false, error: 'Missing agent type' },
          { status: 400 }
        );
      }

      const result = await runAgent({ type, input });
      
      return NextResponse.json({
        success: true,
        result: result
      });
    }

    return NextResponse.json(
      { success: false, error: 'Unknown tool' },
      { status: 400 }
    );
  } catch (error) {
    console.error('Tool call API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to execute tool call' },
      { status: 500 }
    );
  }
}
