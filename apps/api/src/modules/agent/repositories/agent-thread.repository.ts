import { Injectable } from '@nestjs/common';
import { prisma } from '@jobpilot/database';

@Injectable()
export class AgentThreadRepository {
  create(userId: bigint, title: string) {
    return prisma.agentThread.create({ data: { userId, title } });
  }
  list(userId: bigint) {
    return prisma.agentThread.findMany({ where: { userId }, orderBy: { updatedAt: 'desc' } });
  }
  findOwned(id: bigint, userId: bigint) {
    return prisma.agentThread.findFirst({ where: { id, userId } });
  }
}
