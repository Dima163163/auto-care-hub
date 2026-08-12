import type { SupportedLocale } from '@/shared/config/i18n'

import { enTranslations } from './en'
import { ruTranslations } from './ru'
import { roTranslations } from './ro'
import {
    arTranslations,
    deTranslations,
    esTranslations,
    frTranslations,
    hiTranslations,
    jaTranslations,
    koTranslations,
    ptTranslations,
    trTranslations,
    zhTranslations,
} from './popular'

export type TranslationSchema = typeof enTranslations

export const translations = {
    en: enTranslations,
    ru: ruTranslations,
    ro: roTranslations,
    es: esTranslations,
    de: deTranslations,
    fr: frTranslations,
    pt: ptTranslations,
    zh: zhTranslations,
    ja: jaTranslations,
    ko: koTranslations,
    ar: arTranslations,
    tr: trTranslations,
    hi: hiTranslations,
} satisfies Record<SupportedLocale, TranslationSchema>
