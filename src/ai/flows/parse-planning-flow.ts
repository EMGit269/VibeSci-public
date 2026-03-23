'use server';
/**
 * @fileOverview A Genkit flow for parsing Research Planning Markdown.
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const ParsedMethodSchema = z.object({
  name: z.string(),
  description: z.string(),
});

const ParsedTaskSchema = z.object({
  name: z.string(),
  problemDescription: z.string(),
  methods: z.array(ParsedMethodSchema),
});

const ParsePlanningInputSchema = z.object({
  markdown: z.string(),
});
export type ParsePlanningInput = z.infer<typeof ParsePlanningInputSchema>;

const ParsePlanningOutputSchema = z.object({
  tasks: z.array(ParsedTaskSchema),
});
export type ParsePlanningOutput = z.infer<typeof ParsePlanningOutputSchema>;

export async function parsePlanning(input: ParsePlanningInput): Promise<ParsePlanningOutput> {
  return parsePlanningFlow(input);
}

const parsePlanningPrompt = ai.definePrompt({
  name: 'parsePlanningPrompt',
  input: { schema: ParsePlanningInputSchema },
  output: { schema: ParsePlanningOutputSchema },
  prompt: `Extract Task name, problem description and methods from this markdown:
"""
{{{markdown}}}
"""
`,
});

const parsePlanningFlow = ai.defineFlow(
  {
    name: 'parsePlanningFlow',
    inputSchema: ParsePlanningInputSchema,
    outputSchema: ParsePlanningOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    const { output } = await parsePlanningPrompt(input, { model, config });
    return output!;
  }
);
