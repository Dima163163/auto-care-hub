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
        const [{ ruPart1 }, { ruPart2 }, { ruPart3 }, { ruPart4 }, { withAutoCareTranslations }] = await Promise.all([
            import('./ru-part-1'),
            import('./ru-part-2'),
            import('./ru-part-3'),
            import('./ru-part-4'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('ru', { ...enTranslations, ...ruPart1, ...ruPart2, ...ruPart3, ...ruPart4 })
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
            import('./popular-es'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('es', esTranslations)
    },
    de: async () => {
        const [{ deTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular-de'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('de', deTranslations)
    },
    fr: async () => {
        const [{ frTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular-fr'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('fr', frTranslations)
    },
    pt: async () => {
        const [{ ptTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular-pt'),
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
            import('./popular-zh'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('zh', zhTranslations)
    },
    ja: async () => {
        const [{ jaTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular-ja'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('ja', jaTranslations)
    },
    ko: async () => {
        const [{ koTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular-ko'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('ko', koTranslations)
    },
    ar: async () => {
        const [{ arTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular-ar'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('ar', arTranslations)
    },
    tr: async () => {
        const [{ trTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular-tr'),
            import('./autocare-popular'),
        ])

        return withAutoCareTranslations('tr', trTranslations)
    },
    hi: async () => {
        const [{ hiTranslations }, { withAutoCareTranslations }] = await Promise.all([
            import('./popular-hi'),
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
