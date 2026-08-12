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

export const LOCALE_STORAGE_KEY = 'autocare-hub-locale'
const LEGACY_LOCALE_STORAGE_KEY = 'autocare-hub-locale-v1'

export const LOCALE_OPTIONS = [
    { value: 'en', nativeLabel: 'English', intlTag: 'en-US', direction: 'ltr' },
    { value: 'ru', nativeLabel: 'Русский', intlTag: 'ru-RU', direction: 'ltr' },
    { value: 'ro', nativeLabel: 'Română', intlTag: 'ro-RO', direction: 'ltr' },
    { value: 'es', nativeLabel: 'Español', intlTag: 'es-ES', direction: 'ltr' },
    { value: 'de', nativeLabel: 'Deutsch', intlTag: 'de-DE', direction: 'ltr' },
    { value: 'fr', nativeLabel: 'Français', intlTag: 'fr-FR', direction: 'ltr' },
    { value: 'pt', nativeLabel: 'Português', intlTag: 'pt-BR', direction: 'ltr' },
    { value: 'zh', nativeLabel: '中文', intlTag: 'zh-CN', direction: 'ltr' },
    { value: 'ja', nativeLabel: '日本語', intlTag: 'ja-JP', direction: 'ltr' },
    { value: 'ko', nativeLabel: '한국어', intlTag: 'ko-KR', direction: 'ltr' },
    { value: 'ar', nativeLabel: 'العربية', intlTag: 'ar', direction: 'rtl' },
    { value: 'tr', nativeLabel: 'Türkçe', intlTag: 'tr-TR', direction: 'ltr' },
    { value: 'hi', nativeLabel: 'हिन्दी', intlTag: 'hi-IN', direction: 'ltr' },
] as const satisfies ReadonlyArray<{
    value: SupportedLocale
    nativeLabel: string
    intlTag: string
    direction: 'ltr' | 'rtl'
}>

export function getLocaleOption(locale: SupportedLocale) {
    return LOCALE_OPTIONS.find((option) => option.value === locale) ?? LOCALE_OPTIONS[0]!
}

export function normalizeLocale(value: string | undefined): SupportedLocale | undefined {
    if (!value) return undefined

    const baseLocale = value.trim().toLowerCase().split('-')[0]

    return SUPPORTED_LOCALES.includes(baseLocale as SupportedLocale)
        ? baseLocale as SupportedLocale
        : undefined
}

export function getStoredLocale(): SupportedLocale {
    if (typeof window === 'undefined') {
        return DEFAULT_LOCALE
    }

    const savedLocale = normalizeLocale(
        window.localStorage.getItem(LOCALE_STORAGE_KEY) ??
        window.localStorage.getItem(LEGACY_LOCALE_STORAGE_KEY) ??
        undefined,
    )

    if (savedLocale) return savedLocale

    const browserLocale = normalizeLocale(window.navigator.language)

    return browserLocale ?? DEFAULT_LOCALE
}
