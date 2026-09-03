import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, AuthService, JwtAuthGuard } from './auth';
import { BusinessController, BusinessService } from './business';
import { getEnvironment } from './config/environment';
import { AgentController } from './modules/agent/agent.controller';
import { JobPilotAgentSession } from './modules/agent/agent-session';
import { AgentFactory } from './modules/agent/agent.factory';
import { AgentToolDataService } from './modules/agent/agent-tool-data.service';
import { AgentMessageRepository } from './modules/agent/repositories/agent-message.repository';
import { AgentRunRepository } from './modules/agent/repositories/agent-run.repository';
import { AgentThreadRepository } from './modules/agent/repositories/agent-thread.repository';
import { AgentSseAdapter } from './modules/agent/streaming/agent-sse.adapter';
import { MysqlTraceAdapter } from './modules/agent/tracing/mysql-trace.adapter';
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: getEnvironment().JWT_SECRET,
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, BusinessController, AgentController],
  providers: [
    AuthService,
    JwtAuthGuard,
    BusinessService,
    AgentToolDataService,
    AgentFactory,
    JobPilotAgentSession,
    AgentThreadRepository,
    AgentMessageRepository,
    AgentRunRepository,
    AgentSseAdapter,
    MysqlTraceAdapter,
  ],
})
export class AppModule {}
