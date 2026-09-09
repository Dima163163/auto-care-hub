import { createHmac } from 'node:crypto'
import type { EntityManager } from 'typeorm'
import type { FastifyRequest } from 'fastify'

import { AppDataSource } from '../../database/data-source.js'
import {
    UserConsentAction,
    UserConsentEntity,
    UserConsentSource,
    UserConsentType,
} from '../../entities/user-consent/user-consent.entity.js'
import { env } from '../../config/env.js'

export const LEGAL_DOCUMENT_VERSIONS = {
    terms: 'draft-2026-08-13',
    privacy: 'draft-2026-08-13',
} as const

const OPTIONAL_CONSENT_TYPES = [
    UserConsentType.Analytics,
    UserConsentType.Marketing,
] as const

export type OptionalConsentType = typeof OPTIONAL_CONSENT_TYPES[number]

type ConsentEvidence = {
    ipAddress?: string | null
    userAgent?: string | null
}

type RecordConsentInput = ConsentEvidence & {
    userId: string
    consentType: UserConsentType
    action: UserConsentAction
    documentVersion: string
    source: UserConsentSource
    resourceId?: string | null
}

export function hashConsentEvidence(value: string | null | undefined) {
    if (!value) return null

    return createHmac('sha256', env.auth.jwtAccessSecret)
        .update(value)
        .digest('hex')
}

export function getConsentEvidence(request?: Pick<FastifyRequest, 'ip' | 'headers'>): ConsentEvidence {
    return {
        ipAddress: request?.ip ?? null,
        userAgent: request?.headers['user-agent'] ?? null,
    }
}

export async function recordConsentWithManager(
    manager: EntityManager,
    input: RecordConsentInput,
) {
    const repository = manager.getRepository(UserConsentEntity)

    return repository.save(repository.create({
        userId: input.userId,
        consentType: input.consentType,
        action: input.action,
        documentVersion: input.documentVersion,
        source: input.source,
        resourceId: input.resourceId ?? null,
        ipAddressHash: hashConsentEvidence(input.ipAddress),
        userAgentHash: hashConsentEvidence(input.userAgent),
    }))
}

export async function recordConsents(
    input: Omit<RecordConsentInput, 'consentType' | 'documentVersion'> & {
        consents: Array<{
            type: UserConsentType
            documentVersion: string
        }>
    },
) {
    return AppDataSource.transaction(async (manager) => Promise.all(
        input.consents.map((consent) => recordConsentWithManager(manager, {
            userId: input.userId,
            consentType: consent.type,
            action: input.action,
            documentVersion: consent.documentVersion,
            source: input.source,
            resourceId: input.resourceId,
            ipAddress: input.ipAddress,
            userAgent: input.userAgent,
        })),
    ))
}

function isOptionalConsentType(value: UserConsentType): value is OptionalConsentType {
    return OPTIONAL_CONSENT_TYPES.includes(value as OptionalConsentType)
}

export async function setOptionalConsent(
    userId: string,
    consentType: OptionalConsentType,
    granted: boolean,
    request?: Pick<FastifyRequest, 'ip' | 'headers'>,
) {
    if (!isOptionalConsentType(consentType)) {
        throw new Error('Only optional consent types can be changed by the user.')
    }

    return recordConsents({
        userId,
        consents: [{
            type: consentType,
            documentVersion: LEGAL_DOCUMENT_VERSIONS.privacy,
        }],
        action: granted ? UserConsentAction.Granted : UserConsentAction.Revoked,
        source: UserConsentSource.Profile,
        ...getConsentEvidence(request),
    })
}

export async function getUserConsentState(userId: string) {
    const records = await AppDataSource.getRepository(UserConsentEntity).find({
        where: { userId },
        order: { createdAt: 'DESC' },
    })
    const latest = new Map<UserConsentType, UserConsentEntity>()

    for (const record of records) {
        if (!latest.has(record.consentType)) latest.set(record.consentType, record)
    }

    const toState = (type: UserConsentType) => {
        const record = latest.get(type)
        return {
            granted: record?.action === UserConsentAction.Granted,
            version: record?.documentVersion ?? null,
            recordedAt: record?.createdAt.toISOString() ?? null,
        }
    }

    return {
        versions: LEGAL_DOCUMENT_VERSIONS,
        consents: {
            terms: toState(UserConsentType.Terms),
            privacy: toState(UserConsentType.Privacy),
            analytics: toState(UserConsentType.Analytics),
            marketing: toState(UserConsentType.Marketing),
        },
    }
}
