import type { SupportedLocale } from '../../config/i18n.js'

import { enTranslations } from './en.js'
import { ruTranslations } from './ru.js'
import { roTranslations } from './ro.js'
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
} from './popular.js'

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
