import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';

import { PostgresService } from '../../persistence/postgres/postgres.service';
import { QdrantService } from '../../persistence/qdrant/qdrant.service';
import { deterministicUuid } from '../../common/utils/identity.util';
import {
  DeleteProjectMemoryInput,
  DeleteProjectMemoryInputSchema,
  DeleteProjectMemoryOutput,
} from '../dto/delete-project-memory.dto';

@Injectable()
export class DeleteProjectMemoryTool {
  constructor(
    private readonly postgres: PostgresService,
    private readonly qdrantService: QdrantService,
  ) {}

  @Tool({
    name: 'delete_project_memory',
    description:
      'Delete all stored memory for a project: removes prompt events, conversations, and the project record from Postgres, and deletes all indexed points from Qdrant.',
    parameters: DeleteProjectMemoryInputSchema,
  })
  async run(input: DeleteProjectMemoryInput): Promise<DeleteProjectMemoryOutput> {
    const projectId = deterministicUuid('project', input.projectName);

    process.stderr.write(`[DeleteProjectMemoryTool] Deleting project=${input.projectName} id=${projectId}\n`);

    await this.postgres.deleteProject(projectId);

    try {
      await this.qdrantService.deleteByProjectId(projectId);
    } catch (error) {
      process.stderr.write(
        `[DeleteProjectMemoryTool] Qdrant delete failed for project_id=${projectId}: ${error instanceof Error ? error.stack : String(error)}\n`,
      );
    }

    return { deleted: true, projectId };
  }
}
