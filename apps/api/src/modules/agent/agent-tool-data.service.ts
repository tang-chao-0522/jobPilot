import { Injectable } from '@nestjs/common';
import { prisma } from '@jobpilot/database';
import { BusinessService } from '../../business';

@Injectable()
export class AgentToolDataService {
  constructor(private readonly business: BusinessService) {}
  getResumeProfile(userId: bigint) {
    return prisma.resume.findFirst({
      where: { userId, isPrimary: true },
      include: { skills: true, projects: true, experiences: true, educations: true },
    });
  }
  getJobDetail(userId: bigint, jobId: bigint) {
    return prisma.job.findFirst({
      where: { id: jobId, userId },
      include: {
        skills: true,
        matches: { take: 1, orderBy: { createdAt: 'desc' } },
        application: true,
      },
    });
  }
  listJobs(userId: bigint, status?: string) {
    return prisma.job.findMany({
      where: { userId, ...(status ? { application: { status } } : {}) },
      include: { application: true, matches: { take: 1, orderBy: { createdAt: 'desc' } } },
    });
  }
  getMatchAnalysis(userId: bigint, jobId: bigint) {
    return prisma.matchAnalysis.findFirst({
      where: { userId, jobId },
      orderBy: { createdAt: 'desc' },
    });
  }
  createPreparationPlan(userId: bigint, jobId: bigint, days: number, hoursPerDay: number) {
    return this.business.plan(userId, jobId, days, hoursPerDay);
  }
  listPreparationTasks(userId: bigint, jobId?: bigint) {
    return prisma.preparationTask.findMany({
      where: { userId, ...(jobId ? { plan: { jobId } } : {}) },
      orderBy: { scheduledDate: 'asc' },
    });
  }
  updatePreparationTask(
    userId: bigint,
    taskId: bigint,
    input: { completed?: boolean; scheduledDate?: string; estimatedMinutes?: number },
  ) {
    return prisma.preparationTask.updateMany({
      where: { id: taskId, userId },
      data: {
        completed: input.completed,
        completedAt: input.completed ? new Date() : undefined,
        scheduledDate: input.scheduledDate ? new Date(input.scheduledDate) : undefined,
        estimatedMinutes: input.estimatedMinutes,
      },
    });
  }
  updateApplicationStatus(userId: bigint, applicationId: bigint, status: string) {
    return prisma.application.updateMany({
      where: { id: applicationId, userId },
      data: { status },
    });
  }
}
