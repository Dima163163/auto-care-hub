import 'reflect-metadata'
import { DataSource, QueryFailedError } from 'typeorm'
import type { DeepPartial, FindOneOptions } from 'typeorm'
import { ConnectionMetadataBuilder } from 'typeorm/connection/ConnectionMetadataBuilder.js'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'

const mocks = vi.hoisted(() => ({ getRepository: vi.fn(), transaction: vi.fn(), notify: vi.fn(), canManage: vi.fn() }))
vi.mock('../../database/data-source.js', () => ({ AppDataSource: { getRepository: mocks.getRepository, transaction: mocks.transaction } }))
vi.mock('./provider-access.service.js', () => ({ canManageProvider: mocks.canManage }))
vi.mock('../outbox/notification-outbox.service.js', () => ({ enqueueNotificationSafely: mocks.notify }))

import { AutomotiveProviderEntity } from '../../entities/index.js'
import { AutomotiveProviderInvitationEntity, AutomotiveProviderInvitationRole, AutomotiveProviderInvitationStatus } from '../../entities/automotive/provider-invitation.entity.js'
import { UserEntity, UserRole } from '../../entities/user/user.entity.js'
import { createEmailBlindIndex, setDataEncryptionKeyProviderForTests } from '../../shared/security/data-encryption/field-encryption.js'
import { createOwnerProviderInvitation } from './provider-membership.service.js'

const providerId = '11111111-1111-4111-8111-111111111111'
const owner = Object.assign(new UserEntity(), { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Owner })
const input = { email: 'STAFF@Example.Test', role: AutomotiveProviderInvitationRole.Staff, locationId: null }
const repository = {
    findOne: vi.fn<(options: FindOneOptions<AutomotiveProviderInvitationEntity>) => Promise<AutomotiveProviderInvitationEntity | null>>(),
    create: vi.fn((value: DeepPartial<AutomotiveProviderInvitationEntity>) => Object.assign(new AutomotiveProviderInvitationEntity(), value)),
    save: vi.fn(async (value: AutomotiveProviderInvitationEntity) => Object.assign(value, { id: value.id ?? 'invitation-1', createdAt: new Date() })),
    createQueryBuilder: vi.fn(),
}

function uniqueError(constraint = 'UQ_autocare_provider_invitations_pending_scope') {
    return new QueryFailedError('INSERT synthetic invitation', [], Object.assign(new Error('synthetic conflict'), { code: '23505', constraint }))
}

beforeEach(() => {
    vi.clearAllMocks()
    repository.findOne.mockReset().mockResolvedValue(null)
    repository.save.mockReset().mockImplementation(async (value) => Object.assign(value, { id: value.id ?? 'invitation-1', createdAt: new Date() }))
    const builder = { where: vi.fn().mockReturnThis(), andWhere: vi.fn().mockReturnThis(), getOne: vi.fn().mockResolvedValue(null) }
    repository.createQueryBuilder.mockReturnValue(builder)
    mocks.getRepository.mockImplementation((entity) => entity === AutomotiveProviderEntity
        ? { findOne: vi.fn().mockResolvedValue({ id: providerId, ownerId: owner.id }) }
        : entity === AutomotiveProviderInvitationEntity ? repository : { findOne: vi.fn().mockResolvedValue(null) })
    mocks.transaction.mockImplementation((callback) => callback({ getRepository: () => repository }))
    mocks.canManage.mockResolvedValue(true)
    setDataEncryptionKeyProviderForTests({ activeKeyId: 'synthetic-key', getKey: () => ({ kek: Buffer.alloc(32, 11), indexKey: Buffer.alloc(32, 22) }) })
})

afterEach(() => setDataEncryptionKeyProviderForTests(null))

describe('Encrypted provider invitation deduplication', () => {
    it('returns 409 for an existing active scope before insert or notification', async () => {
        repository.findOne.mockResolvedValue(Object.assign(new AutomotiveProviderInvitationEntity(), { expiresAt: new Date('2099-01-01') }))
        repository.save.mockRejectedValue(uniqueError())
        await expect(createOwnerProviderInvitation(owner, providerId, input)).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })
        expect(repository.save).not.toHaveBeenCalled()
        expect(mocks.notify).not.toHaveBeenCalled()
    })

    it('expires the previous pending row before saving its replacement in the transaction', async () => {
        const expired = Object.assign(new AutomotiveProviderInvitationEntity(), { id: 'expired-1', status: AutomotiveProviderInvitationStatus.Pending, expiresAt: new Date('2020-01-01') })
        repository.findOne.mockResolvedValue(expired)
        const result = await createOwnerProviderInvitation(owner, providerId, input)
        expect(repository.save).toHaveBeenNthCalledWith(1, expect.objectContaining({ id: 'expired-1', status: AutomotiveProviderInvitationStatus.Expired }))
        expect(repository.save).toHaveBeenNthCalledWith(2, expect.objectContaining({ status: AutomotiveProviderInvitationStatus.Pending, email: 'staff@example.test' }))
        expect(result.status).toBe(AutomotiveProviderInvitationStatus.Pending)
        expect(mocks.transaction).toHaveBeenCalledOnce()
    })

    it('maps the pending-scope unique race to 409 after transaction rejection', async () => {
        repository.save.mockRejectedValue(uniqueError())
        await expect(createOwnerProviderInvitation(owner, providerId, input)).rejects.toMatchObject({ statusCode: 409, code: 'CONFLICT' })
        expect(mocks.notify).not.toHaveBeenCalled()
    })

    it('preserves an unrelated unique error instead of masking a broken insert', async () => {
        const failure = uniqueError('UQ_autocare_provider_invitations_token_hash')
        repository.save.mockRejectedValue(failure)
        await expect(createOwnerProviderInvitation(owner, providerId, input)).rejects.toBe(failure)
    })

    it('uses actual TypeORM metadata to bind the encrypted email and NULL branch scope', async () => {
        await createOwnerProviderInvitation(owner, providerId, input)
        const options = repository.findOne.mock.calls[0]?.[0]
        expect(options?.lock).toEqual({ mode: 'pessimistic_write' })
        if (!options) throw new Error('Invitation scope lookup was not performed.')

        // Build only metadata and SQL; no connection or database is initialized.
        const source = new DataSource({ type: 'postgres', database: 'autocarehub_test', entities: [AutomotiveProviderInvitationEntity] })
        const metadata = await new ConnectionMetadataBuilder(source).buildEntityMetadatas([AutomotiveProviderInvitationEntity])
        source.entityMetadatas.push(...metadata)
        for (const entity of metadata) source.entityMetadatasMap.set(entity.target, entity)
        const [query, parameters] = source.getRepository(AutomotiveProviderInvitationEntity).createQueryBuilder('invitation').setFindOptions(options).getQueryAndParameters()
        expect(parameters).toContain(createEmailBlindIndex('staff@example.test'))
        expect(parameters).not.toContain('staff@example.test')
        expect(query).toContain('IS NULL')
        expect(query).toContain('FOR UPDATE')
        expect(source.isInitialized).toBe(false)
    })
})
