import { Global, Module } from '@nestjs/common';

import { PgVectorService } from '@persistence/pgvector/pgvector.service';

@Global()
@Module({
  providers: [PgVectorService],
  exports: [PgVectorService],
})
export class PgVectorModule {}
