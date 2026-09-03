import type { AgentContext, AgentToolCall } from '../core/types';
import type { AgentTool } from '../tools/agent-tool';
import type { Guardrail } from './guardrail';

export class ToolPermissionGuardrail implements Guardrail {
  constructor(private readonly allowedTools: ReadonlySet<string>) {}
  beforeToolCall(call: AgentToolCall, _tool: AgentTool, _context: AgentContext): void {
    if (!this.allowedTools.has(call.name)) throw new Error(`未授权工具: ${call.name}`);
  }
}
