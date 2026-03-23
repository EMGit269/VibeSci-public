
'use server';
/**
 * @fileOverview A Genkit flow for extracting a knowledge graph (entities and relationships) from text.
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const NodeSchema = z.object({
  id: z.string().describe('A unique identifier for the node.'),
  label: z.string().describe('The name or label of the entity.'),
  type: z.string().describe('The category of the entity (e.g., Concept, Method, Result, Tool).'),
});

const EdgeSchema = z.object({
  source: z.string().describe('The ID of the source node.'),
  target: z.string().describe('The ID of the target node.'),
  label: z.string().describe('The description of the relationship (e.g., "uses", "depends on", "implements").'),
});

const ExtractGraphInputSchema = z.object({
  text: z.string().describe('The combined text chunks from a knowledge source.'),
});
export type ExtractGraphInput = z.infer<typeof ExtractGraphInputSchema>;

const ExtractGraphOutputSchema = z.object({
  nodes: z.array(NodeSchema),
  edges: z.array(EdgeSchema),
});
export type ExtractGraphOutput = z.infer<typeof ExtractGraphOutputSchema>;

export async function extractKnowledgeGraph(input: ExtractGraphInput): Promise<ExtractGraphOutput> {
  return extractKnowledgeGraphFlow(input);
}

const extractGraphPrompt = ai.definePrompt({
  name: 'extractKnowledgeGraphPrompt',
  input: { schema: ExtractGraphInputSchema },
  output: { schema: ExtractGraphOutputSchema },
  prompt: `You are an expert knowledge engineer. Your task is to analyze the following research document text and extract a knowledge graph representing the key entities and their relationships.

STRICT RULES:
1. Identify major concepts, scientific methods, specific results, and tools.
2. Define clear relationships between these entities.
3. Keep the number of nodes between 10 and 20 for optimal visualization.
4. Ensure the graph is logically coherent and reflects the core findings of the text.

Input Text:
"""
{{{text}}}
"""

Please return a structured JSON response with "nodes" and "edges".`,
});

const extractKnowledgeGraphFlow = ai.defineFlow(
  {
    name: 'extractKnowledgeGraphFlow',
    inputSchema: ExtractGraphInputSchema,
    outputSchema: ExtractGraphOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    const { output } = await extractGraphPrompt(input, { model, config });
    return output!;
  }
);
