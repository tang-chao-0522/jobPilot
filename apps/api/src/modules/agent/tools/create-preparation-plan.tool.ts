import type { AgentTool } from '@jobpilot/agent-runtime';
import { z } from 'zod';
import type { AgentToolDataService } from '../agent-tool-data.service';
export const createPreparationPlanTool = (service: AgentToolDataService): AgentTool => ({
  name: 'create_preparation_plan',
  description: '为职位创建求职准备计划',
  mode: 'write',
  executionMode: 'sequential',
  schema: z.object({ jobId: z.string(), days: z.number(), hoursPerDay: z.number() }),
  execute: (input: any, context) =>
    service.createPreparationPlan(
      BigInt(context.userId),
      BigInt(input.jobId),
      input.days,
      input.hoursPerDay,
    ),
});
