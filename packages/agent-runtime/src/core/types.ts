export type AgentMessageRole = 'system' | 'user' | 'assistant' | 'tool';

export interface AgentToolCall {
  id: string;
  name: string;
  arguments: unknown;
}

export interface AgentMessage {
  id?: string;
  role: AgentMessageRole;
  content: string;
  toolCallId?: string;
  toolCalls?: AgentToolCall[];
}

export interface AgentContext {
  userId: string;
  threadId: string;
  runId: string;
  currentDate: Date;
  metadata?: Record<string, unknown>;
}

export interface AgentLoopResult {
  message: AgentMessage;
  turnCount: number;
  toolCallCount: number;
  usage: { inputTokens: number; outputTokens: number };
}
