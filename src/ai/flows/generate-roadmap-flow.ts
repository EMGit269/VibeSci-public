'use server';
/**
 * @fileOverview A Genkit flow for generating a complete research roadmap.
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const RoadmapTaskSchema = z.object({
  name: z.string(),
  problemDescription: z.string(),
  methods: z.array(z.object({
    name: z.string(),
    description: z.string(),
  })),
});

const GenerateRoadmapInputSchema = z.object({
  projectName: z.string(),
  projectDescription: z.string(),
});
export type GenerateRoadmapInput = z.infer<typeof GenerateRoadmapInputSchema>;

const GenerateRoadmapOutputSchema = z.object({
  tasks: z.array(RoadmapTaskSchema),
});
export type GenerateRoadmapOutput = z.infer<typeof GenerateRoadmapOutputSchema>;

export async function generateRoadmap(input: GenerateRoadmapInput): Promise<GenerateRoadmapOutput> {
  return generateRoadmapFlow(input);
}

const roadmapPrompt = ai.definePrompt({
  name: 'generateRoadmapPrompt',
  input: { schema: GenerateRoadmapInputSchema },
  output: { schema: GenerateRoadmapOutputSchema },
  prompt: `You are an expert research strategist. Based on the following project details, create a logical, step-by-step research roadmap.
  
Project Name: {{{projectName}}}
Project Description: {{{projectDescription}}}

Create 3-5 clear tasks with methods.`,
});

const generateRoadmapFlow = ai.defineFlow(
  {
    name: 'generateRoadmapFlow',
    inputSchema: GenerateRoadmapInputSchema,
    outputSchema: GenerateRoadmapOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    const { output } = await roadmapPrompt(input, { model, config });
    return output!;
  }
);
