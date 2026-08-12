export const BOOKING_COMMISSION_RATE = 0.02
export const BOOKING_COMMISSION_CAP = 10_000

export function calculateBookingCommission(amount: number) {
    if (!Number.isFinite(amount) || amount <= 0) {
        return 0
    }

    return Math.min(Math.round(amount * BOOKING_COMMISSION_RATE), BOOKING_COMMISSION_CAP)
}

export function calculateOwnerPayout(amount: number) {
    return Math.max(0, amount - calculateBookingCommission(amount))
}
