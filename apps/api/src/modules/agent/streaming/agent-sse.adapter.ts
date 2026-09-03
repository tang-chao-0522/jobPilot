import { Injectable, MessageEvent } from '@nestjs/common';
import type { AgentEvent } from '@jobpilot/agent-runtime';
import { map, Observable, ReplaySubject } from 'rxjs';

@Injectable()
export class AgentSseAdapter {
  private readonly streams = new Map<string, ReplaySubject<AgentEvent>>();
  create(runId: string): void {
    this.streams.set(runId, new ReplaySubject<AgentEvent>(100));
  }
  publish(runId: string, event: AgentEvent): void {
    this.streams.get(runId)?.next(event);
  }
  close(runId: string): void {
    this.streams.get(runId)?.complete();
    setTimeout(() => this.streams.delete(runId), 60_000);
  }
  stream(runId: string): Observable<MessageEvent> {
    const subject = this.streams.get(runId);
    if (!subject) throw new Error('Agent stream not found');
    return subject.pipe(map((data) => ({ data })));
  }
}
