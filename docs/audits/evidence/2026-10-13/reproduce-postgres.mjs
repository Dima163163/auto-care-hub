// Manual defect evidence, not a desired-behavior regression gate.
// Requires the dedicated disposable PostgreSQL/Redis audit environment.
import assert from 'node:assert/strict'
import { randomUUID } from 'node:crypto'
import { performance } from 'node:perf_hooks'
import { writeFile } from 'node:fs/promises'

const target = new URL(process.env.DATABASE_URL ?? 'postgresql://invalid/invalid')
assert.equal(target.hostname, '127.0.0.1')
assert.equal(target.port, '29442')
assert.equal(target.pathname, '/autocarehub_test')
assert.equal(process.env.NODE_ENV, 'test')
const base = new URL('../../../../server/dist/', import.meta.url)
const load = (file) => import(new URL(file, base))
const { AppDataSource } = await load('database/data-source.js')
const E = await load('entities/index.js')
const { disconnectRedis } = await load('shared/redis/redis.js')
AppDataSource.setOptions({ migrations: [] })
await AppDataSource.initialize()
const repo = (entity) => AppDataSource.getRepository(entity)
const report = { baseline: '8840ae8', database: 'dedicated PostgreSQL 17, loopback 29442', mocks: false, findings: [], scale: [] }
const record = (id, evidence) => report.findings.push({ id, reproduced: true, ...evidence })
const tag = randomUUID().slice(0, 8)

try {
    const users = repo(E.UserEntity)
    const makeUser = (role) => users.save(users.create({ name: `Synthetic audit ${role}`, email: `audit-${role}-${tag}@example.test`, role, status: 'active', emailVerifiedAt: new Date(), passwordHash: 'synthetic-old-hash', tokenVersion: 1 }))
    const client = await makeUser('client')
    const owner = await makeUser('owner')
    const admin = await makeUser('super_admin')
    const templateProvider = await repo(E.AutomotiveProviderEntity).findOneByOrFail({ status: 'active' })
    const makeProvider = (suffix) => repo(E.AutomotiveProviderEntity).save(repo(E.AutomotiveProviderEntity).create({ ...templateProvider, id: undefined, ownerId: owner.id, name: `Synthetic audit ${tag} ${suffix}`, trustReassessedAt: null, createdAt: undefined, updatedAt: undefined }))
    const provider = await makeProvider('A')
    const templateLocation = await repo(E.AutomotiveServiceLocationEntity).findOneByOrFail({ providerId: templateProvider.id })
    const location = await repo(E.AutomotiveServiceLocationEntity).save(repo(E.AutomotiveServiceLocationEntity).create({ ...templateLocation, id: undefined, providerId: provider.id, createdAt: undefined, updatedAt: undefined }))
    const definition = await repo(E.AutomotiveServiceDefinitionEntity).findOneByOrFail({ slug: 'oil-change' })
    const requestRepository = repo(E.ServiceRequestEntity)
    const requestData = (status = 'awaiting_reply') => ({ clientId: client.id, providerId: provider.id, locationId: location.id, definitionId: definition.id, status, idempotencyKey: `audit-${randomUUID()}`, offeringId: null, offeringSnapshot: null, vehicleSnapshot: null, contactSnapshot: null, note: null, estimateSnapshot: null, bookingSnapshot: null, clientConfirmedAt: status === 'closed' ? new Date() : null, providerConfirmedAt: status === 'closed' ? new Date() : null })
    const request = await requestRepository.save(requestRepository.create(requestData()))

    const { enqueueOutboxEvent } = await load('modules/outbox/outbox.service.js')
    const outbox = await enqueueOutboxEvent({ type: 'email.send', idempotencyKey: `audit-plaintext-${tag}`, payload: { template: 'booking', toEmail: `synthetic-${tag}@example.test`, recipientName: 'Synthetic Recipient' } }, AppDataSource.manager)
    const [rawOutbox] = await AppDataSource.query('SELECT "payload" FROM "outbox_events" WHERE "id" = $1', [outbox.id])
    assert.equal(rawOutbox.payload.toEmail, `synthetic-${tag}@example.test`)
    assert.equal(rawOutbox.payload.recipientName, 'Synthetic Recipient')
    record('U14', { rawPersistedJsonbHasPlaintext: true })

    const { createAutoCareServiceMessage } = await load('modules/autocare/request-conversation.service.js')
    const message = await createAutoCareServiceMessage(admin, request.id, { body: 'Synthetic unauthorized private write' })
    assert.equal(message.senderId, admin.id)
    assert.equal(await repo(E.ServiceMessageEntity).countBy({ requestId: request.id, senderId: admin.id }), 1)
    record('U15', { superAdminPrivateMessagePersisted: true })

    const closedRequest = await requestRepository.save(requestRepository.create(requestData('closed')))
    const { createAutoCareReview, updateClientAutoCareReview } = await load('modules/autocare/provider-reviews-write.service.js')
    const review = await createAutoCareReview(client, { requestId: closedRequest.id, rating: 4, text: 'Synthetic confirmed visit for moderation evidence.' })
    const evidence = (await repo(E.AutoCareTrustEvidenceEntity).findBy({ providerId: provider.id, kind: 'review' })).find((item) => item.reference === review.id)
    assert.ok(evidence)
    const { decideAdminAutoCareReview } = await load('modules/autocare/review-moderation.service.js')
    await decideAdminAutoCareReview(admin, review.id, { status: 'approved' })
    assert.equal((await repo(E.AutomotiveReviewEntity).findOneByOrFail({ id: review.id })).status, 'approved')
    assert.equal((await repo(E.AutoCareTrustEvidenceEntity).findOneByOrFail({ id: evidence.id })).status, 'pending')
    record('U16', { reviewApprovedButPersistedEvidenceStillPending: true })

    const accountRepository = repo(E.AutoCareBonusAccountEntity)
    const account = await accountRepository.save(accountRepository.create({ clientId: client.id, providerId: provider.id, balancePoints: 100, earnedPoints: 200, redeemedPoints: 100 }))
    const ledgerRepository = repo(E.AutoCareBonusLedgerEntity)
    const ledgerBase = { accountId: account.id, clientId: client.id, providerId: provider.id, requestId: null, actorId: null, reason: 'Synthetic audit ledger' }
    await ledgerRepository.save([
        ledgerRepository.create({ ...ledgerBase, type: 'earn', points: 100, idempotencyKey: `audit-old-${tag}`, expiresAt: new Date(Date.now() - 1000), createdAt: new Date(Date.now() - 30000) }),
        ledgerRepository.create({ ...ledgerBase, type: 'redeem', points: -100, idempotencyKey: `audit-spent-${tag}`, expiresAt: null, createdAt: new Date(Date.now() - 20000) }),
        ledgerRepository.create({ ...ledgerBase, type: 'earn', points: 100, idempotencyKey: `audit-fresh-${tag}`, expiresAt: new Date(Date.now() + 86400000) }),
    ])
    const { getMyAutoCareBonusAccounts } = await load('modules/autocare/autocare-bonus.service.js')
    await getMyAutoCareBonusAccounts(client)
    assert.equal((await accountRepository.findOneByOrFail({ id: account.id })).balancePoints, 0)
    record('U18', { unexpiredBalanceBefore: 100, persistedBalanceAfter: 0 })

    const { createAutoCareGuaranteeClaim } = await load('modules/autocare/autocare-marketplace.service.js')
    const { reassessAutoCareProviderTrust, reassessAutoCareTrustScores } = await load('modules/autocare/trust-score.service.js')
    const before = await reassessAutoCareProviderTrust(provider.id)
    for (let index = 0; index < 4; index += 1) await createAutoCareGuaranteeClaim(client, { requestId: request.id, claimType: 'safety', summary: 'Synthetic duplicate unadjudicated safety claim', evidenceUrls: [] })
    const after = await reassessAutoCareProviderTrust(provider.id)
    assert.equal(await repo(E.AutoCareGuaranteeClaimEntity).countBy({ requestId: request.id }), 4)
    assert.ok(after.trust.score < before.trust.score)
    record('U19', { persistedDuplicateCases: 4, trustBefore: before.trust.score, trustAfter: after.trust.score, moderationPenalty: after.trust.factors.moderationPenalty })

    const staleUser = await users.findOneByOrFail({ id: client.id })
    await users.update(client.id, { status: 'blocked', passwordHash: 'synthetic-new-hash', tokenVersion: 2 })
    const { updateUserPreferences } = await load('modules/users/users.service.js')
    await updateUserPreferences(staleUser, { locale: 'ru' })
    const overwritten = await users.findOneByOrFail({ id: client.id })
    assert.equal(overwritten.status, 'active')
    assert.equal(overwritten.passwordHash, 'synthetic-old-hash')
    assert.equal(overwritten.tokenVersion, 1)
    record('U20', { controlledReadUpdateSaveInterleaving: true, persistedSecurityStateReverted: ['status', 'passwordHash', 'tokenVersion'] })

    const reviews = repo(E.AutomotiveReviewEntity)
    await reviews.update(review.id, { revisionAllowedUntil: new Date(Date.now() + 86400000), revisionUsedAt: null })
    const originalFind = reviews.findOneBy.bind(reviews)
    let arrived = 0
    let release
    const barrier = new Promise((resolve) => { release = resolve })
    const timeout = setTimeout(() => release(), 10000)
    reviews.findOneBy = async (where) => {
        const value = await originalFind(where)
        if (where.id === review.id) { arrived += 1; if (arrived === 2) release(); await barrier }
        return value
    }
    let outcomes
    try {
        outcomes = await Promise.allSettled([
            updateClientAutoCareReview(client, review.id, { rating: 5, text: 'Synthetic concurrent revision number A' }),
            updateClientAutoCareReview(client, review.id, { rating: 1, text: 'Synthetic concurrent revision number B' }),
        ])
    } finally { reviews.findOneBy = originalFind; clearTimeout(timeout) }
    assert.equal(arrived, 2)
    assert.equal(outcomes.filter((item) => item.status === 'fulfilled').length, 2)
    record('N24', { realParallelReadsAndWrites: true, barrierOnlyDelaysCompletedDatabaseReads: true, successfulSingleUseRevisions: 2 })

    const neverAssessed = await makeProvider('B')
    const others = await AppDataSource.query('SELECT "id", "status" FROM "autocare_providers" WHERE "id" NOT IN ($1,$2) AND "status" = $3', [provider.id, neverAssessed.id, 'active'])
    await AppDataSource.query('UPDATE "autocare_providers" SET "status"=$1 WHERE "id" NOT IN ($2,$3) AND "status"=$4', ['suspended', provider.id, neverAssessed.id, 'active'])
    try {
        for (let index = 0; index < 3; index += 1) await reassessAutoCareTrustScores(1)
        assert.equal((await repo(E.AutomotiveProviderEntity).findOneByOrFail({ id: neverAssessed.id })).trustReassessedAt, null)
        record('N25', { postgresOrderedWorkerPasses: 3, limit: 1, nullProviderNeverReassessed: true })
    } finally {
        for (const row of others) await repo(E.AutomotiveProviderEntity).update(row.id, { status: row.status })
    }

    // Small controlled growth sample; this is not a production capacity claim.
    const { getOwnerAutoCareServiceRequests } = await load('modules/autocare/request-read.service.js')
    const { getOwnerAutoCareProviderAnalytics } = await load('modules/autocare/autocare-analytics.service.js')
    let queries = 0
    const originalLogQuery = AppDataSource.logger.logQuery.bind(AppDataSource.logger)
    AppDataSource.logger.logQuery = (...args) => { queries += 1; originalLogQuery(...args) }
    try {
        let inserted = 0
        for (const size of [100, 1000]) {
            await requestRepository.save(Array.from({ length: size - inserted }, () => requestRepository.create(requestData())))
            inserted = size
            for (const [name, task] of [
                ['request-list', () => getOwnerAutoCareServiceRequests(owner)],
                ['provider-analytics', () => getOwnerAutoCareProviderAnalytics(owner, provider.id)],
            ]) {
                queries = 0
                const memoryBefore = process.memoryUsage()
                const started = performance.now()
                const result = await task()
                report.scale.push({ name, insertedHistoryRows: size, durationMs: Math.round(performance.now() - started), queries, resultCount: Array.isArray(result) ? result.length : undefined, heapDeltaBytes: process.memoryUsage().heapUsed - memoryBefore.heapUsed })
            }
        }
    } finally { AppDataSource.logger.logQuery = originalLogQuery }
    const listSamples = report.scale.filter((item) => item.name === 'request-list')
    assert.ok(listSamples[1].queries > listSamples[0].queries * 5)
    record('N23', { actualPostgresHistoryGrowthMeasured: true, samples: report.scale })

    await reviews.save(reviews.create({ providerId: provider.id, authorName: 'Synthetic old pending', vehicleLabel: 'Synthetic', rating: 4, text: 'Synthetic old pending review outside latest window', status: 'pending', createdAt: new Date('2000-01-01T00:00:00Z') }))
    await reviews.save(Array.from({ length: 1000 }, (_, index) => reviews.create({ providerId: provider.id, authorName: `Synthetic approved ${index}`, vehicleLabel: 'Synthetic', rating: 5, text: `Synthetic approved review ${index} for bounded-window proof.`, status: 'approved' })))
    const { getAutoCareQualityMonitoring } = await load('modules/autocare/autocare-quality-monitoring.service.js')
    const quality = await getAutoCareQualityMonitoring(admin)
    const actualPending = await reviews.countBy({ status: 'pending' })
    assert.ok(quality.reviews.pending < actualPending)
    record('N21', { insertedRecentApprovedReviews: 1000, actualPending, displayedPending: quality.reviews.pending })

    await writeFile(new URL('./postgres-results.json', import.meta.url), `${JSON.stringify(report, null, 2)}\n`)
    console.log(JSON.stringify({ cases: report.findings.length, ids: report.findings.map(({ id }) => id), scale: report.scale }))
} finally {
    const { closeServiceChatGateway } = await load('modules/autocare/service-chat.gateway.js')
    await closeServiceChatGateway()
    await AppDataSource.destroy()
    await disconnectRedis()
}
