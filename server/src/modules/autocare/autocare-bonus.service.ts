import type { EntityManager } from 'typeorm'

import { AppDataSource } from '../../database/data-source.js'
import {
    AutoCareBonusAccountEntity,
    AutoCareBonusLedgerEntity,
    AutoCareBonusLedgerType,
    AutoCareBonusProgramEntity,
    AutomotiveProviderEntity,
    ServiceRequestEntity,
    ServiceRequestStatus,
    UserEntity,
} from '../../entities/index.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { AppError } from '../../shared/errors/app-error.js'
import { ERROR_CODES } from '../../shared/errors/error-codes.js'
import { canManageProvider, canManageProviderWithManager } from './provider-access.service.js'
import type { AutoCareBonusAccountResponse, AutoCareBonusLedgerEntryResponse, AutoCareBonusProgramResponse, GrantAutoCareBonusInput, OwnerAutoCareBonusProgramInput, RedeemAutoCareBonusInput } from './autocare.types.js'

function forbidden(message: string): never {
    throw new AppError({ statusCode: 403, code: ERROR_CODES.Forbidden, message })
}

function notFound(message: string): never {
    throw new AppError({ statusCode: 404, code: ERROR_CODES.NotFound, message })
}

function assertOwner(user: UserEntity) {
    if (user.role !== UserRole.Owner) forbidden('Only service owners can manage bonus programs.')
}

export function calculateAutoCareBonusPoints(amountMinor: number, earnPercent: number, maxEarnPointsPerVisit: number | null) {
    if (!Number.isFinite(amountMinor) || amountMinor <= 0 || !Number.isFinite(earnPercent) || earnPercent <= 0) return 0
    const calculated = Math.floor((amountMinor * earnPercent) / 10_000)
    return maxEarnPointsPerVisit === null ? calculated : Math.min(calculated, maxEarnPointsPerVisit)
}

function toProgramResponse(program: AutoCareBonusProgramEntity): AutoCareBonusProgramResponse {
    return {
        id: program.id,
        providerId: program.providerId,
        name: program.name,
        earnPercent: Number(program.earnPercent),
        maxEarnPointsPerVisit: program.maxEarnPointsPerVisit,
        expiresAfterDays: program.expiresAfterDays,
        active: program.active,
        createdAt: program.createdAt.toISOString(),
        updatedAt: program.updatedAt.toISOString(),
    }
}

function toEntryResponse(entry: AutoCareBonusLedgerEntity): AutoCareBonusLedgerEntryResponse {
    return {
        id: entry.id,
        type: entry.type,
        points: entry.points,
        reason: entry.reason,
        requestId: entry.requestId,
        expiresAt: entry.expiresAt?.toISOString() ?? null,
        createdAt: entry.createdAt.toISOString(),
    }
}

async function accountResponse(account: AutoCareBonusAccountEntity, manager = AppDataSource.manager): Promise<AutoCareBonusAccountResponse> {
    const entries = await manager.getRepository(AutoCareBonusLedgerEntity).find({ where: { accountId: account.id }, order: { createdAt: 'DESC' }, take: 100 })
    return {
        id: account.id,
        providerId: account.providerId,
        balancePoints: account.balancePoints,
        earnedPoints: account.earnedPoints,
        redeemedPoints: account.redeemedPoints,
        entries: entries.map(toEntryResponse),
    }
}

async function reconcileExpiredBonusEntries(manager: EntityManager, account: AutoCareBonusAccountEntity) {
    const now = new Date()
    const ledgerRepository = manager.getRepository(AutoCareBonusLedgerEntity)
    const expired = await ledgerRepository.createQueryBuilder('entry')
        .where('entry.accountId = :accountId', { accountId: account.id })
        .andWhere('entry.expiresAt IS NOT NULL AND entry.expiresAt <= :now', { now })
        .andWhere('entry.points > 0')
        .andWhere('entry.type IN (:...types)', { types: [AutoCareBonusLedgerType.Earn, AutoCareBonusLedgerType.Adjustment] })
        .getMany()
    let expiredPoints = 0
    for (const entry of expired) {
        const idempotencyKey = `expire:${entry.id}`
        if (await ledgerRepository.findOne({ where: { accountId: account.id, idempotencyKey } })) continue
        const points = Math.min(entry.points, Math.max(account.balancePoints - expiredPoints, 0))
        if (points <= 0) continue
        await ledgerRepository.save(ledgerRepository.create({
            accountId: account.id,
            clientId: account.clientId,
            providerId: account.providerId,
            requestId: entry.requestId,
            type: AutoCareBonusLedgerType.Expire,
            points: -points,
            reason: 'Срок действия бонусов истёк',
            idempotencyKey,
            expiresAt: null,
            actorId: null,
        }))
        expiredPoints += points
    }
    if (expiredPoints > 0) {
        account.balancePoints -= expiredPoints
        await manager.getRepository(AutoCareBonusAccountEntity).save(account)
    }
}

export async function getMyAutoCareBonusAccounts(user: UserEntity) {
    if (user.role !== UserRole.Client) forbidden('Only clients can view bonus balances.')
    const accounts = await AppDataSource.getRepository(AutoCareBonusAccountEntity).find({ where: { clientId: user.id }, order: { updatedAt: 'DESC' } })
    return Promise.all(accounts.map((account) => AppDataSource.transaction(async (manager) => {
        const locked = await manager.getRepository(AutoCareBonusAccountEntity).findOne({ where: { id: account.id }, lock: { mode: 'pessimistic_write' } })
        if (!locked) return accountResponse(account, manager)
        await reconcileExpiredBonusEntries(manager, locked)
        return accountResponse(locked, manager)
    })))
}

export async function getOwnerAutoCareBonusProgram(user: UserEntity, providerId: string) {
    assertOwner(user)
    if (!(await canManageProvider(user.id, providerId))) forbidden('You do not manage this automotive service.')
    const program = await AppDataSource.getRepository(AutoCareBonusProgramEntity).findOneBy({ providerId })
    return program ? toProgramResponse(program) : null
}

export async function upsertOwnerAutoCareBonusProgram(user: UserEntity, providerId: string, input: OwnerAutoCareBonusProgramInput) {
    assertOwner(user)
    const program = await AppDataSource.transaction(async (manager) => {
        if (!(await canManageProviderWithManager(manager, user.id, providerId))) forbidden('You do not manage this automotive service.')
        const provider = await manager.getRepository(AutomotiveProviderEntity).findOneBy({ id: providerId })
        if (!provider) notFound('Automotive service not found.')
        const bonusRepository = manager.getRepository(AutoCareBonusProgramEntity)
        const existing = await bonusRepository.findOne({ where: { providerId }, lock: { mode: 'pessimistic_write' } })
        const entity = existing ?? bonusRepository.create({ providerId })
        entity.name = input.name.trim()
        entity.earnPercent = input.earnPercent
        entity.maxEarnPointsPerVisit = input.maxEarnPointsPerVisit ?? null
        entity.expiresAfterDays = input.expiresAfterDays ?? null
        entity.active = input.active ?? true
        return bonusRepository.save(entity)
    })
    return toProgramResponse(program)
}

function requestAmountMinor(request: ServiceRequestEntity) {
    const bookingAmount = request.bookingSnapshot?.amountMinor
    if (typeof bookingAmount === 'number' && Number.isInteger(bookingAmount)) return bookingAmount
    const quoteAmount = request.acceptedQuoteSnapshot?.amountMinor
    if (typeof quoteAmount === 'number' && Number.isInteger(quoteAmount)) return quoteAmount
    return null
}

/**
 * Awards points only for a confirmed visit that has just transitioned to closed.
 * The request row is locked by the caller, and the ledger key makes retries safe.
 */
export async function awardAutoCareBonusForCompletedVisit(manager: EntityManager, request: ServiceRequestEntity, actorId: string) {
    if (request.status !== ServiceRequestStatus.Closed || !request.clientId) return null
    const program = await manager.getRepository(AutoCareBonusProgramEntity).findOne({ where: { providerId: request.providerId, active: true } })
    if (!program) return null
    const points = calculateAutoCareBonusPoints(requestAmountMinor(request) ?? 0, Number(program.earnPercent), program.maxEarnPointsPerVisit)
    if (points <= 0) return null
    const accountRepository = manager.getRepository(AutoCareBonusAccountEntity)
    const ledgerRepository = manager.getRepository(AutoCareBonusLedgerEntity)
    let account = await accountRepository.findOne({ where: { clientId: request.clientId, providerId: request.providerId }, lock: { mode: 'pessimistic_write' } })
    if (!account) account = await accountRepository.save(accountRepository.create({ clientId: request.clientId, providerId: request.providerId }))
    const idempotencyKey = `request:${request.id}:earn`
    const existing = await ledgerRepository.findOne({ where: { accountId: account.id, idempotencyKey } })
    if (existing) return existing
    const expiresAt = program.expiresAfterDays ? new Date(Date.now() + program.expiresAfterDays * 86_400_000) : null
    const entry = await ledgerRepository.save(ledgerRepository.create({
        accountId: account.id,
        clientId: request.clientId,
        providerId: request.providerId,
        requestId: request.id,
        type: AutoCareBonusLedgerType.Earn,
        points,
        reason: 'Бонус за завершённый визит',
        idempotencyKey,
        expiresAt,
        actorId,
    }))
    account.balancePoints += points
    account.earnedPoints += points
    await accountRepository.save(account)
    return entry
}

export async function redeemAutoCareBonus(user: UserEntity, input: RedeemAutoCareBonusInput, idempotencyKey: string | null) {
    if (user.role !== UserRole.Client) forbidden('Only clients can redeem bonus points.')
    return AppDataSource.transaction(async (manager) => {
        const request = await manager.getRepository(ServiceRequestEntity).findOne({ where: { id: input.requestId }, lock: { mode: 'pessimistic_write' } })
        if (!request || request.providerId !== input.providerId || request.clientId !== user.id) notFound('Service request not found.')
        if (![ServiceRequestStatus.Accepted, ServiceRequestStatus.Closed].includes(request.status)) {
            throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'Bonuses can be redeemed only for a confirmed service request.' })
        }
        const accountRepository = manager.getRepository(AutoCareBonusAccountEntity)
        const ledgerRepository = manager.getRepository(AutoCareBonusLedgerEntity)
        const account = await accountRepository.findOne({ where: { clientId: user.id, providerId: input.providerId }, lock: { mode: 'pessimistic_write' } })
        if (!account) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'No bonus balance is available for this service.' })

        const key = idempotencyKey?.trim() || `request:${request.id}:redeem`
        const existing = await ledgerRepository.findOne({ where: { accountId: account.id, idempotencyKey: key } })
        if (existing) return accountResponse(account, manager)
        const previousRequestRedemption = await ledgerRepository.findOne({ where: { accountId: account.id, requestId: request.id, type: AutoCareBonusLedgerType.Redeem } })
        if (previousRequestRedemption) return accountResponse(account, manager)
        await reconcileExpiredBonusEntries(manager, account)
        if (account.balancePoints < input.points) throw new AppError({ statusCode: 409, code: ERROR_CODES.Conflict, message: 'The bonus balance is too low for this redemption.' })

        await ledgerRepository.save(ledgerRepository.create({
            accountId: account.id,
            clientId: user.id,
            providerId: input.providerId,
            requestId: request.id,
            type: AutoCareBonusLedgerType.Redeem,
            points: -input.points,
            reason: 'Списание бонусов при подтверждённой записи',
            idempotencyKey: key,
            expiresAt: null,
            actorId: user.id,
        }))
        account.balancePoints -= input.points
        account.redeemedPoints += input.points
        await accountRepository.save(account)
        return accountResponse(account, manager)
    })
}

export async function grantAutoCareBonus(user: UserEntity, input: GrantAutoCareBonusInput, idempotencyKey: string | null) {
    assertOwner(user)
    return AppDataSource.transaction(async (manager) => {
        if (!(await canManageProviderWithManager(manager, user.id, input.providerId))) forbidden('You do not manage this automotive service.')
        const client = await manager.getRepository(UserEntity).findOne({ where: { id: input.clientId, role: UserRole.Client }, select: { id: true } })
        if (!client) notFound('Client not found.')
        const accountRepository = manager.getRepository(AutoCareBonusAccountEntity)
        const ledgerRepository = manager.getRepository(AutoCareBonusLedgerEntity)
        const account = await accountRepository.findOne({ where: { clientId: input.clientId, providerId: input.providerId }, lock: { mode: 'pessimistic_write' } })
            ?? await accountRepository.save(accountRepository.create({ clientId: input.clientId, providerId: input.providerId }))
        const key = idempotencyKey?.trim() || `grant:${user.id}:${Date.now()}`
        const existing = await ledgerRepository.findOne({ where: { accountId: account.id, idempotencyKey: key } })
        if (existing) return accountResponse(account, manager)
        await ledgerRepository.save(ledgerRepository.create({
            accountId: account.id,
            clientId: input.clientId,
            providerId: input.providerId,
            requestId: null,
            type: AutoCareBonusLedgerType.Adjustment,
            points: input.points,
            reason: input.reason.trim(),
            idempotencyKey: key,
            expiresAt: null,
            actorId: user.id,
        }))
        account.balancePoints += input.points
        account.earnedPoints += input.points
        await accountRepository.save(account)
        return accountResponse(account, manager)
    })
}

export async function refundAutoCareBonusForCancelledRequest(manager: EntityManager, request: ServiceRequestEntity, actorId: string) {
    if (request.status !== ServiceRequestStatus.Cancelled) return null
    const account = await manager.getRepository(AutoCareBonusAccountEntity).findOne({ where: { clientId: request.clientId, providerId: request.providerId }, lock: { mode: 'pessimistic_write' } })
    if (!account) return null
    const ledgerRepository = manager.getRepository(AutoCareBonusLedgerEntity)
    const redeemed = await ledgerRepository.findOne({ where: { accountId: account.id, requestId: request.id, type: AutoCareBonusLedgerType.Redeem } })
    if (!redeemed) return null
    const idempotencyKey = `request:${request.id}:refund`
    if (await ledgerRepository.findOne({ where: { accountId: account.id, idempotencyKey } })) return null
    const points = Math.abs(redeemed.points)
    const entry = await ledgerRepository.save(ledgerRepository.create({
        accountId: account.id,
        clientId: request.clientId,
        providerId: request.providerId,
        requestId: request.id,
        type: AutoCareBonusLedgerType.Adjustment,
        points,
        reason: 'Возврат бонусов после отмены записи',
        idempotencyKey,
        expiresAt: null,
        actorId,
    }))
    account.balancePoints += points
    account.redeemedPoints = Math.max(0, account.redeemedPoints - points)
    await manager.getRepository(AutoCareBonusAccountEntity).save(account)
    return entry
}
