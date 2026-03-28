// 技能相关类型定义

export interface SkillInput {
  [key: string]: any;
}

export interface SkillOutput {
  success: boolean;
  data?: any;
  error?: string;
}

export type SkillFunction = (input: SkillInput) => Promise<SkillOutput>;
