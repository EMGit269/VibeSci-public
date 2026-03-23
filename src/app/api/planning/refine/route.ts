import { ai, getAiParams } from '@/ai/genkit';
import { NextRequest } from 'next/server';

/**
 * AI Planning Refinement Streaming Route
 */
export async function POST(req: NextRequest) {
  try {
    const { currentMarkdown, instruction } = await req.json();
    const { model, config } = await getAiParams();

    const { stream } = ai.generateStream({
      model,
      config,
      system: `You are an expert research strategist and scientific architect. Your goal is to help a researcher draft a high-quality, implementable project roadmap.

STRICT FORMATTING RULES:
- Every Task MUST start with: "# Task: [Task Name]"
- Every Method under a task MUST start with: "## Method: [Method Name]"
- Followed by: "### Process:"
- Followed by a list of steps using "- "`,
      prompt: `Current Plan:\n"""\n${currentMarkdown}\n"""\n\nUser Instruction:\n"${instruction}"\n\nPlease refine the roadmap. Output ONLY valid markdown.`,
    });

    const encoder = new TextEncoder();
    const readableStream = new ReadableStream({
      async start(controller) {
        try {
          for await (const chunk of stream) {
            const text = chunk.text;
            if (text) {
              controller.enqueue(encoder.encode(text));
            }
          }
        } catch (e) {
          console.error('Stream processing error:', e);
        } finally {
          controller.close();
        }
      },
    });

    return new Response(readableStream, {
      headers: {
        'Content-Type': 'text/plain; charset=utf-8',
        'Cache-Control': 'no-cache',
        'Connection': 'keep-alive',
      },
    });
  } catch (error) {
    console.error('Planning stream error:', error);
    return new Response('Error refining plan', { status: 500 });
  }
}
