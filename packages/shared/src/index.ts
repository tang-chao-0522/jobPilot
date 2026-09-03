import { z } from 'zod';

export const applicationStatuses = [
  'WISHLIST',
  'APPLIED',
  'WRITTEN_TEST',
  'FIRST_INTERVIEW',
  'SECOND_INTERVIEW',
  'HR_INTERVIEW',
  'OFFER',
  'REJECTED',
  'WITHDRAWN',
] as const;
export type ApplicationStatus = (typeof applicationStatuses)[number];
export const resumeProfileSchema = z.object({
  basicInfo: z.record(z.unknown()).default({}),
  education: z
    .array(
      z.object({
        school: z.string(),
        major: z.string().default(''),
        degree: z.string().default(''),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
        description: z.string().optional(),
      }),
    )
    .default([]),
  skills: z
    .array(
      z.object({
        name: z.string(),
        category: z.string().default('技术'),
        level: z.string().default('intermediate'),
        years: z.number().optional(),
      }),
    )
    .default([]),
  internships: z
    .array(
      z.object({
        company: z.string(),
        position: z.string(),
        description: z.string().default(''),
        techStack: z.array(z.string()).default([]),
        startDate: z.string().optional(),
        endDate: z.string().optional(),
      }),
    )
    .default([]),
  projects: z
    .array(
      z.object({
        name: z.string(),
        role: z.string().default(''),
        description: z.string().default(''),
        techStack: z.array(z.string()).default([]),
        highlights: z.array(z.string()).default([]),
      }),
    )
    .default([]),
  awards: z.array(z.string()).default([]),
});
export const jdProfileSchema = z.object({
  requiredSkills: z.array(z.string()),
  preferredSkills: z.array(z.string()),
  responsibilities: z.array(z.string()),
  experienceRequirements: z.array(z.string()),
  keywords: z.array(z.string()),
  summary: z.string(),
});
export const matchResultSchema = z.object({
  skillScore: z.number().min(0).max(40),
  projectScore: z.number().min(0).max(30),
  experienceScore: z.number().min(0).max(15),
  educationScore: z.number().min(0).max(5),
  keywordScore: z.number().min(0).max(10),
  matchedSkills: z.array(z.string()),
  missingSkills: z.array(z.string()),
  projectMatches: z.array(
    z.object({ name: z.string(), relevance: z.number(), reason: z.string() }),
  ),
  risks: z.array(z.string()),
  suggestions: z.array(z.string()),
});
export type ResumeProfile = z.infer<typeof resumeProfileSchema>;
export type JdProfile = z.infer<typeof jdProfileSchema>;
export type MatchResult = z.infer<typeof matchResultSchema> & { totalScore: number };
