export function toStripeMinorUnits(amount: number) {
    if (!Number.isSafeInteger(amount) || amount < 1 || amount > Number.MAX_SAFE_INTEGER / 100) {
        throw new Error('Payment amount is outside Stripe minor-unit bounds.')
    }

    return amount * 100
}

export function getRemainingPaymentAmountMinor(
    grossAmount: number,
    refundedAmountMinor: number,
) {
    const grossAmountMinor = toStripeMinorUnits(grossAmount)
    if (
        !Number.isSafeInteger(refundedAmountMinor)
        || refundedAmountMinor < 0
        || refundedAmountMinor > grossAmountMinor
    ) {
        throw new Error('Refunded payment amount is outside the stored payment bounds.')
    }

    return grossAmountMinor - refundedAmountMinor
}

export function formatPaymentMoney(
    minorUnits: number,
    currency: string,
    locale = 'en-US',
) {
    if (!Number.isSafeInteger(minorUnits) || minorUnits < 0) {
        throw new Error('Payment amount must be a non-negative safe integer.')
    }

    return new Intl.NumberFormat(locale, {
        style: 'currency',
        currency: currency.trim().toUpperCase(),
    }).format(minorUnits / 100)
}
