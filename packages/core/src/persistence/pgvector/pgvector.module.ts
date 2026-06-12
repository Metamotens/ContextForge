import { Global, Module } from '@nestjs/common';

import { PgVectorService } from './pgvector.service';

@Global()
@Module({
  providers: [PgVectorService],
  exports: [PgVectorService],
})
export class PgVectorModule {}
