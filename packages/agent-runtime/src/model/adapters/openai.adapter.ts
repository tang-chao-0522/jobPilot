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
        stream: false,
      },
      { signal: request.signal },
    );
    const message = response.choices[0]?.message;
    if (message?.content) yield { type: 'text_delta', delta: message.content };
    if (message?.tool_calls?.length) {
      yield {
        type: 'tool_calls',
        calls: message.tool_calls
          .filter((call) => call.type === 'function')
          .map((call) => ({
            id: call.id,
            name: call.function.name,
            arguments: JSON.parse(call.function.arguments),
          })),
      };
    }
    if (response.usage) {
      yield {
        type: 'usage',
        inputTokens: response.usage.prompt_tokens,
        outputTokens: response.usage.completion_tokens,
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
