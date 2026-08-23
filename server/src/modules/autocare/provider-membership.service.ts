import { createSecurityTokenValue, hashSecurityTokenValue } from '../auth/security-token-value.js'
import { AppDataSource } from '../../database/data-source.js'
import {
    AutomotiveProviderEntity,
    AutomotiveProviderInvitationEntity,
    AutomotiveProviderInvitationRole,
    AutomotiveProviderInvitationStatus,
    AutomotiveProviderMembershipEntity,
    AutomotiveProviderMembershipRole,
    AutomotiveProviderMembershipStatus,
    AutomotiveServiceLocationEntity,
} from '../../entities/index.js'
import type { UserEntity } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { canManageProvider } from './provider-access.service.js'
import type { CreateAutoCareProviderInvitationInput } from './autocare.types.js'

const INVITATION_TTL_DAYS = 7

function normalizeEmail(email: string) {
    return email.trim().toLowerCase()
}

function assertOwnerRole(user: UserEntity) {
    if (user.role !== 'owner') throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'Only a service owner can manage staff invitations.' })
}

async function getProvider(providerId: string) {
    const provider = await AppDataSource.getRepository(AutomotiveProviderEntity).findOne({ where: { id: providerId }, select: { id: true, ownerId: true } })
    if (!provider) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Automotive service provider not found.' })
    return provider
}

function toInvitationResponse(invitation: AutomotiveProviderInvitationEntity, inviteToken: string | null = null) {
    return {
        id: invitation.id,
        providerId: invitation.providerId,
        email: invitation.email,
        locationId: invitation.locationId,
        role: invitation.role,
        status: invitation.status,
        expiresAt: invitation.expiresAt.toISOString(),
        acceptedAt: invitation.acceptedAt?.toISOString() ?? null,
        revokedAt: invitation.revokedAt?.toISOString() ?? null,
        createdAt: invitation.createdAt.toISOString(),
        inviteToken,
    }
}

export async function listOwnerProviderMemberships(user: UserEntity, providerId: string) {
    assertOwnerRole(user)
    const provider = await getProvider(providerId)
    if (provider.ownerId !== user.id || !(await canManageProvider(user.id, providerId))) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not own this automotive service provider.' })
    }
    const [memberships, invitations] = await Promise.all([
        AppDataSource.getRepository(AutomotiveProviderMembershipEntity).find({ where: { providerId }, order: { createdAt: 'ASC' } }),
        AppDataSource.getRepository(AutomotiveProviderInvitationEntity).find({ where: { providerId }, order: { createdAt: 'DESC' } }),
    ])
    return {
        memberships: memberships.map((membership) => ({
            id: membership.id,
            providerId: membership.providerId,
            userId: membership.userId,
            locationId: membership.locationId,
            role: membership.role,
            status: membership.status,
            createdAt: membership.createdAt.toISOString(),
        })),
        invitations: invitations.map((invitation) => toInvitationResponse(invitation)),
    }
}

export async function createOwnerProviderInvitation(user: UserEntity, providerId: string, input: CreateAutoCareProviderInvitationInput) {
    assertOwnerRole(user)
    const provider = await getProvider(providerId)
    if (provider.ownerId !== user.id || !(await canManageProvider(user.id, providerId))) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not own this automotive service provider.' })
    }
    if (input.locationId) {
        const location = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).findOneBy({ id: input.locationId, providerId })
        if (!location) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'The selected service location does not belong to this provider.' })
    }
    const email = normalizeEmail(input.email)
    const role = input.role === 'manager' ? AutomotiveProviderInvitationRole.Manager : AutomotiveProviderInvitationRole.Staff
    const invitationRepository = AppDataSource.getRepository(AutomotiveProviderInvitationEntity)
    const existing = await invitationRepository.createQueryBuilder('invitation')
        .where('invitation.providerId = :providerId', { providerId })
        .andWhere('invitation.email = :email', { email })
        .andWhere('invitation.role = :role', { role })
        .andWhere('invitation.status = :status', { status: AutomotiveProviderInvitationStatus.Pending })
        .andWhere(input.locationId ? 'invitation.locationId = :locationId' : 'invitation.locationId IS NULL', { locationId: input.locationId })
        .getOne()
    if (existing && existing.expiresAt > new Date()) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'A pending invitation already exists for this scope.' })

    const token = createSecurityTokenValue()
    const invitation = await invitationRepository.save(invitationRepository.create({
        providerId,
        email,
        locationId: input.locationId ?? null,
        role,
        status: AutomotiveProviderInvitationStatus.Pending,
        tokenHash: hashSecurityTokenValue(token),
        invitedById: user.id,
        expiresAt: new Date(Date.now() + INVITATION_TTL_DAYS * 24 * 60 * 60 * 1000),
        acceptedAt: null,
        revokedAt: null,
    }))
    return toInvitationResponse(invitation, process.env.NODE_ENV === 'production' ? null : token)
}

export async function revokeOwnerProviderInvitation(user: UserEntity, providerId: string, invitationId: string) {
    assertOwnerRole(user)
    const provider = await getProvider(providerId)
    if (provider.ownerId !== user.id || !(await canManageProvider(user.id, providerId))) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not own this automotive service provider.' })
    }
    const repository = AppDataSource.getRepository(AutomotiveProviderInvitationEntity)
    const invitation = await repository.findOneBy({ id: invitationId, providerId })
    if (!invitation) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider invitation not found.' })
    if (invitation.status !== AutomotiveProviderInvitationStatus.Pending) return toInvitationResponse(invitation)
    invitation.status = AutomotiveProviderInvitationStatus.Revoked
    invitation.revokedAt = new Date()
    return toInvitationResponse(await repository.save(invitation))
}

export async function revokeOwnerProviderMembership(user: UserEntity, providerId: string, membershipId: string) {
    assertOwnerRole(user)
    const provider = await getProvider(providerId)
    if (provider.ownerId !== user.id || !(await canManageProvider(user.id, providerId))) {
        throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'You do not own this automotive service provider.' })
    }

    const repository = AppDataSource.getRepository(AutomotiveProviderMembershipEntity)
    const membership = await repository.findOneBy({ id: membershipId, providerId })
    if (!membership) throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider membership not found.' })
    if (membership.status === AutomotiveProviderMembershipStatus.Revoked) return membership
    membership.status = AutomotiveProviderMembershipStatus.Revoked
    return repository.save(membership)
}

export async function acceptProviderInvitation(user: UserEntity, token: string) {
    const tokenHash = hashSecurityTokenValue(token)
    return AppDataSource.transaction(async (manager) => {
        const invitationRepository = manager.getRepository(AutomotiveProviderInvitationEntity)
        const invitation = await invitationRepository.createQueryBuilder('invitation')
            .where('invitation.tokenHash = :tokenHash', { tokenHash })
            .setLock('pessimistic_write')
            .getOne()
        if (!invitation || invitation.status !== AutomotiveProviderInvitationStatus.Pending) {
            throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message: 'Provider invitation not found or no longer active.' })
        }
        if (invitation.expiresAt <= new Date()) {
            invitation.status = AutomotiveProviderInvitationStatus.Expired
            await invitationRepository.save(invitation)
            throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Provider invitation has expired.' })
        }
        if (normalizeEmail(user.email) !== invitation.email) throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message: 'This invitation was issued for another email address.' })
        const membershipRepository = manager.getRepository(AutomotiveProviderMembershipEntity)
        const existing = await membershipRepository.createQueryBuilder('membership')
            .where('membership.providerId = :providerId', { providerId: invitation.providerId })
            .andWhere('membership.userId = :userId', { userId: user.id })
            .andWhere(invitation.locationId ? 'membership.locationId = :locationId' : 'membership.locationId IS NULL', { locationId: invitation.locationId })
            .getOne()
        const role = invitation.role === AutomotiveProviderInvitationRole.Manager ? AutomotiveProviderMembershipRole.Manager : AutomotiveProviderMembershipRole.Staff
        const membership = existing
            ? await membershipRepository.save({ ...existing, role, status: AutomotiveProviderMembershipStatus.Active })
            : await membershipRepository.save(membershipRepository.create({
                providerId: invitation.providerId,
                userId: user.id,
                locationId: invitation.locationId,
                role,
                status: AutomotiveProviderMembershipStatus.Active,
            }))
        invitation.status = AutomotiveProviderInvitationStatus.Accepted
        invitation.acceptedAt = new Date()
        await invitationRepository.save(invitation)
        return {
            membership: {
                id: membership.id,
                providerId: membership.providerId,
                userId: membership.userId,
                locationId: membership.locationId,
                role: membership.role,
                status: membership.status,
            },
            invitation: toInvitationResponse(invitation),
        }
    })
}
