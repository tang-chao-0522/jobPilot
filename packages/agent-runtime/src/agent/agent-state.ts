import type { AgentMessage } from '../core/types';
import type { AgentRuntimeError } from '../core/errors';

export interface AgentState {
  messages: AgentMessage[];
  streamingMessage?: AgentMessage;
  pendingToolCalls: Set<string>;
  status: 'idle' | 'running' | 'stopping' | 'error';
  currentTurn: number;
  error?: AgentRuntimeError | Error;
}
