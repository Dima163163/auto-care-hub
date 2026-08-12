import type { z, ZodType } from 'zod'

import { AppError } from '../errors/app-error.js'
import { ERROR_CODES } from '../errors/error-codes.js'
import { formatZodIssues } from './format-zod-issues.js'

export function validateData<TSchema extends ZodType>(
    schema: TSchema,
    data: unknown,
    message = 'Validation failed.'
): z.infer<TSchema> {
    const result = schema.safeParse(data)

    if (!result.success) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.ValidationError,
            message,
            details: formatZodIssues(result.error.issues),
        })
    }

    return result.data
}

export function validateBody<TSchema extends ZodType>(
    schema: TSchema,
    body: unknown
): z.infer<TSchema> {
    return validateData(schema, body)
}

export function validateParams<TSchema extends ZodType>(
    schema: TSchema,
    params: unknown
): z.infer<TSchema> {
    return validateData(schema, params)
}

export function validateQuery<TSchema extends ZodType>(
    schema: TSchema,
    query: unknown
): z.infer<TSchema> {
    return validateData(schema, query)
}