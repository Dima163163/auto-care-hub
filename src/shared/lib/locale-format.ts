import { getLocaleOption, normalizeLocale, type SupportedLocale } from '@/shared/config/i18n'

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
