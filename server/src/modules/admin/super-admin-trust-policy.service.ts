import { AppDataSource } from '../../database/data-source.js'
import { In } from 'typeorm'
import { AutoCareTrustPolicyEntity, AutomotiveMarketEntity } from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { isSuperAdmin } from '../../shared/auth/roles.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { env } from '../../config/env.js'
import { DEFAULT_AUTOCARE_TRUST_POLICY, type AutoCareTrustPolicy } from '../autocare/trust-score.js'

export type SuperAdminTrustPolicyResponse = AutoCareTrustPolicy & {
    rollout: { enabled: boolean; marketIds: string[]; percentage: number }
    updatedAt: string | null
}

export type UpdateSuperAdminTrustPolicyInput = AutoCareTrustPolicy & {
    rollout: { enabled: boolean; marketIds: string[]; percentage: number }
}

const POLICY_ID = 'default'
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[1-5][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/i

function assertSuperAdmin(actor: UserEntity) {
    if (!isSuperAdmin(actor)) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only super admin can manage trust policy.' })
    }
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

export async function updateSuperAdminTrustPolicy(actor: UserEntity, input: UpdateSuperAdminTrustPolicyInput): Promise<SuperAdminTrustPolicyResponse> {
    assertSuperAdmin(actor)
    const rolloutMarketIds = [...new Set(input.rollout.marketIds)]
    if (rolloutMarketIds.length > 0) {
        const malformedIds = rolloutMarketIds.filter((marketId) => !UUID_PATTERN.test(marketId))
        if (malformedIds.length > 0) {
            throw new AppError({
                statusCode: 422,
                code: ERROR_CODES.ValidationError,
                message: `Rollout markets must use UUIDs: ${malformedIds.join(', ')}`,
            })
        }
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
        policyVersion: input.policyVersion,
        trustedMinimumRating: input.trustedMinimumRating,
        trustedMinimumReviews: input.trustedMinimumReviews,
        trustedMinimumCompletedVisits: input.trustedMinimumCompletedVisits,
        trustedMaxNoShowRate: input.trustedMaxNoShowRate,
        trustedMaxComplaintRate: input.trustedMaxComplaintRate,
        trustedMaxResponseTimeMinutes: input.trustedMaxResponseTimeMinutes,
        reassessmentIntervalHours: input.reassessmentIntervalHours,
        rolloutEnabled: input.rollout.enabled,
        rolloutMarketIds,
        rolloutPercentage: input.rollout.percentage,
        updatedById: actor.id,
    })
    return fromEntity(await repository.save(entity))
}
