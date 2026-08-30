import type { FastifyBaseLogger } from 'fastify'

import {
    isSensitiveLogKey,
    sanitizeLogMetadata,
    sanitizeLogString,
} from './sensitive-data.js'

type SafeLogMetadata = Record<string, boolean | number | string | null | undefined>

let applicationLogger: FastifyBaseLogger | null = null

function getErrorMessage(error: Error) {
    if (!(error instanceof AggregateError) || !Array.isArray(error.errors)) {
        return error.message
    }

    const messages = error.errors
        .filter((cause): cause is Error => cause instanceof Error && Boolean(cause.message))
        .map((cause) => cause.message)

    return [error.message, ...messages].filter(Boolean).join('; ')
}

export function serializeError(error: unknown) {
    if (error instanceof Error) {
        const message = getErrorMessage(error).slice(0, 500)
        return {
            name: error.name,
            message: isSensitiveLogKey(message)
                ? '[REDACTED_ERROR_MESSAGE]'
                : sanitizeLogString(message) || 'Unknown error',
        }
    }

    return {
        name: 'UnknownError',
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
