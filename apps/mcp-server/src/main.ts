import 'reflect-metadata';
import { NestFactory } from '@nestjs/core';

import { AppModule } from '@app/app.module';

async function bootstrap(): Promise<void> {
  const app = await NestFactory.create(AppModule);

  app.enableShutdownHooks();
  app.enableCors({ origin: true });

  const port = Number(process.env.MCP_PORT) || 3030;
  await app.listen(port, '0.0.0.0');
  process.stdout.write(`[ContextForge] MCP HTTP server listening on http://0.0.0.0:${port}/mcp\n`);
}

bootstrap().catch((err) => {
  process.stderr.write(`[ContextForge] MCP startup error: ${err instanceof Error ? err.stack : String(err)}\n`);
  process.exit(1);
});
