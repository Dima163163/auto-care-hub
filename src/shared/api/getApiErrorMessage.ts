import {
    getStoredLocale,
    type SupportedLocale,
} from '@/shared/config/i18n'
import { t, type TranslationKey } from '@/shared/lib/i18n'

type ApiErrorData = {
    error?: string | {
        code?: unknown
        message?: unknown
    }
    code?: unknown
    message?: unknown
}

function isRecord(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null
}

function getApiErrorData(error: unknown) {
    if (!isRecord(error) || !('data' in error) || !isRecord(error.data)) {
        return undefined
    }

    const data = error.data
    const nestedError = data.error

    if (
        nestedError !== undefined &&
        typeof nestedError !== 'string' &&
        !isRecord(nestedError)
    ) {
        return undefined
    }

    const parsedData: ApiErrorData = {}

    if (nestedError !== undefined) {
        parsedData.error = nestedError
    }
    if ('code' in data) {
        parsedData.code = data.code
    }
    if ('message' in data) {
        parsedData.message = data.message
    }

    return parsedData
}

function getNetworkError(error: unknown) {
    if (!isRecord(error)) {
        return undefined
    }

    return typeof error.error === 'string' ? error.error : undefined
}

function isFetchError(error: unknown) {
    return isRecord(error) && error.status === 'FETCH_ERROR'
}

function getApiErrorStatus(error: unknown) {
    return isRecord(error) && typeof error.status === 'number'
        ? error.status
        : undefined
}

export type ApiErrorState =
    | 'offline'
    | 'permission-denied'
    | 'suspended'
    | 'session-expired'
    | 'stale'

/**
 * Converts transport/API error shapes into display-level states shared by
 * public and authenticated screens.  HTTP status is kept only as a fallback:
 * a stable API error code always wins when the server provides one.
 */
export function getApiErrorState(error: unknown): ApiErrorState | undefined {
    const code = getApiErrorCode(error)

    if (code === 'PERMISSION_DENIED' || code === 'FORBIDDEN') {
        return 'permission-denied'
    }

    if (code === 'ACCOUNT_SUSPENDED') {
        return 'suspended'
    }

    if (code === 'SESSION_EXPIRED' || code === 'UNAUTHORIZED') {
        return 'session-expired'
    }

    if (code === 'STALE_DATA') {
        return 'stale'
    }

    if (code === 'OFFLINE' || isFetchError(error)) {
        return 'offline'
    }

    const status = getApiErrorStatus(error)
    if (status === 401) {
        return 'session-expired'
    }
    if (status === 403) {
        return 'permission-denied'
    }
    if (status === 423) {
        return 'suspended'
    }

    return undefined
}

export const getApiErrorCode = (error: unknown) => {
    const data = getApiErrorData(error)
    const code = data?.code
        ?? (typeof data?.error === 'object' ? data.error.code : undefined)

    if (typeof code === 'string' && code.trim().length > 0) {
        return code
    }

    return undefined
}

export const getApiErrorMessage = (
    error: unknown,
    fallbackMessage: string,
    locale: SupportedLocale = getStoredLocale(),
) => {
    if (getApiErrorState(error) === 'session-expired') {
        return t('auth.sessionExpiredTitle', undefined, locale)
    }

    const code = getApiErrorCode(error)

    if (code) {
        const translationKey = `errors.${code}` as TranslationKey
        const translatedMessage = t(translationKey, undefined, locale)

        if (translatedMessage !== translationKey) {
            return translatedMessage
        }
    }

    const data = getApiErrorData(error)
    const message = data?.message
        ?? (typeof data?.error === 'object' ? data.error.message : data?.error)

    if (typeof message === 'string' && message.trim().length > 0) {
        return message
    }

    if (isFetchError(error)) {
        const translatedMessage = t('errors.NETWORK_ERROR', undefined, locale)

        return translatedMessage === 'errors.NETWORK_ERROR'
            ? fallbackMessage
            : translatedMessage
    }

    const networkError = getNetworkError(error)
    if (networkError && networkError.trim().length > 0) {
        return networkError
    }

    if (error instanceof Error && error.message.trim().length > 0) {
        return error.message
    }

    return fallbackMessage
}
