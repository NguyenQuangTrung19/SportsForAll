export const SKILL_LEVELS = ['beginner', 'amateur', 'intermediate', 'advanced', 'pro'] as const;

export type SkillLevel = (typeof SKILL_LEVELS)[number];

export const SKILL_LEVEL_LABELS: Record<SkillLevel, string> = {
  beginner: 'Mới chơi',
  amateur: 'Nghiệp dư',
  intermediate: 'Trung bình',
  advanced: 'Khá',
  pro: 'Chuyên nghiệp',
};
