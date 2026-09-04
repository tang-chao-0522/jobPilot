import { useCallback, useEffect, useRef, useState } from 'react';
import { api } from '../api';

interface AgentEvent {
  type: 'agent_start' | 'message_delta' | 'tool_start' | 'tool_end' | 'agent_end';
  delta?: string;
  toolName?: string;
  status?: 'completed' | 'failed' | 'cancelled';
  error?: string;
}

export function useAgentEventStream(onSettled: () => void | Promise<void>) {
  const [streamedText, setStreamedText] = useState('');
  const [isStreaming, setIsStreaming] = useState(false);
  const sourceRef = useRef<EventSource | null>(null);
  const runIdRef = useRef<string | undefined>(undefined);

  useEffect(() => () => sourceRef.current?.close(), []);

  const connect = useCallback(
    (runId: string) => {
      sourceRef.current?.close();
      runIdRef.current = runId;
      setIsStreaming(true);
      setStreamedText('正在思考...');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const token = encodeURIComponent(localStorage.getItem('token') || '');
      const source = new EventSource(`${apiUrl}/agent/runs/${runId}/stream?token=${token}`);
      sourceRef.current = source;
      let accumulated = '';

      source.onmessage = async (event) => {
        const payload = JSON.parse(event.data) as AgentEvent;
        if (payload.type === 'message_delta') {
          accumulated += payload.delta || '';
          setStreamedText(accumulated);
        } else if (payload.type === 'tool_start') {
          setStreamedText(`正在调用 ${payload.toolName}...`);
        } else if (payload.type === 'agent_end') {
          source.close();
          sourceRef.current = null;
          runIdRef.current = undefined;
          setIsStreaming(false);
          await onSettled();
          if (payload.status === 'failed') {
            setStreamedText(`执行失败：${payload.error || '请稍后重试'}`);
          } else {
            setStreamedText('');
          }
        }
      };
    },
    [onSettled],
  );

  const abort = useCallback(async () => {
    if (!runIdRef.current) return;
    await api.post(`/agent/runs/${runIdRef.current}/abort`);
  }, []);

  return { streamedText, isStreaming, connect, abort };
}
