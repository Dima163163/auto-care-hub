export type ChatOfferDraft = {
    type: 'discount' | 'alternative'
    title: string
    description: string
    discountPercent: string
    couponCode: string
    amount: string
}

export type ChatOfferValidation =
    | {
        valid: true
        title: string
        description: string | null
        discountPercent: number | null
        couponCode: string | null
        amountMinor: number | null
        currencyCode: string | null
    }
    | {
        valid: false
        reason: 'title' | 'description' | 'discountPercent' | 'couponCode' | 'amount'
    }

const couponPattern = /^[A-Z0-9_-]{4,32}$/

export function validateChatOffer(draft: ChatOfferDraft): ChatOfferValidation {
    const title = draft.title.trim()
    if (title.length < 2 || title.length > 160) return { valid: false, reason: 'title' }

    const description = draft.description.trim()
    if (description.length > 4_000) return { valid: false, reason: 'description' }

    if (draft.type === 'discount') {
        const discountPercent = Number(draft.discountPercent)
        if (!Number.isInteger(discountPercent) || discountPercent < 1 || discountPercent > 100) {
            return { valid: false, reason: 'discountPercent' }
        }

        const couponCode = draft.couponCode.trim().toUpperCase()
        if (couponCode && !couponPattern.test(couponCode)) return { valid: false, reason: 'couponCode' }

        return {
            valid: true,
            title,
            description: description || null,
            discountPercent,
            couponCode: couponCode || null,
            amountMinor: null,
            currencyCode: null,
        }
    }

    const amount = draft.amount.trim()
    if (!amount) {
        return {
            valid: true,
            title,
            description: description || null,
            discountPercent: null,
            couponCode: null,
            amountMinor: null,
            currencyCode: null,
        }
    }

    const amountMinor = Math.round(Number(amount) * 100)
    if (!Number.isFinite(amountMinor) || amountMinor <= 0 || amountMinor > 1_000_000_000) {
        return { valid: false, reason: 'amount' }
    }

    return {
        valid: true,
        title,
        description: description || null,
        discountPercent: null,
        couponCode: null,
        amountMinor,
        currencyCode: 'RUB',
    }
}
