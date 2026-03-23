
import { config } from 'dotenv';
config();

import '@/ai/flows/generate-documentation-from-code-flow.ts';
import '@/ai/flows/generate-code-for-task-method-flow.ts';
import '@/ai/flows/compare-solution-methods.ts';
import '@/ai/flows/suggest-methods-flow.ts';
import '@/ai/flows/chat-flow.ts';
import '@/ai/flows/refine-planning-flow.ts';
import '@/ai/flows/parse-planning-flow.ts';
import '@/ai/flows/analyze-planning-flow.ts';
import '@/ai/flows/extract-knowledge-graph-flow.ts';
