'use server';
/**
 * @fileOverview A Genkit flow for analyzing research planning markdown for logic gaps and complexity.
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const AnalysisItemSchema = z.object({
  step: z.string().describe('The specific task or method step being analyzed.'),
  explanation: z.string().describe('A detailed explanation of the issue found.'),
});

const AnalyzePlanningInputSchema = z.object({
  markdown: z.string().describe('The research planning content in Markdown.'),
});
export type AnalyzePlanningInput = z.infer<typeof AnalyzePlanningInputSchema>;

const AnalyzePlanningOutputSchema = z.object({
  errors: z.array(AnalysisItemSchema).describe('Logic gaps or missing steps that would prevent execution.'),
  warnings: z.array(AnalysisItemSchema).describe('Steps that are technically challenging or require significant resources.'),
});
export type AnalyzePlanningOutput = z.infer<typeof AnalyzePlanningOutputSchema>;

export async function analyzePlanning(input: AnalyzePlanningInput): Promise<AnalyzePlanningOutput> {
  return analyzePlanningFlow(input);
}

const analyzePlanningPrompt = ai.definePrompt({
  name: 'analyzePlanningPrompt',
  input: { schema: AnalyzePlanningInputSchema },
  output: { schema: AnalyzePlanningOutputSchema },
  prompt: `You are an expert scientific auditor and research architect. Your goal is to analyze a research plan and identify potential failures in the scientific roadmap.

STRICT FOCUS:
- FOCUS on the LOGIC of the research route. (e.g., Is Task B dependent on Task A but scheduled before it? Is the Method scientifically sound for the Problem?)
- IGNORE low-level code details or syntax. Do not get bogged down in implementation snippets.
- CRITERIA FOR ERRORS: Only flag major logical gaps that would invalidate the research progression (e.g., analyzing data before any acquisition method is defined).
- CRITERIA FOR WARNINGS: If a problem is minor, or simply represents a difficult but possible step, flag it as a Warning.

Input Research Plan:
"""
{{{markdown}}}
"""

Please return a structured JSON response categorizing the issues into errors and warnings. If no issues are found, return empty arrays.`,
});

const analyzePlanningFlow = ai.defineFlow(
  {
    name: 'analyzePlanningFlow',
    inputSchema: AnalyzePlanningInputSchema,
    outputSchema: AnalyzePlanningOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    const { output } = await analyzePlanningPrompt(input, { model, config });
    return output!;
  }
);
