import {
    getApiErrorCode,
    getApiErrorMessage,
} from '@/shared/api/getApiErrorMessage'

export function getLoginErrorMessage(error: unknown, fallbackMessage: string) {
    if (getApiErrorCode(error) === 'UNAUTHORIZED') {
        return fallbackMessage
    }

    return getApiErrorMessage(error, fallbackMessage)
}
