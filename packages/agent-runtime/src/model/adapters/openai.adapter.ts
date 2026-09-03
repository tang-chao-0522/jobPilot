import OpenAI from 'openai';
import type { AgentMessage } from '../../core/types';
import type { ModelAdapter } from '../model-adapter';
import type { ModelEvent, ModelRequest } from '../model-types';

export interface OpenAIModelConfig {
  apiKey: string;
  baseUrl: string;
  model: string;
}

export class OpenAIModelAdapter implements ModelAdapter {
  readonly modelId: string;
  private readonly client: OpenAI;

  constructor(private readonly config: OpenAIModelConfig) {
    this.modelId = config.model;
    this.client = new OpenAI({
      apiKey: config.apiKey || 'not-configured',
      baseURL: config.baseUrl,
    });
  }

  async *stream(request: ModelRequest): AsyncIterable<ModelEvent> {
    if (!this.config.apiKey) {
      yield { type: 'text_delta', delta: '尚未配置模型 API Key，请先修改本地环境配置。' };
      yield { type: 'done' };
      return;
    }

    const response = await this.client.chat.completions.create(
      {
        model: this.config.model,
        messages: request.messages.map(toProviderMessage) as never,
        tools: request.tools as never,
        tool_choice: 'auto',
        stream: true,
        stream_options: { include_usage: true },
      },
      { signal: request.signal },
    );

    const toolCalls = new Map<number, { id: string; name: string; arguments: string }>();
    for await (const chunk of response) {
      const delta = chunk.choices[0]?.delta;
      if (delta?.content) yield { type: 'text_delta', delta: delta.content };
      for (const toolCall of delta?.tool_calls ?? []) {
        const current = toolCalls.get(toolCall.index) ?? { id: '', name: '', arguments: '' };
        if (toolCall.id) current.id = toolCall.id;
        if (toolCall.function?.name) current.name += toolCall.function.name;
        if (toolCall.function?.arguments) current.arguments += toolCall.function.arguments;
        toolCalls.set(toolCall.index, current);
      }
      if (chunk.usage) {
        yield {
          type: 'usage',
          inputTokens: chunk.usage.prompt_tokens,
          outputTokens: chunk.usage.completion_tokens,
        };
      }
    }

    if (toolCalls.size) {
      yield {
        type: 'tool_calls',
        calls: [...toolCalls.entries()]
          .sort(([left], [right]) => left - right)
          .map(([, call]) => ({
            id: call.id,
            name: call.name,
            arguments: JSON.parse(call.arguments || '{}'),
          })),
      };
    }
    yield { type: 'done' };
  }
}

function toProviderMessage(message: AgentMessage): unknown {
  if (message.role === 'tool') {
    return { role: 'tool', tool_call_id: message.toolCallId, content: message.content };
  }
  if (message.role === 'assistant' && message.toolCalls?.length) {
    return {
      role: 'assistant',
      content: message.content || null,
      tool_calls: message.toolCalls.map((call) => ({
        id: call.id,
        type: 'function',
        function: { name: call.name, arguments: JSON.stringify(call.arguments) },
      })),
    };
  }
  return { role: message.role, content: message.content };
}
