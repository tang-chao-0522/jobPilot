# JobPilot

JobPilot 是一个面向校招生与初级开发者的 AI 求职工作台。项目严格采用需求文档指定的 React 19、NestJS、Prisma、MySQL 8、pnpm 与 Turborepo 技术栈，不依赖 Docker。

## 本地启动

要求：Node.js 22+、pnpm 10+、MySQL 8。

1. 在 MySQL 中创建数据库：`CREATE DATABASE jobpilot CHARACTER SET utf8mb4 COLLATE utf8mb4_unicode_ci;`
2. 复制 `.env.example` 为 `.env`，修改 `DATABASE_URL` 中的用户名和密码。
3. 安装依赖并初始化数据库：

   ```bash
   pnpm install
   pnpm db:generate
   pnpm db:push
   pnpm db:seed
   ```

4. 启动前后端：`pnpm dev`

Web：http://localhost:5173；API：http://localhost:3000/api/v1。

演示账号：`demo@jobpilot.local` / `jobpilot123`。

## AI 配置

在 `.env` 中设置 `OPENAI_API_KEY`、`OPENAI_BASE_URL` 和 `OPENAI_MODEL`。模型适配器兼容 OpenAI API 协议；未配置密钥时，简历/JD/匹配会使用本地启发式分析，Agent 会返回配置提示。

## 工程检查

```bash
pnpm format:check
pnpm lint
pnpm typecheck
pnpm build
```
