'use server';
/**
 * @fileOverview A Genkit flow for suggesting solution methods.
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const SuggestMethodsInputSchema = z.object({
  taskName: z.string(),
  problemDescription: z.string(),
});
export type SuggestMethodsInput = z.infer<typeof SuggestMethodsInputSchema>;

const SuggestedMethodSchema = z.object({
    name: z.string(),
    description: z.string(),
});

const SuggestMethodsOutputSchema = z.object({
  suggestions: z.array(SuggestedMethodSchema),
});
export type SuggestMethodsOutput = z.infer<typeof SuggestMethodsOutputSchema>;

export async function suggestMethods(input: SuggestMethodsInput): Promise<SuggestMethodsOutput> {
  return suggestMethodsFlow(input);
}

const suggestMethodsPrompt = ai.definePrompt({
  name: 'suggestMethodsPrompt',
  input: { schema: SuggestMethodsInputSchema },
  output: { schema: SuggestMethodsOutputSchema },
  prompt: `Suggest 3-5 solution methods for:
Task: {{{taskName}}}
Problem: {{{problemDescription}}}
`,
});

const suggestMethodsFlow = ai.defineFlow(
  {
    name: 'suggestMethodsFlow',
    inputSchema: SuggestMethodsInputSchema,
    outputSchema: SuggestMethodsOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    const { output } = await suggestMethodsPrompt(input, { model, config });
    return output!;
  }
);
