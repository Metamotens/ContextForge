import { Injectable } from "@nestjs/common";
import { randomUUID } from "node:crypto";
import { Tool } from "@rekog/mcp-nest";

import { QdrantService } from "../../persistence/qdrant/qdrant.service";
import { deterministicUuid } from "../../common/utils/identity.util";
import { buildDeterministicVector } from "../../common/utils/vector.util";
import {
  SaveInteractionMemoryInput,
  SaveInteractionMemoryInputSchema,
  SaveInteractionMemoryOutput,
} from "../dto/save-interaction-memory.dto";

@Injectable()
export class SaveInteractionMemoryTool {
  private readonly embeddingVectorSize =
    Number(process.env.EMBEDDING_VECTOR_SIZE) || 1536;

  constructor(private readonly qdrantService: QdrantService) {}

  @Tool({
    name: "save_interaction_memory",
    description:
      "Save a conversation event. Indexes in Qdrant only if role=system and isSummary=true.",
    parameters: SaveInteractionMemoryInputSchema,
  })
  async run(input: SaveInteractionMemoryInput): Promise<SaveInteractionMemoryOutput> {
    process.stderr.write(
      `[SaveInteractionMemoryTool] project=${input.projectName}\n`,
    );

    const eventId = randomUUID();
    const shouldIndex = input.role === "system" && input.isSummary === true;

    if (shouldIndex) {
      try {
        await this.qdrantService.indexSummary({
          eventId,
          projectId: deterministicUuid("project", input.projectName),
          conversationId: deterministicUuid("conversation", input.conversationId),
          provider: input.provider,
          userName: input.userName,
          createdAtIso: new Date().toISOString(),
          vector: buildDeterministicVector(input.content, this.embeddingVectorSize),
          summaryText: input.content,
        });
      } catch (error) {
        process.stderr.write(
          `[SaveInteractionMemoryTool] Qdrant index failed for eventId=${eventId}: ${error instanceof Error ? error.stack : String(error)}\n`,
        );
      }
    }

    return { eventId, saved: true };
  }
}
