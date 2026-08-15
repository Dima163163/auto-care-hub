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
    },
} as const satisfies AccountAnonymizationPolicy

export const ANONYMIZED_REVIEW_TEXT = 'Review removed after account deletion.'

export function getAnonymizedIdentity(userId: string) {
    return {
        name: 'Deleted account',
        email: `deleted+${userId}@example.invalid`,
    } as const
}
