import type { z } from 'zod/v4';

import { DeleteProjectMemoryInputSchema } from '../schemas/delete-project-memory.schema';

export type DeleteProjectMemoryInput = z.infer<typeof DeleteProjectMemoryInputSchema>;

export type DeleteProjectMemoryOutput = {
  deleted: boolean;
  projectId: string;
};
