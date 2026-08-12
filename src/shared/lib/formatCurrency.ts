import { APP_CONFIG } from '@/shared/config/app'
import { getStoredLocale } from '@/shared/config/i18n'

export function formatCurrency(value: number, currency: string = APP_CONFIG.currency) {
    return new Intl.NumberFormat(getStoredLocale(), {
        style: 'currency', // Эта настройка говорит: Форматируй число не просто как число, а как валюту.
        currency: currency.trim().toUpperCase(),
        maximumFractionDigits: 0, // Не показывать копейки / дробную часть.
    }).format(value) // Здесь происходит само форматирование.
}
