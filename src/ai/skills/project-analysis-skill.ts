'use server';

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';
import { SkillInput } from './types';

const ProjectAnalysisInputSchema = z.object({
  projectDescription: z.string().describe('项目描述'),
  existingCode: z.string().optional().describe('现有代码'),
  requirements: z.string().optional().describe('项目需求'),
});

type ProjectAnalysisInput = z.infer<typeof ProjectAnalysisInputSchema> & SkillInput;

const ProjectAnalysisOutputSchema = z.object({
  projectStructure: z.string().describe('项目结构分析'),
  technologyStack: z.string().describe('技术栈分析'),
  keyComponents: z.array(z.string()).describe('关键组件'),
  implementationPlan: z.string().describe('实施方案'),
  potentialChallenges: z.array(z.string()).describe('潜在挑战'),
});

type ProjectAnalysisOutput = z.infer<typeof ProjectAnalysisOutputSchema>;

async function generateWithCustomModel(config: any, system: string, prompt: string): Promise<string> {
  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: system },
        { role: 'user', content: prompt },
      ],
      temperature: config.temperature || 0.7,
      max_tokens: config.max_tokens || 8192,
    }),
  });

  if (!response.ok) {
    const errorText = await response.text();
    throw new Error(`Custom model API error: ${response.status} - ${errorText}`);
  }

  const data = await response.json();
  return data.choices[0].message.content;
}

export async function analyzeProject(input: ProjectAnalysisInput): Promise<ProjectAnalysisOutput> {
  return projectAnalysisFlow(input);
}

const projectAnalysisFlow = ai.defineFlow(
  {
    name: 'projectAnalysisFlow',
    inputSchema: ProjectAnalysisInputSchema,
    outputSchema: ProjectAnalysisOutputSchema,
  },
  async (input) => {
    try {
      const { model, config } = await getAiParams();
      
      const prompt = `
请分析以下项目并提供详细的项目梳理：

项目描述：${input.projectDescription}

现有代码：${input.existingCode || '无'}

项目需求：${input.requirements || '无'}

请输出以下内容：
1. 项目结构分析
2. 技术栈分析
3. 关键组件列表
4. 详细的实施方案
5. 潜在挑战列表
`;

      const systemPrompt = "你是一个专业的项目分析Agent，擅长分析项目需求、设计技术方案和制定实施计划。请基于提供的项目信息，提供详细、专业的项目分析报告。";

      let text: string;
      
      if (model === 'custom/model') {
        console.log('[ProjectAnalysis] Using custom model for generation');
        text = await generateWithCustomModel(config, systemPrompt, prompt);
      } else {
        const { text: generatedText } = await ai.generate({
          model,
          config: { ...config, temperature: 0.7 },
          system: systemPrompt,
          prompt: prompt,
        });
        text = generatedText;
      }

      // 解析生成的内容
      const lines = text.split('\n');
      let projectStructure = '';
      let technologyStack = '';
      let keyComponents: string[] = [];
      let implementationPlan = '';
      let potentialChallenges: string[] = [];

      let currentSection = '';
      for (const line of lines) {
        if (line.includes('项目结构分析')) {
          currentSection = 'projectStructure';
        } else if (line.includes('技术栈分析')) {
          currentSection = 'technologyStack';
        } else if (line.includes('关键组件')) {
          currentSection = 'keyComponents';
        } else if (line.includes('实施方案')) {
          currentSection = 'implementationPlan';
        } else if (line.includes('潜在挑战')) {
          currentSection = 'potentialChallenges';
        } else if (line.trim() && currentSection) {
          switch (currentSection) {
            case 'projectStructure':
              projectStructure += line + '\n';
              break;
            case 'technologyStack':
              technologyStack += line + '\n';
              break;
            case 'keyComponents':
              if (line.trim().startsWith('-')) {
                keyComponents.push(line.trim().substring(2));
              }
              break;
            case 'implementationPlan':
              implementationPlan += line + '\n';
              break;
            case 'potentialChallenges':
              if (line.trim().startsWith('-')) {
                potentialChallenges.push(line.trim().substring(2));
              }
              break;
          }
        }
      }

      return {
        projectStructure: projectStructure.trim(),
        technologyStack: technologyStack.trim(),
        keyComponents: keyComponents.length > 0 ? keyComponents : ['待确定'],
        implementationPlan: implementationPlan.trim(),
        potentialChallenges: potentialChallenges.length > 0 ? potentialChallenges : ['无明显挑战'],
      };
    } catch (error) {
      console.error('Project Analysis Agent Error:', error);
      return {
        projectStructure: '分析失败',
        technologyStack: '分析失败',
        keyComponents: ['分析失败'],
        implementationPlan: '分析失败',
        potentialChallenges: ['分析失败'],
      };
    }
  }
);
