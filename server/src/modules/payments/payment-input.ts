export const MAX_PAYMENT_AMOUNT = 1_000_000
export const MAX_PAYMENT_IDEMPOTENCY_KEY_LENGTH = 128
import { isSupportedPaymentCurrency } from './payment-currencies.js'

export function validatePaymentAmounts(input: {
    grossAmount: number
    commissionAmount: number
    ownerPayoutAmount: number
}) {
    const amounts = [input.grossAmount, input.commissionAmount, input.ownerPayoutAmount]
    if (amounts.some((amount) => !Number.isSafeInteger(amount) || amount < 0 || amount > MAX_PAYMENT_AMOUNT)) {
        throw new Error('Payment amounts are outside accepted bounds.')
    }
    if (input.grossAmount < 1 || input.commissionAmount + input.ownerPayoutAmount !== input.grossAmount) {
        throw new Error('Payment amounts do not balance.')
    }
    return input
}

export function normalizePaymentCurrency(currency: string) {
    const normalized = currency.trim().toLowerCase()
    if (!/^[a-z]{3}$/.test(normalized) || !isSupportedPaymentCurrency(normalized)) {
        throw new Error('Payment currency must be a supported three-letter code.')
    }
    return normalized
}

export function normalizePaymentIdempotencyKey(key: string | undefined) {
    if (key === undefined) return undefined

    const normalized = key.trim()
    if (!/^[a-zA-Z0-9_-]{8,128}$/.test(normalized) || normalized.length > MAX_PAYMENT_IDEMPOTENCY_KEY_LENGTH) {
        throw new Error('Payment idempotency key is invalid.')
    }

    return normalized
}
