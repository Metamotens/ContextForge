import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from './app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.enableCors();
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
