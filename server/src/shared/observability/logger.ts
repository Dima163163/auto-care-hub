import type { FastifyBaseLogger } from 'fastify'

import {
    isSensitiveLogKey,
    sanitizeLogMetadata,
    sanitizeLogString,
} from './sensitive-data.js'

type SafeLogMetadata = Record<string, boolean | number | string | null | undefined>

let applicationLogger: FastifyBaseLogger | null = null

const MAX_ERROR_MESSAGE_LENGTH = 500
const MAX_AGGREGATE_DEPTH = 3
const MAX_AGGREGATE_ERRORS = 10
const SQL_ERROR_CODE_PATTERN = /^(?:[0-9][A-Z0-9]{4}|(?:P0|XX|HV|F0)[A-Z0-9]{3})$/
const RUNTIME_ERROR_CODE_PATTERN = /^(?:E[A-Z0-9_]{1,40}|FST_ERR_[A-Z0-9_]{1,56})$/

interface SerializedError {
    name: string
    message?: string
    code?: string
}

function getErrorCode(error: Error) {
    const code = 'code' in error ? error.code : undefined
    return typeof code === 'string' && (SQL_ERROR_CODE_PATTERN.test(code) || RUNTIME_ERROR_CODE_PATTERN.test(code))
        ? code
        : undefined
}

function getErrorMessage(error: Error, depth = 0): string {
    // SQL messages can contain arbitrary row values, not only recognizable
    // contacts. Do not attempt regex redaction of database diagnostics.
    if (error.name === 'QueryFailedError' || 'query' in error || 'driverError' in error || SQL_ERROR_CODE_PATTERN.test(getErrorCode(error) ?? '')) {
        return 'Database query failed.'
    }

    if (!(error instanceof AggregateError) || !Array.isArray(error.errors)) {
        return error.message
    }

    if (depth >= MAX_AGGREGATE_DEPTH) return 'Nested errors omitted.'
    const messages = error.errors
        .slice(0, MAX_AGGREGATE_ERRORS)
        .filter((cause): cause is Error => cause instanceof Error && Boolean(cause.message))
        .map((cause) => getErrorMessage(cause, depth + 1))

    return [error.message, ...messages].filter(Boolean).join('; ')
}

export function serializeError(error: unknown): SerializedError {
    try {
        if (error instanceof Error) {
            const message = getErrorMessage(error).slice(0, MAX_ERROR_MESSAGE_LENGTH)
            const code = getErrorCode(error)
            const name = error.name
            return {
                name: /^[A-Za-z][A-Za-z0-9]{0,79}$/.test(name) && sanitizeLogString(name) === name && !isSensitiveLogKey(name)
                    ? name
                    : 'Error',
                ...(code ? { code } : {}),
                message: isSensitiveLogKey(message)
                    ? '[REDACTED_ERROR_MESSAGE]'
                    : sanitizeLogString(message).slice(0, MAX_ERROR_MESSAGE_LENGTH) || 'Unknown error',
            }
        }
    } catch {
        // Pino serializers must not throw, including for malformed errors.
        return { name: 'UnknownError' }
    }

    return { name: 'UnknownError' }
}

export function serializeFastifyError(error: unknown) {
    const safeError = serializeError(error)
    // Fastify's serializer contract requires type/message/stack. An empty
    // stack keeps that contract without exposing raw messages through it.
    return {
        type: safeError.name,
        message: safeError.message ?? 'Unknown error',
        stack: '',
        ...(safeError.code ? { code: safeError.code } : {}),
    }
}

export function setApplicationLogger(logger: FastifyBaseLogger) {
    applicationLogger = logger
}

export function logError(
    message: string,
    error?: unknown,
    metadata: SafeLogMetadata = {}
) {
    const safeMetadata = sanitizeLogMetadata(metadata)
    const context = {
        ...safeMetadata,
        ...(error === undefined ? {} : { error: serializeError(error) }),
    }

    if (applicationLogger) {
        applicationLogger.error(context, message)
        return
    }

    process.stderr.write(`${JSON.stringify({
        level: 'error',
        time: new Date().toISOString(),
        message,
        ...context,
    })}\n`)
}

export function logWarn(
    message: string,
    metadata: SafeLogMetadata = {},
) {
    const safeMetadata = sanitizeLogMetadata(metadata)
    if (applicationLogger) {
        applicationLogger.warn(safeMetadata, message)
        return
    }

    process.stderr.write(`${JSON.stringify({
        level: 'warn',
        time: new Date().toISOString(),
        message,
        ...safeMetadata,
    })}\n`)
}

export function logInfo(
    message: string,
    metadata: SafeLogMetadata = {},
) {
    const safeMetadata = sanitizeLogMetadata(metadata)
    if (applicationLogger) {
        applicationLogger.info(safeMetadata, message)
        return
    }

    process.stdout.write(`${JSON.stringify({
        level: 'info',
        time: new Date().toISOString(),
        message,
        ...safeMetadata,
    })}\n`)
}
