import { BadRequestException, Injectable } from '@nestjs/common';
import { AgentAbortedError, type Agent } from '@jobpilot/agent-runtime';
import { getModelConfig } from '../../config/model.config';
import { AgentFactory } from './agent.factory';
import { AgentMessageRepository } from './repositories/agent-message.repository';
import { AgentRunRepository } from './repositories/agent-run.repository';
import { AgentThreadRepository } from './repositories/agent-thread.repository';
import { AgentSseAdapter } from './streaming/agent-sse.adapter';
import { MysqlTraceAdapter } from './tracing/mysql-trace.adapter';

@Injectable()
export class JobPilotAgentSession {
  private readonly activeAgents = new Map<string, Agent>();

  constructor(
    private readonly factory: AgentFactory,
    private readonly threads: AgentThreadRepository,
    private readonly messages: AgentMessageRepository,
    private readonly runs: AgentRunRepository,
    private readonly sse: AgentSseAdapter,
    private readonly trace: MysqlTraceAdapter,
  ) {}

  async run(input: { userId: bigint; threadId: bigint; message: string }) {
    if (!(await this.threads.findOwned(input.threadId, input.userId)))
      throw new BadRequestException('对话不存在');
    const history = await this.messages.recent(input.threadId);
    const run = await this.runs.create(
      input.threadId,
      input.userId,
      input.message,
      getModelConfig().model,
    );
    await this.messages.create(input.threadId, 'USER', input.message);
    const runId = run.id.toString();
    this.sse.create(runId);
    const agent = this.factory.create(history, {
      userId: input.userId.toString(),
      threadId: input.threadId.toString(),
      runId,
      currentDate: new Date(),
    });
    agent.subscribe((event) => {
      if (event.type !== 'agent_end') this.sse.publish(runId, event);
    });
    agent.subscribe(this.trace.listener(run.id));
    this.activeAgents.set(runId, agent);
    await this.runs.start(run.id);
    void this.execute(agent, run.id, input.threadId, input.message, Date.now());
    return run;
  }

  abort(runId: string): boolean {
    const agent = this.activeAgents.get(runId);
    if (!agent) return false;
    agent.abort();
    return true;
  }

  private async execute(
    agent: Agent,
    runId: bigint,
    threadId: bigint,
    message: string,
    startedAt: number,
  ) {
    try {
      const result = await agent.prompt({ role: 'user', content: message });
      await this.messages.create(threadId, 'ASSISTANT', result.message.content);
      await this.runs.complete(runId, {
        output: result.message.content,
        turnCount: result.turnCount,
        inputTokens: result.usage.inputTokens,
        outputTokens: result.usage.outputTokens,
        latencyMs: Date.now() - startedAt,
      });
      this.sse.publish(runId.toString(), { type: 'agent_end', status: 'completed' });
    } catch (error) {
      const state = agent.getState();
      const reversedUserIndex = [...state.messages]
        .reverse()
        .findIndex((item) => item.role === 'user');
      const lastUserIndex =
        reversedUserIndex === -1 ? -1 : state.messages.length - reversedUserIndex - 1;
      const partialMessage =
        state.streamingMessage?.content ||
        state.messages
          .slice(lastUserIndex + 1)
          .reverse()
          .find((item) => item.role === 'assistant')?.content;
      if (partialMessage) await this.messages.create(threadId, 'ASSISTANT', partialMessage);

      if (error instanceof AgentAbortedError) {
        await this.runs.cancel(runId, Date.now() - startedAt);
        this.sse.publish(runId.toString(), { type: 'agent_end', status: 'cancelled' });
      } else {
        const errorMessage = error instanceof Error ? error.message : 'Agent 执行失败';
        await this.runs.fail(runId, errorMessage, Date.now() - startedAt);
        this.sse.publish(runId.toString(), {
          type: 'agent_end',
          status: 'failed',
          error: errorMessage,
        });
      }
    } finally {
      this.activeAgents.delete(runId.toString());
      this.sse.close(runId.toString());
    }
  }
}
