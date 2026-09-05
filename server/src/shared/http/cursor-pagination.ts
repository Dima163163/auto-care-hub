import { AppError } from '../errors/app-error.js'
import { ERROR_CODES } from '../errors/error-codes.js'
import { MAX_CURSOR_LENGTH } from '../security/request-limits.js'

export type CursorPayload = Record<string, string>

export type CursorPage<T> = {
    items: T[]
    nextCursor: string | null
}

export const MAX_CURSOR_PAGE_LIMIT = 100
export const MAX_CURSOR_PAYLOAD_BYTES = 1_536

export type CursorPaginationInput = {
    cursor?: string
    beforeCursor?: string
    limit?: number
}

/**
 * Service methods are also called by jobs and replay handlers, so do not read
 * pagination properties from an arbitrary value. Keep the query shape narrow
 * before any repository lookup while leaving cursor semantics to decodeCursor.
 */
export function normalizeCursorPaginationInput(input: unknown): CursorPaginationInput | null {
    if (input === undefined) return {}
    if (input === null) return null
    if (typeof input !== 'object' || Array.isArray(input)) return null
    const value = input as Record<string, unknown>
    if (Object.keys(value).some((key) => !['cursor', 'beforeCursor', 'limit'].includes(key))) return null
    if (value.limit !== undefined && (typeof value.limit !== 'number' || !Number.isSafeInteger(value.limit))) return null
    if (value.cursor !== undefined && typeof value.cursor !== 'string') return null
    if (value.beforeCursor !== undefined && typeof value.beforeCursor !== 'string') return null
    const cursor = typeof value.cursor === 'string' ? value.cursor.normalize('NFKC').trim() || undefined : undefined
    const beforeCursor = typeof value.beforeCursor === 'string' ? value.beforeCursor.normalize('NFKC').trim() || undefined : undefined
    if (cursor && beforeCursor) return null
    return {
        ...(cursor ? { cursor } : {}),
        ...(beforeCursor ? { beforeCursor } : {}),
        ...(value.limit === undefined ? {} : { limit: value.limit }),
    }
}

export function isCursorPaginationRequested(input: {
    cursor?: string
    limit?: number
}) {
    return input.cursor !== undefined || input.limit !== undefined
}

export function getCursorLimit(limit: number | undefined, fallback = 50) {
    const candidate = limit ?? fallback
    if (
        !Number.isSafeInteger(candidate)
        || candidate < 1
        || candidate > MAX_CURSOR_PAGE_LIMIT
    ) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Pagination limit is invalid.',
        })
    }

    return candidate
}

export function encodeCursor(payload: CursorPayload) {
    const serialized = JSON.stringify(payload)
    if (Buffer.byteLength(serialized, 'utf8') > MAX_CURSOR_PAYLOAD_BYTES) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Cursor payload is too large.',
        })
    }

    return Buffer.from(serialized, 'utf8').toString('base64url')
}

export function decodeCursor(cursor: string, requiredFields: readonly string[]) {
    if (cursor.length > MAX_CURSOR_LENGTH) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Cursor is invalid or expired.',
        })
    }

    try {
        const decoded = JSON.parse(Buffer.from(cursor, 'base64url').toString('utf8')) as unknown

        if (!decoded || typeof decoded !== 'object' || Array.isArray(decoded)) {
            throw new Error('Cursor payload must be an object.')
        }

        const payload = decoded as Record<string, unknown>
        const result: CursorPayload = {}

        for (const field of requiredFields) {
            if (typeof payload[field] !== 'string' || payload[field].length === 0) {
                throw new Error(`Cursor field ${field} is missing.`)
            }

            result[field] = payload[field]
        }

        return result
    } catch {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Cursor is invalid or expired.',
        })
    }
}

export function assertCursorDate(payload: CursorPayload, field: string) {
    const value = payload[field]
    const timestamp = value ? Date.parse(value) : Number.NaN

    if (!value || Number.isNaN(timestamp)) {
        throw new AppError({
            statusCode: 400,
            code: ERROR_CODES.BadRequest,
            message: 'Cursor is invalid or expired.',
        })
    }

    return new Date(timestamp)
}

export function toCursorPage<T>(
    items: T[],
    limit: number,
    getCursorPayload: (item: T) => CursorPayload,
): CursorPage<T> {
    getCursorLimit(limit)
    const hasMore = items.length > limit
    const pageItems = hasMore ? items.slice(0, limit) : items
    const lastItem = pageItems.at(-1)

    return {
        items: pageItems,
        nextCursor: hasMore && lastItem ? encodeCursor(getCursorPayload(lastItem)) : null,
    }
}
