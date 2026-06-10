import { z } from 'zod/v4';

export const DeleteProjectMemoryInputSchema = z.object({
  projectName: z.string().min(1),
});

export type DeleteProjectMemoryInput = z.infer<typeof DeleteProjectMemoryInputSchema>;

export type DeleteProjectMemoryOutput = {
  deleted: boolean;
  projectId: string;
};
