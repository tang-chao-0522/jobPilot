import {
  BadRequestException,
  Body,
  Controller,
  Delete,
  Get,
  Injectable,
  Param,
  Patch,
  Post,
  Put,
  Query,
  Req,
  UploadedFile,
  UseGuards,
  UseInterceptors,
} from '@nestjs/common';
import { FileInterceptor } from '@nestjs/platform-express';
import { prisma } from '@jobpilot/database';
import { JwtAuthGuard } from './auth';
import { jdProfileSchema, matchResultSchema, resumeProfileSchema } from '@jobpilot/shared';
import OpenAI from 'openai';
import { mkdir, writeFile } from 'fs/promises';
import { join, extname } from 'path';
import { randomUUID } from 'crypto';
import pdfParse from 'pdf-parse';
import mammoth from 'mammoth';
import { getModelConfig } from './config/model.config';
const json = (x: any) => x as any;
const arr = (x: any) => (Array.isArray(x) ? x : []);
const date = (x?: string) => (x ? new Date(x) : undefined);
@Injectable()
export class BusinessService {
  private async structured<T>(schema: any, name: string, prompt: string, fallback: T): Promise<T> {
    const modelConfig = getModelConfig();
    if (!modelConfig.apiKey) return fallback;
    const client = new OpenAI({
      apiKey: modelConfig.apiKey,
      baseURL: modelConfig.baseUrl,
    });
    const r = await client.chat.completions.create({
      model: modelConfig.model,
      messages: [
        { role: 'system', content: '只输出符合要求的 JSON，不要 Markdown。' },
        { role: 'user', content: prompt },
      ],
      response_format: { type: 'json_object' },
    });
    return schema.parse(JSON.parse(r.choices[0]?.message.content || '{}'));
  }
  private skills(text: string) {
    const known = [
      'JavaScript',
      'TypeScript',
      'React',
      'Vue',
      'Angular',
      'Node.js',
      'NestJS',
      'Java',
      'Python',
      'Go',
      'MySQL',
      'PostgreSQL',
      'Redis',
      'Docker',
      'Kubernetes',
      'Git',
      'Webpack',
      'Vite',
      'SSE',
      'WebSocket',
    ];
    return known.filter((x) => new RegExp(x.replace('.', '\\.'), 'i').test(text));
  }
  async dashboard(uid: bigint) {
    const [apps, tasks, jobs] = await Promise.all([
      prisma.application.findMany({
        where: { userId: uid },
        include: { job: true },
        orderBy: { updatedAt: 'desc' },
      }),
      prisma.preparationTask.findMany({
        where: { userId: uid, scheduledDate: { gte: new Date(new Date().toDateString()) } },
        take: 5,
        orderBy: { scheduledDate: 'asc' },
      }),
      prisma.job.count({ where: { userId: uid } }),
    ]);
    return {
      jobs,
      applications: apps.length,
      interviews: apps.filter((a) => a.status.includes('INTERVIEW')).length,
      offers: apps.filter((a) => a.status === 'OFFER').length,
      tasks,
      recent: apps.slice(0, 5),
    };
  }
  async upload(uid: bigint, file: Express.Multer.File) {
    if (!file) throw new BadRequestException('请选择文件');
    const ext = extname(file.originalname).toLowerCase();
    if (!['.pdf', '.docx'].includes(ext) || file.size > 10 * 1024 * 1024)
      throw new BadRequestException('仅支持 10MB 内的 PDF/DOCX');
    let text = '';
    if (ext === '.pdf') text = (await pdfParse(file.buffer)).text;
    else text = (await mammoth.extractRawText({ buffer: file.buffer })).value;
    await mkdir(join(process.cwd(), 'uploads'), { recursive: true });
    const path = join('uploads', randomUUID() + ext);
    await writeFile(join(process.cwd(), path), file.buffer);
    const r = await prisma.resume.create({
      data: {
        userId: uid,
        name: file.originalname,
        fileUrl: path,
        fileType: ext.slice(1),
        rawText: text,
        isPrimary: (await prisma.resume.count({ where: { userId: uid } })) === 0,
      },
    });
    return r;
  }
  async parseResume(uid: bigint, id: bigint) {
    const r = await prisma.resume.findFirst({ where: { id, userId: uid } });
    if (!r) throw new BadRequestException('简历不存在');
    const sk = this.skills(r.rawText);
    const fallback = {
      basicInfo: {},
      education: [],
      skills: sk.map((name) => ({ name, category: '技术', level: 'intermediate' })),
      internships: [],
      projects: [],
      awards: [],
    };
    const p = await this.structured(
      resumeProfileSchema,
      'resume',
      `提取简历结构化信息：${r.rawText.slice(0, 15000)}`,
      fallback,
    );
    await prisma.$transaction([
      prisma.resumeSkill.deleteMany({ where: { resumeId: id } }),
      prisma.resume.update({
        where: { id },
        data: {
          profile: json(p),
          summary: `已识别 ${p.skills.length} 项技能`,
          parseStatus: 'COMPLETED',
        },
      }),
      ...p.skills.map((s) =>
        prisma.resumeSkill.create({
          data: {
            resumeId: id,
            name: s.name,
            category: s.category,
            level: s.level,
            years: 'years' in s && typeof s.years === 'number' ? s.years : undefined,
          },
        }),
      ),
    ]);
    return p;
  }
  async analyzeJob(uid: bigint, id: bigint) {
    const j = await prisma.job.findFirst({ where: { id, userId: uid } });
    if (!j) throw new BadRequestException('职位不存在');
    const sk = this.skills(j.description);
    const fallback = {
      requiredSkills: sk.slice(0, 5),
      preferredSkills: sk.slice(5),
      responsibilities: j.description.split(/\n/).filter(Boolean).slice(0, 5),
      experienceRequirements: [],
      keywords: sk,
      summary: `${j.company} · ${j.title}`,
    };
    const p = await this.structured(jdProfileSchema, 'jd', `解析 JD：${j.description}`, fallback);
    await prisma.$transaction([
      prisma.jobSkill.deleteMany({ where: { jobId: id } }),
      prisma.job.update({
        where: { id },
        data: {
          parsedSummary: p.summary,
          responsibilities: json(p.responsibilities),
          requirements: json(p.experienceRequirements),
          keywords: json(p.keywords),
          analysisStatus: 'COMPLETED',
        },
      }),
      ...p.requiredSkills.map((name) =>
        prisma.jobSkill.create({ data: { jobId: id, name, type: 'REQUIRED' } }),
      ),
      ...p.preferredSkills.map((name) =>
        prisma.jobSkill.create({ data: { jobId: id, name, type: 'PREFERRED' } }),
      ),
    ]);
    return p;
  }
  async match(uid: bigint, id: bigint) {
    const [job, resume] = await Promise.all([
      prisma.job.findFirst({ where: { id, userId: uid }, include: { skills: true } }),
      prisma.resume.findFirst({
        where: { userId: uid, isPrimary: true },
        include: { skills: true, projects: true, experiences: true, educations: true },
      }),
    ]);
    if (!job || !resume) throw new BadRequestException('请先添加职位并设置主简历');
    const own = new Set(resume.skills.map((s) => s.name.toLowerCase())),
      required = job.skills.filter((s) => s.type === 'REQUIRED').map((s) => s.name);
    const matched = required.filter((s) => own.has(s.toLowerCase())),
      missing = required.filter((s) => !own.has(s.toLowerCase()));
    const ratio = required.length ? matched.length / required.length : 0.5;
    const fallback = {
      skillScore: Math.round(40 * ratio),
      projectScore: Math.min(30, resume.projects.length * 10),
      experienceScore: Math.min(15, resume.experiences.length * 8),
      educationScore: resume.educations.length ? 5 : 2,
      keywordScore: Math.round(10 * ratio),
      matchedSkills: matched,
      missingSkills: missing,
      projectMatches: resume.projects.map((p) => ({
        name: p.name,
        relevance: Math.round(50 + ratio * 45),
        reason: '技术栈与岗位要求存在交集',
      })),
      risks: missing.map((s) => `岗位可能重点追问 ${s}`),
      suggestions: missing.map((s) => `补充 ${s} 的基础知识与项目实践`),
    };
    const p = await this.structured(
      matchResultSchema,
      'match',
      `根据简历技能 ${[...own]} 与岗位技能 ${required} 分项评分`,
      fallback,
    );
    const total =
      p.skillScore + p.projectScore + p.experienceScore + p.educationScore + p.keywordScore;
    return prisma.matchAnalysis.create({
      data: {
        userId: uid,
        resumeId: resume.id,
        jobId: id,
        totalScore: total,
        ...p,
        matchedSkills: json(p.matchedSkills),
        missingSkills: json(p.missingSkills),
        projectMatches: json(p.projectMatches),
        risks: json(p.risks),
        suggestions: json(p.suggestions),
        model: getModelConfig().apiKey ? getModelConfig().model : 'local-heuristic',
      },
    });
  }
  async plan(uid: bigint, jobId: bigint, days = 5, hours = 2) {
    const job = await prisma.job.findFirst({
      where: { id: jobId, userId: uid },
      include: { matches: { orderBy: { createdAt: 'desc' }, take: 1 } },
    });
    if (!job) throw new BadRequestException('职位不存在');
    const topics = arr(job.matches[0]?.missingSkills);
    const start = new Date(),
      end = new Date(start);
    end.setDate(end.getDate() + days - 1);
    return prisma.preparationPlan.create({
      data: {
        userId: uid,
        jobId,
        title: `${job.company} ${job.title} 准备计划`,
        startDate: start,
        endDate: end,
        tasks: {
          create: Array.from({ length: days }, (_, i) => ({
            userId: uid,
            title: topics[i % Math.max(1, topics.length)]
              ? `掌握 ${topics[i % topics.length]}`
              : `岗位专项练习 ${i + 1}`,
            description: '结合 JD 梳理知识点并完成练习',
            category: 'SKILL_GAP',
            priority: i < 2 ? 'HIGH' : 'MEDIUM',
            estimatedMinutes: Math.max(30, hours * 60),
            scheduledDate: new Date(start.getFullYear(), start.getMonth(), start.getDate() + i),
          })),
        },
      },
      include: { tasks: true },
    });
  }
  async interview(uid: bigint, jobId: bigint) {
    const [job, resume] = await Promise.all([
      prisma.job.findFirst({ where: { id: jobId, userId: uid }, include: { skills: true } }),
      prisma.resume.findFirst({ where: { userId: uid, isPrimary: true } }),
    ]);
    if (!job || !resume) throw new BadRequestException('缺少岗位或主简历');
    const skills = job.skills.map((s) => s.name);
    const qs = [
      '请做一个 2 分钟的自我介绍。',
      ...skills.slice(0, 5).map((s) => `请解释 ${s} 的核心原理，并结合项目举例。`),
      '描述一次你解决复杂问题的经历。',
      '为什么选择这个岗位？',
    ];
    return prisma.interviewSession.create({
      data: {
        userId: uid,
        jobId,
        resumeId: resume.id,
        questions: {
          create: qs.slice(0, 10).map((question, i) => ({
            questionIndex: i + 1,
            category: i === 0 ? '行为问题' : i < 6 ? 'JD 技能' : '项目经历',
            question,
            expectedPoints: json(['结构清晰', '结合实践', '说明结果']),
          })),
        },
      },
      include: { questions: true, job: true },
    });
  }
}
@UseGuards(JwtAuthGuard)
@Controller()
export class BusinessController {
  constructor(private s: BusinessService) {}
  uid(r: any) {
    return r.user.id;
  }
  @Get('dashboard') dashboard(@Req() r: any) {
    return this.s.dashboard(this.uid(r));
  }
  @Post('resumes')
  @UseInterceptors(FileInterceptor('file', { limits: { fileSize: 10 * 1024 * 1024 } }))
  upload(@Req() r: any, @UploadedFile() f: Express.Multer.File) {
    return this.s.upload(this.uid(r), f);
  }
  @Get('resumes') resumes(@Req() r: any) {
    return prisma.resume.findMany({
      where: { userId: this.uid(r) },
      include: { skills: true, projects: true, experiences: true, educations: true },
      orderBy: { createdAt: 'desc' },
    });
  }
  @Get('resumes/:id') resume(@Req() r: any, @Param('id') id: string) {
    return prisma.resume.findFirst({
      where: { id: BigInt(id), userId: this.uid(r) },
      include: { skills: true, projects: true, experiences: true, educations: true },
    });
  }
  @Patch('resumes/:id') updateResume(@Req() r: any, @Param('id') id: string, @Body() b: any) {
    return prisma.resume.updateMany({
      where: { id: BigInt(id), userId: this.uid(r) },
      data: { profile: json(b.profile), summary: b.summary },
    });
  }
  @Delete('resumes/:id') delResume(@Req() r: any, @Param('id') id: string) {
    return prisma.resume.deleteMany({ where: { id: BigInt(id), userId: this.uid(r) } });
  }
  @Post('resumes/:id/parse') parse(@Req() r: any, @Param('id') id: string) {
    return this.s.parseResume(this.uid(r), BigInt(id));
  }
  @Put('resumes/:id/primary') async primary(@Req() r: any, @Param('id') id: string) {
    await prisma.resume.updateMany({ where: { userId: this.uid(r) }, data: { isPrimary: false } });
    return prisma.resume.updateMany({
      where: { id: BigInt(id), userId: this.uid(r) },
      data: { isPrimary: true },
    });
  }
  @Post('jobs') async createJob(@Req() r: any, @Body() b: any) {
    const j = await prisma.job.create({
      data: {
        userId: this.uid(r),
        company: b.company,
        title: b.title,
        city: b.city || '',
        salaryMin: b.salaryMin ? Number(b.salaryMin) : null,
        salaryMax: b.salaryMax ? Number(b.salaryMax) : null,
        source: b.source,
        sourceUrl: b.sourceUrl,
        description: b.description,
        notes: b.notes,
      },
    });
    await prisma.application.create({
      data: { userId: this.uid(r), jobId: j.id, status: 'WISHLIST' },
    });
    return j;
  }
  @Get('jobs') jobs(
    @Req() r: any,
    @Query('search') search?: string,
    @Query('status') status?: string,
  ) {
    return prisma.job.findMany({
      where: {
        userId: this.uid(r),
        ...(search
          ? { OR: [{ company: { contains: search } }, { title: { contains: search } }] }
          : {}),
        ...(status ? { application: { status } } : {}),
      },
      include: { application: true, matches: { orderBy: { createdAt: 'desc' }, take: 1 } },
      orderBy: { updatedAt: 'desc' },
    });
  }
  @Get('jobs/:id') job(@Req() r: any, @Param('id') id: string) {
    return prisma.job.findFirst({
      where: { id: BigInt(id), userId: this.uid(r) },
      include: {
        skills: true,
        application: true,
        matches: { orderBy: { createdAt: 'desc' }, take: 1 },
      },
    });
  }
  @Patch('jobs/:id') jobUpdate(@Req() r: any, @Param('id') id: string, @Body() b: any) {
    return prisma.job.updateMany({ where: { id: BigInt(id), userId: this.uid(r) }, data: b });
  }
  @Delete('jobs/:id') jobDelete(@Req() r: any, @Param('id') id: string) {
    return prisma.job.deleteMany({ where: { id: BigInt(id), userId: this.uid(r) } });
  }
  @Post('jobs/:id/analyze') analyze(@Req() r: any, @Param('id') id: string) {
    return this.s.analyzeJob(this.uid(r), BigInt(id));
  }
  @Post('jobs/:id/match') match(@Req() r: any, @Param('id') id: string) {
    return this.s.match(this.uid(r), BigInt(id));
  }
  @Get('applications') apps(@Req() r: any) {
    return prisma.application.findMany({
      where: { userId: this.uid(r) },
      include: { job: { include: { matches: { take: 1, orderBy: { createdAt: 'desc' } } } } },
      orderBy: { updatedAt: 'desc' },
    });
  }
  @Patch('applications/:id/status') appStatus(
    @Req() r: any,
    @Param('id') id: string,
    @Body() b: any,
  ) {
    return prisma.application.updateMany({
      where: { id: BigInt(id), userId: this.uid(r) },
      data: { status: b.status, appliedAt: b.status === 'APPLIED' ? new Date() : undefined },
    });
  }
  @Post('preparation/plans') plan(@Req() r: any, @Body() b: any) {
    return this.s.plan(
      this.uid(r),
      BigInt(b.jobId),
      Number(b.days || 5),
      Number(b.hoursPerDay || 2),
    );
  }
  @Get('preparation/plans') plans(@Req() r: any) {
    return prisma.preparationPlan.findMany({
      where: { userId: this.uid(r) },
      include: { tasks: true, job: true },
    });
  }
  @Get('preparation/tasks') tasks(@Req() r: any) {
    return prisma.preparationTask.findMany({
      where: { userId: this.uid(r) },
      include: { plan: { include: { job: true } } },
      orderBy: { scheduledDate: 'asc' },
    });
  }
  @Patch('preparation/tasks/:id') task(@Req() r: any, @Param('id') id: string, @Body() b: any) {
    return prisma.preparationTask.updateMany({
      where: { id: BigInt(id), userId: this.uid(r) },
      data: {
        completed: b.completed,
        completedAt: b.completed ? new Date() : null,
        scheduledDate: date(b.scheduledDate),
        estimatedMinutes: b.estimatedMinutes,
      },
    });
  }
  @Post('interviews') interview(@Req() r: any, @Body() b: any) {
    return this.s.interview(this.uid(r), BigInt(b.jobId));
  }
  @Get('interviews/:id') session(@Req() r: any, @Param('id') id: string) {
    return prisma.interviewSession.findFirst({
      where: { id: BigInt(id), userId: this.uid(r) },
      include: { questions: true, job: true },
    });
  }
  @Post('interviews/:id/answer') async answer(
    @Req() r: any,
    @Param('id') id: string,
    @Body() b: any,
  ) {
    const sess = await prisma.interviewSession.findFirst({
      where: { id: BigInt(id), userId: this.uid(r) },
    });
    if (!sess) throw new BadRequestException();
    const score = Math.min(10, Math.max(3, Math.round(String(b.answer).length / 20)));
    return prisma.interviewQuestion.update({
      where: { id: BigInt(b.questionId) },
      data: {
        userAnswer: b.answer,
        score,
        aiFeedback:
          score >= 7
            ? '回答结构清晰。建议进一步补充量化结果。'
            : '建议使用 STAR 结构，并结合具体项目细节。',
      },
    });
  }
  @Post('interviews/:id/complete') async complete(@Req() r: any, @Param('id') id: string) {
    const s = await prisma.interviewSession.findFirst({
      where: { id: BigInt(id), userId: this.uid(r) },
      include: { questions: true },
    });
    if (!s) throw new BadRequestException();
    const answered = s.questions.filter((q) => q.score);
    const avg = answered.reduce((n, q) => n + Number(q.score), 0) / Math.max(1, answered.length);
    return prisma.interviewSession.update({
      where: { id: s.id },
      data: {
        status: 'COMPLETED',
        totalScore: avg,
        completedAt: new Date(),
        summary: '模拟面试已完成',
        strengths: json(['能够结合项目回答']),
        weaknesses: json(['部分答案需要更具体']),
        suggestions: json(['使用 STAR 结构复盘', '补充薄弱技能']),
      },
    });
  }
}
