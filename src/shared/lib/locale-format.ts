import { getLocaleOption, normalizeLocale, type SupportedLocale } from '@/shared/config/i18n'

export type LocalizedPluralForms = Partial<Record<Intl.LDMLPluralRule, string>> & {
    other: string
}

export function getIntlLocale(locale: string | SupportedLocale): string {
    const normalized = normalizeLocale(locale) ?? 'en'
    return getLocaleOption(normalized).intlTag
}

export function formatCurrency(value: number, currency: string, locale: string | SupportedLocale): string {
    return new Intl.NumberFormat(getIntlLocale(locale), {
        style: 'currency',
        currency,
        maximumFractionDigits: 0,
    }).format(value)
}

export function formatDateTime(value: string | number | Date, locale: string | SupportedLocale, options?: Intl.DateTimeFormatOptions): string {
    return new Intl.DateTimeFormat(getIntlLocale(locale), options).format(new Date(value))
}

export function formatAutoCareSlot(slot: string, locale: string | SupportedLocale): string {
    const match = /^(Today|Tomorrow|Сегодня|Завтра),\s*(.+)$/.exec(slot)
    if (!match) return slot

    const offset = match[1] === 'Tomorrow' || match[1] === 'Завтра' ? 1 : 0
    const intlLocale = getIntlLocale(locale)
    const relativeDay = new Intl.RelativeTimeFormat(intlLocale, { numeric: 'auto' }).format(offset, 'day')
    const capitalizedDay = `${relativeDay.charAt(0).toLocaleUpperCase(intlLocale)}${relativeDay.slice(1)}`

    return `${capitalizedDay}, ${match[2]}`
}

export function formatPlural(
    value: number,
    locale: string | SupportedLocale,
    forms: LocalizedPluralForms,
): string {
    const category = new Intl.PluralRules(getIntlLocale(locale)).select(value)

    return forms[category] ?? forms.other
}
