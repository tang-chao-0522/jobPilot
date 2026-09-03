import type { AgentTool } from '@jobpilot/agent-runtime';
import { z } from 'zod';
import type { AgentToolDataService } from '../agent-tool-data.service';
export const getJobDetailTool = (service: AgentToolDataService): AgentTool => ({
  name: 'get_job_detail',
  description: '获取职位、JD、匹配和投递详情',
  mode: 'read',
  executionMode: 'parallel',
  schema: z.object({ jobId: z.string() }),
  execute: (input: any, context) =>
    service.getJobDetail(BigInt(context.userId), BigInt(input.jobId)),
});
