import { NextRequest, NextResponse } from 'next/server';
import { runAgent } from '@/ai/skills/skill-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Missing agent type' },
        { status: 400 }
      );
    }

    const result = await runAgent(body);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Agent API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run agent' },
      { status: 500 }
    );
  }
}
