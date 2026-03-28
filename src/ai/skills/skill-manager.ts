'use server';

import { analyzeProject } from './project-analysis-skill';
import { generateCode } from './code-generation-skill';
import { generateDocumentation } from './documentation-skill';
import { createProject } from './project-creation-skill';
import { runLangChainAgent as runSimpleLangChainAgent } from './langchain-skill';
import { runLangChainAgent as runAdvancedLangChainAgent } from '../agents/langchain-agent';
import { runResearchCodeManager } from './research-code-manager-skill';
import { SkillInput, SkillOutput } from './types';

export type SkillType = 'project-analysis' | 'code-generation' | 'documentation' | 'project-creation' | 'langchain' | 'research-code-manager';

export interface SkillRequest {
  type: SkillType;
  input: SkillInput;
}

export async function runSkill(request: SkillRequest): Promise<SkillOutput> {
  try {
    switch (request.type) {
      case 'project-analysis':
        const projectAnalysisResult = await analyzeProject(request.input as any);
        return {
          success: true,
          data: projectAnalysisResult,
        };

      case 'code-generation':
        const codeGenerationResult = await generateCode(request.input as any);
        return {
          success: true,
          data: codeGenerationResult,
        };

      case 'documentation':
        const documentationResult = await generateDocumentation(request.input as any);
        return {
          success: true,
          data: documentationResult,
        };

      case 'project-creation':
        const projectCreationResult = await createProject(request.input as any);
        return {
          success: true,
          data: projectCreationResult,
        };

      case 'langchain':
        const { sessionId, input, chatHistory } = request.input as any;
        if (sessionId) {
          // 使用高级 LangChain agent
          const langchainResult = await runAdvancedLangChainAgent(sessionId, input || JSON.stringify(request.input), chatHistory || []);
          return langchainResult;
        } else {
          // 使用简单 LangChain agent
          const langchainResult = await runSimpleLangChainAgent(request.input as any);
          return langchainResult;
        }

      case 'research-code-manager':
        const researchCodeManagerResult = await runResearchCodeManager(request.input as any);
        return researchCodeManagerResult;

      default:
        return {
          success: false,
          error: 'Unknown skill type',
        };
    }
  } catch (error) {
    console.error('Skill Manager Error:', error);
    return {
      success: false,
      error: error instanceof Error ? error.message : 'Unknown error',
    };
  }
}

// 保持向后兼容
export type AgentType = SkillType;
export interface AgentRequest extends SkillRequest {}
export interface AgentResponse extends SkillOutput {}
export async function runAgent(request: AgentRequest): Promise<AgentResponse> {
  return runSkill(request);
}