import type { AgentContext, AgentMessage } from '../../core/types';
import type { ContextTransformer } from '../context-transformer';

export class RecentMessagesTransformer implements ContextTransformer {
  constructor(private readonly limit = 20) {}
  async transform(messages: AgentMessage[], _context: AgentContext): Promise<AgentMessage[]> {
    const system = messages.filter((message) => message.role === 'system');
    const conversation = messages.filter((message) => message.role !== 'system').slice(-this.limit);
    return [...system, ...conversation];
  }
}
