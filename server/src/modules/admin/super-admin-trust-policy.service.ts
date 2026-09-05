import { AppDataSource } from '../../database/data-source.js'
import { In } from 'typeorm'
import { AutoCareTrustPolicyEntity, AutomotiveMarketEntity } from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { env } from '../../config/env.js'
import { DEFAULT_AUTOCARE_TRUST_POLICY, type AutoCareTrustPolicy } from '../autocare/trust-score.js'
import { normalizeSuperAdminTrustPolicyInput, normalizeSuperAdminTrustPolicyUuid, type NormalizedSuperAdminTrustPolicyInput } from './super-admin-trust-policy-input-policy.js'

export type SuperAdminTrustPolicyResponse = AutoCareTrustPolicy & {
    rollout: { enabled: boolean; marketIds: string[]; percentage: number }
    updatedAt: string | null
}

export type UpdateSuperAdminTrustPolicyInput = AutoCareTrustPolicy & {
    rollout: { enabled: boolean; marketIds: string[]; percentage: number }
}

const POLICY_ID = 'default'
function assertSuperAdmin(actor: UserEntity) {
    if (!isSuperAdmin(actor)) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only super admin can manage trust policy.' })
    }
}

function requireTrustPolicyInput(input: unknown): NormalizedSuperAdminTrustPolicyInput {
    const normalized = normalizeSuperAdminTrustPolicyInput(input)
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Trust policy payload is invalid.' })
    }
    return normalized
}

function requireTrustPolicyUuid(value: unknown) {
    const normalized = normalizeSuperAdminTrustPolicyUuid(value)
    if (!normalized) {
        throw new AppError({ statusCode: 422, code: ERROR_CODES.ValidationError, message: 'Rollout market id must be a valid UUID.' })
    }
    return normalized
}

function fromEntity(entity: AutoCareTrustPolicyEntity): SuperAdminTrustPolicyResponse {
    return {
        policyVersion: entity.policyVersion,
        trustedMinimumRating: Number(entity.trustedMinimumRating),
        trustedMinimumReviews: entity.trustedMinimumReviews,
        trustedMinimumCompletedVisits: entity.trustedMinimumCompletedVisits,
        trustedMaxNoShowRate: Number(entity.trustedMaxNoShowRate),
        trustedMaxComplaintRate: Number(entity.trustedMaxComplaintRate),
        trustedMaxResponseTimeMinutes: entity.trustedMaxResponseTimeMinutes,
        reassessmentIntervalHours: entity.reassessmentIntervalHours,
        rollout: {
            enabled: entity.rolloutEnabled,
            marketIds: [...entity.rolloutMarketIds],
            percentage: entity.rolloutPercentage,
        },
        updatedAt: entity.updatedAt?.toISOString() ?? null,
    }
}

export async function getAutoCareTrustPolicy(): Promise<AutoCareTrustPolicy> {
    try {
        const entity = await AppDataSource.getRepository(AutoCareTrustPolicyEntity).findOneBy({ id: POLICY_ID })
        if (!entity) return DEFAULT_AUTOCARE_TRUST_POLICY
        return {
            policyVersion: entity.policyVersion,
            trustedMinimumRating: Number(entity.trustedMinimumRating),
            trustedMinimumReviews: entity.trustedMinimumReviews,
            trustedMinimumCompletedVisits: entity.trustedMinimumCompletedVisits,
            trustedMaxNoShowRate: Number(entity.trustedMaxNoShowRate),
            trustedMaxComplaintRate: Number(entity.trustedMaxComplaintRate),
            trustedMaxResponseTimeMinutes: entity.trustedMaxResponseTimeMinutes,
            reassessmentIntervalHours: entity.reassessmentIntervalHours,
        }
    } catch {
        return DEFAULT_AUTOCARE_TRUST_POLICY
    }
}

export async function getAutoCareTrustRollout() {
    try {
        const entity = await AppDataSource.getRepository(AutoCareTrustPolicyEntity).findOneBy({ id: POLICY_ID })
        return entity
            ? { enabled: entity.rolloutEnabled, marketIds: [...entity.rolloutMarketIds], percentage: entity.rolloutPercentage }
            : env.autoCareTrustRollout
    } catch {
        return env.autoCareTrustRollout
    }
}

export async function getSuperAdminTrustPolicy(actor: UserEntity): Promise<SuperAdminTrustPolicyResponse> {
    assertSuperAdmin(actor)
    const entity = await AppDataSource.getRepository(AutoCareTrustPolicyEntity).findOneBy({ id: POLICY_ID })
    if (!entity) {
        return {
            ...DEFAULT_AUTOCARE_TRUST_POLICY,
            rollout: env.autoCareTrustRollout,
            updatedAt: null,
        }
    }
    return fromEntity(entity)
}

export async function updateSuperAdminTrustPolicy(actor: UserEntity, input: unknown): Promise<SuperAdminTrustPolicyResponse> {
    assertSuperAdmin(actor)
    const normalizedInput = requireTrustPolicyInput(input)
    const rolloutMarketIds = normalizedInput.rollout.marketIds.map((marketId) => requireTrustPolicyUuid(marketId))
    if (rolloutMarketIds.length > 0) {
        const markets = await AppDataSource.getRepository(AutomotiveMarketEntity).find({
            where: { id: In(rolloutMarketIds) },
            select: { id: true },
        })
        if (markets.length !== rolloutMarketIds.length) {
            const existingIds = new Set(markets.map((market) => market.id))
            const missingIds = rolloutMarketIds.filter((marketId) => !existingIds.has(marketId))
            throw new AppError({
                statusCode: 422,
                code: ERROR_CODES.ValidationError,
                message: `Rollout markets do not exist: ${missingIds.join(', ')}`,
            })
        }
    }
    const repository = AppDataSource.getRepository(AutoCareTrustPolicyEntity)
    const entity = await repository.findOneBy({ id: POLICY_ID }) ?? repository.create({ id: POLICY_ID })
    Object.assign(entity, {
        policyVersion: normalizedInput.policyVersion,
        trustedMinimumRating: normalizedInput.trustedMinimumRating,
        trustedMinimumReviews: normalizedInput.trustedMinimumReviews,
        trustedMinimumCompletedVisits: normalizedInput.trustedMinimumCompletedVisits,
        trustedMaxNoShowRate: normalizedInput.trustedMaxNoShowRate,
        trustedMaxComplaintRate: normalizedInput.trustedMaxComplaintRate,
        trustedMaxResponseTimeMinutes: normalizedInput.trustedMaxResponseTimeMinutes,
        reassessmentIntervalHours: normalizedInput.reassessmentIntervalHours,
        rolloutEnabled: normalizedInput.rollout.enabled,
        rolloutMarketIds,
        rolloutPercentage: normalizedInput.rollout.percentage,
        updatedById: actor.id,
    })
    return fromEntity(await repository.save(entity))
}
