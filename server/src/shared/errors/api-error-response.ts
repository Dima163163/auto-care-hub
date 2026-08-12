import type { ErrorCode } from './error-codes.js'
import type { ApiErrorResponse } from './types.js'

export function createApiErrorResponse(input: {
    statusCode: number
    code: ErrorCode
    message: string
    requestId: string
    details?: ApiErrorResponse['details']
}): ApiErrorResponse {
    return {
        statusCode: input.statusCode,
        code: input.code,
        message: input.message,
        ...(input.details ? { details: input.details } : {}),
        requestId: input.requestId,
    }
}
