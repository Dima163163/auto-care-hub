import type { DataSource } from 'typeorm'
import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import { encryptFieldValue, setDataEncryptionKeyProviderForTests } from './field-encryption.js'
import { resetClientVehicleBindingBackfill, runClientVehicleBindingBackfill, verifyClientVehicleBindings } from './client-vehicle-binding-backfill.js'

const firstId = '00000000-0000-4000-8000-000000000001'
const secondId = '00000000-0000-4000-8000-000000000002'

beforeEach(() => setDataEncryptionKeyProviderForTests({
    activeKeyId: 'client-vehicle-backfill-test',
    getIndexKey: () => Buffer.alloc(32, 53),
    getKey: () => ({ kek: Buffer.alloc(32, 54) }),
}))
afterEach(() => setDataEncryptionKeyProviderForTests(null))

function fakeSource() {
    const rows = new Map([
        [firstId, {
            userId: firstId,
            vin: encryptFieldValue('client_vehicles', 'vin', 'JT123456789012345'), vinBinding: null as string | null,
            licensePlate: encryptFieldValue('client_vehicles', 'licensePlate', 'А123ВС63') as ReturnType<typeof encryptFieldValue> | null,
            licensePlateBinding: null as string | null,
            internalNumber: encryptFieldValue('client_vehicles', 'internalNumber', 'FLEET-1') as ReturnType<typeof encryptFieldValue> | null,
            internalNumberBinding: null as string | null,
            imageUrl: encryptFieldValue('client_vehicles', 'imageUrl', '/vehicle.png'), imageUrlBinding: null as string | null,
        }],
        [secondId, {
            userId: firstId,
            vin: null as ReturnType<typeof encryptFieldValue> | null, vinBinding: null as string | null,
            licensePlate: null as ReturnType<typeof encryptFieldValue> | null, licensePlateBinding: null as string | null,
            internalNumber: null as ReturnType<typeof encryptFieldValue> | null, internalNumberBinding: null as string | null,
            imageUrl: encryptFieldValue('client_vehicles', 'imageUrl', '/default.png'), imageUrlBinding: null as string | null,
        }],
    ])
    let checkpoint: { afterId: string | null; processed: number } | null = null
    let failCompare = false
    async function query(sql: string, params: unknown[] = []): Promise<unknown> {
        if (sql.startsWith('INSERT INTO "client_vehicle_binding_backfill_checkpoints"')) {
            checkpoint ??= { afterId: null, processed: 0 }
            return []
        }
        if (sql.startsWith('DELETE FROM "client_vehicle_binding_backfill_checkpoints"')) {
            checkpoint = null
            return []
        }
        if (sql.startsWith('SELECT "afterId", "processed"')) {
            return checkpoint ? [{ afterId: checkpoint.afterId, processed: String(checkpoint.processed) }] : []
        }
        if (sql.startsWith('SELECT "id", "userId"')) {
            const afterId = params.length === 2 ? String(params[0]) : null
            const limit = Number(params[params.length - 1])
            return [...rows].filter(([id]) => !afterId || id > afterId).slice(0, limit)
                .map(([id, value]) => ({ id, ...value }))
        }
        if (sql.startsWith('UPDATE "client_vehicles" SET "vinBinding"')) {
            const id = String(params[4])
            const current = rows.get(id)
            if (failCompare || !current || current.userId !== params[5]
                || JSON.stringify(current.vin) !== JSON.stringify(params[6]) || current.vinBinding !== params[7]
                || JSON.stringify(current.licensePlate) !== JSON.stringify(params[8]) || current.licensePlateBinding !== params[9]
                || JSON.stringify(current.internalNumber) !== JSON.stringify(params[10]) || current.internalNumberBinding !== params[11]
                || JSON.stringify(current.imageUrl) !== JSON.stringify(params[12]) || current.imageUrlBinding !== params[13]) return [[], 0]
            rows.set(id, { ...current, vinBinding: params[0] as string | null, licensePlateBinding: params[1] as string | null,
                internalNumberBinding: params[2] as string | null, imageUrlBinding: String(params[3]) })
            return [[{ id }], 1]
        }
        if (sql.startsWith('UPDATE "client_vehicle_binding_backfill_checkpoints"')) {
            checkpoint = { afterId: String(params[1]), processed: Number(params[2]) }
            return [[], 1]
        }
        throw new Error(`Unexpected query: ${sql}`)
    }
    const source = {
        query,
        transaction: async <T>(callback: (manager: { query: typeof query }) => Promise<T>) => callback({ query }),
    } as unknown as DataSource
    return { source, rows, checkpoint: () => checkpoint, failNextCompare: () => { failCompare = true } }
}

describe('client vehicle binding backfill', () => {
    it('resumes and verifies all four fields, optional nulls and owner scope', async () => {
        const fake = fakeSource()
        expect(await runClientVehicleBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .toMatchObject({ exhausted: false, checkpoint: { afterId: firstId, processed: 1 } })
        expect(fake.rows.get(firstId)?.vinBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.licensePlateBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.internalNumberBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(fake.rows.get(firstId)?.imageUrlBinding).toMatch(/^p2_[A-Za-z0-9_-]{43}$/)
        expect(await runClientVehicleBindingBackfill(fake.source, { batchSize: 1, maxBatches: 2 }))
            .toMatchObject({ exhausted: true, checkpoint: { afterId: secondId, processed: 2 } })
        expect(fake.rows.get(secondId)?.vinBinding).toBeNull()
        expect((await verifyClientVehicleBindings(fake.source, { batchSize: 2, maxBatches: 2 })).exhausted).toBe(true)
        fake.rows.set(firstId, { ...fake.rows.get(firstId)!, userId: secondId })
        await expect(verifyClientVehicleBindings(fake.source, { batchSize: 2, maxBatches: 2 }))
            .rejects.toThrow('Encrypted record binding authentication failed.')
        await resetClientVehicleBindingBackfill(fake.source)
        expect(fake.checkpoint()).toBeNull()
    })

    it('does not advance the checkpoint after a compare-write conflict', async () => {
        const fake = fakeSource()
        fake.failNextCompare()
        await expect(runClientVehicleBindingBackfill(fake.source, { batchSize: 1, maxBatches: 1 }))
            .rejects.toThrow('Client vehicle binding source row changed concurrently.')
        expect(fake.checkpoint()).toEqual({ afterId: null, processed: 0 })
    })
})
