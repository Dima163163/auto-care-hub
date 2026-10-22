import { beforeAll, describe, expect, it } from 'vitest'

import { loadAllTranslations } from '@/shared/config/translations'
import {
    getApiErrorCode,
    getApiErrorMessage,
    getApiErrorState,
} from './getApiErrorMessage'

describe('getApiErrorMessage', () => {
    beforeAll(async () => {
        await loadAllTranslations()
    })

    it('returns API message when error contains non-empty string message', () => {
        const error = {
            data: {
                message: 'Invalid email or password',
            },
        }

        expect(
            getApiErrorMessage(error, 'Fallback message'),
        ).toBe('Invalid email or password')
    })

    it('returns fallback message when API message is empty string', () => {
        const error = {
            data: {
                message: '   ',
            },
        }

        expect(
            getApiErrorMessage(error, 'Fallback message'),
        ).toBe('Fallback message')
    })

    it('returns nested API error message when data contains error object', () => {
        const error = {
            data: {
                error: {
                    message: 'Cabinet is blocked',
                },
            },
        }

        expect(
            getApiErrorMessage(error, 'Fallback message'),
        ).toBe('Cabinet is blocked')
    })

    it('returns API error string when data contains error string', () => {
        const error = {
            data: {
                error: 'Network request failed',
            },
        }

        expect(
            getApiErrorMessage(error, 'Fallback message'),
        ).toBe('Network request failed')
    })

    it('returns a neutral localized message for RTK Query network errors', () => {
        const error = {
            status: 'FETCH_ERROR',
            error: 'TypeError: Failed to fetch',
        }

        expect(
            getApiErrorMessage(error, 'Fallback message'),
        ).toBe('The connection was interrupted. Check your internet connection and try again.')
        expect(
            getApiErrorMessage(error, 'Fallback message', 'ru'),
        ).toBe('Соединение прервано. Проверьте интернет и попробуйте еще раз.')
    })

    it.each([
        { status: 'PARSING_ERROR', originalStatus: 500, data: 'Internal Server Error', error: 'SyntaxError: Unexpected token I' },
        { status: 'PARSING_ERROR', originalStatus: 200, data: '<html>upstream</html>', error: 'SyntaxError: Unexpected token <' },
        { status: 500, data: { message: 'Database host private.internal failed' } },
        { status: 'TIMEOUT_ERROR', error: 'TimeoutError: upstream request timed out' },
    ])('hides raw transport diagnostics from the UI for %o', (error) => {
        expect(getApiErrorMessage(error, 'Fallback message', 'en')).toBe('Something went wrong on our end. Please try again later.')
        expect(getApiErrorMessage(error, 'Fallback message', 'ru')).toBe('Произошла внутренняя ошибка сервера. Попробуйте позже.')
    })

    it('does not display arbitrary RTK transport error strings', () => {
        expect(getApiErrorMessage({ status: 'CUSTOM_ERROR', error: 'private upstream detail' }, 'Fallback message')).toBe('Fallback message')
        expect(getApiErrorMessage(new SyntaxError('Unexpected token in private response'), 'Fallback message', 'en')).toBe('Something went wrong on our end. Please try again later.')
    })

    it('localizes an expired session even when the server only returns HTTP 401', () => {
        expect(getApiErrorMessage({ status: 401 }, 'Fallback message', 'ru')).toBe('Сессия истекла')
        expect(getApiErrorMessage({ status: 401 }, 'Fallback message', 'en')).toBe('Your session has expired')
    })

    it('returns fallback message when API message is not a string', () => {
        const error = {
            data: {
                message: 404,
            },
        }

        expect(
            getApiErrorMessage(error, 'Fallback message'),
        ).toBe('Fallback message')
    })

    it('fails closed for malformed API error payloads', () => {
        const error = {
            data: {
                error: { message: { nested: 'secret' } },
            },
        }

        expect(getApiErrorMessage(error, 'Fallback message')).toBe('Fallback message')
        expect(getApiErrorCode({ data: { code: { nested: 'not-a-code' } } })).toBeUndefined()
    })

    it('uses a neutral server message when HTTP 500 has no structured data', () => {
        const error = {
            status: 500,
        }

        expect(
            getApiErrorMessage(error, 'Fallback message'),
        ).toBe('Something went wrong on our end. Please try again later.')
    })

    it('returns fallback message when error is null', () => {
        expect(
            getApiErrorMessage(null, 'Fallback message'),
        ).toBe('Fallback message')
    })

    it('returns API error code when error contains top-level data code', () => {
        expect(
            getApiErrorCode({
                data: {
                    code: 'CABINET_IMAGE_TOO_LARGE',
                },
            }),
        ).toBe('CABINET_IMAGE_TOO_LARGE')
    })

    it('returns nested API error code when data contains error object', () => {
        expect(
            getApiErrorCode({
                data: {
                    error: {
                        code: 'CABINET_IMAGE_INVALID_CONTENT',
                    },
                },
            }),
        ).toBe('CABINET_IMAGE_INVALID_CONTENT')
    })

    it('translates a known API error code using the requested locale', () => {
        const error = {
            data: {
                code: 'EMAIL_VERIFICATION_REQUIRED',
                message: 'Please verify your email to perform this action.',
            },
        }

        expect(
            getApiErrorMessage(error, 'Fallback message', 'ru'),
        ).toBe('Для выполнения этого действия необходимо подтвердить email.')
        expect(
            getApiErrorMessage(error, 'Fallback message', 'ro'),
        ).toBe('Please verify your email to perform this action.')
    })

    it('translates every currently exposed image and review storage error code', () => {
        expect(
            getApiErrorMessage(
                { data: { code: 'CABINET_IMAGE_INVALID_FILE_NAME' } },
                'Fallback message',
                'ru',
            ),
        ).toBe('Некорректное имя файла изображения.')
        expect(
            getApiErrorMessage(
                { data: { code: 'REVIEW_STORAGE_NOT_READY' } },
                'Fallback message',
                'en',
            ),
        ).toBe('Reviews are temporarily unavailable. Please try again later.')
    })

    it('returns Error message before fallback', () => {
        expect(
            getApiErrorMessage(
                new Error('Translated upload error'),
                'Fallback message',
            ),
        ).toBe('Translated upload error')
    })

    it.each([
        [{ status: 'FETCH_ERROR' }, 'offline'],
        [{ data: { code: 'OFFLINE' } }, 'offline'],
        [{ data: { code: 'FORBIDDEN' } }, 'permission-denied'],
        [{ status: 403 }, 'permission-denied'],
        [{ data: { code: 'SESSION_EXPIRED' } }, 'session-expired'],
        [{ status: 401 }, 'session-expired'],
        [{ data: { code: 'ACCOUNT_SUSPENDED' } }, 'suspended'],
        [{ status: 423 }, 'suspended'],
        [{ data: { code: 'STALE_DATA' } }, 'stale'],
        [{ status: 500 }, undefined],
    ] as const)('maps API error state %o to %s', (error, expected) => {
        expect(getApiErrorState(error)).toBe(expected)
    })
})
