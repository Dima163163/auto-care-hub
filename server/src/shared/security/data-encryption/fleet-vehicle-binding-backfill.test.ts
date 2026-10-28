import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetFleetVehicleBindingBackfill, runFleetVehicleBindingBackfill, verifyFleetVehicleBindings } from './fleet-vehicle-binding-backfill.js'

const id = '00000000-0000-4000-8000-000000000001'
const fleetId = '00000000-0000-4000-8000-000000000002'
const table = 'autocare_fleet_vehicles'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'fleet-vehicle-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 77),
    getKey: () => ({ kek: Buffer.alloc(32, 78) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const row = {
        fleetId,
        label: encryptFieldValue(table, 'label', 'Private car'), labelBinding: null as string | null,
        vehicleSnapshot: encryptFieldValue(table, 'vehicleSnapshot', { make: 'Toyota' }), vehicleSnapshotBinding: null as string | null,
    }
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let conflict = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "fleet_vehicle_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "fleet_vehicle_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "fleetId"')) {
            return params.length === 2 && String(params[0]) >= id ? [] : [{ id, ...row }]
        }
        if (sql.startsWith('UPDATE "autocare_fleet_vehicles" SET "labelBinding"')) {
            if (conflict || params[2] !== id || params[3] !== row.fleetId
                || params[4] !== row.label || params[5] !== row.labelBinding
                || JSON.stringify(params[6]) !== JSON.stringify(row.vehicleSnapshot) || params[7] !== row.vehicleSnapshotBinding) return [[], 0]
            row.labelBinding = params[0] as string
            row.vehicleSnapshotBinding = params[1] as string
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "fleet_vehicle_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = { query, transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }) } as unknown as DataSource
    return { source, row, checkpoint: () => checkpoint, failCompare: () => { conflict = true } }
}

describe('fleet vehicle binding backfill', () => {
    it('resumes, verifies and rejects a changed owner scope', async () => {
        const fake = fakeSource()
        expect(await runFleetVehicleBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: id, processed: 1 } })
        expect(fake.row.labelBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.row.vehicleSnapshotBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect((await runFleetVehicleBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 })).exhausted).toBe(true)
        expect((await verifyFleetVehicleBindings(fake.source, { batchSize: 1, maxBatches: 2 })).exhausted).toBe(true)
        fake.row.fleetId = id
        await expect(verifyFleetVehicleBindings(fake.source, { batchSize: 1, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetFleetVehicleBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failCompare()
        await expect(runFleetVehicleBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Fleet vehicle binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
