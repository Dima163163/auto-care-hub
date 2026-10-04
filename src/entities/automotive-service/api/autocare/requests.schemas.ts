import { z } from 'zod'
import type { AutoCareAvailability } from './requests.types'

export const autoCareAvailabilitySchema = z.object({ date: z.string(), timezone: z.string().optional(), durationMinutes: z.number().int().nonnegative(), slots: z.array(z.object({ startTime: z.string(), endTime: z.string(), startsAt: z.string().datetime({ offset: true }) }).passthrough()) }).passthrough() satisfies z.ZodType<AutoCareAvailability>

const autoCareQuoteLineItemSchema = z.object({
    kind: z.enum(['part', 'labour', 'consumable', 'tax', 'fee', 'discount']),
    title: z.string(),
    quantity: z.number().finite(),
    unitPriceMinor: z.number().int().min(-1_000_000_000).max(1_000_000_000),
    totalMinor: z.number().int(),
}).passthrough()

export const autoCareQuoteSchema = z.object({
    amountMinor: z.number().int().min(1).max(1_000_000_000),
    lineItems: z.array(autoCareQuoteLineItemSchema),
    subtotalMinor: z.number().int().nonnegative().max(1_000_000_000),
    taxMinor: z.number().int().nonnegative().max(1_000_000_000),
    feesMinor: z.number().int().nonnegative().max(1_000_000_000),
    currencyCode: z.string().regex(/^[A-Z]{3}$/),
    note: z.string().nullable(),
    validUntil: z.string().datetime({ offset: true }).nullable(),
    priceLocked: z.boolean(),
    status: z.enum(['pending', 'accepted', 'declined', 'expired', 'superseded']),
    createdAt: z.string().datetime({ offset: true }),
}).passthrough()

const autoCareQuoteHistorySchema = autoCareQuoteSchema.extend({ id: z.string().min(1), version: z.number().int().positive() }).passthrough()

const autoCareBookingSnapshotSchema = z.object({
    requestId: z.string(), quoteVersion: z.number().int().nonnegative(), amountMinor: z.number().finite(), currencyCode: z.string(),
    lineItems: z.array(autoCareQuoteLineItemSchema), scheduledAt: z.string(), timezone: z.string(), serviceSlug: z.string(),
    providerId: z.string(), locationId: z.string(), status: z.literal('confirmed'), createdAt: z.string(),
    bonusDiscountMinor: z.number().int().nonnegative().optional(), payableAmountMinor: z.number().int().nonnegative().optional(),
    vehicleId: z.string().nullable().optional(), vehicleSnapshot: z.record(z.string(), z.union([z.string(), z.number(), z.null()])).nullable().optional(),
}).passthrough()

export const autoCareRescheduleSchema = z.object({
    id: z.string().min(1), proposedAt: z.string(), requestedById: z.string(),
    status: z.enum(['pending', 'accepted', 'rejected']), reason: z.string().nullable(),
    resolvedById: z.string().nullable(), resolutionReason: z.string().nullable(),
    createdAt: z.string(), resolvedAt: z.string().nullable(),
}).passthrough()

export const autoCareScalarRecordSchema = z.record(z.string(), z.union([z.string(), z.number(), z.null()]))

export const autoCareServiceRequestSchema = z.object({
    id: z.string().min(1), providerId: z.string().min(1), providerName: z.string(), locationId: z.string().min(1), address: z.string(), definitionId: z.string().min(1), serviceSlug: z.string(),
    serviceLabels: z.record(z.string(), z.string()), serviceDescription: z.string().nullable().default(null), offeringId: z.string().nullable(), priceFromMinor: z.number().finite().nullable(), currencyCode: z.string().nullable(), preferredAt: z.string().nullable(), timezone: z.string().nullable().optional(), vehicleId: z.string().nullable().optional(),
    vehicleSnapshot: autoCareScalarRecordSchema.nullable(), contactSnapshot: autoCareScalarRecordSchema.nullable(), note: z.string().nullable(), status: z.enum(['draft', 'open', 'awaiting_reply', 'estimate_shared', 'accepted', 'declined', 'cancelled', 'no_show', 'closed']), clientConfirmedAt: z.string().nullable(), providerConfirmedAt: z.string().nullable(), cancelledAt: z.string().nullable().optional(), cancelledById: z.string().nullable().optional(), cancellationReason: z.string().nullable().optional(), noShowAt: z.string().nullable().optional(), noShowById: z.string().nullable().optional(), noShowReason: z.string().nullable().optional(), completedAt: z.string().nullable().optional(), completedById: z.string().nullable().optional(), completionNote: z.string().nullable().optional(), acceptedQuoteVersion: z.number().int().positive().nullable().optional(), acceptedQuoteSnapshot: z.record(z.string(), z.unknown()).nullable().optional(), acceptedQuoteAt: z.string().nullable().optional(), booking: autoCareBookingSnapshotSchema.nullable().optional(), reschedule: autoCareRescheduleSchema.nullable().default(null), createdAt: z.string(), updatedAt: z.string(), quote: autoCareQuoteSchema.nullable(), quoteHistory: z.array(autoCareQuoteHistorySchema).default([]),
}).passthrough()

export const autoCareServiceRequestsSchema = z.array(autoCareServiceRequestSchema)

const autoCareServiceMessageOfferSchema = z.object({ type: z.enum(['discount', 'alternative']), title: z.string(), description: z.string().nullable(), discountPercent: z.number().int().nullable(), couponCode: z.string().nullable(), amountMinor: z.number().finite().nullable(), currencyCode: z.string().nullable(), expiresAt: z.string().nullable(), status: z.enum(['pending', 'accepted', 'declined']) }).passthrough()

export const autoCareServiceMessageSchema = z.object({ id: z.string().min(1), senderId: z.string().min(1), kind: z.enum(['text', 'system', 'offer']), body: z.string().nullable(), offer: autoCareServiceMessageOfferSchema.nullable(), deliveredAt: z.string().nullable(), readAt: z.string().nullable(), deletedAt: z.string().nullable().optional(), createdAt: z.string() }).passthrough()

export const autoCareServiceAttachmentSchema = z.object({ id: z.string().min(1), uploadedById: z.string().min(1), contentType: z.enum(['image/jpeg', 'image/png', 'image/webp']), bytes: z.number().int().positive(), status: z.enum(['pending', 'ready', 'rejected']), url: z.string(), createdAt: z.string().datetime({ offset: true }) }).passthrough()

export const autoCareServiceConversationSchema = z.object({ request: autoCareServiceRequestSchema, messages: z.array(autoCareServiceMessageSchema), attachments: z.array(autoCareServiceAttachmentSchema), nextCursor: z.string().nullable().default(null), previousCursor: z.string().nullable().default(null), moderationReviewActive: z.boolean().default(false), messagesProtected: z.boolean().default(false) }).passthrough()

export const autoCareRepairEventsSchema = z.array(z.object({ id: z.string(), requestId: z.string(), eventType: z.string(), actorId: z.string().nullable(), title: z.string(), notes: z.string().nullable(), metadata: z.record(z.string(), z.unknown()), createdAt: z.string() }).passthrough())
