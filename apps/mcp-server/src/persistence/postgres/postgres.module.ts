import { Global, Module } from '@nestjs/common';
import { PostgresService } from '@persistence/postgres/postgres.service';

@Global()
@Module({
  providers: [PostgresService],
  exports: [PostgresService],
})
export class PostgresModule {}
