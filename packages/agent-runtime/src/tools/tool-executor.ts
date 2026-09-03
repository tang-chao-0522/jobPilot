import type { AgentContext, AgentToolCall } from '../core/types';
import type { AgentEventEmitter } from '../core/events';
import type { Guardrail } from '../guardrails/guardrail';
import type { AgentTool } from './agent-tool';
import type { ToolExecutionHooks } from './tool-hooks';
import type { ToolResult } from './tool-result';
import { ToolRegistry } from './tool-registry';

export class ToolExecutor {
  constructor(
    private readonly registry: ToolRegistry,
    private readonly hooks: ToolExecutionHooks[] = [],
    private readonly guardrails: Guardrail[] = [],
  ) {}

  async execute(
    call: AgentToolCall,
    context: AgentContext,
    turn: number,
    signal: AbortSignal,
    emit: AgentEventEmitter,
  ): Promise<ToolResult> {
    const tool = this.registry.get(call.name);
    const startedAt = Date.now();
    await emit({
      type: 'tool_start',
      toolCallId: call.id,
      toolName: call.name,
      input: call.arguments,
      turn,
    });
    try {
      if (signal.aborted) throw signal.reason;
      for (const guardrail of this.guardrails)
        await guardrail.beforeToolCall?.(call, tool, context);
      const input = tool.schema.parse(call.arguments);
      for (const hook of this.hooks) await hook.beforeToolCall?.({ call, tool, turn });
      const data = await this.runWithRetry(tool, input, { ...context, signal }, signal);
      const result: ToolResult = {
        success: true,
        data,
        metadata: { latencyMs: Date.now() - startedAt },
      };
      for (const hook of this.hooks)
        await hook.afterToolCall?.({ call, tool, turn, result, latencyMs: Date.now() - startedAt });
      await emit({
        type: 'tool_end',
        toolCallId: call.id,
        toolName: call.name,
        result,
        success: true,
        turn,
        latencyMs: Date.now() - startedAt,
      });
      return result;
    } catch (cause) {
      const error = cause instanceof Error ? cause : new Error('工具执行失败');
      const result: ToolResult = {
        success: false,
        error: { code: 'TOOL_ERROR', message: error.message, retryable: tool.mode === 'read' },
        metadata: { latencyMs: Date.now() - startedAt },
      };
      for (const hook of this.hooks)
        await hook.onToolError?.({ call, tool, turn, error, latencyMs: Date.now() - startedAt });
      await emit({
        type: 'tool_end',
        toolCallId: call.id,
        toolName: call.name,
        result,
        success: false,
        turn,
        latencyMs: Date.now() - startedAt,
      });
      return result;
    }
  }

  private async runWithRetry(
    tool: AgentTool<any, any>,
    input: unknown,
    context: AgentContext & { signal: AbortSignal },
    signal: AbortSignal,
  ): Promise<unknown> {
    const attempts = tool.mode === 'read' ? 2 : 1;
    let lastError: unknown;
    for (let attempt = 0; attempt < attempts; attempt++) {
      try {
        return await tool.execute(input, context, signal);
      } catch (error) {
        lastError = error;
      }
    }
    throw lastError;
  }
}
