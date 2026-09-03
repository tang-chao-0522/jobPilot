import type { AgentTool } from '@jobpilot/agent-runtime';
import { z } from 'zod';
import type { AgentToolDataService } from '../agent-tool-data.service';
export const listPreparationTasksTool = (service: AgentToolDataService): AgentTool => ({
  name: 'list_preparation_tasks',
  description: '列出准备任务',
  mode: 'read',
  executionMode: 'parallel',
  schema: z.object({ range: z.string().optional(), jobId: z.string().optional() }),
  execute: (input: any, context) =>
    service.listPreparationTasks(
      BigInt(context.userId),
      input.jobId ? BigInt(input.jobId) : undefined,
    ),
});
