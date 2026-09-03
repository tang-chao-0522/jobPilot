import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';
import { AppModule } from './app.module';
import { ValidationPipe } from '@nestjs/common';
import { map } from 'rxjs';
import { getEnvironment } from './config/environment';
async function bootstrap() {
  const environment = getEnvironment();
  const app = await NestFactory.create(AppModule);
  app.setGlobalPrefix('api/v1');
  app.enableCors({ origin: environment.WEB_ORIGIN, credentials: true });
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
  await app.listen(environment.PORT);
  console.log('JobPilot API: http://localhost:3000/api/v1');
}
bootstrap();
