import type { ZodType } from 'zod';
import type { AgentContext } from '../core/types';

export type ToolMode = 'read' | 'write';
export type ToolExecutionMode = 'parallel' | 'sequential';
export type ToolContext = AgentContext & { signal: AbortSignal };

export interface AgentTool<TInput = unknown, TOutput = unknown> {
  name: string;
  description: string;
  schema: ZodType<TInput>;
  mode: ToolMode;
  executionMode?: ToolExecutionMode;
  execute(input: TInput, context: ToolContext, signal: AbortSignal): Promise<TOutput>;
}
