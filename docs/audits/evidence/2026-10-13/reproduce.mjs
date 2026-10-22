// Run from the repository root after npm --prefix server run build.
// These assertions document current defects, not desired regression behavior.
// No database, Redis, mail or external storage connection is opened.
import assert from 'node:assert/strict'
import { createRequire } from 'node:module'
import { execFileSync } from 'node:child_process'
import { mkdtemp, mkdir, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { Script } from 'node:vm'

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

await reproduce('U16', async () => {
    // Build TypeORM metadata and SQL only; no initialize/connect call.
    AppDataSource.setOptions({ migrations: [] })
    await AppDataSource.buildMetadatas()
    const repository = originalGetRepository(entities.AutoCareTrustEvidenceEntity)
    const reference = ids.review
    const storedCiphertext = encryption.createEncryptedFieldTransformer('autocare_trust_evidence', 'reference', 'text').to(reference)
    const parameters = () => repository.createQueryBuilder('evidence').setFindOptions({ where: { kind: 'review', reference, status: 'pending' } }).getQueryAndParameters()[1]
    const first = parameters().find((value) => typeof value === 'string' && value.includes('$encrypted'))
    const second = parameters().find((value) => typeof value === 'string' && value.includes('$encrypted'))
    assert.ok(first)
    assert.notEqual(first, storedCiphertext)
    assert.notEqual(first, second)
    return { exactLookupReencryptsReference: true, lookupCiphertextDiffersFromStoredAndNextLookup: true }
})

await reproduce('U17', async () => {
    const { createOwnerProviderInvitation } = await load('modules/autocare/provider-membership.service.js')
    let invitation
    const outgoing = []
    const provider = { id: ids.provider, ownerId: ids.owner, status: 'active' }
    installRepositories({
        AutomotiveProviderEntity: { findOne: async () => provider, find: async () => [provider] },
        AutomotiveProviderMembershipEntity: { find: async () => [] },
        AutomotiveProviderInvitationEntity: { findOne: async () => null, create: (value) => value, save: async (value) => (invitation = { ...value, id: fixtureId('9'), createdAt: new Date() }) },
        UserEntity: { findOne: async () => ({ id: ids.client, locale: 'en' }) },
        OutboxEventEntity: { findOneByOrFail: async () => ({}) },
    }, async (_sql, parameters) => outgoing.push(JSON.parse(parameters[1])))
    process.env.NODE_ENV = 'production'
    let response
    try {
        response = await createOwnerProviderInvitation({ id: ids.owner, role: 'owner' }, ids.provider, { email: 'synthetic@example.test', role: 'staff', locationId: null })
    } finally {
        process.env.NODE_ENV = 'test'
    }
    assert.equal(response.inviteToken, null)
    assert.equal(invitation.tokenHash.length, 64)
    assert.equal(outgoing.length, 1)
    assert.equal(outgoing[0].link, '/profile/notifications')
    assert.equal(outgoing[0].metadata.token, undefined)
    assert.equal(outgoing[0].encryptedToken, undefined)
    return { productionResponseTokenIsNull: true, onlyNotificationContainsNoAcceptanceToken: true }
})

await reproduce('U18', async () => {
    const { getMyAutoCareBonusAccounts } = await load('modules/autocare/autocare-bonus.service.js')
    const account = { id: ids.request, clientId: ids.client, providerId: ids.provider, balancePoints: 100, earnedPoints: 200, redeemedPoints: 100 }
    const now = new Date()
    const oldEarn = { id: fixtureId('8'), accountId: account.id, type: 'earn', points: 100, expiresAt: new Date(now.getTime() - 1_000), createdAt: new Date(now.getTime() - 30_000) }
    const ledger = [oldEarn, { type: 'redeem', points: -100, expiresAt: null, createdAt: new Date(now.getTime() - 20_000) }, { type: 'earn', points: 100, expiresAt: new Date(now.getTime() + 86_400_000), createdAt: now }]
    const query = { where() { return this }, andWhere() { return this }, async getMany() { return [oldEarn] } }
    installRepositories({
        AutoCareBonusAccountEntity: { find: async () => [account], findOne: async () => account, save: async (value) => value },
        AutoCareBonusLedgerEntity: { createQueryBuilder: () => query, findOne: async () => null, create: (value) => value, save: async (value) => { ledger.push({ ...value, createdAt: now }); return value }, find: async () => ledger },
    })
    const [response] = await getMyAutoCareBonusAccounts({ id: ids.client, role: 'client' })
    assert.equal(response.balancePoints, 0)
    assert.equal(ledger.at(-1).type, 'expire')
    assert.equal(ledger.at(-1).points, -100)
    return { freshUnexpiredPointsBeforeRead: 100, freshPointsAfterRead: response.balancePoints, spentOldEarnExpiredAgain: true }
})

await reproduce('U19', async () => {
    const { createAutoCareGuaranteeClaim } = await load('modules/autocare/autocare-marketplace.service.js')
    const { calculateAutoCareTrustScore } = await load('modules/autocare/trust-score.js')
    const claims = []
    installRepositories({
        ServiceRequestEntity: { findOneBy: async () => ({ id: ids.request, clientId: ids.client, providerId: ids.provider, status: 'awaiting_reply' }) },
        AutoCareGuaranteeClaimEntity: { create: (value) => value, save: async (value) => { const saved = { ...value, id: String(claims.length), createdAt: new Date(), updatedAt: new Date() }; claims.push(saved); return saved } },
    })
    const input = { requestId: ids.request, claimType: 'safety', summary: 'Synthetic safety claim without an adjudicated visit', evidenceUrls: [] }
    for (let index = 0; index < 4; index += 1) await createAutoCareGuaranteeClaim({ id: ids.client, role: 'client' }, input)
    assert.equal(claims.length, 4)
    const common = { verified: true, rating: 4.8, reviewCount: 96, yearsActive: 6, profileFields: 5, verifiedEvidenceCount: 4, completedInteractionCount: 20 }
    const before = calculateAutoCareTrustScore({ ...common, activeGuaranteeClaims: 0 })
    const after = calculateAutoCareTrustScore({ ...common, activeGuaranteeClaims: claims.length, complaintRate: claims.length / 20, moderationViolationCount: claims.length })
    assert.ok(after.score < before.score)
    assert.equal(after.factors.moderationPenalty, 40)
    return { duplicateClaimsForOneUncompletedRequest: claims.length, trustBefore: before.score, trustAfter: after.score, unadjudicatedClaimsBecomeModerationPenalty: 40 }
})

await reproduce('N24', async () => {
    const { updateClientAutoCareReview } = await load('modules/autocare/provider-reviews-write.service.js')
    const review = { id: ids.review, clientId: ids.client, providerId: ids.provider, authorName: 'Synthetic', vehicleLabel: 'Synthetic vehicle', rating: 4, text: 'Synthetic previous review', photoUrls: [], createdAt: new Date(), revisionAllowedUntil: new Date(Date.now() + 86_400_000), revisionUsedAt: null }
    let saves = 0
    let transactions = 0
    installRepositories({ AutomotiveReviewEntity: { findOneBy: async () => ({ ...review }), save: async (value) => { saves += 1; return value } } })
    AppDataSource.transaction = async () => { transactions += 1; throw new Error('Unexpected transaction') }
    const results = await Promise.all([
        updateClientAutoCareReview({ id: ids.client, role: 'client' }, ids.review, { rating: 5, text: 'Synthetic concurrent revision A' }),
        updateClientAutoCareReview({ id: ids.client, role: 'client' }, ids.review, { rating: 1, text: 'Synthetic concurrent revision B' }),
    ])
    assert.equal(results.length, 2)
    assert.equal(saves, 2)
    assert.equal(transactions, 0)
    return { successfulOneTimeRevisions: saves, transactionOrCompareAndSet: false }
})

await reproduce('N25', async () => {
    const { reassessAutoCareProviderTrust, reassessAutoCareTrustScores } = await load('modules/autocare/trust-score.service.js')
    const providers = ['a', 'b', 'c'].map((id) => ({ id, status: 'active', ownerId: ids.owner, verified: false, rating: 0, yearsActive: 0, description: null, logoUrl: null, coverImageUrl: null, galleryImageUrls: [], warrantyText: null, bonusSummary: null, trustScore: 0, trustBadge: null, trustReassessedAt: null, createdAt: new Date() }))
    const snapshots = []
    const scanned = []
    const manager = installRepositories({
        AutomotiveProviderEntity: {
            findOneBy: async ({ id }) => providers.find((provider) => provider.id === id), save: async (value) => value,
            find: async ({ take }) => { const selected = [...providers].sort((left, right) => (left.trustReassessedAt?.getTime() ?? Infinity) - (right.trustReassessedAt?.getTime() ?? Infinity)).slice(0, take); scanned.push(selected.map(({ id }) => id)); return selected },
        },
        AutoCareTrustEvidenceEntity: { find: async () => [] },
        AutomotiveReviewEntity: { find: async () => [] },
        AutoCareGuaranteeClaimEntity: { find: async () => [] },
        ServiceRequestEntity: { find: async () => [] },
        AutoCareTrustPolicyEntity: { findOneBy: async () => null },
        AutomotiveServiceLocationEntity: { find: async ({ where }) => [{ id: where.providerId, providerId: where.providerId }] },
        AutoCareTrustSnapshotEntity: { find: async ({ where }) => snapshots.filter((value) => value.providerId === where.providerId), create: (value) => value, save: async (value) => { snapshots.push(value); return value } },
    })
    await reassessAutoCareProviderTrust('a', manager)
    await reassessAutoCareProviderTrust('b', manager)
    for (let index = 0; index < 3; index += 1) await reassessAutoCareTrustScores(2)
    assert.deepEqual(scanned, [['a', 'b'], ['a', 'b'], ['a', 'b']])
    assert.equal(providers[2].trustReassessedAt, null)
    return { postgresAscNullsLastFixturePasses: scanned, neverAssessedProviderRemainsNull: true }
})

await reproduce('N26', async () => {
    const require = createRequire(new URL('../../../../server/package.json', import.meta.url))
    const { hash, compare } = require('bcryptjs')
    const { assertPasswordPolicy } = await load('modules/auth/password-policy.js')
    const prefix = 'SyntheticSecurePrefix'.repeat(4).slice(0, 72)
    const first = assertPasswordPolicy(`${prefix}A`)
    const second = assertPasswordPolicy(`${prefix}B`)
    assert.notEqual(first, second)
    const stored = await hash(first, 4)
    assert.equal(await compare(second, stored), true)
    return { allowedDistinctPasswordsAfterByte72AuthenticateIdentically: true }
})

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

await reproduce('N27', async () => {
    const directory = await mkdtemp(path.join(tmpdir(), 'autocare-runtime-boundary-audit-'))
    try {
        await mkdir(path.join(directory, 'src/entities/automotive-service/api/autocare'), { recursive: true })
        await mkdir(path.join(directory, 'src/features'), { recursive: true })
        await writeFile(path.join(directory, 'src/entities/automotive-service/api/autocareApi.ts'), 'export { createRequestsEndpoints } from "./autocare/requests.endpoints"\n')
        await writeFile(path.join(directory, 'src/entities/automotive-service/api/autocare/requests.endpoints.ts'), 'export function createRequestsEndpoints(build) { return {\ngetSecret: build.query({ query: () => "/synthetic" })\n} }\n')
        const output = execFileSync(process.execPath, [new URL('../../../../scripts/check-api-runtime-boundaries.mjs', import.meta.url).pathname], { cwd: directory, encoding: 'utf8' })
        assert.match(output, /passed \(0 endpoints/)
        return { unvalidatedDomainEndpointAccepted: true, checkedEndpointsInNegativeFixture: 0 }
    } finally {
        await rm(directory, { recursive: true, force: true })
    }
})

await reproduce('N28', async () => {
    const require = createRequire(new URL('../../../../package.json', import.meta.url))
    const typescript = require('typescript')
    const source = await readFile(new URL('../../../../src/shared/lib/auth-session-state.ts', import.meta.url), 'utf8')
    const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS } }).outputText
    const exports = {}
    const storageFailure = () => { throw new Error('Synthetic storage denied') }
    new Script(compiled).runInNewContext({ exports, require: () => ({}), window: { sessionStorage: { setItem: storageFailure, getItem: storageFailure, removeItem: storageFailure } } })
    assert.throws(() => exports.markSessionExpired(), /Synthetic storage denied/)
    assert.throws(() => exports.hasSessionExpired(), /Synthetic storage denied/)
    assert.throws(() => exports.clearSessionExpired(), /Synthetic storage denied/)
    return { expiryReadWriteClearAllThrowWhenStorageDenied: true, authCleanupCallsExpiryWriteBeforeCredentialClear: true }
})

await reproduce('N29', async () => {
    const require = createRequire(new URL('../../../../server/package.json', import.meta.url))
    const { hash } = require('bcryptjs')
    const { decode } = require('jsonwebtoken')
    const { env } = await load('config/env.js')
    const { loginUser } = await load('modules/auth/auth.service.js')
    const { setRefreshTokenCookie } = await load('modules/auth/auth-cookie.js')
    const savedExpiry = env.auth.jwtRefreshExpiresIn
    const password = 'Synthetic-password-for-TTL-reproduction'
    const user = { id: ids.client, role: 'client', status: 'active', tokenVersion: 1, passwordHash: await hash(password, 4), failedLoginAttempts: 0, lockedUntil: null, lastFailedLoginAt: null }
    let databaseExpiry
    installRepositories({ UserEntity: { findOne: async () => user }, UserSessionEntity: { create: (value) => value, save: async (value) => { databaseExpiry = value.expiresAt; return { ...value, id: ids.thread } } } })
    env.auth.jwtRefreshExpiresIn = '1h'
    try {
        const result = await loginUser({ email: 'synthetic@example.test', password })
        const token = decode(result.refreshToken)
        let cookieMaxAge
        setRefreshTokenCookie({ setCookie: (_name, _token, options) => { cookieMaxAge = options.maxAge } }, result.refreshToken)
        assert.equal(token.exp - token.iat, 3_600)
        assert.ok(databaseExpiry.getTime() - Date.now() > 6.9 * 86_400_000)
        assert.equal(cookieMaxAge, 7 * 86_400)
        return { configuredRefreshJwtLifetimeSeconds: 3_600, fixedCookieMaxAgeSeconds: cookieMaxAge, databaseSessionLifetimeDays: 7 }
    } finally {
        env.auth.jwtRefreshExpiresIn = savedExpiry
    }
})

await reproduce('N30', async () => {
    const { hydrateRequest } = await load('modules/autocare/request-read.service.js')
    const now = new Date()
    const request = { id: ids.request, providerId: ids.provider, locationId: ids.provider, definitionId: ids.provider, offeringId: null, status: 'estimate_shared', createdAt: now, updatedAt: now, estimateSnapshot: { amountMinor: 5_100, currencyCode: 'RUB', quoteStatus: 'pending', createdAt: now.toISOString() }, bookingSnapshot: null }
    const quotes = Array.from({ length: 51 }, (_, index) => ({ id: `quote-${index + 1}`, version: index + 1, amountMinor: 100 * (index + 1), currencyCode: 'RUB', snapshot: {}, status: index === 50 ? 'pending' : 'superseded', createdAt: now, validUntil: null }))
    installRepositories({
        AutomotiveProviderEntity: { findOneBy: async () => ({ id: ids.provider, name: 'Synthetic provider' }) },
        AutomotiveServiceLocationEntity: { findOneBy: async () => ({ id: ids.provider, address: 'Synthetic address' }) },
        AutomotiveServiceDefinitionEntity: { findOneBy: async () => ({ id: ids.provider, slug: 'synthetic', labels: {} }) },
        AutoCareServiceQuoteEntity: { find: async ({ take }) => quotes.slice(0, take) },
        AutoCareRescheduleRequestEntity: { findOne: async () => null },
    })
    const result = await hydrateRequest(request)
    assert.equal(result.quoteHistory.at(-1).version, 50)
    assert.equal(result.quote.status, 'superseded')
    assert.equal(result.quote.amountMinor, 5_100)
    return { trueLatestQuoteVersion: 51, visibleQuoteVersion: result.quoteHistory.at(-1).version, currentPendingQuoteExposedAs: result.quote.status }
})

await reproduce('N32', async () => {
    const { notifyAutoCareParticipant } = await load('modules/autocare/request-effects.service.js')
    const keys = new Set()
    installRepositories({ UserEntity: { findOne: async () => ({ locale: 'en' }) }, OutboxEventEntity: { findOneByOrFail: async () => ({}) } }, async (_sql, parameters) => keys.add(parameters[2]))
    const common = { userId: ids.client, requestId: ids.request, event: 'estimate-shared', role: 'client', title: 'Synthetic revised estimate' }
    await notifyAutoCareParticipant({ ...common, message: 'Synthetic quote version 1' })
    await notifyAutoCareParticipant({ ...common, message: 'Synthetic quote version 2' })
    assert.equal(keys.size, 1)
    return { distinctQuoteNotificationsShareOneIdempotencyKey: true, outboxRowsForTwoQuoteVersions: keys.size }
})

await reproduce('N33', async () => {
    const require = createRequire(new URL('../../../../package.json', import.meta.url))
    const typescript = require('typescript')
    const source = await readFile(new URL('../../../../src/shared/api/getApiErrorMessage.ts', import.meta.url), 'utf8')
    const compiled = typescript.transpileModule(source, { compilerOptions: { module: typescript.ModuleKind.CommonJS } }).outputText
    const exports = {}
    new Script(compiled).runInNewContext({ exports, require: () => ({ getStoredLocale: () => 'ru', t: (key) => key }) })
    const technicalMessage = 'SyntaxError: Unexpected token I, Internal Server Error is not valid JSON'
    const displayed = exports.getApiErrorMessage({ status: 'PARSING_ERROR', originalStatus: 500, data: 'Internal Server Error', error: technicalMessage }, 'Попробуйте позже', 'ru')
    assert.equal(displayed, technicalMessage)
    return { parsingFailureDisplaysRawTechnicalError: true }
})

process.stdout.write(`${JSON.stringify({ baseline: '8840ae8', fixtures: 'synthetic, no network or database', findings }, null, 2)}\n`)
