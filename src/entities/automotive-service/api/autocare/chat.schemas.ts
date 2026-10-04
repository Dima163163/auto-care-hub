import { z } from 'zod'
import { autoCareServiceAttachmentSchema, autoCareServiceMessageSchema } from './requests.schemas'

export const autoCareChatThreadSchema = z.object({ id: z.string().min(1), type: z.enum(['service_request', 'provider_inquiry', 'support', 'admin_escalation']), status: z.enum(['open', 'closed']), subject: z.string(), requestId: z.string().nullable(), providerId: z.string().nullable(), providerName: z.string().nullable(), clientId: z.string().nullable(), lastMessageAt: z.string().nullable(), unreadCount: z.number().int().nonnegative(), moderationRestriction: z.object({ id: z.string(), reason: z.string(), expiresAt: z.string(), state: z.enum(['active', 'expired']), appealStatus: z.enum(['pending', 'accepted', 'rejected', 'withdrawn']).nullable() }).nullable().optional(), createdAt: z.string(), updatedAt: z.string() }).passthrough()

export const autoCareChatThreadsSchema = z.array(autoCareChatThreadSchema)

export const autoCareChatConversationSchema = z.object({ thread: autoCareChatThreadSchema, messages: z.array(autoCareServiceMessageSchema), attachments: z.array(autoCareServiceAttachmentSchema), nextCursor: z.string().nullable().default(null), previousCursor: z.string().nullable().default(null), moderationReviewActive: z.boolean().default(false), messagesProtected: z.boolean().default(false) }).passthrough()

export const autoCareChatReportSchema = z.object({ id: z.string(), threadId: z.string(), messageId: z.string().nullable(), reporterId: z.string(), reportedUserId: z.string().nullable(), category: z.enum(['spam', 'harassment', 'threat', 'fraud', 'unsafe', 'other']), description: z.string().nullable(), acknowledgeFullThreadReview: z.boolean().optional(), acknowledgedAt: z.string().nullable().optional(), policyVersion: z.string().nullable().optional(), assignedModeratorId: z.string().nullable(), accessExpiresAt: z.string().nullable(), extensionUsed: z.boolean(), status: z.enum(['pending', 'resolved', 'dismissed']), reviewedById: z.string().nullable(), resolutionReason: z.string().nullable(), overturnedAt: z.string().nullable().optional(), createdAt: z.string(), reviewedAt: z.string().nullable() }).passthrough()

const autoCareChatReportsSchema = z.array(autoCareChatReportSchema)

export const autoCareChatReportPageSchema = z.object({ items: autoCareChatReportsSchema, nextCursor: z.string().nullable(), totalCount: z.number().int().nonnegative().optional() })

export const autoCareChatBlockSchema = z.object({ id: z.string(), threadId: z.string(), blockerId: z.string(), blockedUserId: z.string(), status: z.enum(['active', 'revoked']), reason: z.string().nullable(), expiresAt: z.string().nullable().optional(), createdAt: z.string(), revokedAt: z.string().nullable() }).passthrough()
