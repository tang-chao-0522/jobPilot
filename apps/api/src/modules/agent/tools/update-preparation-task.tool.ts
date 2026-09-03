import type { AgentTool } from '@jobpilot/agent-runtime';
import { z } from 'zod';
import type { AgentToolDataService } from '../agent-tool-data.service';
export const updatePreparationTaskTool = (service: AgentToolDataService): AgentTool => ({
  name: 'update_preparation_task',
  description: '完成任务或调整日期和时长',
  mode: 'write',
  executionMode: 'sequential',
  schema: z.object({
    taskId: z.string(),
    completed: z.boolean().optional(),
    scheduledDate: z.string().optional(),
    estimatedMinutes: z.number().optional(),
  }),
  execute: (input: any, context) =>
    service.updatePreparationTask(BigInt(context.userId), BigInt(input.taskId), input),
});
