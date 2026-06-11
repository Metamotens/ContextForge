import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';

import { InteractionPersistenceService } from '../../enrichment/interaction-persistence.service';
import { SaveInteractionMemoryInputSchema } from '../schemas/save-interaction-memory.schema';
import type {
  SaveInteractionMemoryInput,
  SaveInteractionMemoryOutput,
} from '../types/save-interaction-memory.types';

@Injectable()
export class SaveInteractionMemoryTool {
  constructor(private readonly persistence: InteractionPersistenceService) {}

  @Tool({
    name: 'save_interaction_memory',
    description:
      'STEP 2 of the ContextForge memory workflow — call this TWICE after every response: ' +
      'once with role=user (the exact user message) and once with role=assistant (your full response). ' +
      'Persists both turns in Postgres and automatically generates a summary + Qdrant index entry ' +
      'when the conversation reaches the token or turn threshold.',
    parameters: SaveInteractionMemoryInputSchema,
  })
  async run(input: SaveInteractionMemoryInput): Promise<SaveInteractionMemoryOutput> {
    process.stderr.write(
      `[SaveInteractionMemoryTool] project=${input.projectName} role=${input.role} isSummary=${input.isSummary ?? false}\n`,
    );
    return this.persistence.persistEvent(input);
  }
}
