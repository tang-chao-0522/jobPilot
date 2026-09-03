import { Injectable } from '@nestjs/common';
import { prisma } from '@jobpilot/database';
import type { AgentEvent, AgentEventListener } from '@jobpilot/agent-runtime';

@Injectable()
export class MysqlTraceAdapter {
  private readonly calls = new Map<string, bigint>();

  listener(runId: bigint): AgentEventListener {
    return (event) => this.consume(runId, event);
  }

  private async consume(runId: bigint, event: AgentEvent): Promise<void> {
    if (event.type === 'tool_start') {
      const trace = await prisma.agentToolCall.create({
        data: {
          runId,
          turnIndex: event.turn,
          toolName: event.toolName,
          arguments: event.input as never,
          status: 'PENDING',
        },
      });
      await prisma.agentToolCall.updateMany({
        where: { id: trace.id, status: 'PENDING' },
        data: { status: 'RUNNING' },
      });
      this.calls.set(event.toolCallId, trace.id);
    }
    if (event.type === 'tool_end') {
      const id = this.calls.get(event.toolCallId);
      if (!id) return;
      await prisma.agentToolCall.updateMany({
        where: { id, status: 'RUNNING' },
        data: {
          result: event.result as never,
          status: event.success ? 'SUCCESS' : 'FAILED',
          latencyMs: event.latencyMs,
          completedAt: new Date(),
        },
      });
      this.calls.delete(event.toolCallId);
    }
  }
}
