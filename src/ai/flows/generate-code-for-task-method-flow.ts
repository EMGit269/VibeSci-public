
'use server';
/**
 * @fileOverview 科研代码生成流。
 * 强制使用 Gemini 3.1 Flash 进行高性价比生成。
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const GenerateCodeForTaskMethodInputSchema = z.object({
  taskName: z.string(),
  problemDescription: z.string(),
  methodName: z.string(),
  codeRequirements: z.string(),
  parentTaskName: z.string().optional(),
  existingCodeContext: z.string().optional(),
});

export type GenerateCodeForTaskMethodInput = z.infer<typeof GenerateCodeForTaskMethodInputSchema>;

const GenerateCodeForTaskMethodOutputSchema = z.object({
  task: z.string(),
  method: z.string(),
  version: z.string(),
  purpose: z.string(),
  code: z.string(),
  notesAndTradeoffs: z.string(),
});

export type GenerateCodeForTaskMethodOutput = z.infer<typeof GenerateCodeForTaskMethodOutputSchema>;

const generateCodePrompt = ai.definePrompt({
  name: 'generateCodePrompt',
  input: { schema: GenerateCodeForTaskMethodInputSchema },
  output: { schema: GenerateCodeForTaskMethodOutputSchema },
  prompt: `You are an AI-powered coding assistant designed for research-oriented projects. 

Generate a robust code implementation for the following research module.

【Task Context】:
- Name: {{{taskName}}}
- Goal: {{{problemDescription}}}

【Method Approach】:
- Method: {{{methodName}}}

【Requirements】:
{{{codeRequirements}}}

{{#if existingCodeContext}}
【Refining Existing Code】:
\`\`\`
{{{existingCodeContext}}}
\`\`\`
{{/if}}

Please return a structured JSON response with code, version (e.g., 1.0), purpose, and critical research tradeoffs.`,
});

const generateCodeForTaskMethodFlow = ai.defineFlow(
  {
    name: 'generateCodeForTaskMethodFlow',
    inputSchema: GenerateCodeForTaskMethodInputSchema,
    outputSchema: GenerateCodeForTaskMethodOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    const { output } = await generateCodePrompt(input, { model, config });
    if (!output) throw new Error('Failed to generate code.');
    return output;
  }
);

export async function generateCodeForTaskMethod(input: GenerateCodeForTaskMethodInput): Promise<GenerateCodeForTaskMethodOutput> {
  return generateCodeForTaskMethodFlow(input);
}
