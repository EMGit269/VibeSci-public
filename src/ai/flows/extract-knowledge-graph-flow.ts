
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
  prompt: `You are an expert knowledge engineer specializing in scientific research. Your task is to analyze the following research document text and extract a comprehensive knowledge graph representing the key entities and their relationships.

STRICT RULES:
1. Identify major concepts, scientific methods, specific results, tools, researchers, and theories.
2. Define clear, precise relationships between these entities (e.g., "uses", "depends on", "implements", "leads to", "contradicts").
3. Keep the number of nodes between 15 and 25 for optimal visualization and information richness.
4. Ensure the graph is logically coherent, hierarchically structured, and reflects the core findings of the text.
5. Use consistent naming conventions for nodes and relationships.
6. Prioritize entities that are central to the research topic.

Input Text:
"""
{{{text}}}
"""

Please return a structured JSON response with "nodes" and "edges". Ensure the response is valid JSON and contains only the graph data.`,
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
