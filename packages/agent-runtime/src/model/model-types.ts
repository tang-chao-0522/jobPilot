import type { AgentMessage, AgentToolCall } from '../core/types';

export interface ModelToolDefinition {
  type: 'function';
  function: { name: string; description: string; parameters: Record<string, unknown> };
}

export interface ModelRequest {
  messages: AgentMessage[];
  tools: ModelToolDefinition[];
  signal?: AbortSignal;
}

export type ModelEvent =
  | { type: 'text_delta'; delta: string }
  | { type: 'tool_calls'; calls: AgentToolCall[] }
  | { type: 'usage'; inputTokens: number; outputTokens: number }
  | { type: 'done' };
