import { PrismaClient } from '@prisma/client';
import bcrypt from 'bcryptjs';

const prisma = new PrismaClient();
async function main() {
  const user = await prisma.user.upsert({
    where: { email: 'demo@jobpilot.local' },
    update: {},
    create: {
      email: 'demo@jobpilot.local',
      nickname: 'JobPilot 用户',
      passwordHash: await bcrypt.hash('jobpilot123', 10),
    },
  });
  const count = await prisma.job.count({ where: { userId: user.id } });
  if (!count) {
    const job = await prisma.job.create({
      data: {
        userId: user.id,
        company: '星河科技',
        title: '前端开发工程师',
        city: '上海',
        source: '公司官网',
        description: '负责 React 应用开发，熟悉 TypeScript、Node.js、Vite，有工程化实践经验。',
      },
    });
    await prisma.application.create({ data: { userId: user.id, jobId: job.id } });
  }
}
main().finally(() => prisma.$disconnect());
