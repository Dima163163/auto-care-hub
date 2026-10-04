

export type AutoCareAvailability = { date: string; timezone?: string; durationMinutes: number; slots: Array<{ startTime: string; endTime: string; startsAt: string }> }

export type AutoCareServiceRequest = {
    id: string
    providerId: string
    providerName: string
    locationId: string
    address: string
    definitionId: string
    serviceSlug: string
    serviceLabels: Record<string, string>
    serviceDescription: string | null
    offeringId: string | null
    priceFromMinor: number | null
    currencyCode: string | null
    preferredAt: string | null
    timezone?: string | null
    vehicleId?: string | null
    vehicleSnapshot: Record<string, string | number | null> | null
    contactSnapshot: Record<string, string | number | null> | null
    note: string | null
    status: 'draft' | 'open' | 'awaiting_reply' | 'estimate_shared' | 'accepted' | 'declined' | 'cancelled' | 'no_show' | 'closed'
    clientConfirmedAt: string | null
    providerConfirmedAt: string | null
    cancelledAt?: string | null
    cancelledById?: string | null
    cancellationReason?: string | null
    noShowAt?: string | null
    noShowById?: string | null
    noShowReason?: string | null
    completedAt?: string | null
    completedById?: string | null
    completionNote?: string | null
    acceptedQuoteVersion?: number | null
    acceptedQuoteSnapshot?: Record<string, unknown> | null
    acceptedQuoteAt?: string | null
    booking?: AutoCareBookingSnapshot | null
    reschedule: AutoCareReschedule | null
    createdAt: string
    updatedAt: string
    quote: AutoCareServiceQuote | null
    quoteHistory: Array<AutoCareServiceQuote & { id: string; version: number }>
}

export type AutoCareBookingSnapshot = {
    requestId: string
    quoteVersion: number
    amountMinor: number
    currencyCode: string
    lineItems: AutoCareQuoteLineItem[]
    scheduledAt: string
    timezone: string
    serviceSlug: string
    providerId: string
    locationId: string
    status: 'confirmed'
    createdAt: string
    vehicleId?: string | null
    vehicleSnapshot?: Record<string, string | number | null> | null
    bonusDiscountMinor?: number
    payableAmountMinor?: number
}

export type AutoCareReschedule = { id: string; proposedAt: string; requestedById: string; status: 'pending' | 'accepted' | 'rejected'; reason: string | null; resolvedById: string | null; resolutionReason: string | null; createdAt: string; resolvedAt: string | null }

export type AutoCareQuoteLineItem = { kind: 'part' | 'labour' | 'consumable' | 'tax' | 'fee' | 'discount'; title: string; quantity: number; unitPriceMinor: number; totalMinor: number }

export type AutoCareServiceQuote = { amountMinor: number; currencyCode: string; note: string | null; createdAt: string; lineItems?: AutoCareQuoteLineItem[]; subtotalMinor?: number; taxMinor?: number; feesMinor?: number; validUntil?: string | null; priceLocked?: boolean; status?: 'pending' | 'accepted' | 'declined' | 'expired' | 'superseded' }

export type AutoCareQuoteDecisionInput = { requestId: string; quoteId: string; quoteVersion: number }

export type AutoCareServiceMessageOffer = { type: 'discount' | 'alternative'; title: string; description: string | null; discountPercent: number | null; couponCode: string | null; amountMinor: number | null; currencyCode: string | null; expiresAt: string | null; status: 'pending' | 'accepted' | 'declined' }

export type AutoCareServiceMessage = { id: string; senderId: string; kind: 'text' | 'system' | 'offer'; body: string | null; offer: AutoCareServiceMessageOffer | null; deliveredAt: string | null; readAt: string | null; deletedAt?: string | null; createdAt: string }

export type AutoCareServiceAttachment = { id: string; uploadedById: string; contentType: string; bytes: number; status: 'pending' | 'ready' | 'rejected'; url: string; createdAt: string }

export type AutoCareServiceConversation = { request: AutoCareServiceRequest; messages: AutoCareServiceMessage[]; attachments: AutoCareServiceAttachment[]; nextCursor: string | null; previousCursor: string | null; moderationReviewActive: boolean; messagesProtected: boolean }

export type GetAutoCareAttachmentObjectUrlInput = { attachmentId: string; emergencyReason?: string } & ({ channel: 'request'; requestId: string } | { channel: 'chat'; chatId: string })

export type CreateAutoCareServiceMessageInput = { requestId: string; body: string; idempotencyKey?: string }

export type GetAutoCareServiceConversationInput = { requestId: string; cursor?: string; beforeCursor?: string; limit?: number }

export type CreateAutoCareServiceOfferInput = { requestId: string; type: 'discount' | 'alternative'; title: string; description?: string | null; discountPercent?: number | null; couponCode?: string | null; amountMinor?: number | null; currencyCode?: string | null; expiresAt?: string | null }

export type DecideAutoCareServiceOfferInput = { requestId: string; messageId: string; decision: 'accept' | 'decline' }

export type CreateAutoCareServiceAttachmentInput = { requestId: string; fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; size: number; contentBase64: string }

export type CreateAutoCareServiceQuoteInput = { requestId: string; amountMinor: number; currencyCode: string; note?: string | null; lineItems?: Array<Omit<AutoCareQuoteLineItem, 'totalMinor'>>; taxMinor?: number; feesMinor?: number; validUntil?: string | null; priceLocked?: boolean }

export type CompleteAutoCareServiceRequestInput = { requestId: string; note?: string | null }

export type AutoCareRepairEvent = { id: string; requestId: string; eventType: string; actorId: string | null; title: string; notes: string | null; metadata: Record<string, unknown>; createdAt: string }

export type CreateAutoCareServiceRequestInput = {
    providerId: string
    locationId: string
    offeringId: string
    preferredAt: string
    vehicleId?: string | null
    vehicleSnapshot?: {
        make: string
        model: string
        year: number
        mileage?: number
        fuelType?: string
        engineDisplacement?: number | null
        horsepower?: number | null
        color?: string
        licensePlate?: string | null
        internalNumber?: string | null
        vin?: string | null
    } | null
    contactSnapshot: {
        name: string
        email: string
        phone: string
    }
    note?: string | null
    dataProcessingConsent: true
    idempotencyKey?: string
}
