import type { AgentTool } from '@jobpilot/agent-runtime';
import { z } from 'zod';
import type { AgentToolDataService } from '../agent-tool-data.service';
export const getMatchAnalysisTool = (service: AgentToolDataService): AgentTool => ({
  name: 'get_match_analysis',
  description: '获取职位最近一次匹配分析',
  mode: 'read',
  executionMode: 'parallel',
  schema: z.object({ jobId: z.string() }),
  execute: (input: any, context) =>
    service.getMatchAnalysis(BigInt(context.userId), BigInt(input.jobId)),
});
