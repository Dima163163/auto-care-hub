// Run from the repository root after npm --prefix server run build.
// These assertions document current defects, not desired regression behavior.
// No database, Redis, mail or external storage connection is opened.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'

process.env.NODE_ENV = 'test'
process.env.DATABASE_URL = 'postgresql://audit:audit@127.0.0.1:1/autocare_audit_test'
process.env.JWT_SECRET = 'audit-synthetic-secret-for-isolated-reproduction'
delete process.env.REDIS_URL
delete process.env.REDIS_HOST

const base = new URL('../../../../server/dist/', import.meta.url)
const load = (file) => import(new URL(file, base))
const { AppDataSource } = await load('database/data-source.js')
const entities = await load('entities/index.js')
const encryption = await load('shared/security/data-encryption/field-encryption.js')
encryption.setDataEncryptionKeyProviderForTests({
    activeKeyId: 'audit-key',
    getIndexKey: () => Buffer.alloc(32, 31),
    getKey: () => ({ kek: Buffer.alloc(32, 73) }),
})
const originalGetRepository = AppDataSource.getRepository.bind(AppDataSource)
const originalManager = AppDataSource.manager
const originalTransaction = AppDataSource.transaction
const findings = []
const fixtureId = (digit) => `${digit.repeat(8)}-${digit.repeat(4)}-4${digit.repeat(3)}-8${digit.repeat(3)}-${digit.repeat(12)}`
const ids = { request: fixtureId('1'), client: fixtureId('2'), provider: fixtureId('3'), superAdmin: fixtureId('4'), owner: fixtureId('5'), thread: fixtureId('6'), review: fixtureId('7') }

function installRepositories(repositories, query = async () => []) {
    const getRepository = (entity) => {
        const repository = repositories[entity.name]
        assert.ok(repository, `Unexpected fixture repository: ${entity.name}`)
        return repository
    }
    const manager = { getRepository, query }
    AppDataSource.getRepository = getRepository
    AppDataSource.manager = manager
    AppDataSource.transaction = async (callback) => callback(manager)
    return manager
}

function resetRepositories() {
    AppDataSource.getRepository = originalGetRepository
    AppDataSource.manager = originalManager
    AppDataSource.transaction = originalTransaction
}

async function reproduce(id, callback) {
    try {
        const result = await callback()
        findings.push({ id, reproduced: true, ...result })
    } finally {
        resetRepositories()
    }
}

await reproduce('U14', async () => {
    const { enqueueOutboxEvent } = await load('modules/outbox/outbox.service.js')
    let storedPayload
    const manager = installRepositories({ OutboxEventEntity: { findOneByOrFail: async () => ({ id: ids.request, payload: storedPayload }) } }, async (_sql, parameters) => {
        storedPayload = JSON.parse(parameters[1])
    })
    await enqueueOutboxEvent({ type: 'email.send', idempotencyKey: 'audit-outbox-plaintext', payload: { template: 'booking', toEmail: 'synthetic@example.test', recipientName: 'Synthetic Recipient' } }, manager)
    assert.equal(storedPayload.toEmail, 'synthetic@example.test')
    assert.equal(storedPayload.recipientName, 'Synthetic Recipient')
    assert.equal(storedPayload.toEmailCiphertext, undefined)
    const correctlyTransformed = encryption.outboxPayloadEncryptionTransformer.to(storedPayload)
    assert.notEqual(correctlyTransformed.toEmail, storedPayload.toEmail)
    return { rawInsertHasPlaintextRecipient: true, transformerWasBypassed: true }
})

await reproduce('U15', async () => {
    const { createAutoCareServiceMessage } = await load('modules/autocare/request-conversation.service.js')
    const { createAutoCareChatMessage } = await load('modules/autocare/chat-messaging.service.js')
    const now = new Date()
    const request = { id: ids.request, clientId: ids.client, providerId: ids.provider, locationId: ids.provider }
    const thread = { id: ids.thread, type: 'service_request', requestId: ids.request, providerId: ids.provider, clientId: ids.client, createdById: ids.client, status: 'open' }
    let savedMessage
    installRepositories({
        ServiceRequestEntity: { findOneBy: async () => request, findOne: async () => request },
        AutoCareChatThreadEntity: { findOneBy: async () => thread, findOne: async () => thread },
        AutoCareChatBlockEntity: { find: async () => [] },
        AutomotiveProviderEntity: { findOneBy: async () => ({ ownerId: ids.owner }) },
        ServiceMessageEntity: { create: (value) => value, save: async (value) => (savedMessage = { ...value, id: fixtureId('8'), createdAt: now }) },
        UserEntity: { findOne: async () => ({ locale: 'en' }) },
        OutboxEventEntity: { findOneByOrFail: async () => ({}) },
    })
    const actor = { id: ids.superAdmin, role: 'super_admin' }
    await createAutoCareServiceMessage(actor, ids.request, { body: 'Synthetic unauthorized intervention' })
    assert.equal(savedMessage.senderId, ids.superAdmin)
    await assert.rejects(createAutoCareChatMessage(actor, ids.thread, { body: 'Synthetic unauthorized intervention' }), (error) => error.statusCode === 403)
    return { legacyRequestMessageSaved: true, modernChatRejectedWith403: true }
})

AppDataSource.setOptions({ migrations: [] })
await AppDataSource.buildMetadatas()
await reproduce('U20', async () => {
    const { updateUserPreferences } = await load('modules/users/users.service.js')
    const require = createRequire(new URL('../../../../server/package.json', import.meta.url))
    const { Subject } = require('typeorm/persistence/Subject.js')
    const { SubjectChangedColumnsComputer } = require('typeorm/persistence/SubjectChangedColumnsComputer.js')
    const staleUser = { id: ids.client, status: 'active', role: 'client', passwordHash: 'synthetic-old-password-hash', tokenVersion: 1, locale: 'en' }
    const currentDatabaseUser = { ...staleUser, status: 'blocked', passwordHash: 'synthetic-new-password-hash', tokenVersion: 2 }
    let changedSecurityFields
    installRepositories({ UserEntity: { save: async (entity) => {
        const subject = new Subject({ metadata: AppDataSource.getMetadata(entities.UserEntity), entity, canBeUpdated: true })
        subject.databaseEntity = currentDatabaseUser
        subject.databaseEntityLoaded = true
        new SubjectChangedColumnsComputer().compute([subject])
        changedSecurityFields = Object.fromEntries(subject.changeMaps.filter(({ column }) => ['status', 'passwordHash', 'tokenVersion'].includes(column?.propertyName)).map(({ column, value }) => [column.propertyName, value]))
        return entity
    } } })
    await updateUserPreferences(staleUser, { locale: 'ru' })
    assert.deepEqual(changedSecurityFields, { passwordHash: 'synthetic-old-password-hash', status: 'active', tokenVersion: 1 })
    return { preferenceSaveRevertsConcurrentSecurityFields: Object.keys(changedSecurityFields), ormDiffProofOnly: true }
})


process.stdout.write(`${JSON.stringify({ verifiedOn: '2026-10-20', baseline: '8840ae8', fixtures: 'synthetic repositories and ORM metadata only; no database/network', findings }, null, 2)}\n`)
