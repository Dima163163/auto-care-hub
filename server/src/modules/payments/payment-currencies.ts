export const SUPPORTED_PAYMENT_CURRENCIES = ['rub', 'usd', 'eur'] as const
export type SupportedPaymentCurrency = (typeof SUPPORTED_PAYMENT_CURRENCIES)[number]

export function isSupportedPaymentCurrency(value: string): value is SupportedPaymentCurrency {
    return SUPPORTED_PAYMENT_CURRENCIES.includes(value.trim().toLowerCase() as SupportedPaymentCurrency)
}
