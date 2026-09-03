import type { AgentTool } from './agent-tool';
import type { ModelToolDefinition } from '../model/model-types';

export class ToolRegistry {
  private readonly tools = new Map<string, AgentTool<any, any>>();

  register<TInput, TOutput>(tool: AgentTool<TInput, TOutput>): this {
    if (this.tools.has(tool.name)) throw new Error(`Duplicate tool: ${tool.name}`);
    this.tools.set(tool.name, tool);
    return this;
  }

  get(name: string): AgentTool<any, any> {
    const tool = this.tools.get(name);
    if (!tool) throw new Error(`Unknown tool: ${name}`);
    return tool;
  }

  list(): AgentTool<any, any>[] {
    return [...this.tools.values()];
  }

  getDefinitions(): ModelToolDefinition[] {
    return this.list().map((tool) => ({
      type: 'function',
      function: {
        name: tool.name,
        description: tool.description,
        parameters: zodToJson(tool.schema),
      },
    }));
  }
}

function zodToJson(schema: any): Record<string, unknown> {
  const shape = schema?._def?.shape?.();
  if (!shape) return { type: 'object', properties: {}, additionalProperties: false };
  const properties: Record<string, unknown> = {};
  const required: string[] = [];
  for (const [name, value] of Object.entries(shape)) {
    const definition = (value as any)._def;
    let type = 'string';
    if (definition?.typeName === 'ZodNumber') type = 'number';
    if (definition?.typeName === 'ZodBoolean') type = 'boolean';
    properties[name] = { type, description: definition?.description };
    if (!['ZodOptional', 'ZodDefault'].includes(definition?.typeName)) required.push(name);
  }
  return { type: 'object', properties, required, additionalProperties: false };
}
