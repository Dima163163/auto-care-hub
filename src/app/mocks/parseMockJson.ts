import { z } from 'zod'

export async function parseMockJson<T>(
    request: Request,
    schema: z.ZodType<T>,
): Promise<T | undefined> {
    try {
        const result = schema.safeParse(await request.json())

        return result.success ? result.data : undefined
    } catch {
        return undefined
    }
}
