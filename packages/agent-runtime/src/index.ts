import OpenAI from 'openai';
import type { ZodType } from 'zod';

export type Message = {
  role: 'system' | 'user' | 'assistant' | 'tool';
  content: string;
  toolCallId?: string;
  toolCalls?: ToolCall[];
};
export type ToolCall = { id: string; name: string; arguments: unknown };
export type ModelResponse = {
  text?: string;
  toolCalls?: ToolCall[];
  usage?: { input: number; output: number };
};
export interface ModelAdapter {
  generate(request: { messages: Message[]; tools: ToolDefinition[] }): Promise<ModelResponse>;
}
export interface Agent {
  id: string;
  name: string;
  instructions: string;
  tools: string[];
  maxTurns: number;
}
export interface AgentContext {
  userId: string;
  threadId: string;
  runId: string;
  messages: Message[];
  metadata?: Record<string, unknown>;
}
export interface Tool<T = unknown, R = unknown> {
  name: string;
  description: string;
  permission: 'READ' | 'WRITE';
  schema: ZodType<T>;
  execute(input: T, context: AgentContext): Promise<R>;
}
export type ToolDefinition = {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
};
export interface TraceSink {
  onTurn?(turn: number): Promise<void> | void;
  onTool?(e: {
    turn: number;
    tool: string;
    args: unknown;
    result?: unknown;
    error?: string;
    latencyMs: number;
  }): Promise<void> | void;
}

export class ToolRegistry {
  private tools = new Map<string, Tool<any, any>>();
  register<T, R>(tool: Tool<T, R>) {
    this.tools.set(tool.name, tool);
    return this;
  }
  get(name: string) {
    return this.tools.get(name);
  }
  definitions(names: string[]): ToolDefinition[] {
    return names
      .map((n) => this.tools.get(n))
      .filter(Boolean)
      .map((t) => ({
        type: 'function',
        function: { name: t!.name, description: t!.description, parameters: zodToJson(t!.schema) },
      }));
  }
}
function zodToJson(schema: ZodType): Record<string, unknown> {
  const shape = (schema as any)._def?.shape?.();
  if (!shape) return { type: 'object', properties: {} };
  const properties: Record<string, unknown> = {};
  for (const [key, value] of Object.entries(shape)) {
    const def = (value as any)._def;
    let type = 'string';
    if (def?.typeName === 'ZodNumber') type = 'number';
    if (def?.typeName === 'ZodBoolean') type = 'boolean';
    properties[key] = { type, description: def?.description };
  }
  return { type: 'object', properties, additionalProperties: false };
}
export class Guardrail {
  constructor(private maxToolCalls = 10) {}
  validateInput(input: string) {
    if (/ignore\s+(all|previous).*instructions|忽略.*指令/i.test(input))
      throw new Error('检测到可能的 Prompt Injection');
  }
  validateTool(agent: Agent, name: string, count: number) {
    if (!agent.tools.includes(name)) throw new Error(`未授权工具: ${name}`);
    if (count >= this.maxToolCalls) throw new Error('工具调用次数已达上限');
  }
}
export class ToolExecutor {
  constructor(
    private registry: ToolRegistry,
    private guardrail: Guardrail,
    private trace?: TraceSink,
  ) {}
  async execute(call: ToolCall, context: AgentContext, agent: Agent, turn: number, count: number) {
    this.guardrail.validateTool(agent, call.name, count);
    const tool = this.registry.get(call.name);
    if (!tool) throw new Error(`工具不存在: ${call.name}`);
    const started = Date.now();
    try {
      const input = tool.schema.parse(call.arguments);
      const result = await tool.execute(input, context);
      await this.trace?.onTool?.({
        turn,
        tool: call.name,
        args: input,
        result,
        latencyMs: Date.now() - started,
      });
      return { success: true, data: result };
    } catch (e) {
      const error = e instanceof Error ? e.message : '工具执行失败';
      await this.trace?.onTool?.({
        turn,
        tool: call.name,
        args: call.arguments,
        error,
        latencyMs: Date.now() - started,
      });
      return { success: false, error: { code: 'TOOL_ERROR', message: error } };
    }
  }
}
export class OpenAIAdapter implements ModelAdapter {
  private client: OpenAI;
  constructor(private model = process.env.OPENAI_MODEL || 'gpt-4o-mini') {
    this.client = new OpenAI({
      apiKey: process.env.OPENAI_API_KEY || 'missing',
      baseURL: process.env.OPENAI_BASE_URL,
    });
  }
  async generate(request: {
    messages: Message[];
    tools: ToolDefinition[];
  }): Promise<ModelResponse> {
    if (!process.env.OPENAI_API_KEY)
      return {
        text: '尚未配置 OPENAI_API_KEY。业务功能可以正常使用；配置密钥后即可启用智能 Agent 对话。',
      };
    const messages: any[] = request.messages.map((m) => {
      if (m.role === 'tool') {
        return { role: 'tool', tool_call_id: m.toolCallId!, content: m.content };
      }
      if (m.role === 'assistant' && m.toolCalls?.length) {
        return {
          role: 'assistant',
          content: m.content || null,
          tool_calls: m.toolCalls.map((call) => ({
            id: call.id,
            type: 'function',
            function: { name: call.name, arguments: JSON.stringify(call.arguments) },
          })),
        };
      }
      return { role: m.role, content: m.content };
    });
    const response = await this.client.chat.completions.create({
      model: this.model,
      messages,
      tools: request.tools as any,
      tool_choice: 'auto',
    });
    const msg = response.choices[0]?.message;
    return {
      text: msg?.content || undefined,
      toolCalls: msg?.tool_calls?.map((c: any) => ({
        id: c.id,
        name: c.function.name,
        arguments: JSON.parse(c.function.arguments),
      })),
      usage: {
        input: response.usage?.prompt_tokens || 0,
        output: response.usage?.completion_tokens || 0,
      },
    };
  }
}
export class AgentRunner {
  constructor(
    private model: ModelAdapter,
    private registry: ToolRegistry,
    private guardrail = new Guardrail(),
    private trace?: TraceSink,
  ) {}
  async run(input: { agent: Agent; context: AgentContext; onEvent?: (event: any) => void }) {
    const { agent, context, onEvent } = input;
    this.guardrail.validateInput(context.messages.at(-1)?.content || '');
    let toolCount = 0;
    const usage = { input: 0, output: 0 };
    for (let turn = 1; turn <= agent.maxTurns; turn++) {
      await this.trace?.onTurn?.(turn);
      const response = await this.model.generate({
        messages: [{ role: 'system', content: agent.instructions }, ...context.messages],
        tools: this.registry.definitions(agent.tools),
      });
      usage.input += response.usage?.input || 0;
      usage.output += response.usage?.output || 0;
      if (!response.toolCalls?.length) return { text: response.text || '', turnCount: turn, usage };
      context.messages.push({
        role: 'assistant',
        content: response.text || '',
        toolCalls: response.toolCalls,
      });
      for (const call of response.toolCalls) {
        onEvent?.({ type: 'tool.started', tool: call.name });
        const result = await new ToolExecutor(this.registry, this.guardrail, this.trace).execute(
          call,
          context,
          agent,
          turn,
          toolCount++,
        );
        onEvent?.({ type: 'tool.completed', tool: call.name });
        context.messages.push({
          role: 'tool',
          toolCallId: call.id,
          content: JSON.stringify(result),
        });
      }
    }
    throw new Error('Agent 已达到最大轮次');
  }
}
export const jobPilotAgent: Agent = {
  id: 'jobpilot',
  name: 'JobPilot AI 求职助手',
  maxTurns: 8,
  tools: [
    'get_resume_profile',
    'get_job_detail',
    'list_jobs',
    'get_match_analysis',
    'create_preparation_plan',
    'list_preparation_tasks',
    'update_preparation_task',
    'update_application_status',
  ],
  instructions: `Role\n你是 JobPilot AI 求职助手。\nGoal\n帮助用户分析职位、管理求职进度和制定准备计划。\nRules\n1. 涉及用户业务数据时优先调用 Tool，不允许猜测。2. 不虚构简历或 JD。3. 修改数据前必须有明确意图。4. Tool 错误最多重试一次。5. 仅调用注册工具。6. 必须使用 Tool 返回的 ID。7. 数据不足时明确说明。`,
};
