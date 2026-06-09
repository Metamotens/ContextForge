import { Injectable } from "@nestjs/common";
import { Tool } from "@rekog/mcp-nest";

import { QdrantService } from "../../persistence/qdrant/qdrant.service";
import { deterministicUuid } from "../../common/utils/identity.util";
import { buildDeterministicVector } from "../../common/utils/vector.util";
import {
  SearchProjectContextInput,
  SearchProjectContextInputSchema,
  SearchProjectContextOutput,
} from "../dto/search-project-context.dto";

@Injectable()
export class SearchProjectContextTool {
  private readonly embeddingVectorSize =
    Number(process.env.EMBEDDING_VECTOR_SIZE) || 1536;

  constructor(private readonly qdrantService: QdrantService) {}

  @Tool({
    name: "search_project_context",
    description:
      "Search project context from Qdrant conversation summaries using project and optional conversation filter.",
    parameters: SearchProjectContextInputSchema,
  })
  async run(input: SearchProjectContextInput): Promise<SearchProjectContextOutput> {
    const topK = input.topK ?? (Number(process.env.TOPK_DEFAULT) || 3);

    process.stderr.write(
      `[SearchProjectContextTool] project=${input.projectName}, topK=${topK}\n`,
    );

    try {
      const searchResults = await this.qdrantService.searchSummaries({
        projectId: deterministicUuid("project", input.projectName),
        conversationId: input.conversationId
          ? deterministicUuid("conversation", input.conversationId)
          : undefined,
        queryVector: buildDeterministicVector(input.query, this.embeddingVectorSize),
        topK,
      });

      return {
        results: searchResults.map((point) => ({
          eventId: String(point.id),
          snippet:
            typeof point.payload?.summary_text === "string"
              ? point.payload.summary_text
              : "(summary payload unavailable)",
          score: point.score ?? 0,
        })),
      };
    } catch (error) {
      process.stderr.write(
        `[SearchProjectContextTool] Qdrant search failed: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
      return { results: [] };
    }
  }
}
