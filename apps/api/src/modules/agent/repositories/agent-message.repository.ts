import { Injectable } from '@nestjs/common';
import { prisma } from '@jobpilot/database';
import type { AgentMessage } from '@jobpilot/agent-runtime';

@Injectable()
export class AgentMessageRepository {
  list(threadId: bigint, userId: bigint) {
    return prisma.agentMessage.findMany({
      where: { threadId, thread: { userId } },
      orderBy: { createdAt: 'asc' },
    });
  }
  async recent(threadId: bigint, limit = 20): Promise<AgentMessage[]> {
    const messages = await prisma.agentMessage.findMany({
      where: { threadId },
      orderBy: { createdAt: 'desc' },
      take: limit,
    });
    return messages.reverse().map((message) => ({
      role: message.role.toLowerCase() as AgentMessage['role'],
      content: message.content,
    }));
  }
  create(threadId: bigint, role: 'USER' | 'ASSISTANT' | 'TOOL' | 'SYSTEM', content: string) {
    return prisma.agentMessage.create({ data: { threadId, role, content } });
  }
}
