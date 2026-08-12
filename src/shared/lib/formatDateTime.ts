import { getStoredLocale } from '@/shared/config/i18n'

export function formatDateTime(value: string | Date) {
    const date = value instanceof Date ? value : new Date(value)

    return new Intl.DateTimeFormat(getStoredLocale(), {
        dateStyle: 'medium',
        timeStyle: 'short',
    }).format(date)
}
