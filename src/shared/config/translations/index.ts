import type { SupportedLocale } from '@/shared/config/i18n'

import { enTranslations } from './en'
import { withAutoCareTranslations } from './autocare-popular'
import { ruTranslations } from './ru'
import { roTranslations } from './ro'
import {
    csTranslations,
    elTranslations,
    itTranslations,
    nlTranslations,
    plTranslations,
    svTranslations,
    ukTranslations,
} from './european'
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
    ru: withAutoCareTranslations('ru', ruTranslations),
    ro: withAutoCareTranslations('ro', roTranslations),
    es: withAutoCareTranslations('es', esTranslations),
    de: withAutoCareTranslations('de', deTranslations),
    fr: withAutoCareTranslations('fr', frTranslations),
    pt: withAutoCareTranslations('pt', ptTranslations),
    it: itTranslations,
    pl: plTranslations,
    nl: nlTranslations,
    uk: ukTranslations,
    cs: csTranslations,
    el: elTranslations,
    sv: svTranslations,
    zh: withAutoCareTranslations('zh', zhTranslations),
    ja: withAutoCareTranslations('ja', jaTranslations),
    ko: withAutoCareTranslations('ko', koTranslations),
    ar: withAutoCareTranslations('ar', arTranslations),
    tr: withAutoCareTranslations('tr', trTranslations),
    hi: withAutoCareTranslations('hi', hiTranslations),
} satisfies Record<SupportedLocale, TranslationSchema>
