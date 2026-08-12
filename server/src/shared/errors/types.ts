import type { ErrorCode } from './error-codes.js'

export type ValidationErrorDetail = {
    path: string
    message: string
}

export type ApiErrorResponse = {
    statusCode: number
    code: ErrorCode
    message: string
    details?: ValidationErrorDetail[]
    requestId?: string
}
