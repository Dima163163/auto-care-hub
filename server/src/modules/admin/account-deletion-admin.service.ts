import { type EntityManager } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import {
    AccountDeletionRequestEntity,
    AccountDeletionRequestStatus,
} from '../../entities/account-deletion-request/account-deletion-request.entity.js'
import { UserEntity, UserStatus } from '../../entities/user/user.entity.js'
import { UserSessionEntity } from '../../entities/user-session/user-session.entity.js'
import { SecurityTokenEntity } from '../../entities/security-token/security-token.entity.js'
import { OAuthIdentityEntity } from '../../entities/oauth-identity/oauth-identity.entity.js'
import { OAuthLinkRequestEntity } from '../../entities/oauth-link-request/oauth-link-request.entity.js'
import { FavoriteCabinetEntity } from '../../entities/favorite-cabinet/favorite-cabinet.entity.js'
import { CabinetEntity, CabinetStatus } from '../../entities/cabinet/cabinet.entity.js'
import { NotificationEntity } from '../../entities/notification/notification.entity.js'
import { ClientVehicleEntity } from '../../entities/user/client-vehicle.entity.js'
import {
    AutoCareBonusAccountEntity,
    AutomotiveProviderEntity,
    AutomotiveProviderInvitationEntity,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderStatus,
} from '../../entities/index.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { createEmailBlindIndex, encryptRedactedFieldValue } from '../../shared/security/data-encryption/field-encryption.js'
import { createPlaintextRecordBinding } from '../../shared/security/data-encryption/plaintext-record-binding.js'
import { chatThreadRecordContext, type ChatThreadRecordScope } from '../../shared/security/data-encryption/chat-thread-record-scope.js'
import { providerChangeRequestContext } from '../../shared/security/data-encryption/provider-change-request-record-binding.js'
import { appealContext } from '../../shared/security/data-encryption/appeal-record-binding.js'
import { catalogGapContext } from '../../shared/security/data-encryption/catalog-gap-record-binding.js'
import { repairEventContext } from '../../shared/security/data-encryption/repair-event-record-binding.js'
import { broadcastRequestContext } from '../../shared/security/data-encryption/broadcast-request-record-binding.js'
import { broadcastOfferContext } from '../../shared/security/data-encryption/broadcast-offer-record-binding.js'
import { guaranteeClaimContext } from '../../shared/security/data-encryption/guarantee-claim-record-binding.js'
import { expertQuestionContext } from '../../shared/security/data-encryption/expert-question-record-binding.js'
import { fleetAccountContext } from '../../shared/security/data-encryption/fleet-account-record-binding.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import {
    assertCursorDate,
    decodeCursor,
    getCursorLimit,
    isCursorPaginationRequested,
    toCursorPage,
} from '../../shared/http/cursor-pagination.js'
import type { CursorPage } from '../../shared/http/cursor-pagination.js'
import { isAccountDeletionStatusTransitionAllowed } from './account-deletion-status.js'
import { metrics } from '../../shared/observability/metrics.js'
import { getAdminDeletionListLimit } from './account-deletion-list-policy.js'
import { getAnonymizedIdentity, ANONYMIZED_REVIEW_TEXT } from '../users/account-anonymization-policy.js'
import { isAccountDeletionReady } from '../users/account-deletion-retention.js'
import { isAutoCareAttachmentObjectKeyOwnedBy, removeAutoCareAttachmentObject, shouldDeleteAutoCareAttachmentObject } from '../autocare/autocare-attachment-storage.js'
import { getAutoCareProviderLogoFileName, removeAutoCareProviderLogo } from '../autocare/autocare-provider-logo-storage.js'
import { getAutoCareProviderMediaFileName, removeAutoCareProviderMedia } from '../autocare/autocare-provider-media-storage.js'
import { deleteUploadedCabinetImages } from '../cabinets/cabinet-image-storage.js'
import { assertAutoCareDeletionInvariants } from '../users/account-deletion-invariants.js'
import { redactServiceQuoteSnapshots } from './service-quote-redaction.js'
import {
    normalizeAccountDeletionRequestsQuery,
    normalizeAccountDeletionRequestUuid,
    normalizeAccountDeletionTerminalStatus,
} from './account-deletion-input-policy.js'

async function redactAccountDeletionOutboxEvents(
    manager: EntityManager,
    userId: string,
    originalEmail: string,
) {
    const recipientMatch = `(event."payload" ->> 'userId' = $1 OR LOWER(TRIM(event."payload" ->> 'email')) = LOWER(TRIM($2)) OR LOWER(TRIM(event."payload" ->> 'toEmail')) = LOWER(TRIM($2)))`

    // Pending and retryable notifications must not be delivered after the
    // account has been anonymized. Delete only those not currently claimed by
    // a worker; an in-flight event is handled by the worker lease/retention
    // path and is never treated as deletion proof.
    await manager.query(
        `DELETE FROM "outbox_events" event
          WHERE event."status" IN ('pending', 'failed')
            AND ${recipientMatch}`,
        [userId, createEmailBlindIndex(originalEmail)],
    )

    // Completed/dead-letter rows are retained for operational history, but
    // their payload must not keep the deleted user's address or identifiers.
    await manager.query(
        `UPDATE "outbox_events" event
            SET "payload" = '{"redacted": true}'::jsonb
          WHERE event."status" IN ('completed', 'dead_letter')
            AND ${recipientMatch}`,
        [userId, createEmailBlindIndex(originalEmail)],
    )
}

function encryptedRedactedText(table: string, column: string, value: string) {
    return JSON.stringify(encryptRedactedFieldValue(table, column, value))
}

function encryptedRedactedJson(table: string, column: string, value: unknown) {
    return encryptRedactedFieldValue(table, column, value)
}

async function anonymizeAccount(manager: EntityManager, userId: string) {
    const userRepository = manager.getRepository(UserEntity)
    const user = await userRepository.findOne({
        where: { id: userId },
        lock: { mode: 'pessimistic_write' },
    })
    if (!user) return null

    const originalEmail = user.email
    await redactAccountDeletionOutboxEvents(manager, userId, originalEmail)
    const attachments = await manager.query(
        `SELECT "objectKey", "requestId", "threadId"
           FROM "autocare_service_attachments"
          WHERE "uploadedById" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)
             OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)`,
        [userId],
    ) as Array<{ objectKey: string; requestId: string | null; threadId: string | null }>
    const attachmentKeys = [...new Set(attachments.map(({ objectKey }) => objectKey))]
    const referenceRows = attachmentKeys.length === 0
        ? []
        : await manager.query(
            `SELECT "objectKey", COUNT(*)::int AS "count"
               FROM "autocare_service_attachments"
              WHERE "objectKey" = ANY($1::text[])
              GROUP BY "objectKey"`,
            [attachmentKeys],
        ) as Array<{ objectKey: string; count: number }>
    const referenceCounts = new Map(referenceRows.map(({ objectKey, count }) => [objectKey, count]))
    // Privacy wins over availability here. If object deletion fails, the
    // transaction is rolled back and completion can safely be retried because
    // object deletion is idempotent.
    for (const attachment of attachments) {
        const scopes = [
            ...(attachment.requestId ? [{ scope: 'requests' as const, parentId: attachment.requestId }] : []),
            ...(attachment.threadId ? [{ scope: 'chats' as const, parentId: attachment.threadId }] : []),
        ]
        if (shouldDeleteAutoCareAttachmentObject(referenceCounts.get(attachment.objectKey) ?? 0)
            && isAutoCareAttachmentObjectKeyOwnedBy(attachment.objectKey, scopes)) {
            await removeAutoCareAttachmentObject(attachment.objectKey)
        }
    }

    const ownedProviders = await manager.getRepository(AutomotiveProviderEntity).find({
        where: { ownerId: userId },
        select: { id: true, logoUrl: true, coverImageUrl: true, galleryImageUrls: true },
    })
    // Provider media is public by URL, so it must be removed before the
    // account is anonymized. If storage deletion fails, the transaction rolls
    // back and the provider keeps its references for a safe retry.
    for (const provider of ownedProviders) {
        const logoFileName = provider.logoUrl ? getAutoCareProviderLogoFileName(provider.logoUrl) : null
        if (logoFileName) await removeAutoCareProviderLogo(logoFileName)
        const coverFileName = provider.coverImageUrl
            ? getAutoCareProviderMediaFileName(provider.coverImageUrl, 'cover')
            : null
        if (coverFileName) await removeAutoCareProviderMedia('cover', coverFileName)
        for (const galleryUrl of provider.galleryImageUrls ?? []) {
            const galleryFileName = getAutoCareProviderMediaFileName(galleryUrl, 'gallery')
            if (galleryFileName) await removeAutoCareProviderMedia('gallery', galleryFileName)
        }
    }

    const ownedCabinets = await manager.getRepository(CabinetEntity).find({
        where: { ownerId: userId },
        select: { id: true, photos: true },
    })
    // Legacy cabinets remain referenced by historical bookings, so they
    // cannot be removed safely. Make them non-public and delete their
    // uploaded image objects before the account is anonymized instead.
    for (const cabinet of ownedCabinets) {
        if (cabinet.photos.length > 0) await deleteUploadedCabinetImages(cabinet.photos)
    }
    await manager.getRepository(CabinetEntity).update(
        { ownerId: userId },
        { status: CabinetStatus.Blocked, photos: [] },
    )

    const identity = getAnonymizedIdentity(userId)
    user.name = identity.name
    user.email = identity.email
    user.communityProfileEnabled = false
    user.communityDisplayName = null
    user.status = UserStatus.Blocked
    user.passwordHash = null
    user.phone = null
    user.avatarUrl = null
    user.locale = null
    user.emailVerifiedAt = null
    user.emailNotifications = false
    user.bookingEmailNotifications = false
    user.preferredCity = null
    user.preferredCategories = []
    user.failedLoginAttempts = 0
    user.lockedUntil = null
    user.lastFailedLoginAt = null
    user.tokenVersion += 1
    await userRepository.save(user)

    await manager.getRepository(UserSessionEntity).delete({ userId })
    await manager.getRepository(SecurityTokenEntity).delete({ userId })
    await manager.getRepository(OAuthLinkRequestEntity).delete({ userId })
    await manager.getRepository(OAuthIdentityEntity).delete({ userId })
    await manager.getRepository(FavoriteCabinetEntity).delete({ userId })
    await manager.getRepository(NotificationEntity).delete({ userId })
    await manager.getRepository(ClientVehicleEntity).delete({ userId })
    await manager.query(
        `DELETE FROM "autocare_service_attachments"
          WHERE "uploadedById" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)
             OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)`,
        [userId],
    )
    await manager.getRepository(AutoCareBonusAccountEntity).delete({ clientId: userId })
    await manager.getRepository(AutomotiveProviderMembershipEntity).delete({ userId })
    await manager.getRepository(AutomotiveProviderInvitationEntity).delete([
        { email: originalEmail },
        { invitedById: userId },
    ])
    // A detached provider is suspended and no longer public. Clear direct
    // contact fields that may have been the owner's personal phone/email while
    // preserving the business profile for an explicit future transfer.
    await manager.getRepository(AutomotiveProviderEntity).update(
        { ownerId: userId },
        {
            phone: null,
            phones: [],
            email: null,
            publicContactNote: null,
            logoUrl: null,
            coverImageUrl: null,
            galleryImageUrls: [],
        },
    )
    await manager.getRepository(AutomotiveProviderEntity).update(
        { ownerId: userId },
        { ownerId: null, status: AutomotiveProviderStatus.Suspended },
    )

    // Preserve immutable booking/financial references, but redact free text and
    // private AutoCare payloads that are not needed for settlement/audit.
    await manager.query('UPDATE "reviews" SET "text" = $1 WHERE "clientId" = $2', [ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "audit_logs" SET "actor_id" = NULL, "metadata" = \'{"redacted": true}\'::jsonb WHERE "actor_id" = $1', [userId])
    await manager.query('UPDATE "platform_reviews" SET "authorName" = $1, "avatarUrl" = NULL, "text" = $2, "organizationResponse" = NULL WHERE "clientId" = $3', [identity.name, ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "platform_reviews" SET "respondedById" = NULL WHERE "respondedById" = $1', [userId])
    await manager.query('UPDATE "autocare_reviews" SET "authorName" = $1, "vehicleLabel" = $1, "avatarUrl" = NULL, "photoUrls" = \'{}\', "text" = $2, "clientId" = NULL WHERE "clientId" = $3', [identity.name, ANONYMIZED_REVIEW_TEXT, userId])
    await manager.query('UPDATE "autocare_review_promos" SET "clientId" = NULL, "redeemedById" = NULL WHERE "clientId" = $1 OR "redeemedById" = $1', [userId])
    await manager.query(
        `UPDATE "autocare_service_requests"
            SET "contactSnapshot" = NULL,
                "contactSnapshotBinding" = NULL,
                "vehicleSnapshot" = NULL,
                "vehicleSnapshotBinding" = NULL,
                "note" = NULL,
                "noteBinding" = NULL,
                "estimateSnapshot" = NULL,
                "estimateSnapshotBinding" = NULL,
                "acceptedQuoteSnapshot" = NULL,
                "acceptedQuoteSnapshotBinding" = NULL,
                "bookingSnapshot" = NULL,
                "bookingSnapshotBinding" = NULL,
                "cancelledById" = NULL,
                "noShowById" = NULL,
                "completedById" = NULL
          WHERE "clientId" = $1
             OR "cancelledById" = $1
             OR "noShowById" = $1
             OR "completedById" = $1`,
        [userId],
    )
    await redactServiceQuoteSnapshots(manager, userId)
    const broadcastsToRedact = await manager.query(
        'SELECT "id", "clientId", "serviceDefinitionId", "marketId" FROM "autocare_broadcast_requests" WHERE "clientId" = $1 ORDER BY "id" FOR UPDATE',
        [userId],
    ) as Array<{ id: string; clientId: string; serviceDefinitionId: string; marketId: string | null }>
    const redactedBroadcastIssue = encryptedRedactedText('autocare_broadcast_requests', 'issueDescription', ANONYMIZED_REVIEW_TEXT)
    for (const broadcast of broadcastsToRedact) {
        const context = broadcastRequestContext(broadcast)
        await manager.query(
            `UPDATE "autocare_broadcast_requests" SET "issueDescription" = $2,
                "issueDescriptionBinding" = $3, "vehicleSnapshot" = NULL,
                "vehicleSnapshotBinding" = NULL, "photoUrls" = '{}' WHERE "id" = $1`,
            [broadcast.id, redactedBroadcastIssue,
                createPlaintextRecordBinding('autocare_broadcast_requests', 'issueDescription', ANONYMIZED_REVIEW_TEXT, broadcast.id, context)],
        )
    }
    const broadcastOffersToRedact = await manager.query(
        `SELECT offer."id", offer."broadcastRequestId", offer."providerId", offer."locationId"
           FROM "autocare_broadcast_offers" offer
           JOIN "autocare_broadcast_requests" request ON request."id" = offer."broadcastRequestId"
          WHERE request."clientId" = $1 ORDER BY offer."id" FOR UPDATE OF offer`,
        [userId],
    ) as Array<{ id: string; broadcastRequestId: string; providerId: string; locationId: string }>
    const redactedOfferSnapshot = { redacted: true }
    const encryptedRedactedOfferSnapshot = encryptedRedactedJson('autocare_broadcast_offers', 'offerSnapshot', redactedOfferSnapshot)
    for (const offer of broadcastOffersToRedact) {
        await manager.query(
            'UPDATE "autocare_broadcast_offers" SET "offerSnapshot" = $2::jsonb, "offerSnapshotBinding" = $3 WHERE "id" = $1',
            [offer.id, encryptedRedactedOfferSnapshot,
                createPlaintextRecordBinding('autocare_broadcast_offers', 'offerSnapshot',
                    JSON.stringify(redactedOfferSnapshot), offer.id, broadcastOfferContext(offer))],
        )
    }
    const guaranteeClaimsToRedact = await manager.query(
        'SELECT "id", "requestId", "clientId", "providerId", "claimType" FROM "autocare_guarantee_claims" WHERE "clientId" = $1 ORDER BY "id" FOR UPDATE',
        [userId],
    ) as Array<{ id: string; requestId: string; clientId: string; providerId: string; claimType: string }>
    const redactedGuaranteeSummary = encryptedRedactedText('autocare_guarantee_claims', 'summary', ANONYMIZED_REVIEW_TEXT)
    for (const claim of guaranteeClaimsToRedact) {
        await manager.query(
            `UPDATE "autocare_guarantee_claims" SET "summary" = $2, "summaryBinding" = $3,
                "evidenceUrls" = '{}', "resolution" = NULL, "resolutionBinding" = NULL WHERE "id" = $1`,
            [claim.id, redactedGuaranteeSummary,
                createPlaintextRecordBinding('autocare_guarantee_claims', 'summary', ANONYMIZED_REVIEW_TEXT, claim.id, guaranteeClaimContext(claim))],
        )
    }
    await manager.query('UPDATE "autocare_guarantee_claims" SET "resolvedById" = NULL WHERE "resolvedById" = $1', [userId])
    const expertQuestionsToRedact = await manager.query(
        'SELECT "id", "clientId" FROM "autocare_expert_questions" WHERE "clientId" = $1 ORDER BY "id" FOR UPDATE',
        [userId],
    ) as Array<{ id: string; clientId: string }>
    const redactedExpertSymptoms = encryptedRedactedText('autocare_expert_questions', 'symptoms', ANONYMIZED_REVIEW_TEXT)
    for (const question of expertQuestionsToRedact) {
        await manager.query(
            `UPDATE "autocare_expert_questions" SET "symptoms" = $2, "symptomsBinding" = $3,
                "vehicleSnapshot" = NULL, "vehicleSnapshotBinding" = NULL,
                "answer" = NULL, "answerBinding" = NULL WHERE "id" = $1`,
            [question.id, redactedExpertSymptoms,
                createPlaintextRecordBinding('autocare_expert_questions', 'symptoms', ANONYMIZED_REVIEW_TEXT, question.id, expertQuestionContext(question))],
        )
    }
    await manager.query('UPDATE "autocare_expert_questions" SET "answeredById" = NULL WHERE "answeredById" = $1', [userId])
    const fleetsToRedact = await manager.query(
        'SELECT "id", "ownerId" FROM "autocare_fleet_accounts" WHERE "ownerId" = $1 ORDER BY "id" FOR UPDATE',
        [userId],
    ) as Array<{ id: string; ownerId: string }>
    const redactedFleetName = encryptedRedactedText('autocare_fleet_accounts', 'name', identity.name)
    for (const fleet of fleetsToRedact) {
        await manager.query(
            'UPDATE "autocare_fleet_accounts" SET "name" = $2, "nameBinding" = $3, "notes" = NULL, "notesBinding" = NULL WHERE "id" = $1',
            [fleet.id, redactedFleetName,
                createPlaintextRecordBinding('autocare_fleet_accounts', 'name', identity.name, fleet.id, fleetAccountContext(fleet))],
        )
    }
    await manager.query('UPDATE "autocare_fleet_vehicles" SET "label" = $1, "vehicleSnapshot" = $2, "approvalPolicy" = NULL WHERE "fleetId" IN (SELECT "id" FROM "autocare_fleet_accounts" WHERE "ownerId" = $3)', [encryptedRedactedText('autocare_fleet_vehicles', 'label', identity.name), encryptedRedactedJson('autocare_fleet_vehicles', 'vehicleSnapshot', {}), userId])
    await manager.query('UPDATE "autocare_service_requests" SET "cancellationReason" = NULL, "cancellationReasonBinding" = NULL, "noShowReason" = NULL, "noShowReasonBinding" = NULL, "completionNote" = NULL, "completionNoteBinding" = NULL WHERE "clientId" = $1', [userId])
    await manager.query(
        `UPDATE "autocare_service_messages"
            SET "body" = NULL, "bodyBinding" = NULL, "offer" = NULL, "offerBinding" = NULL
          WHERE "senderId" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)
             OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)`,
        [userId],
    )
    await manager.query('UPDATE "autocare_chat_reports" SET "description" = NULL, "descriptionBinding" = NULL, "reportedUserId" = NULL, "reviewedById" = NULL, "resolutionReason" = NULL, "resolutionReasonBinding" = NULL, "assignmentReason" = NULL, "assignmentReasonBinding" = NULL, "extensionReason" = NULL, "extensionReasonBinding" = NULL WHERE "reporterId" = $1 OR "reportedUserId" = $1 OR "reviewedById" = $1 OR "assignedModeratorId" = $1 OR "assignedById" = $1 OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)', [userId])
    await manager.query('UPDATE "autocare_chat_blocks" SET "reason" = NULL, "reasonBinding" = NULL WHERE "blockerId" = $1 OR "blockedUserId" = $1 OR "threadId" IN (SELECT "id" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1)', [userId])
    const threadsToRedact = await manager.query(
        'SELECT "id", "type", "requestId", "providerId" FROM "autocare_chat_threads" WHERE "clientId" = $1 OR "createdById" = $1 ORDER BY "id" FOR UPDATE',
        [userId],
    ) as Array<{ id: string } & ChatThreadRecordScope>
    const redactedChatSubject = encryptedRedactedText('autocare_chat_threads', 'subject', ANONYMIZED_REVIEW_TEXT)
    for (const thread of threadsToRedact) {
        const context = chatThreadRecordContext({ ...thread, clientId: null, createdById: null })
        const binding = createPlaintextRecordBinding('autocare_chat_threads', 'subject', ANONYMIZED_REVIEW_TEXT, thread.id, context)
        await manager.query(
            'UPDATE "autocare_chat_threads" SET "subject" = $2, "subjectBinding" = $3, "clientId" = NULL, "createdById" = NULL WHERE "id" = $1',
            [thread.id, redactedChatSubject, binding],
        )
    }
    const repairEventsToRedact = await manager.query(
        `SELECT "id", "requestId", "eventType" FROM "autocare_repair_events"
          WHERE "actorId" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)
          ORDER BY "id" FOR UPDATE`,
        [userId],
    ) as Array<{ id: string; requestId: string; eventType: string }>
    const redactedRepairTitle = encryptedRedactedText('autocare_repair_events', 'title', ANONYMIZED_REVIEW_TEXT)
    const redactedRepairMetadata = encryptedRedactedJson('autocare_repair_events', 'metadata', {})
    for (const repairEvent of repairEventsToRedact) {
        const context = repairEventContext(repairEvent)
        await manager.query(
            `UPDATE "autocare_repair_events" SET "actorId" = NULL, "title" = $2,
                "titleBinding" = $3, "notes" = NULL, "notesBinding" = NULL,
                "metadata" = $4::jsonb, "metadataBinding" = $5 WHERE "id" = $1`,
            [repairEvent.id, redactedRepairTitle,
                createPlaintextRecordBinding('autocare_repair_events', 'title', ANONYMIZED_REVIEW_TEXT, repairEvent.id, context),
                redactedRepairMetadata,
                createPlaintextRecordBinding('autocare_repair_events', 'metadata', '{}', repairEvent.id, context)],
        )
    }
    await manager.query('UPDATE "autocare_trust_evidence" SET "verifiedById" = NULL, "reference" = NULL, "referenceIndex" = NULL, "referenceBinding" = NULL, "notes" = NULL, "notesBinding" = NULL WHERE "verifiedById" = $1 OR "providerId" = ANY($2::uuid[])', [userId, ownedProviders.map(({ id }) => id)])
    const providerChangesToRedact = await manager.query(
        'SELECT "id", "providerId", "requestedById", "kind" FROM "autocare_provider_change_requests" WHERE "requestedById" = $1 ORDER BY "id" FOR UPDATE',
        [userId],
    ) as Array<{ id: string; providerId: string; requestedById: string; kind: string }>
    const redactedProviderChangePayload = { redacted: true }
    const encryptedProviderChangePayload = encryptedRedactedJson('autocare_provider_change_requests', 'payload', redactedProviderChangePayload)
    for (const change of providerChangesToRedact) {
        const context = providerChangeRequestContext(change)
        const binding = createPlaintextRecordBinding('autocare_provider_change_requests', 'payload',
            JSON.stringify(redactedProviderChangePayload), change.id, context)
        await manager.query(
            'UPDATE "autocare_provider_change_requests" SET "payload" = $2::jsonb, "payloadBinding" = $3, "reviewedById" = NULL, "reviewReason" = NULL, "reviewReasonBinding" = NULL WHERE "id" = $1',
            [change.id, encryptedProviderChangePayload, binding],
        )
    }
    await manager.query('UPDATE "autocare_provider_change_requests" SET "reviewedById" = NULL, "reviewReason" = NULL, "reviewReasonBinding" = NULL WHERE "reviewedById" = $1', [userId])
    const gapsToRedact = await manager.query(
        'SELECT "id", "requestedById", "providerId", "proposedSlug", "categorySlug", "priceType" FROM "autocare_catalog_gap_requests" WHERE "requestedById" = $1 ORDER BY "id" FOR UPDATE',
        [userId],
    ) as Array<{ id: string; requestedById: string; providerId: string | null; proposedSlug: string; categorySlug: string; priceType: string }>
    const redactedLabels = encryptedRedactedJson('autocare_catalog_gap_requests', 'labels', {})
    const redactedAttributes = encryptedRedactedJson('autocare_catalog_gap_requests', 'comparisonAttributes', [])
    const redactedRationale = encryptedRedactedText('autocare_catalog_gap_requests', 'rationale', ANONYMIZED_REVIEW_TEXT)
    for (const gap of gapsToRedact) {
        const context = catalogGapContext(gap)
        const labelsBinding = createPlaintextRecordBinding('autocare_catalog_gap_requests', 'labels', '{}', gap.id, context)
        const attributesBinding = createPlaintextRecordBinding('autocare_catalog_gap_requests', 'comparisonAttributes', '[]', gap.id, context)
        const rationaleBinding = createPlaintextRecordBinding('autocare_catalog_gap_requests', 'rationale', ANONYMIZED_REVIEW_TEXT, gap.id, context)
        await manager.query(
            'UPDATE "autocare_catalog_gap_requests" SET "labels" = $2::jsonb, "labelsBinding" = $3, "comparisonAttributes" = $4::jsonb, "comparisonAttributesBinding" = $5, "rationale" = $6, "rationaleBinding" = $7, "reviewedById" = NULL, "reviewReason" = NULL, "reviewReasonBinding" = NULL WHERE "id" = $1',
            [gap.id, redactedLabels, labelsBinding, redactedAttributes, attributesBinding,
                redactedRationale, rationaleBinding],
        )
    }
    await manager.query('UPDATE "autocare_catalog_gap_requests" SET "reviewedById" = NULL, "reviewReason" = NULL, "reviewReasonBinding" = NULL WHERE "reviewedById" = $1', [userId])
    const appealsToRedact = await manager.query(
        'SELECT "id", "subject", "subjectId", "submittedById", "providerId" FROM "autocare_appeals" WHERE "submittedById" = $1 ORDER BY "id" FOR UPDATE',
        [userId],
    ) as Array<{ id: string; subject: string; subjectId: string; submittedById: string; providerId: string | null }>
    const redactedAppealReason = encryptedRedactedText('autocare_appeals', 'reason', ANONYMIZED_REVIEW_TEXT)
    for (const appeal of appealsToRedact) {
        const binding = createPlaintextRecordBinding('autocare_appeals', 'reason',
            ANONYMIZED_REVIEW_TEXT, appeal.id, appealContext(appeal))
        await manager.query(
            'UPDATE "autocare_appeals" SET "reason" = $2, "reasonBinding" = $3, "evidenceIds" = \'{}\', "decidedById" = NULL, "decisionReason" = NULL, "decisionReasonBinding" = NULL WHERE "id" = $1',
            [appeal.id, redactedAppealReason, binding],
        )
    }
    await manager.query('UPDATE "autocare_appeals" SET "decidedById" = NULL, "decisionReason" = NULL, "decisionReasonBinding" = NULL WHERE "decidedById" = $1', [userId])
    await manager.query(
        `UPDATE "autocare_reschedule_requests"
            SET "reason" = NULL, "reasonBinding" = NULL, "resolvedById" = NULL, "resolutionReason" = NULL, "resolutionReasonBinding" = NULL
          WHERE "requestedById" = $1
             OR "resolvedById" = $1
             OR "requestId" IN (SELECT "id" FROM "autocare_service_requests" WHERE "clientId" = $1)`,
        [userId],
    )
    await manager.query('UPDATE "booking_reschedule_requests" SET "resolvedById" = NULL, "resolutionReason" = NULL, "resolutionReasonBinding" = NULL WHERE "requestedById" = $1 OR "resolvedById" = $1 OR "bookingId" IN (SELECT "id" FROM "bookings" WHERE "clientId" = $1)', [userId])
    await manager.query('UPDATE "booking_status_history" SET "changedById" = NULL, "reason" = NULL, "reasonBinding" = NULL WHERE "changedById" = $1 OR "bookingId" IN (SELECT "id" FROM "bookings" WHERE "clientId" = $1)', [userId])
    await manager.query('UPDATE "bookings" SET "comment" = NULL, "commentBinding" = NULL, "cancellationReason" = NULL, "cancellationReasonBinding" = NULL, "ownerNote" = NULL, "ownerNoteBinding" = NULL WHERE "clientId" = $1', [userId])
    await manager.query('UPDATE "autocare_trust_policy" SET "updatedById" = NULL WHERE "updatedById" = $1', [userId])
    await manager.query('UPDATE "autocare_bonus_ledger" SET "actorId" = NULL WHERE "actorId" = $1', [userId])
    await manager.query('UPDATE "security_event_actions" SET "assignee_id" = NULL WHERE "assignee_id" = $1', [userId])
    await manager.query('UPDATE "security_events" SET "user_id" = NULL WHERE "user_id" = $1', [userId])
    await assertAutoCareDeletionInvariants(manager, userId, originalEmail)
    return user
}

export type AdminDeletionRequestsQuery = {
    status?: AccountDeletionRequestStatus
    cursor?: string
    limit?: number
}

export type AdminDeletionRequest = {
    id: string
    userId: string
    user: {
        id: string
        name: string
        email: string
    }
    status: AccountDeletionRequestStatus
    reason: string | null
    requestedAt: string
    cancelledAt: string | null
    completedAt: string | null
}

export type AdminDeletionRequestTerminalStatus =
    | AccountDeletionRequestStatus.Cancelled
    | AccountDeletionRequestStatus.Completed

function assertSuperAdminAccess(user: UserEntity) {
    if (!isSuperAdmin(user)) {
        throw new AppError({
            statusCode: 403,
            code: ERROR_CODES.Forbidden,
            message: 'Only super admin can manage account deletion requests.',
        })
    }
}

function mapAdminDeletionRequest(request: AccountDeletionRequestEntity): AdminDeletionRequest {
    return {
        id: request.id,
        userId: request.userId,
        user: {
            id: request.user.id,
            name: request.user.name,
            email: request.user.email,
        },
        status: request.status,
        reason: request.reason,
        requestedAt: request.requestedAt.toISOString(),
        cancelledAt: request.cancelledAt?.toISOString() ?? null,
        completedAt: request.completedAt?.toISOString() ?? null,
    }
}

export async function getAdminDeletionRequests(
    admin: UserEntity,
    input: unknown = {},
): Promise<AdminDeletionRequest[] | CursorPage<AdminDeletionRequest>> {
    assertSuperAdminAccess(admin)

    const normalizedInput = normalizeAccountDeletionRequestsQuery(input)
    if (!normalizedInput) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Account deletion requests query is invalid.',
        })
    }

    const isPaginated = isCursorPaginationRequested(normalizedInput)
    const limit = getCursorLimit(normalizedInput.limit)
    const query = AppDataSource.getRepository(AccountDeletionRequestEntity)
        .createQueryBuilder('request')
        .leftJoinAndSelect('request.user', 'user')

    if (normalizedInput.status) {
        query.andWhere('request.status = :status', { status: normalizedInput.status })
    }

    if (normalizedInput.cursor) {
        const cursor = decodeCursor(normalizedInput.cursor, ['requestedAt', 'id'])
        const requestedAt = assertCursorDate(cursor, 'requestedAt')
        query.andWhere(
            '(request.requestedAt < :requestedAt OR (request.requestedAt = :requestedAt AND request.id < :cursorId))',
            { requestedAt, cursorId: cursor.id },
        )
    }

    const requests = await query
        .orderBy('request.requestedAt', 'DESC')
        .addOrderBy('request.id', 'DESC')
        .take(isPaginated ? limit + 1 : getAdminDeletionListLimit())
        .getMany()
    const mappedRequests = requests.map(mapAdminDeletionRequest)

    return isPaginated
        ? toCursorPage(mappedRequests, limit, (request) => ({
            requestedAt: request.requestedAt,
            id: request.id,
        }))
        : mappedRequests
}

export async function updateAdminDeletionRequestStatus(
    admin: UserEntity,
    requestId: unknown,
    status: unknown,
): Promise<AdminDeletionRequest> {
    assertSuperAdminAccess(admin)
    const normalizedRequestId = normalizeAccountDeletionRequestUuid(requestId)
    const normalizedStatus = normalizeAccountDeletionTerminalStatus(status) as AdminDeletionRequestTerminalStatus | null
    if (!normalizedRequestId || !normalizedStatus) {
        throw new AppError({
            statusCode: 422,
            code: ERROR_CODES.ValidationError,
            message: 'Account deletion status mutation input is invalid.',
        })
    }
    let outcome: 'updated' | 'reused' = 'updated'

    const updatedRequest = await AppDataSource.transaction(async (manager) => {
        const repository = manager.getRepository(AccountDeletionRequestEntity)
        const deletionRequest = await repository
            .createQueryBuilder('request')
            .where('request.id = :requestId', { requestId: normalizedRequestId })
            .setLock('pessimistic_write')
            .getOne()

        if (!deletionRequest) {
            throw new AppError({
                statusCode: 404,
                code: ERROR_CODES.NotFound,
                message: 'Account deletion request not found.',
            })
        }

        const requestUser = await manager.getRepository(UserEntity).findOneBy({ id: deletionRequest.userId })
        if (!requestUser) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Account deletion request has no active account.',
            })
        }
        deletionRequest.user = requestUser

        if (deletionRequest.status === normalizedStatus) {
            outcome = 'reused'
            return deletionRequest
        }

        if (!isAccountDeletionStatusTransitionAllowed(deletionRequest.status, normalizedStatus)) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Only pending account deletion requests can change status.',
            })
        }

        if (normalizedStatus === AccountDeletionRequestStatus.Completed && !isAccountDeletionReady(deletionRequest.requestedAt)) {
            throw new AppError({
                statusCode: 409,
                code: ERROR_CODES.Conflict,
                message: 'Account deletion retention period has not elapsed.',
            })
        }

        const now = new Date()
        if (normalizedStatus === AccountDeletionRequestStatus.Completed) {
            // The reason is user-provided free text and may contain PII. Keep
            // it only while the request is pending; a completed deletion must
            // not retain it in the admin queue after the account is anonymized.
            deletionRequest.reason = null
            const anonymizedUser = await anonymizeAccount(manager, deletionRequest.userId)
            if (anonymizedUser) deletionRequest.user = anonymizedUser
        }
        deletionRequest.status = normalizedStatus
        deletionRequest.cancelledAt = normalizedStatus === AccountDeletionRequestStatus.Cancelled ? now : null
        deletionRequest.completedAt = normalizedStatus === AccountDeletionRequestStatus.Completed ? now : null

        return repository.save(deletionRequest)
    })

    metrics.increment('admin_account_deletion_status_updates_total', 1, { status: normalizedStatus, outcome })

    return mapAdminDeletionRequest(updatedRequest)
}

export { assertSuperAdminAccess, mapAdminDeletionRequest }
