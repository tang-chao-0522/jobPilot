import {
  BadRequestException,
  Body,
  Controller,
  Get,
  MessageEvent,
  Param,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import type { Observable } from 'rxjs';
import { JwtAuthGuard } from '../../auth';
import { JobPilotAgentSession } from './agent-session';
import { AgentMessageRepository } from './repositories/agent-message.repository';
import { AgentRunRepository } from './repositories/agent-run.repository';
import { AgentThreadRepository } from './repositories/agent-thread.repository';
import { AgentSseAdapter } from './streaming/agent-sse.adapter';

@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(
    private readonly session: JobPilotAgentSession,
    private readonly threads: AgentThreadRepository,
    private readonly messages: AgentMessageRepository,
    private readonly runs: AgentRunRepository,
    private readonly sse: AgentSseAdapter,
  ) {}
  @Post('threads') createThread(@Req() request: any, @Body() body: any) {
    return this.threads.create(request.user.id, body.title || '新的求职对话');
  }
  @Get('threads') listThreads(@Req() request: any) {
    return this.threads.list(request.user.id);
  }
  @Get('threads/:id/messages') listMessages(@Req() request: any, @Param('id') id: string) {
    return this.messages.list(BigInt(id), request.user.id);
  }
  @Post('runs') run(@Req() request: any, @Body() body: any) {
    return this.session.run({
      userId: request.user.id,
      threadId: BigInt(body.threadId),
      message: body.input,
    });
  }
  @Post('runs/:id/abort') abort(@Param('id') id: string) {
    if (!this.session.abort(id)) throw new BadRequestException('Agent 未在运行');
    return { success: true };
  }
  @Get('runs/:id') detail(@Req() request: any, @Param('id') id: string) {
    return this.runs.findOwned(BigInt(id), request.user.id);
  }
  @Sse('runs/:id/stream') stream(@Param('id') id: string): Observable<MessageEvent> {
    return this.sse.stream(id);
  }
}
