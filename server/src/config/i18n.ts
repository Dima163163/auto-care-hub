export const SUPPORTED_LOCALES = [
    'en',
    'ru',
    'ro',
    'es',
    'de',
    'fr',
    'pt',
    'zh',
    'ja',
    'ko',
    'ar',
    'tr',
    'hi',
] as const

export type SupportedLocale = typeof SUPPORTED_LOCALES[number]

export const DEFAULT_LOCALE: SupportedLocale = 'en'

export function normalizeLocale(value: string | undefined): SupportedLocale | undefined {
    if (!value) return undefined

    const baseLocale = value.trim().toLowerCase().split('-')[0]

    return SUPPORTED_LOCALES.includes(baseLocale as SupportedLocale)
        ? baseLocale as SupportedLocale
        : undefined
}
