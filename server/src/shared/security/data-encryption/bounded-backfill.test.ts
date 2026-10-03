import { describe, expect, it } from 'vitest'
import { runBoundedBackfill, type BackfillAdapter, type BackfillCheckpoint } from './bounded-backfill.js'
const id = (index: number) => `00000000-0000-4000-8000-${String(index).padStart(12, '0')}`
describe('bounded resumable backfill engine', () => {
    it('processes 5000 rows with at most 25 rows resident in each batch and resumes checkpoints', async () => {
        let stored: BackfillCheckpoint = { afterId: null, processed: 0 }
        let largest = 0
        const adapter: BackfillAdapter<number, string> = {
            async readBatch(after, limit) {
                const start = after ? Number(after.slice(-12)) + 1 : 0
                return Array.from({ length: Math.min(limit, 5000 - start) }, (_, offset) => ({ id: id(start + offset), value: start + offset }))
            },
            async transform(row) { return `encrypted-${row.value}` },
            async commitBatch(rows, checkpoint) { largest = Math.max(largest, rows.length); stored = checkpoint },
        }
        const first = await runBoundedBackfill(adapter, { checkpoint: stored, batchSize: 25, maxBatches: 2 })
        expect(first).toEqual({ checkpoint: { afterId: id(49), processed: 50 }, exhausted: false })
        const next = await runBoundedBackfill(adapter, { checkpoint: stored, batchSize: 25, maxBatches: 300 })
        expect(next).toEqual({ checkpoint: { afterId: id(4999), processed: 5000 }, exhausted: true })
        expect(largest).toBe(25)
    })
    it('does not advance the caller checkpoint when an atomic compare/write batch fails', async () => {
        const checkpoint = { afterId: null, processed: 0 }
        await expect(runBoundedBackfill({ readBatch: async () => [{ id: id(1), value: 'synthetic' }], transform: async () => 'ciphertext', commitBatch: async () => { throw new Error('Version conflict') } }, { checkpoint, batchSize: 25, maxBatches: 1 })).rejects.toThrow('Version conflict')
        expect(checkpoint).toEqual({ afterId: null, processed: 0 })
    })
    it('rejects oversized, duplicate and nonprogressing batches before transforming', async () => {
        for (const rows of [[{ id: id(1), value: 1 }, { id: id(2), value: 2 }], [{ id: id(0), value: 1 }]]) {
            await expect(runBoundedBackfill({ readBatch: async () => rows, transform: async () => { throw new Error('Must not transform') }, commitBatch: async () => {} }, { checkpoint: { afterId: id(0), processed: 0 }, batchSize: 1, maxBatches: 1 })).rejects.toThrow(/batch budget|keyset order/)
        }
    })
})
