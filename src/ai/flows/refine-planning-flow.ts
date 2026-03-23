'use server';
/**
 * @fileOverview A Genkit flow for refining research planning markdown.
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const RefinePlanningInputSchema = z.object({
  currentMarkdown: z.string(),
  instruction: z.string(),
});
export type RefinePlanningInput = z.infer<typeof RefinePlanningInputSchema>;

const RefinePlanningOutputSchema = z.object({
  refinedMarkdown: z.string(),
});
export type RefinePlanningOutput = z.infer<typeof RefinePlanningOutputSchema>;

export async function refinePlanning(input: RefinePlanningInput): Promise<RefinePlanningOutput> {
  return refinePlanningFlow(input);
}

const refinePlanningPrompt = ai.definePrompt({
  name: 'refinePlanningPrompt',
  input: { schema: RefinePlanningInputSchema },
  output: { schema: RefinePlanningOutputSchema },
  prompt: `Refine the research plan based on instruction. Output ONLY markdown.

Current Plan:
"""
{{{currentMarkdown}}}
"""

User Instruction:
"{{{instruction}}}"
`,
});

const refinePlanningFlow = ai.defineFlow(
  {
    name: 'refinePlanningFlow',
    inputSchema: RefinePlanningInputSchema,
    outputSchema: RefinePlanningOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    const { output } = await refinePlanningPrompt(input, { model, config });
    return output!;
  }
);
