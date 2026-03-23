'use server';
/**
 * @fileOverview A Genkit flow for generating documentation from code.
 */

import {ai, getAiParams} from '@/ai/genkit';
import {z} from 'genkit';

const GenerateDocumentationFromCodeInputSchema = z.object({
  code: z.string(),
  comments: z.string().optional(),
  taskDescription: z.string(),
  methodDescription: z.string(),
});
export type GenerateDocumentationFromCodeInput = z.infer<typeof GenerateDocumentationFromCodeInputSchema>;

const GenerateDocumentationFromCodeOutputSchema = z.object({
  documentation: z.string(),
});
export type GenerateDocumentationFromCodeOutput = z.infer<typeof GenerateDocumentationFromCodeOutputSchema>;

export async function generateDocumentationFromCode(input: GenerateDocumentationFromCodeInput): Promise<GenerateDocumentationFromCodeOutput> {
  return generateDocumentationFromCodeFlow(input);
}

const documentationPrompt = ai.definePrompt({
  name: 'generateDocumentationFromCodePrompt',
  input: {schema: GenerateDocumentationFromCodeInputSchema},
  output: {schema: GenerateDocumentationFromCodeOutputSchema},
  prompt: `You are an AI-powered documentation specialist.

Focus on explaining:
1. Purpose, 2. Functionality, 3. Inputs/Outputs, 4. Assumptions, 5. Usage Example, 6. Trade-offs.

Task Description: {{{taskDescription}}}
Method Description: {{{methodDescription}}}
Code Snippet:
\`\`\`
{{{code}}}
\`\`\`
{{#if comments}}
Developer Comments: {{{comments}}}
{{/if}}
`,
});

const generateDocumentationFromCodeFlow = ai.defineFlow(
  {
    name: 'generateDocumentationFromCodeFlow',
    inputSchema: GenerateDocumentationFromCodeInputSchema,
    outputSchema: GenerateDocumentationFromCodeOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    const {output} = await documentationPrompt(input, { model, config });
    return output!;
  }
);
