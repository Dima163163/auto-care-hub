import { z } from 'zod'

export const updatedCountSchema = z.object({ updated: z.number().int().nonnegative() }).passthrough()
