import { Injectable } from '@nestjs/common';
import { prisma } from '@jobpilot/database';

@Injectable()
export class AgentRunRepository {
  create(threadId: bigint, userId: bigint, input: string, model: string) {
    return prisma.agentRun.create({ data: { threadId, userId, input, model, status: 'CREATED' } });
  }
  start(id: bigint) {
    return prisma.agentRun.updateMany({
      where: { id, status: 'CREATED' },
      data: { status: 'RUNNING' },
    });
  }
  findOwned(id: bigint, userId: bigint) {
    return prisma.agentRun.findFirst({ where: { id, userId }, include: { toolCalls: true } });
  }
  complete(
    id: bigint,
    data: {
      output: string;
      turnCount: number;
      inputTokens: number;
      outputTokens: number;
      latencyMs: number;
    },
  ) {
    return prisma.agentRun.updateMany({
      where: { id, status: 'RUNNING' },
      data: { ...data, status: 'COMPLETED', completedAt: new Date() },
    });
  }
  fail(id: bigint, errorMessage: string, latencyMs: number) {
    return prisma.agentRun.updateMany({
      where: { id, status: 'RUNNING' },
      data: { status: 'FAILED', errorMessage, latencyMs, completedAt: new Date() },
    });
  }
  cancel(id: bigint, latencyMs: number) {
    return prisma.agentRun.updateMany({
      where: { id, status: 'RUNNING' },
      data: { status: 'CANCELLED', latencyMs, completedAt: new Date() },
    });
  }
}
