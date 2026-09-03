import 'dotenv/config';
import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { map } from 'rxjs';
async function bootstrap() {
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: process.env.WEB_ORIGIN || 'http://localhost:5173', credentials: true });
  app.useGlobalPipes(new ValidationPipe({ whitelist: true, transform: true }));
  app.useGlobalInterceptors({
    intercept(_c: any, next: any) {
      return next
        .handle()
        .pipe(
          map((v: any) =>
            JSON.parse(
              JSON.stringify(v, (_k: string, x: any) => (typeof x === 'bigint' ? x.toString() : x)),
            ),
          ),
        );
    },
  } as any);
  await app.listen(Number(process.env.PORT) || 3000);
  console.log('JobPilot API: http://localhost:3000/api/v1');
}
bootstrap();
