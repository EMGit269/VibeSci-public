'use server';

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';
import { SkillInput } from './types';

const CodeGenerationInputSchema = z.object({
  taskDescription: z.string().describe('任务描述'),
  language: z.string().describe('编程语言'),
  framework: z.string().optional().describe('框架'),
  requirements: z.string().optional().describe('具体要求'),
  existingCode: z.string().optional().describe('现有代码'),
});

type CodeGenerationInput = z.infer<typeof CodeGenerationInputSchema> & SkillInput;

const CodeGenerationOutputSchema = z.object({
  code: z.string().describe('生成的代码'),
  explanation: z.string().describe('代码解释'),
  dependencies: z.array(z.string()).describe('依赖项'),
  usage: z.string().describe('使用说明'),
});

type CodeGenerationOutput = z.infer<typeof CodeGenerationOutputSchema>;

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

export async function generateCode(input: CodeGenerationInput): Promise<CodeGenerationOutput> {
  return codeGenerationFlow(input);
}

const codeGenerationFlow = ai.defineFlow(
  {
    name: 'codeGenerationFlow',
    inputSchema: CodeGenerationInputSchema,
    outputSchema: CodeGenerationOutputSchema,
  },
  async (input) => {
    try {
      const { model, config } = await getAiParams();
      
      const prompt = `
请根据以下需求生成${input.language}代码：

任务描述：${input.taskDescription}

编程语言：${input.language}

框架：${input.framework || '无'}

具体要求：${input.requirements || '无'}

现有代码：${input.existingCode || '无'}

请输出完整的代码，并提供代码解释、依赖项和使用说明。
`;

      const systemPrompt = "你是一个专业的代码生成Agent，擅长根据需求生成高质量、可运行的代码。请提供完整的代码实现，并确保代码符合最佳实践和规范。";

      let text: string;
      if (model === 'custom/model') {
        console.log('[CodeGeneration] Using custom model for generation');
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
      let code = '';
      let explanation = '';
      let dependencies: string[] = [];
      let usage = '';

      let currentSection = '';
      const lines = text.split('\n');
      for (const line of lines) {
        if (line.includes('```')) {
          if (currentSection === 'code') {
            currentSection = '';
          } else {
            currentSection = 'code';
          }
        } else if (line.includes('代码解释')) {
          currentSection = 'explanation';
        } else if (line.includes('依赖项')) {
          currentSection = 'dependencies';
        } else if (line.includes('使用说明')) {
          currentSection = 'usage';
        } else if (line.trim() && currentSection) {
          switch (currentSection) {
            case 'code':
              code += line + '\n';
              break;
            case 'explanation':
              explanation += line + '\n';
              break;
            case 'dependencies':
              if (line.trim().startsWith('-')) {
                dependencies.push(line.trim().substring(2));
              }
              break;
            case 'usage':
              usage += line + '\n';
              break;
          }
        }
      }

      return {
        code: code.trim(),
        explanation: explanation.trim(),
        dependencies: dependencies.length > 0 ? dependencies : ['无特殊依赖'],
        usage: usage.trim(),
      };
    } catch (error) {
      console.error('Code Generation Agent Error:', error);
      return {
        code: '// 生成失败',
        explanation: '生成失败',
        dependencies: ['生成失败'],
        usage: '生成失败',
      };
    }
  }
);
