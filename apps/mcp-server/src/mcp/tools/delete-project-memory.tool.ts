import { Injectable } from '@nestjs/common';
import { Tool } from '@rekog/mcp-nest';

import { deterministicUuid } from '@common/utils/identity.util';
import { DeleteProjectMemoryInputSchema } from '@mcp/schemas/delete-project-memory.schema';
import type {
  DeleteProjectMemoryInput,
  DeleteProjectMemoryOutput,
} from '@mcp/types/delete-project-memory.types';
import { PostgresService } from '@persistence/postgres/postgres.service';

@Injectable()
export class DeleteProjectMemoryTool {
  constructor(private readonly postgres: PostgresService) {}

  @Tool({
    name: 'delete_project_memory',
    description:
      'Delete all stored memory for a project: removes prompt events, conversations, and the project record from Postgres (embeddings are removed automatically via CASCADE DELETE).',
    parameters: DeleteProjectMemoryInputSchema,
  })
  async run(input: DeleteProjectMemoryInput): Promise<DeleteProjectMemoryOutput> {
    const projectId = deterministicUuid('project', input.projectName);

    process.stderr.write(`[DeleteProjectMemoryTool] Deleting project=${input.projectName} id=${projectId}\n`);

    await this.postgres.deleteProject(projectId);

    return { deleted: true, projectId };
  }
}
