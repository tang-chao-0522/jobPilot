import { Module } from '@nestjs/common';
import { JwtModule } from '@nestjs/jwt';
import { AuthController, AuthService, JwtAuthGuard } from './auth';
import { BusinessController, BusinessService } from './business';
import { AgentController, AgentService } from './agent';
@Module({
  imports: [
    JwtModule.register({
      global: true,
      secret: process.env.JWT_SECRET || 'local-dev-secret-change-me',
      signOptions: { expiresIn: '7d' },
    }),
  ],
  controllers: [AuthController, BusinessController, AgentController],
  providers: [AuthService, JwtAuthGuard, BusinessService, AgentService],
})
export class AppModule {}
