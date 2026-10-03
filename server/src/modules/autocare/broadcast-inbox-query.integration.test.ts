import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'
import { AppDataSource } from '../../database/data-source.js'
import { AutoCareBroadcastRequestEntity } from '../../entities/index.js'
import { scopeBroadcastInbox } from './broadcast-inbox-query.js'

it('finds an older matching request behind 120 newer irrelevant rows without widening branch/market access', async () => {
    // Session-local shadow tables on one owned connection; no application rows
    // are changed. The global setup has already validated the isolated target.
    const runner = AppDataSource.createQueryRunner()
    await runner.connect()
    await runner.startTransaction()
    try {
        await runner.query('CREATE TEMP TABLE autocare_broadcast_requests (LIKE public.autocare_broadcast_requests INCLUDING DEFAULTS) ON COMMIT DROP')
        await runner.query('CREATE TEMP TABLE autocare_service_locations (id uuid, "providerId" uuid, "marketId" uuid) ON COMMIT DROP')
        await runner.query('CREATE TEMP TABLE autocare_service_offerings ("locationId" uuid, "definitionId" uuid, active boolean) ON COMMIT DROP')
        await runner.query('CREATE TEMP TABLE autocare_broadcast_offers ("broadcastRequestId" uuid, "providerId" uuid, "locationId" uuid) ON COMMIT DROP')
        const [locationId, marketId, foreignMarketId, providerId, definitionId, clientId] = Array.from({ length: 6 }, () => randomUUID())
        if (!locationId || !marketId || !foreignMarketId || !providerId || !definitionId || !clientId) throw new Error('Missing synthetic identifiers')
        await runner.query('INSERT INTO autocare_service_locations VALUES ($1,$2,$3)', [locationId, providerId, marketId])
        await runner.query('INSERT INTO autocare_service_offerings VALUES ($1,$2,true)', [locationId, definitionId])
        const repository = runner.manager.getRepository(AutoCareBroadcastRequestEntity)
        const matchingId = randomUUID()
        const now = new Date()
        const expiresAt = new Date(now.getTime() + 3600_000)
        const rows = Array.from({ length: 120 }, () => repository.create({ id: randomUUID(), clientId, serviceDefinitionId: definitionId, marketId: foreignMarketId, issueDescription: 'Synthetic irrelevant request', expiresAt, status: 'open', createdAt: now }))
        rows.push(repository.create({ id: matchingId, clientId, serviceDefinitionId: definitionId, marketId, issueDescription: 'Synthetic matching request', expiresAt, status: 'open', createdAt: new Date(now.getTime() - 3600_000) }))
        await repository.save(rows)
        const query = () => repository.createQueryBuilder('broadcast')
        const result = await scopeBroadcastInbox(query(), [locationId], [marketId], now).orderBy('broadcast.createdAt', 'DESC').take(100).getMany()
        expect(result.map((row) => row.id)).toEqual([matchingId])
        expect(await scopeBroadcastInbox(query(), [randomUUID()], [marketId], now).getMany()).toEqual([])
        expect(await scopeBroadcastInbox(query(), [locationId], [], now).getMany()).toEqual([])
        expect(await scopeBroadcastInbox(query(), [locationId], [marketId], expiresAt).getMany()).toEqual([])
    } finally {
        await runner.rollbackTransaction()
        await runner.release()
    }
})
