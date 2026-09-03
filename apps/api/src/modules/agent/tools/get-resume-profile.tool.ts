import type { AgentTool } from '@jobpilot/agent-runtime';
import { z } from 'zod';
import type { AgentToolDataService } from '../agent-tool-data.service';
export const getResumeProfileTool = (service: AgentToolDataService): AgentTool => ({
  name: 'get_resume_profile',
  description: '获取当前用户的主简历画像',
  mode: 'read',
  executionMode: 'parallel',
  schema: z.object({}),
  execute: (_input, context) => service.getResumeProfile(BigInt(context.userId)),
});
