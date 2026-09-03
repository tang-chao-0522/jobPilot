import type { AgentToolCall } from '../core/types';
import type { AgentTool } from './agent-tool';
import type { ToolResult } from './tool-result';

export interface BeforeToolCallContext {
  call: AgentToolCall;
  tool: AgentTool<any, any>;
  turn: number;
}
export interface AfterToolCallContext extends BeforeToolCallContext {
  result: ToolResult;
  latencyMs: number;
}
export interface ToolErrorContext extends BeforeToolCallContext {
  error: Error;
  latencyMs: number;
}
export interface ToolExecutionHooks {
  beforeToolCall?(context: BeforeToolCallContext): Promise<void> | void;
  afterToolCall?(context: AfterToolCallContext): Promise<void> | void;
  onToolError?(context: ToolErrorContext): Promise<void> | void;
}
