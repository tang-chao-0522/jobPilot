import { useEffect, useRef } from 'react';
import { Bot } from 'lucide-react';

interface AgentMessage {
  id: string;
  role: 'USER' | 'ASSISTANT';
  content: string;
}

interface AgentConversationProps {
  messages: AgentMessage[];
  streamedText: string;
}

export function AgentConversation({ messages, streamedText }: AgentConversationProps) {
  const endRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ block: 'end' });
  }, [messages, streamedText]);

  return (
    <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain p-5 lg:p-8">
      <div className="flex min-h-full flex-col gap-5">
        {!messages.length && !streamedText ? (
          <div className="grid flex-1 place-items-center text-center">
            <div>
              <span className="mx-auto grid h-14 w-14 place-items-center rounded-2xl bg-mint text-brand">
                <Bot size={28} />
              </span>
              <h2 className="mt-4 text-lg font-semibold">今天想推进什么？</h2>
              <p className="subtle mt-2">试试：“我有哪些正在面试的职位？”</p>
            </div>
          </div>
        ) : (
          messages.map((message) => (
            <div
              key={message.id}
              className={`max-w-[80%] whitespace-pre-wrap rounded-2xl p-4 text-sm ${
                message.role === 'USER' ? 'ml-auto bg-brand text-white' : 'bg-gray-100'
              }`}
            >
              {message.content}
            </div>
          ))
        )}
        {streamedText && (
          <div className="max-w-[80%] whitespace-pre-wrap rounded-2xl bg-gray-100 p-4 text-sm">
            {streamedText}
          </div>
        )}
        <div ref={endRef} aria-hidden className="h-px shrink-0" />
      </div>
    </div>
  );
}
