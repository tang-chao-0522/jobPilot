import { Injectable } from '@nestjs/common';
import {
  Agent,
  OpenAIModelAdapter,
  PromptInjectionGuardrail,
  RecentMessagesTransformer,
  ToolPermissionGuardrail,
  ToolRegistry,
  type AgentContext,
  type AgentMessage,
} from '@jobpilot/agent-runtime';
import { getEnvironment } from '../../config/environment';
import { getModelConfig } from '../../config/model.config';
import { AgentToolDataService } from './agent-tool-data.service';
import { getResumeProfileTool } from './tools/get-resume-profile.tool';
import { getJobDetailTool } from './tools/get-job-detail.tool';
import { listJobsTool } from './tools/list-jobs.tool';
import { getMatchAnalysisTool } from './tools/get-match-analysis.tool';
import { createPreparationPlanTool } from './tools/create-preparation-plan.tool';
import { listPreparationTasksTool } from './tools/list-preparation-tasks.tool';
import { updatePreparationTaskTool } from './tools/update-preparation-task.tool';
import { updateApplicationStatusTool } from './tools/update-application-status.tool';

const JOB_PILOT_SYSTEM_PROMPT = `Role
你是 JobPilot AI 求职助手。
Goal
帮助用户分析职位、管理求职进度和制定准备计划。
Rules
1. 涉及用户业务数据时优先调用 Tool，不允许猜测。
2. 不虚构简历或 JD。
3. 修改业务数据前必须确认用户有明确意图。
4. 必须使用 Tool 返回的 ID，不猜测数据库 ID。
5. 数据不足时明确说明。`;

@Injectable()
export class AgentFactory {
  constructor(private readonly dataService: AgentToolDataService) {}

  create(messages: AgentMessage[], context: AgentContext): Agent {
    const environment = getEnvironment();
    const registry = new ToolRegistry();
    [
      getResumeProfileTool(this.dataService),
      getJobDetailTool(this.dataService),
      listJobsTool(this.dataService),
      getMatchAnalysisTool(this.dataService),
      createPreparationPlanTool(this.dataService),
      listPreparationTasksTool(this.dataService),
      updatePreparationTaskTool(this.dataService),
      updateApplicationStatusTool(this.dataService),
    ].forEach((tool) => registry.register(tool));

    return new Agent(
      {
        name: 'jobpilot-agent',
        instructions: JOB_PILOT_SYSTEM_PROMPT,
        model: new OpenAIModelAdapter(getModelConfig()),
        registry,
        maxTurns: environment.AGENT_MAX_TURNS,
        maxToolCalls: environment.AGENT_MAX_TOOL_CALLS,
        contextTransformers: [new RecentMessagesTransformer(20)],
        guardrails: [
          new PromptInjectionGuardrail(),
          new ToolPermissionGuardrail(new Set(registry.list().map((tool) => tool.name))),
        ],
      },
      messages,
      context,
    );
  }
}
