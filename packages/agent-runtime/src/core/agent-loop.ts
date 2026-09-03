import { randomUUID } from 'crypto';
import { AgentAbortedError, AgentLimitError } from './errors';
import type { AgentEventEmitter } from './events';
import type { AgentContext, AgentLoopResult, AgentMessage, AgentToolCall } from './types';
import { transformContext, type ContextTransformer } from '../context/context-transformer';
import type { Guardrail } from '../guardrails/guardrail';
import type { ModelAdapter } from '../model/model-adapter';
import { ToolExecutor } from '../tools/tool-executor';
import { ToolRegistry } from '../tools/tool-registry';

export interface AgentLoopOptions {
  model: ModelAdapter;
  registry: ToolRegistry;
  contextTransformers: ContextTransformer[];
  guardrails: Guardrail[];
  toolExecutor: ToolExecutor;
  maxTurns: number;
  maxToolCalls: number;
  signal?: AbortSignal;
}

export async function runAgentLoop(
  messages: AgentMessage[],
  context: AgentContext,
  options: AgentLoopOptions,
  emit: AgentEventEmitter,
): Promise<AgentLoopResult> {
  let toolCallCount = 0;
  const usage = { inputTokens: 0, outputTokens: 0 };

  for (let turn = 1; turn <= options.maxTurns; turn++) {
    assertNotAborted(options.signal);
    await emit({ type: 'turn_start', turn });
    const modelMessages = await transformContext(messages, context, options.contextTransformers);
    let content = '';
    let toolCalls: AgentToolCall[] = [];
    const messageId = randomUUID();
    await emit({ type: 'message_start', messageId });

    for await (const event of options.model.stream({
      messages: modelMessages,
      tools: options.registry.getDefinitions(),
      signal: options.signal,
    })) {
      assertNotAborted(options.signal);
      if (event.type === 'text_delta') {
        content += event.delta;
        await emit({ type: 'message_delta', delta: event.delta });
      } else if (event.type === 'tool_calls') toolCalls = event.calls;
      else if (event.type === 'usage') {
        usage.inputTokens += event.inputTokens;
        usage.outputTokens += event.outputTokens;
      }
    }

    const assistantMessage: AgentMessage = { id: messageId, role: 'assistant', content, toolCalls };
    messages.push(assistantMessage);
    await emit({ type: 'message_end', message: assistantMessage });

    if (!toolCalls.length) {
      await emit({ type: 'turn_end', turn });
      return { message: assistantMessage, turnCount: turn, toolCallCount, usage };
    }
    if (toolCallCount + toolCalls.length > options.maxToolCalls)
      throw new AgentLimitError('MAX_TOOL_CALLS');
    toolCallCount += toolCalls.length;

    const results = await executeToolBatch(toolCalls, context, turn, options, emit);
    for (let index = 0; index < toolCalls.length; index++) {
      messages.push({
        role: 'tool',
        toolCallId: toolCalls[index].id,
        content: JSON.stringify(results[index]),
      });
    }
    await emit({ type: 'turn_end', turn });
    if (results.some((result) => result.terminate)) {
      return { message: assistantMessage, turnCount: turn, toolCallCount, usage };
    }
  }
  throw new AgentLimitError('MAX_TURNS');
}

async function executeToolBatch(
  calls: AgentToolCall[],
  context: AgentContext,
  turn: number,
  options: AgentLoopOptions,
  emit: AgentEventEmitter,
) {
  const results = new Array(calls.length);
  const parallelReads = calls
    .map((call, index) => ({ call, index }))
    .filter(({ call }) => {
      const tool = options.registry.get(call.name);
      return tool.mode === 'read' && tool.executionMode !== 'sequential';
    });
  await Promise.all(
    parallelReads.map(async ({ call, index }) => {
      results[index] = await options.toolExecutor.execute(
        call,
        context,
        turn,
        options.signal ?? new AbortController().signal,
        emit,
      );
    }),
  );
  for (const [index, call] of calls.entries()) {
    if (results[index]) continue;
    assertNotAborted(options.signal);
    results[index] = await options.toolExecutor.execute(
      call,
      context,
      turn,
      options.signal ?? new AbortController().signal,
      emit,
    );
  }
  return results;
}

function assertNotAborted(signal?: AbortSignal): void {
  if (signal?.aborted) throw new AgentAbortedError();
}
