import type { FastifyRequest } from 'fastify'

import { AppError } from '../errors/app-error.js'
import { ERROR_CODES } from '../errors/error-codes.js'

type CsrfOriginOptions = {
    allowedOrigins: string[]
    isProduction: boolean
}

function getSingleHeaderValue(value: string | string[] | undefined) {
    if (Array.isArray(value)) {
        return value.length === 1 ? value[0] : undefined
    }

    return value
}

function hasAmbiguousHeader(value: string | string[] | undefined) {
    return Array.isArray(value) && value.length !== 1
}

function getOriginFromReferer(referer: string | undefined) {
    if (!referer) {
        return null
    }

    try {
        return new URL(referer).origin
    } catch {
        return null
    }
}

export function getRequestOrigin(request: Pick<FastifyRequest, 'headers'>) {
    const origin = getSingleHeaderValue(request.headers.origin)

    if (origin) {
        return origin
    }

    return getOriginFromReferer(
        getSingleHeaderValue(request.headers.referer)
    )
}

export function isTrustedRequestOrigin(
    request: Pick<FastifyRequest, 'headers'>,
    options: CsrfOriginOptions
) {
    if (
        hasAmbiguousHeader(request.headers.origin)
        || hasAmbiguousHeader(request.headers.referer)
    ) {
        return false
    }

    const requestOrigin = getRequestOrigin(request)

    if (!requestOrigin) {
        return !options.isProduction
    }

    return options.allowedOrigins.includes(requestOrigin)
}

export function assertTrustedRequestOrigin(
    request: Pick<FastifyRequest, 'headers'>,
    options: CsrfOriginOptions
) {
    if (isTrustedRequestOrigin(request, options)) {
        return
    }

    throw new AppError({
        statusCode: 403,
        code: ERROR_CODES.CsrfOriginMismatch,
        message: 'Request origin is not allowed.',
    })
}
