'use server';
/**
 * @fileOverview A Genkit flow for analyzing research planning markdown for logic gaps and complexity.
 */

import { ai, getAiParams } from '@/ai/genkit';
import { z } from 'genkit';

const AnalysisItemSchema = z.object({
  step: z.string().describe('The specific task or method step being analyzed.'),
  explanation: z.string().describe('A detailed explanation of the issue found.'),
});

const AnalyzePlanningInputSchema = z.object({
  markdown: z.string().describe('The research planning content in Markdown.'),
});
export type AnalyzePlanningInput = z.infer<typeof AnalyzePlanningInputSchema>;

const AnalyzePlanningOutputSchema = z.object({
  errors: z.array(AnalysisItemSchema).describe('Logic gaps or missing steps that would prevent execution.'),
  warnings: z.array(AnalysisItemSchema).describe('Steps that are technically challenging or require significant resources.'),
});
export type AnalyzePlanningOutput = z.infer<typeof AnalyzePlanningOutputSchema>;

async function analyzeWithCustomModel(config: any, markdown: string): Promise<AnalyzePlanningOutput> {
  const prompt = `你是一位专业的科学审计师和研究架构师。你的目标是分析研究计划并识别科学路线图中的潜在问题。

严格聚焦：
- 专注于研究路线的逻辑。（例如：任务B依赖于任务A但安排在任务A之前？方法是否科学合理地解决问题？）
- 忽略低级别代码细节或语法。不要陷入实现片段的细节中。
- 错误标准：只标记会使研究进展无效的重大逻辑漏洞（例如：在定义任何数据获取方法之前分析数据）。
- 警告标准：如果问题较小，或只是代表一个困难但可能的步骤，则将其标记为警告。
- 保持解释简短明了：专注于核心问题，避免不必要的细节。
- 直接切入主题：直截了当地指出问题，不要有介绍或冗长解释。

输入研究计划：
"""
${markdown}
"""

请返回结构化的JSON响应，将问题分类为errors和warnings。如果没有发现问题，返回空数组。

JSON输出格式：
{
  "errors": [
    {
      "step": "任务/方法名称",
      "explanation": "简短、聚焦的错误解释"
    }
  ],
  "warnings": [
    {
      "step": "任务/方法名称",
      "explanation": "简短、聚焦的警告解释"
    }
  ]
}`;

  const response = await fetch(`${config.baseUrl}/chat/completions`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      'Authorization': `Bearer ${config.apiKey}`,
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: 'system', content: 'You are an expert scientific auditor and research architect.' },
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
  const content = data.choices[0]?.message?.content;
  
  if (!content) {
    throw new Error('No response from custom model');
  }

  // 提取 JSON 部分
  const jsonMatch = content.match(/\{[\s\S]*\}/);
  if (!jsonMatch) {
    throw new Error('No JSON found in response');
  }

  try {
    const result = JSON.parse(jsonMatch[0]);
    return {
      errors: result.errors || [],
      warnings: result.warnings || []
    };
  } catch (e) {
    throw new Error('Invalid JSON response');
  }
}

export async function analyzePlanning(input: AnalyzePlanningInput): Promise<AnalyzePlanningOutput> {
  return analyzePlanningFlow(input);
}

const analyzePlanningPrompt = ai.definePrompt({
  name: 'analyzePlanningPrompt',
  input: { schema: AnalyzePlanningInputSchema },
  output: { schema: AnalyzePlanningOutputSchema },
  prompt: `你是一位专业的科学审计师和研究架构师。你的目标是分析研究计划并识别科学路线图中的潜在问题。

严格聚焦：
- 专注于研究路线的逻辑。（例如：任务B依赖于任务A但安排在任务A之前？方法是否科学合理地解决问题？）
- 忽略低级别代码细节或语法。不要陷入实现片段的细节中。
- 错误标准：只标记会使研究进展无效的重大逻辑漏洞（例如：在定义任何数据获取方法之前分析数据）。
- 警告标准：如果问题较小，或只是代表一个困难但可能的步骤，则将其标记为警告。
- 保持解释简短明了：专注于核心问题，避免不必要的细节。
- 直接切入主题：直截了当地指出问题，不要有介绍或冗长解释。

输入研究计划：
"""
{{{markdown}}}
"""

请返回结构化的JSON响应，将问题分类为errors和warnings。如果没有发现问题，返回空数组。`, 
});

const analyzePlanningFlow = ai.defineFlow(
  {
    name: 'analyzePlanningFlow',
    inputSchema: AnalyzePlanningInputSchema,
    outputSchema: AnalyzePlanningOutputSchema,
  },
  async (input) => {
    const { model, config } = await getAiParams();
    
    if (model === 'custom/model') {
      console.log('[Analyze Planning] Using custom model');
      return await analyzeWithCustomModel(config, input.markdown);
    } else {
      console.log('[Analyze Planning] Using Genkit');
      try {
        const { output } = await analyzePlanningPrompt(input, { model, config });
        return output!;
      } catch (e) {
        console.error('Genkit analysis error:', e);
        // 回退到自定义模型
        console.log('[Analyze Planning] Falling back to custom model');
        return await analyzeWithCustomModel(config, input.markdown);
      }
    }
  }
);