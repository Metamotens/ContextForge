import type { z } from 'zod/v4';

import {
  SaveInteractionMemoryInputSchema,
  SaveInteractionMemoryOutputSchema,
} from '../schemas/save-interaction-memory.schema';

export type SaveInteractionMemoryInput = z.infer<typeof SaveInteractionMemoryInputSchema>;
export type SaveInteractionMemoryOutput = z.infer<typeof SaveInteractionMemoryOutputSchema>;
