import type { FastifyRequest } from 'fastify'
import {
    DEFAULT_LOCALE,
    normalizeLocale,
    type SupportedLocale,
} from '../../config/i18n.js'

export const MAX_ACCEPT_LANGUAGE_LENGTH = 512

export function getRequestLocale(request: FastifyRequest): SupportedLocale {
    const acceptLanguage = request.headers?.['accept-language']

    if (!acceptLanguage || acceptLanguage.length > MAX_ACCEPT_LANGUAGE_LENGTH) {
        return DEFAULT_LOCALE
    }

    // Parse weighted browser preferences, for example "de-DE,de;q=0.8,en;q=0.5".
    const locales = acceptLanguage
        .split(',')
        .map((part, index) => {
            const [rawLocale, ...parameters] = part.split(';')
            const qualityParameter = parameters.find((parameter) => parameter.trim().startsWith('q='))
            const quality = qualityParameter ? Number(qualityParameter.trim().slice(2)) : 1

            return {
                index,
                locale: normalizeLocale(rawLocale),
                quality: Number.isFinite(quality) ? Math.min(Math.max(quality, 0), 1) : 0,
            }
        })
        .filter(({ locale, quality }) => locale && quality > 0)
        .sort((left, right) => right.quality - left.quality || left.index - right.index)

    const firstLocale = locales[0]?.locale

    if (firstLocale) {
        return firstLocale
    }

    return DEFAULT_LOCALE
}

export function getEmailLocale(
    preferredLocale: SupportedLocale | null | undefined,
    request: FastifyRequest,
): SupportedLocale {
    return preferredLocale ?? getRequestLocale(request)
}
