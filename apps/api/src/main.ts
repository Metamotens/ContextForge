import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

function parseCorsOrigins(): string[] | undefined {
  const raw = process.env.CORS_ORIGINS?.trim();
  if (!raw || raw === '*') return undefined;
  const origins = raw.split(',').map((value) => value.trim()).filter(Boolean);
  return origins.length > 0 ? origins : undefined;
}

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();

  const corsOrigins = parseCorsOrigins();
  app.enableCors(corsOrigins ? { origin: corsOrigins } : undefined);

  app.setGlobalPrefix('api');

  const port = Number(process.env.API_PORT) || 3000;
  await app.listen(port);
  process.stdout.write(`[ContextForge API] Listening on http://localhost:${port}/api\n`);
}

bootstrap().catch((err) => {
  process.stderr.write(
    `[ContextForge API] Startup error: ${err instanceof Error ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});
