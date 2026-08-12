export type AccountAnonymizationPolicy = {
    user: {
        identity: 'redact'
        credentials: 'set_null'
        contact: 'set_null'
        preferences: 'clear'
        providerIdentity: 'preserve_until_provider_offboarding'
        sessionsAndTokens: 'delete'
    }
    bookings: {
        businessAndFinancialReferences: 'preserve'
        freeText: 'redact'
    }
    reviews: {
        ratingStatusAndTimestamps: 'preserve'
        text: 'redact'
        clientReference: 'preserve'
    }
    paymentsAndInvoices: {
        amountsCurrenciesProviderReferencesAndStatuses: 'preserve'
        userReference: 'preserve_through_booking'
    }
    audit: {
        actionAndTimestamp: 'preserve'
        nullableActorReference: 'set_null'
        metadata: 'redact'
    }
    transientUserData: 'delete'
    financialRecords: {
        completedBooking: {
            businessReferences: 'preserve'
            clientReference: 'preserve_through_booking'
            freeText: 'redact'
        }
        review: {
            ratingStatusAndTimestamps: 'preserve'
            bookingAndCabinetReferences: 'preserve'
            clientReference: 'preserve_through_booking'
            text: 'redact'
        }
        invoice: {
            amountsCurrencyStatusAndIssuedAt: 'preserve'
            providerReference: 'preserve'
            userReference: 'preserve_through_booking'
        }
        refund: {
            amountCurrencyStatusAndTimestamps: 'preserve'
            providerReferences: 'preserve'
            freeTextReason: 'redact'
        }
        dispute: {
            amountCurrencyStatusAndTimestamps: 'preserve'
            providerReferencesAndEventCursor: 'preserve'
            freeTextReason: 'redact'
        }
        providerEvidence: {
            boundedIdentifiersAndSettlementFields: 'preserve'
            rawPayloadsAndPersonalMetadata: 'redact'
        }
    }
}

export const accountAnonymizationPolicy = {
    user: {
        identity: 'redact',
        credentials: 'set_null',
        contact: 'set_null',
        preferences: 'clear',
        providerIdentity: 'preserve_until_provider_offboarding',
        sessionsAndTokens: 'delete',
    },
    bookings: {
        businessAndFinancialReferences: 'preserve',
        freeText: 'redact',
    },
    reviews: {
        ratingStatusAndTimestamps: 'preserve',
        text: 'redact',
        clientReference: 'preserve',
    },
    paymentsAndInvoices: {
        amountsCurrenciesProviderReferencesAndStatuses: 'preserve',
        userReference: 'preserve_through_booking',
    },
    audit: {
        actionAndTimestamp: 'preserve',
        nullableActorReference: 'set_null',
        metadata: 'redact',
    },
    transientUserData: 'delete',
    financialRecords: {
        completedBooking: {
            businessReferences: 'preserve',
            clientReference: 'preserve_through_booking',
            freeText: 'redact',
        },
        review: {
            ratingStatusAndTimestamps: 'preserve',
            bookingAndCabinetReferences: 'preserve',
            clientReference: 'preserve_through_booking',
            text: 'redact',
        },
        invoice: {
            amountsCurrencyStatusAndIssuedAt: 'preserve',
            providerReference: 'preserve',
            userReference: 'preserve_through_booking',
        },
        refund: {
            amountCurrencyStatusAndTimestamps: 'preserve',
            providerReferences: 'preserve',
            freeTextReason: 'redact',
        },
        dispute: {
            amountCurrencyStatusAndTimestamps: 'preserve',
            providerReferencesAndEventCursor: 'preserve',
            freeTextReason: 'redact',
        },
        providerEvidence: {
            boundedIdentifiersAndSettlementFields: 'preserve',
            rawPayloadsAndPersonalMetadata: 'redact',
        },
    },
} as const satisfies AccountAnonymizationPolicy

export const ANONYMIZED_REVIEW_TEXT = 'Review removed after account deletion.'

export function getAnonymizedIdentity(userId: string) {
    return {
        name: 'Deleted account',
        email: `deleted+${userId}@example.invalid`,
    } as const
}
