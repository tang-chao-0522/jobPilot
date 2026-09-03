import type { AgentTool } from '@jobpilot/agent-runtime';
import { z } from 'zod';
import type { AgentToolDataService } from '../agent-tool-data.service';
export const listJobsTool = (service: AgentToolDataService): AgentTool => ({
  name: 'list_jobs',
  description: '列出职位，可按投递状态筛选',
  mode: 'read',
  executionMode: 'parallel',
  schema: z.object({ status: z.string().optional() }),
  execute: (input: any, context) => service.listJobs(BigInt(context.userId), input.status),
});
