import "reflect-metadata";
import { NestFactory } from "@nestjs/core";

import { AppModule } from "./app.module";

async function bootstrap(): Promise<void> {
  const app = await NestFactory.createApplicationContext(AppModule, { logger: false });

  app.enableShutdownHooks();

  process.stderr.write("[ContextForge] MCP stdio server connected.\n");
}

bootstrap().catch((err) => {
  process.stderr.write(
    `[ContextForge] MCP startup error: ${err instanceof Error ? err.stack : String(err)}\n`,
  );
  process.exit(1);
});
