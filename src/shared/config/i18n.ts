export const SUPPORTED_LOCALES = [
    'en',
    'ru',
    'ro',
    'es',
    'de',
    'fr',
    'pt',
    'it',
    'pl',
    'nl',
    'uk',
    'cs',
    'el',
    'sv',
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
    { value: 'en', nativeLabel: 'English', shortLabel: 'EN', intlTag: 'en-US', direction: 'ltr' },
    { value: 'ru', nativeLabel: 'Русский', shortLabel: 'RU', intlTag: 'ru-RU', direction: 'ltr' },
    { value: 'ro', nativeLabel: 'Română', shortLabel: 'RO', intlTag: 'ro-RO', direction: 'ltr' },
    { value: 'es', nativeLabel: 'Español', shortLabel: 'ES', intlTag: 'es-ES', direction: 'ltr' },
    { value: 'de', nativeLabel: 'Deutsch', shortLabel: 'DE', intlTag: 'de-DE', direction: 'ltr' },
    { value: 'fr', nativeLabel: 'Français', shortLabel: 'FR', intlTag: 'fr-FR', direction: 'ltr' },
    { value: 'pt', nativeLabel: 'Português', shortLabel: 'PT', intlTag: 'pt-BR', direction: 'ltr' },
    { value: 'it', nativeLabel: 'Italiano', shortLabel: 'IT', intlTag: 'it-IT', direction: 'ltr' },
    { value: 'pl', nativeLabel: 'Polski', shortLabel: 'PL', intlTag: 'pl-PL', direction: 'ltr' },
    { value: 'nl', nativeLabel: 'Nederlands', shortLabel: 'NL', intlTag: 'nl-NL', direction: 'ltr' },
    { value: 'uk', nativeLabel: 'Українська', shortLabel: 'UK', intlTag: 'uk-UA', direction: 'ltr' },
    { value: 'cs', nativeLabel: 'Čeština', shortLabel: 'CS', intlTag: 'cs-CZ', direction: 'ltr' },
    { value: 'el', nativeLabel: 'Ελληνικά', shortLabel: 'EL', intlTag: 'el-GR', direction: 'ltr' },
    { value: 'sv', nativeLabel: 'Svenska', shortLabel: 'SV', intlTag: 'sv-SE', direction: 'ltr' },
    { value: 'zh', nativeLabel: '中文', shortLabel: 'ZH', intlTag: 'zh-CN', direction: 'ltr' },
    { value: 'ja', nativeLabel: '日本語', shortLabel: 'JA', intlTag: 'ja-JP', direction: 'ltr' },
    { value: 'ko', nativeLabel: '한국어', shortLabel: 'KO', intlTag: 'ko-KR', direction: 'ltr' },
    { value: 'ar', nativeLabel: 'العربية', shortLabel: 'AR', intlTag: 'ar', direction: 'rtl' },
    { value: 'tr', nativeLabel: 'Türkçe', shortLabel: 'TR', intlTag: 'tr-TR', direction: 'ltr' },
    { value: 'hi', nativeLabel: 'हिन्दी', shortLabel: 'HI', intlTag: 'hi-IN', direction: 'ltr' },
] as const satisfies ReadonlyArray<{
    value: SupportedLocale
    nativeLabel: string
    shortLabel: string
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
