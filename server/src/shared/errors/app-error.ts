import type { ApiErrorResponse, ValidationErrorDetail } from './types.js'
import type { ErrorCode } from './error-codes.js'

type AppErrorOptions = {
    statusCode: number
    code: ErrorCode
    message: string
    details?: ValidationErrorDetail[]
}

export class AppError extends Error {
    readonly statusCode: number
    readonly code: ErrorCode
    readonly details?: ValidationErrorDetail[]

    constructor(options: AppErrorOptions) {
        super(options.message)

        this.name = 'AppError'
        this.statusCode = options.statusCode
        this.code = options.code
        this.details = options.details
    }

    toResponse(): ApiErrorResponse {
        return {
            statusCode: this.statusCode,
            code: this.code,
            message: this.message,
            ...(this.details ? { details: this.details } : {}),
        }
    }
}