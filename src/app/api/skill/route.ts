import { NextRequest, NextResponse } from 'next/server';
import { runSkill, SkillRequest } from '@/ai/skills/skill-manager';

export async function POST(request: NextRequest) {
  try {
    const body = await request.json();
    
    if (!body || !body.type) {
      return NextResponse.json(
        { success: false, error: 'Missing skill type' },
        { status: 400 }
      );
    }

    const result = await runSkill(body as SkillRequest);
    
    return NextResponse.json(result);
  } catch (error) {
    console.error('Skill API error:', error);
    return NextResponse.json(
      { success: false, error: 'Failed to run skill' },
      { status: 500 }
    );
  }
}
