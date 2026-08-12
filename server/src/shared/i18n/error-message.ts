import type { ErrorCode } from '../errors/error-codes.js'
import {
    DEFAULT_LOCALE,
    type SupportedLocale,
} from '../../config/i18n.js'
import { t, type TranslationKey } from './i18n.js'

export function getLocalizedErrorMessage(
    code: ErrorCode,
    fallbackMessage: string,
    locale: SupportedLocale = DEFAULT_LOCALE,
) {
    const key = `errors.${code}` as TranslationKey
    const translatedMessage = t(key, undefined, locale)

    return translatedMessage === key ? fallbackMessage : translatedMessage
}
