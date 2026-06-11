import { z } from 'zod/v4';

export const DeleteProjectMemoryInputSchema = z.object({
  projectName: z.string().min(1),
});
