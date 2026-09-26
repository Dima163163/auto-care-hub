import { normalizeLocale, type SupportedLocale } from '@/shared/config/i18n'
import type { TranslationKey } from '@/shared/lib/i18n'
import type { I18nContextValue } from '@/shared/lib/i18n-context'

import { formatNumber, formatPlural } from './locale-format'

export type AutoCareCountTranslationKeys = {
    one: TranslationKey
    few: TranslationKey
    many: TranslationKey
    other: TranslationKey
}

export function formatAutoCareCount(
    count: number,
    locale: SupportedLocale,
    t: I18nContextValue['t'],
    keys: AutoCareCountTranslationKeys,
    isLowerBound = false,
) {
    const countLabel = `${formatNumber(count, locale)}${isLowerBound ? '+' : ''}`
    const params = { count: countLabel }

    return formatPlural(count, locale, {
        one: t(keys.one, params),
        few: t(keys.few, params),
        many: t(keys.many, params),
        other: t(keys.other, params),
    })
}

export function formatAutoCareReviewCount(count: number, locale: string, t: I18nContextValue['t']) {
    return formatAutoCareCount(count, normalizeLocale(locale) ?? 'en', t, {
        one: 'autocare.reviewsOne',
        few: 'autocare.reviewsFew',
        many: 'autocare.reviewsMany',
        other: 'autocare.reviewsOther',
    })
}
