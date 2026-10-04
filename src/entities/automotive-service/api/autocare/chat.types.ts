import type { AutoCareAppeal } from './governance.types'
import type { AutoCareServiceAttachment, AutoCareServiceMessage } from './requests.types'

export type AutoCareChatThreadType = 'service_request' | 'provider_inquiry' | 'support' | 'admin_escalation'

export type AutoCareChatRestriction = { id: string; reason: string; expiresAt: string; state: 'active' | 'expired'; appealStatus: AutoCareAppeal['status'] | null }

export type AutoCareChatThread = { id: string; type: AutoCareChatThreadType; status: 'open' | 'closed'; subject: string; requestId: string | null; providerId: string | null; providerName: string | null; clientId: string | null; lastMessageAt: string | null; unreadCount: number; moderationRestriction?: AutoCareChatRestriction | null; createdAt: string; updatedAt: string }

export type AutoCareChatConversation = { thread: AutoCareChatThread; messages: AutoCareServiceMessage[]; attachments: AutoCareServiceAttachment[]; nextCursor: string | null; previousCursor: string | null; moderationReviewActive: boolean; messagesProtected: boolean }

export type AutoCareChatReport = { id: string; threadId: string; messageId: string | null; reporterId: string; reportedUserId: string | null; category: 'spam' | 'harassment' | 'threat' | 'fraud' | 'unsafe' | 'other'; description: string | null; acknowledgeFullThreadReview?: boolean; acknowledgedAt?: string | null; policyVersion?: string | null; relatedReportId?: string | null; assignedModeratorId: string | null; accessExpiresAt: string | null; extensionUsed: boolean; status: 'pending' | 'resolved' | 'dismissed'; reviewedById: string | null; resolutionReason: string | null; overturnedAt?: string | null; createdAt: string; reviewedAt: string | null }

export type AutoCareChatReportPage = { items: AutoCareChatReport[]; nextCursor: string | null; totalCount?: number }

export type AutoCareChatReportListQuery = { cursor?: string; limit?: number }

export type AdminAutoCareChatReportQuery = AutoCareChatReportListQuery & {
    status?: AutoCareChatReport['status']
    scope?: 'active' | 'archive'
    search?: string
    assignedModeratorId?: string | 'me' | 'unassigned'
    category?: AutoCareChatReport['category']
}

export type AutoCareChatBlock = { id: string; threadId: string; blockerId: string; blockedUserId: string; status: 'active' | 'revoked'; reason: string | null; createdAt: string; revokedAt: string | null }

export type CreateAutoCareChatReportInput = { chatId: string; messageId: string; category: 'harassment' | 'threat' | 'fraud' | 'other'; description?: string | null; acknowledgeFullThreadReview: true }

export type AssignAutoCareChatReportInput = { id: string; moderatorId: string | null; reason: string }

export type ExtendAutoCareChatReportAccessInput = { id: string; reason: string }

export type DeleteAutoCareChatMessageResponse = { id: string; deletedAt: string }

export type CreateAutoCareChatBlockInput = { chatId: string; blockedUserId?: string; reason?: string | null }

export type RevokeAutoCareChatBlockInput = { chatId: string; blockId: string }

export type DecideAutoCareChatReportInput = { id: string; status: 'resolved' | 'dismissed'; reason?: string | null; blockUser?: boolean; blockDurationDays?: 1 | 7 | 30 }

export type CreateAutoCareChatInput = { type: Exclude<AutoCareChatThreadType, 'service_request'>; providerId?: string; requestId?: string; subject: string }

export type CreateAutoCareChatMessageInput = { chatId: string; body: string; idempotencyKey: string }

export type CreateAutoCareChatAttachmentInput = { chatId: string; fileName: string; contentType: 'image/jpeg' | 'image/png' | 'image/webp'; size: number; contentBase64: string }
