import type { FastifyInstance } from 'fastify'
import { z } from 'zod'

import { validateBody } from '../shared/validation/validate.js'

const validationExampleSchema = z.object({
    email: z.string().email('Enter a valid email.'),
    name: z.string().min(2, 'Name must contain at least 2 characters.'),
})

type ValidationExampleResponse = {
    status: 'ok'
    email: string
    name: string
}

export async function devRoutes(app: FastifyInstance) {
    app.post<{ Body: unknown; Reply: ValidationExampleResponse }>(
        '/dev/validation-example',
        async (request) => {
            const body = validateBody(validationExampleSchema, request.body)

            return {
                status: 'ok',
                email: body.email,
                name: body.name,
            }
        }
    )
}