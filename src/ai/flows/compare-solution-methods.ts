'use server';
/**
 * @fileOverview A Genkit flow for comparing different proposed solution methods for a research task.
 *
 * - compareSolutionMethods - A function that handles the comparison of multiple solution methods.
 * - CompareSolutionMethodsInput - The input type for the compareSolutionMethods function.
 * - CompareSolutionMethodsOutput - The return type for the compareSolutionMethods function.
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const SolutionMethodSchema = z.object({
  name: z.string().describe('The name or label of the solution method (e.g., "Method A: rule-based").'),
  description: z.string().describe('A detailed description of the solution method.'),
  codeSnippet: z.string().optional().describe('An optional code snippet demonstrating the method.'),
});

const CompareSolutionMethodsInputSchema = z.object({
  taskName: z.string().describe('The name of the research task for which methods are being compared.'),
  problemDescription: z.string().describe('A brief description of the problem the task aims to solve.'),
  methods: z.array(SolutionMethodSchema).min(2).describe('An array of at least two solution methods to compare.'),
});
export type CompareSolutionMethodsInput = z.infer<typeof CompareSolutionMethodsInputSchema>;

const MethodEvaluationSchema = z.object({
  methodName: z.string().describe('The name of the evaluated solution method.'),
  merits: z.string().describe('The advantages and strengths of this method.'),
  tradeoffs: z.string().describe('The disadvantages, limitations, and challenges of this method.'),
  impacts: z.string().describe('The potential impact and implications of adopting this method in the research project.'),
  suitability: z.string().describe('A brief assessment of when this method would be most suitable.'),
});

const CompareSolutionMethodsOutputSchema = z.object({
  overallSummary: z.string().describe('A high-level summary comparing all methods, highlighting key differences.'),
  recommendation: z.string().describe('An overall recommendation based on the comparison, suggesting which method(s) might be most promising and why. Consider the research goals and practical implications.'),
  methodEvaluations: z.array(MethodEvaluationSchema).describe('Detailed evaluations for each submitted solution method.'),
});
export type CompareSolutionMethodsOutput = z.infer<typeof CompareSolutionMethodsOutputSchema>;

export async function compareSolutionMethods(input: CompareSolutionMethodsInput): Promise<CompareSolutionMethodsOutput> {
  return compareSolutionMethodsFlow(input);
}

const compareSolutionMethodsPrompt = ai.definePrompt({
  name: 'compareSolutionMethodsPrompt',
  input: { schema: CompareSolutionMethodsInputSchema },
  output: { schema: CompareSolutionMethodsOutputSchema },
  prompt: `You are an expert research assistant. Your task is to compare different proposed solution methods for a research task.
Provide a detailed analysis of their tradeoffs, merits, potential impacts, and suitability, then give an overall summary and recommendation.

Research Task: {{{taskName}}}
Problem Description: {{{problemDescription}}}

Here are the solution methods to compare:

{{#each methods}}
---
Method Name: {{{name}}}
Description: {{{description}}}
{{#if codeSnippet}}
Code Snippet:
\
~~~ts
{{{codeSnippet}}}
~~~
{{/if}}
{{/each}}

Please provide your analysis in the following structured JSON format:

Overall Summary:
[Provide a high-level summary comparing all methods, highlighting key differences and overarching themes.]

Overall Recommendation:
[Provide an overall recommendation based on your comparison, suggesting which method(s) might be most promising and why. Consider the research goals and practical implications.]

Method Evaluations:
{{#each methods}}
  - methodName: "{{{name}}}"
    merits: [List the advantages and strengths of "{{{name}}}".]
    tradeoffs: [List the disadvantages, limitations, and challenges of "{{{name}}}".]
    impacts: [Describe the potential impact and implications of adopting "{{{name}}}" in the research project.]
    suitability: [Briefly assess when "{{{name}}}" would be most suitable.]
{{/each}}`,
});

const compareSolutionMethodsFlow = ai.defineFlow(
  {
    name: 'compareSolutionMethodsFlow',
    inputSchema: CompareSolutionMethodsInputSchema,
    outputSchema: CompareSolutionMethodsOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    const { output } = await compareSolutionMethodsPrompt(input, { model, config });
    return output!;
  }
);
