import { useCallback, useEffect, useRef, useState } from 'react';

interface AgentEvent {
  type:
    | 'agent.started'
    | 'message.delta'
    | 'tool.started'
    | 'tool.completed'
    | 'agent.completed'
    | 'agent.error';
  delta?: string;
  tool?: string;
}

export function useAgentEventStream(onSettled: () => void) {
  const [streamedText, setStreamedText] = useState('');
  const sourceRef = useRef<EventSource | null>(null);

  useEffect(() => () => sourceRef.current?.close(), []);

  const connect = useCallback(
    (runId: string) => {
      sourceRef.current?.close();
      setStreamedText('正在思考...');
      const apiUrl = import.meta.env.VITE_API_URL || 'http://localhost:3000/api/v1';
      const token = encodeURIComponent(localStorage.getItem('token') || '');
      const source = new EventSource(`${apiUrl}/agent/runs/${runId}/stream?token=${token}`);
      sourceRef.current = source;
      let accumulated = '';

      source.onmessage = (event) => {
        const payload = JSON.parse(event.data) as AgentEvent;
        if (payload.type === 'message.delta') {
          accumulated += payload.delta || '';
          setStreamedText(accumulated);
        } else if (payload.type === 'tool.started') {
          setStreamedText(`正在调用 ${payload.tool}...`);
        } else if (payload.type === 'agent.completed' || payload.type === 'agent.error') {
          source.close();
          sourceRef.current = null;
          setStreamedText('');
          onSettled();
        }
      };
    },
    [onSettled],
  );

  return { streamedText, connect };
}
