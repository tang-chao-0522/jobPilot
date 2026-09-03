import type { AgentContext } from '../core/types';
import type { AgentToolCall } from '../core/types';
import type { AgentTool } from '../tools/agent-tool';

export interface Guardrail {
  validateInput?(input: string, context: AgentContext): Promise<void> | void;
  beforeToolCall?(
    call: AgentToolCall,
    tool: AgentTool<any, any>,
    context: AgentContext,
  ): Promise<void> | void;
}

export class PromptInjectionGuardrail implements Guardrail {
  validateInput(input: string): void {
    if (/ignore\s+(all|previous).*instructions|忽略.*(?:指令|提示词)/i.test(input)) {
      throw new Error('检测到可能的 Prompt Injection');
    }
  }
}
