import { randomUUID } from 'crypto';
import { AgentAbortedError } from '../core/errors';
import { EventBus, type AgentEventListener } from '../core/events';
import { runAgentLoop } from '../core/agent-loop';
import type { AgentContext, AgentLoopResult, AgentMessage } from '../core/types';
import { ToolExecutor } from '../tools/tool-executor';
import type { AgentConfig } from './agent-config';
import type { AgentState } from './agent-state';

export class Agent {
  private readonly events = new EventBus();
  private abortController?: AbortController;
  private readonly state: AgentState;
  private pendingSteering?: AgentMessage;

  constructor(
    private readonly config: AgentConfig,
    messages: AgentMessage[],
    private readonly context: AgentContext,
  ) {
    this.state = {
      messages: [...messages],
      pendingToolCalls: new Set(),
      status: 'idle',
      currentTurn: 0,
    };
    this.events.subscribe((event) => this.reduce(event));
  }

  async prompt(message: AgentMessage): Promise<AgentLoopResult> {
    if (this.state.status === 'running') throw new Error('Agent is already running');
    this.abortController = new AbortController();
    this.state.messages.push(message);
    this.state.status = 'running';
    await this.events.emit({ type: 'agent_start', runId: this.context.runId });
    try {
      for (const guardrail of this.config.guardrails) {
        await guardrail.validateInput?.(message.content, this.context);
      }
      const result = await runAgentLoop(
        [{ role: 'system', content: this.config.instructions }, ...this.state.messages],
        this.context,
        {
          ...this.config,
          toolExecutor: new ToolExecutor(
            this.config.registry,
            this.config.toolHooks,
            this.config.guardrails,
          ),
          signal: this.abortController.signal,
        },
        (event) => this.events.emit(event),
      );
      await this.events.emit({ type: 'agent_end', status: 'completed' });
      return result;
    } catch (error) {
      const cancelled = error instanceof AgentAbortedError || this.abortController.signal.aborted;
      this.state.error = error instanceof Error ? error : new Error('Agent failed');
      await this.events.emit({
        type: 'agent_end',
        status: cancelled ? 'cancelled' : 'failed',
        error: this.state.error.message,
      });
      throw error;
    }
  }

  abort(): void {
    if (this.state.status !== 'running') return;
    this.state.status = 'stopping';
    this.abortController?.abort(new AgentAbortedError());
  }

  steer(message: AgentMessage): void {
    this.pendingSteering = message;
  }

  subscribe(listener: AgentEventListener): () => void {
    return this.events.subscribe(listener);
  }

  getState(): Readonly<AgentState> {
    return this.state;
  }

  private reduce(event: Parameters<AgentEventListener>[0]): void {
    if (event.type === 'turn_start') this.state.currentTurn = event.turn;
    if (event.type === 'message_start')
      this.state.streamingMessage = {
        id: event.messageId || randomUUID(),
        role: 'assistant',
        content: '',
      };
    if (event.type === 'message_delta' && this.state.streamingMessage)
      this.state.streamingMessage.content += event.delta;
    if (event.type === 'message_end') {
      this.state.messages.push(event.message);
      this.state.streamingMessage = undefined;
    }
    if (event.type === 'tool_start') this.state.pendingToolCalls.add(event.toolCallId);
    if (event.type === 'tool_end') this.state.pendingToolCalls.delete(event.toolCallId);
    if (event.type === 'turn_end' && this.pendingSteering) {
      this.state.messages.push(this.pendingSteering);
      this.pendingSteering = undefined;
    }
    if (event.type === 'agent_end')
      this.state.status = event.status === 'failed' ? 'error' : 'idle';
  }
}
