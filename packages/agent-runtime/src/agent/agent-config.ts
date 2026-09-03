import type { ContextTransformer } from '../context/context-transformer';
import type { Guardrail } from '../guardrails/guardrail';
import type { ModelAdapter } from '../model/model-adapter';
import type { ToolExecutionHooks } from '../tools/tool-hooks';
import type { ToolRegistry } from '../tools/tool-registry';

export interface AgentConfig {
  name: string;
  instructions: string;
  model: ModelAdapter;
  registry: ToolRegistry;
  maxTurns: number;
  maxToolCalls: number;
  contextTransformers: ContextTransformer[];
  guardrails: Guardrail[];
  toolHooks?: ToolExecutionHooks[];
}
