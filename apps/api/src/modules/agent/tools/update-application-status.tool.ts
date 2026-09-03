import type { AgentTool } from '@jobpilot/agent-runtime';
import { z } from 'zod';
import type { AgentToolDataService } from '../agent-tool-data.service';
export const updateApplicationStatusTool = (service: AgentToolDataService): AgentTool => ({
  name: 'update_application_status',
  description: '更新投递状态',
  mode: 'write',
  executionMode: 'sequential',
  schema: z.object({ applicationId: z.string(), status: z.string() }),
  execute: (input: any, context) =>
    service.updateApplicationStatus(
      BigInt(context.userId),
      BigInt(input.applicationId),
      input.status,
    ),
});
