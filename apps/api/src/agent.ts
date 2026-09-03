import {
  BadRequestException,
  Body,
  Controller,
  Get,
  Injectable,
  MessageEvent,
  Param,
  Post,
  Req,
  Sse,
  UseGuards,
} from '@nestjs/common';
import { Observable, ReplaySubject, map } from 'rxjs';
import { prisma } from '@jobpilot/database';
import {
  AgentRunner,
  Guardrail,
  OpenAIAdapter,
  ToolRegistry,
  jobPilotAgent,
  type AgentContext,
  type TraceSink,
} from '@jobpilot/agent-runtime';
import { z } from 'zod';
import { JwtAuthGuard } from './auth';
import { BusinessService } from './business';
@Injectable()
export class AgentService {
  streams = new Map<string, ReplaySubject<any>>();
  constructor(private business: BusinessService) {}
  private registry() {
    const r = new ToolRegistry();
    r.register({
      name: 'get_resume_profile',
      description: '获取当前用户的主简历画像',
      permission: 'READ',
      schema: z.object({}),
      execute: async (_, c) =>
        prisma.resume.findFirst({
          where: { userId: BigInt(c.userId), isPrimary: true },
          include: { skills: true, projects: true, experiences: true, educations: true },
        }),
    });
    r.register({
      name: 'get_job_detail',
      description: '根据 jobId 获取职位详情、解析结果和匹配分析',
      permission: 'READ',
      schema: z.object({ jobId: z.string() }),
      execute: async (i, c) =>
        prisma.job.findFirst({
          where: { id: BigInt(i.jobId), userId: BigInt(c.userId) },
          include: {
            skills: true,
            matches: { take: 1, orderBy: { createdAt: 'desc' } },
            application: true,
          },
        }),
    });
    r.register({
      name: 'list_jobs',
      description: '列出职位，可按投递状态筛选',
      permission: 'READ',
      schema: z.object({ status: z.string().optional() }),
      execute: async (i, c) =>
        prisma.job.findMany({
          where: {
            userId: BigInt(c.userId),
            ...(i.status ? { application: { status: i.status } } : {}),
          },
          include: { application: true, matches: { take: 1, orderBy: { createdAt: 'desc' } } },
        }),
    });
    r.register({
      name: 'get_match_analysis',
      description: '获取指定职位最近一次匹配分析',
      permission: 'READ',
      schema: z.object({ jobId: z.string() }),
      execute: async (i, c) =>
        prisma.matchAnalysis.findFirst({
          where: { jobId: BigInt(i.jobId), userId: BigInt(c.userId) },
          orderBy: { createdAt: 'desc' },
        }),
    });
    r.register({
      name: 'create_preparation_plan',
      description: '为职位创建求职准备计划',
      permission: 'WRITE',
      schema: z.object({ jobId: z.string(), days: z.number(), hoursPerDay: z.number() }),
      execute: (i, c) =>
        this.business.plan(BigInt(c.userId), BigInt(i.jobId), i.days, i.hoursPerDay),
    });
    r.register({
      name: 'list_preparation_tasks',
      description: '列出准备任务',
      permission: 'READ',
      schema: z.object({ range: z.string().optional(), jobId: z.string().optional() }),
      execute: async (i, c) =>
        prisma.preparationTask.findMany({
          where: {
            userId: BigInt(c.userId),
            ...(i.jobId ? { plan: { jobId: BigInt(i.jobId) } } : {}),
          },
          orderBy: { scheduledDate: 'asc' },
        }),
    });
    r.register({
      name: 'update_preparation_task',
      description: '完成任务或调整日期和时长',
      permission: 'WRITE',
      schema: z.object({
        taskId: z.string(),
        completed: z.boolean().optional(),
        scheduledDate: z.string().optional(),
        estimatedMinutes: z.number().optional(),
      }),
      execute: async (i, c) =>
        prisma.preparationTask.updateMany({
          where: { id: BigInt(i.taskId), userId: BigInt(c.userId) },
          data: {
            completed: i.completed,
            completedAt: i.completed ? new Date() : undefined,
            scheduledDate: i.scheduledDate ? new Date(i.scheduledDate) : undefined,
            estimatedMinutes: i.estimatedMinutes,
          },
        }),
    });
    r.register({
      name: 'update_application_status',
      description: '更新投递状态',
      permission: 'WRITE',
      schema: z.object({ applicationId: z.string(), status: z.string() }),
      execute: async (i, c) =>
        prisma.application.updateMany({
          where: { id: BigInt(i.applicationId), userId: BigInt(c.userId) },
          data: { status: i.status },
        }),
    });
    return r;
  }
  async start(uid: bigint, threadId: bigint, input: string) {
    const thread = await prisma.agentThread.findFirst({ where: { id: threadId, userId: uid } });
    if (!thread) throw new BadRequestException('对话不存在');
    const run = await prisma.agentRun.create({
      data: { threadId, userId: uid, input, model: process.env.OPENAI_MODEL || 'gpt-4o-mini' },
    });
    await prisma.agentMessage.create({ data: { threadId, role: 'USER', content: input } });
    const subject = new ReplaySubject<any>(50);
    this.streams.set(run.id.toString(), subject);
    void this.execute(run.id, uid, threadId, input, subject);
    return run;
  }
  private async execute(
    runId: bigint,
    uid: bigint,
    threadId: bigint,
    input: string,
    s: ReplaySubject<any>,
  ) {
    const started = Date.now();
    s.next({ type: 'agent.started', runId: runId.toString() });
    try {
      const history = await prisma.agentMessage.findMany({
        where: { threadId },
        orderBy: { createdAt: 'desc' },
        take: 20,
      });
      const trace: TraceSink = {
        onTool: async (e) => {
          await prisma.agentToolCall.create({
            data: {
              runId,
              turnIndex: e.turn,
              toolName: e.tool,
              arguments: e.args as any,
              result: e.result as any,
              status: e.error ? 'FAILED' : 'SUCCESS',
              latencyMs: e.latencyMs,
              errorMessage: e.error,
              completedAt: new Date(),
            },
          });
        },
      };
      const context: AgentContext = {
        userId: uid.toString(),
        threadId: threadId.toString(),
        runId: runId.toString(),
        messages: history
          .reverse()
          .slice(0, -1)
          .map((m) => ({ role: m.role.toLowerCase() as any, content: m.content }))
          .concat({ role: 'user', content: input }),
      };
      const out = await new AgentRunner(
        new OpenAIAdapter(),
        this.registry(),
        new Guardrail(10),
        trace,
      ).run({ agent: jobPilotAgent, context, onEvent: (e) => s.next(e) });
      await prisma.$transaction([
        prisma.agentMessage.create({ data: { threadId, role: 'ASSISTANT', content: out.text } }),
        prisma.agentRun.update({
          where: { id: runId },
          data: {
            status: 'COMPLETED',
            output: out.text,
            turnCount: out.turnCount,
            inputTokens: out.usage.input,
            outputTokens: out.usage.output,
            latencyMs: Date.now() - started,
            completedAt: new Date(),
          },
        }),
      ]);
      for (const part of out.text.match(/.{1,24}/gs) || []) {
        s.next({ type: 'message.delta', delta: part });
      }
      s.next({ type: 'agent.completed', output: out.text });
      s.complete();
    } catch (e) {
      const msg = e instanceof Error ? e.message : 'Agent 运行失败';
      await prisma.agentRun.update({
        where: { id: runId },
        data: {
          status: 'FAILED',
          errorMessage: msg,
          latencyMs: Date.now() - started,
          completedAt: new Date(),
        },
      });
      s.next({ type: 'agent.error', error: msg });
      s.complete();
    }
  }
}
@UseGuards(JwtAuthGuard)
@Controller('agent')
export class AgentController {
  constructor(private s: AgentService) {}
  @Post('threads') thread(@Req() r: any, @Body() b: any) {
    return prisma.agentThread.create({
      data: { userId: r.user.id, title: b.title || '新的求职对话' },
    });
  }
  @Get('threads') threads(@Req() r: any) {
    return prisma.agentThread.findMany({
      where: { userId: r.user.id },
      orderBy: { updatedAt: 'desc' },
    });
  }
  @Get('threads/:id/messages') messages(@Req() r: any, @Param('id') id: string) {
    return prisma.agentMessage.findMany({
      where: { threadId: BigInt(id), thread: { userId: r.user.id } },
      orderBy: { createdAt: 'asc' },
    });
  }
  @Post('runs') run(@Req() r: any, @Body() b: any) {
    return this.s.start(r.user.id, BigInt(b.threadId), b.input);
  }
  @Get('runs/:id') detail(@Req() r: any, @Param('id') id: string) {
    return prisma.agentRun.findFirst({
      where: { id: BigInt(id), userId: r.user.id },
      include: { toolCalls: true },
    });
  }
  @Sse('runs/:id/stream') stream(@Param('id') id: string): Observable<MessageEvent> {
    const subject = this.s.streams.get(id);
    if (!subject) throw new BadRequestException('流不存在或已结束');
    return subject.pipe(map((data) => ({ data }) as MessageEvent));
  }
}
