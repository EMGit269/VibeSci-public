'use server';

import { SkillInput, SkillOutput } from './types';

export interface ResearchCodeManagerInput extends SkillInput {
  action: 'analyze_structure' | 'visualize_deps' | 'generate_template' | 'generate_literature_review';
  projectPath?: string;
  projectName?: string;
  projectType?: 'deep-learning' | 'ml' | 'statistics' | 'numerical';
  outputPath?: string;
  literatureFile?: string;
  title?: string;
  structureFile?: string;
}

export type ResearchCodeManagerOutput = SkillOutput;

export async function runResearchCodeManager(input: ResearchCodeManagerInput): Promise<ResearchCodeManagerOutput> {
  try {
    const { action, projectPath, projectName, projectType, outputPath, literatureFile, title, structureFile } = input;

    let scriptName = '';
    let args: string[] = [];

    switch (action) {
      case 'analyze_structure':
        scriptName = 'analyze_structure.py';
        if (projectPath) args.push('--project-path', projectPath);
        if (outputPath) args.push('--output', outputPath);
        break;

      case 'visualize_deps':
        scriptName = 'visualize_deps.py';
        if (structureFile) args.push('--structure-file', structureFile);
        if (outputPath) args.push('--output', outputPath);
        break;

      case 'generate_template':
        scriptName = 'generate_template.py';
        if (projectName) args.push('--project-name', projectName);
        if (projectType) args.push('--type', projectType);
        if (outputPath) args.push('--output', outputPath);
        break;

      case 'generate_literature_review':
        scriptName = 'generate_literature_review.py';
        if (literatureFile) args.push('--literature-file', literatureFile);
        if (outputPath) args.push('--output', outputPath);
        if (title) args.push('--title', title);
        break;

      default:
        return {
          success: false,
          error: `Unknown action: ${action}`
        };
    }

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    try {
      const response = await fetch('/api/research-code-manager/execute', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ script: scriptName, args }),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      if (!response.ok) {
        const errorText = await response.text();
        return {
          success: false,
          error: `Script execution failed: ${errorText}`
        };
      }

      const result = await response.json();
      return result;
    } catch (error) {
      clearTimeout(timeoutId);
      throw error;
    }
  } catch (error) {
    console.error('Error running Research Code Manager:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Failed to run Research Code Manager'
    };
  }
}