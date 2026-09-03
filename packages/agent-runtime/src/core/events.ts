import type { AgentMessage } from './types';

export type AgentEvent =
  | { type: 'agent_start'; runId: string }
  | { type: 'turn_start'; turn: number }
  | { type: 'message_start'; messageId: string }
  | { type: 'message_delta'; delta: string }
  | { type: 'message_end'; message: AgentMessage }
  | { type: 'tool_start'; toolCallId: string; toolName: string; input: unknown; turn: number }
  | { type: 'tool_update'; toolCallId: string; message: string }
  | {
      type: 'tool_end';
      toolCallId: string;
      toolName: string;
      result: unknown;
      success: boolean;
      turn: number;
      latencyMs: number;
    }
  | { type: 'turn_end'; turn: number }
  | { type: 'agent_end'; status: 'completed' | 'failed' | 'cancelled'; error?: string };

export type AgentEventListener = (event: AgentEvent) => void | Promise<void>;
export type AgentEventEmitter = (event: AgentEvent) => Promise<void>;

export class EventBus {
  private readonly listeners = new Set<AgentEventListener>();

  subscribe(listener: AgentEventListener): () => void {
    this.listeners.add(listener);
    return () => this.listeners.delete(listener);
  }

  async emit(event: AgentEvent): Promise<void> {
    await Promise.all([...this.listeners].map((listener) => listener(event)));
  }
}
