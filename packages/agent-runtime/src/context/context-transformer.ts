import type { AgentContext, AgentMessage } from '../core/types';

export interface ContextTransformer {
  transform(messages: AgentMessage[], context: AgentContext): Promise<AgentMessage[]>;
}

export async function transformContext(
  messages: AgentMessage[],
  context: AgentContext,
  transformers: ContextTransformer[],
): Promise<AgentMessage[]> {
  let result = [...messages];
  for (const transformer of transformers) result = await transformer.transform(result, context);
  return result;
}
