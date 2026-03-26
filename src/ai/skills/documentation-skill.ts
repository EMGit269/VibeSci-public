'use server';

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const DocumentationInputSchema = z.object({
  projectName: z.string().describe('项目名称'),
  projectDescription: z.string().describe('项目描述'),
  code: z.string().optional().describe('项目代码'),
  features: z.array(z.string()).optional().describe('项目功能'),
  audience: z.string().optional().describe('目标受众'),
});

type DocumentationInput = z.infer<typeof DocumentationInputSchema>;

const DocumentationOutputSchema = z.object({
  readme: z.string().describe('README文档'),
  installationGuide: z.string().describe('安装指南'),
  usageGuide: z.string().describe('使用指南'),
  apiDocumentation: z.string().describe('API文档'),
  troubleshooting: z.string().describe('故障排除'),
});

type DocumentationOutput = z.infer<typeof DocumentationOutputSchema>;

/**
 * 文档生成Agent
 * 用于自动生成项目文档
 */
export async function generateDocumentation(input: DocumentationInput): Promise<DocumentationOutput> {
  return documentationFlow(input);
}

const documentationFlow = ai.defineFlow(
  {
    name: 'documentationFlow',
    inputSchema: DocumentationInputSchema,
    outputSchema: DocumentationOutputSchema,
  },
  async (input) => {
    try {
      const { model, config } = await getAiParams();
      
      const prompt = `
请为以下项目生成完整的文档：

项目名称：${input.projectName}

项目描述：${input.projectDescription}

项目代码：${input.code || '无'}

项目功能：${input.features?.join(', ') || '无'}

目标受众：${input.audience || '开发者'}

请生成以下文档：
1. README文档：包含项目介绍、功能特性、安装步骤、使用方法等
2. 安装指南：详细的安装步骤
3. 使用指南：如何使用项目的详细说明
4. API文档：项目API的详细说明
5. 故障排除：常见问题及解决方案
`;

      const { text } = await ai.generate({
        model,
        config: { ...config, temperature: 0.7 },
        system: "你是一个专业的文档生成Agent，擅长为项目生成清晰、详细、专业的文档。请提供完整的文档内容，确保文档结构清晰，内容全面。",
        prompt: prompt,
      });

      // 解析生成的内容
      let readme = '';
      let installationGuide = '';
      let usageGuide = '';
      let apiDocumentation = '';
      let troubleshooting = '';

      let currentSection = '';
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('README')) {
          currentSection = 'readme';
        } else if (line.includes('安装指南')) {
          currentSection = 'installationGuide';
        } else if (line.includes('使用指南')) {
          currentSection = 'usageGuide';
        } else if (line.includes('API文档')) {
          currentSection = 'apiDocumentation';
        } else if (line.includes('故障排除')) {
          currentSection = 'troubleshooting';
        } else if (line.trim() && currentSection) {
          switch (currentSection) {
            case 'readme':
              readme += line + '\n';
              break;
            case 'installationGuide':
              installationGuide += line + '\n';
              break;
            case 'usageGuide':
              usageGuide += line + '\n';
              break;
            case 'apiDocumentation':
              apiDocumentation += line + '\n';
              break;
            case 'troubleshooting':
              troubleshooting += line + '\n';
              break;
          }
        }
      }

      return {
        readme: readme.trim(),
        installationGuide: installationGuide.trim(),
        usageGuide: usageGuide.trim(),
        apiDocumentation: apiDocumentation.trim(),
        troubleshooting: troubleshooting.trim(),
      };
    } catch (error) {
      console.error('Documentation Agent Error:', error);
      return {
        readme: '生成失败',
        installationGuide: '生成失败',
        usageGuide: '生成失败',
        apiDocumentation: '生成失败',
        troubleshooting: '生成失败',
      };
    }
  }
);
