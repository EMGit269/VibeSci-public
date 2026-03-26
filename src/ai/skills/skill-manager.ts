'use server';

import { analyzeProject } from './project-analysis-skill';
import { generateCode } from './code-generation-skill';
import { generateDocumentation } from './documentation-skill';
import { createProject } from './project-creation-skill';
import { runLangChainAgent } from './langchain-skill';
import { runAcademicPaperSearchAgent } from './academic-paper-search-skill';

export type AgentType = 'project-analysis' | 'code-generation' | 'documentation' | 'project-creation' | 'langchain' | 'academic-paper-search';

export interface AgentRequest {
  type: AgentType;
  input: any;
}

export interface AgentResponse {
  success: boolean;
  data?: any;
  error?: string;
}

/**
 * Agent管理器
 * 用于管理和调度不同的agent
 */
export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  try {
    switch (request.type) {
      case 'project-analysis':
        const projectAnalysisResult = await analyzeProject(request.input);
        return {
          success: true,
          data: projectAnalysisResult,
        };
      
      case 'code-generation':
        const codeGenerationResult = await generateCode(request.input);
        return {
          success: true,
          data: codeGenerationResult,
        };
      
      case 'documentation':
        const documentationResult = await generateDocumentation(request.input);
        return {
          success: true,
          data: documentationResult,
        };
      
      case 'project-creation':
        const projectCreationResult = await createProject(request.input);
        return {
          success: true,
          data: projectCreationResult,
        };
      
      case 'langchain':
        const langchainResult = await runLangChainAgent(request.input);
        return langchainResult;
      
      case 'academic-paper-search':
        const academicPaperSearchResult = await runAcademicPaperSearchAgent(request.input);
        return academicPaperSearchResult;
      
      default:
        return {
          success: false,
          error: 'Unknown agent type',
        };
    }
  } catch (error) {
    console.error('Agent Manager Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}
