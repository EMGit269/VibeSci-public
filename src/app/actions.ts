
'use server';

import { cookies } from 'next/headers';
import { generateCodeForTaskMethod, type GenerateCodeForTaskMethodInput } from '@/ai/flows/generate-code-for-task-method-flow';
import { generateDocumentationFromCode, type GenerateDocumentationFromCodeInput } from '@/ai/flows/generate-documentation-from-code-flow';
import { compareSolutionMethods, type CompareSolutionMethodsInput } from '@/ai/flows/compare-solution-methods';
import { suggestMethods } from '@/ai/flows/suggest-methods-flow';
import { analyzePlanning } from '@/ai/flows/analyze-planning-flow';
import { generateChatTitle } from '@/ai/flows/generate-chat-title-flow';
import { extractKnowledgeGraph } from '@/ai/flows/extract-knowledge-graph-flow';

/**
 * AI Model Settings
 */
export async function setSelectedModelAction(model: string) {
  try {
    const cookieStore = await cookies();
    cookieStore.set('preferred-ai-model', model, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function saveCustomAiSettingsAction(data: { apiKey: string, baseUrl?: string, modelId: string }) {
  try {
    const cookieStore = await cookies();
    cookieStore.set('custom-api-key', data.apiKey, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    if (data.baseUrl) {
      cookieStore.set('custom-base-url', data.baseUrl, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    } else {
      cookieStore.delete('custom-base-url');
    }
    cookieStore.set('custom-model-id', data.modelId, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

export async function syncGeminiKeyToCookieAction(key: string) {
  try {
    const cookieStore = await cookies();
    if (key) {
      cookieStore.set('user-gemini-key', key, { path: '/', maxAge: 60 * 60 * 24 * 30 });
    } else {
      cookieStore.delete('user-gemini-key');
    }
    return { success: true };
  } catch (e) {
    return { success: false };
  }
}

/**
 * AI Logic Actions (Pure AI Wrappers)
 */

export async function generateChatTitleAction(userMessage: string, assistantResponse: string) {
  try {
    const title = await generateChatTitle({ userMessage, assistantResponse });
    return { success: true, title };
  } catch (e) {
    return { success: false, title: userMessage.substring(0, 20) };
  }
}

export async function analyzePlanningAction(markdown: string) {
  try {
    const result = await analyzePlanning({ markdown });
    return { success: true, analysis: result };
  } catch (e) {
    return { success: false, message: e instanceof Error ? e.message : "Analysis failed" };
  }
}

export async function suggestMethodsAction(taskName: string, problemDescription: string) {
  try {
    const result = await suggestMethods({ taskName, problemDescription });
    return { success: true, data: result.suggestions };
  } catch (e) {
    return { success: false, error: 'Failed to suggest methods' };
  }
}

export async function compareMethodsAction(input: CompareSolutionMethodsInput) {
  try {
    const result = await compareSolutionMethods(input);
    return { success: true, data: result };
  } catch (e) {
    console.error("Comparison Action Error:", e);
    return { success: false, error: e instanceof Error ? e.message : 'Comparison failed' };
  }
}

export async function generateCodeAction(input: GenerateCodeForTaskMethodInput) {
  try {
    const result = await generateCodeForTaskMethod(input);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: 'Failed to generate code' };
  }
}

export async function generateDocsAction(input: GenerateDocumentationFromCodeInput) {
  try {
    const result = await generateDocumentationFromCode(input);
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: 'Failed to generate documentation' };
  }
}

export async function extractKnowledgeGraphAction(text: string) {
  try {
    const result = await extractKnowledgeGraph({ text });
    return { success: true, data: result };
  } catch (e) {
    return { success: false, error: 'Knowledge extraction failed' };
  }
}
