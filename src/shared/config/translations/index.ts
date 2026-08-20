import {
    SUPPORTED_LOCALES,
    type SupportedLocale,
} from '@/shared/config/i18n'

import { enTranslations } from './en'

export type TranslationSchema = typeof enTranslations

type TranslationLoader = () => Promise<TranslationSchema>

const loadedTranslations: Partial<Record<SupportedLocale, TranslationSchema>> = {
    en: enTranslations,
}

const pendingTranslations = new Map<SupportedLocale, Promise<TranslationSchema>>()

const localeLoaders: Record<SupportedLocale, TranslationLoader> = {
    en: async () => enTranslations,
    ru: async () => {
        const [{ ruTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./ru'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('ru', ruTranslations)
    },
    ro: async () => {
        const [{ roTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./ro'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('ro', roTranslations)
    },
    es: async () => {
        const [{ esTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('es', esTranslations)
    },
    de: async () => {
        const [{ deTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('de', deTranslations)
    },
    fr: async () => {
        const [{ frTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('fr', frTranslations)
    },
    pt: async () => {
        const [{ ptTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('pt', ptTranslations)
    },
    it: async () => (await import('./european')).itTranslations,
    pl: async () => (await import('./european')).plTranslations,
    nl: async () => (await import('./european')).nlTranslations,
    uk: async () => (await import('./european')).ukTranslations,
    cs: async () => (await import('./european')).csTranslations,
    el: async () => (await import('./european')).elTranslations,
    sv: async () => (await import('./european')).svTranslations,
    zh: async () => {
        const [{ zhTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('zh', zhTranslations)
    },
    ja: async () => {
        const [{ jaTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('ja', jaTranslations)
    },
    ko: async () => {
        const [{ koTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('ko', koTranslations)
    },
    ar: async () => {
        const [{ arTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('ar', arTranslations)
    },
    tr: async () => {
        const [{ trTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('tr', trTranslations)
    },
    hi: async () => {
        const [{ hiTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('hi', hiTranslations)
    },
}

export function getTranslations(locale: SupportedLocale): TranslationSchema {
    return loadedTranslations[locale] ?? enTranslations
}

export async function loadTranslations(locale: SupportedLocale): Promise<TranslationSchema> {
    const loaded = loadedTranslations[locale]
    if (loaded) return loaded

    const pending = pendingTranslations.get(locale)
    if (pending) return pending

    const nextTranslation = localeLoaders[locale]()
        .then((translation) => {
            loadedTranslations[locale] = translation
            return translation
        })
        .finally(() => {
            pendingTranslations.delete(locale)
        })

    pendingTranslations.set(locale, nextTranslation)
    return nextTranslation
}

export async function loadAllTranslations() {
    await Promise.all(SUPPORTED_LOCALES.map((locale) => loadTranslations(locale)))

    return Object.fromEntries(
        SUPPORTED_LOCALES.map((locale) => [locale, getTranslations(locale)]),
    ) as Record<SupportedLocale, TranslationSchema>
}
