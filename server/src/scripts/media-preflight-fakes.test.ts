import { describe, expect, it } from 'vitest'

import {
    DETERMINISTIC_EICAR_PAYLOAD,
    DeterministicFakeAntivirusAdapter,
    DeterministicFakeS3Adapter,
} from './media-preflight-fakes.js'

describe('deterministic media preflight fakes', () => {
    it('round-trips a quarantine object through promotion without a network', async () => {
        const storage = new DeterministicFakeS3Adapter()
        await storage.put({
            key: 'quarantine/autocare-preflight/fixture.bin',
            body: Buffer.from('clean fixture'),
            contentType: 'application/octet-stream',
            metadata: { state: 'quarantine' },
        })
        await storage.copy({
            sourceKey: 'quarantine/autocare-preflight/fixture.bin',
            targetKey: 'private/autocare-preflight/fixture.bin',
            contentType: 'application/octet-stream',
            metadata: { state: 'private' },
        })
        expect(await storage.get('private/autocare-preflight/fixture.bin')).toEqual(Buffer.from('clean fixture'))
        expect(storage.getObjectChecksum('private/autocare-preflight/fixture.bin')).toMatch(/^[a-f0-9]{64}$/)
        await storage.remove('quarantine/autocare-preflight/fixture.bin')
        expect(storage.has('quarantine/autocare-preflight/fixture.bin')).toBe(false)
        expect(storage.has('private/autocare-preflight/fixture.bin')).toBe(true)
        expect(storage.operations).toEqual([
            'put:quarantine/autocare-preflight/fixture.bin',
            'copy:quarantine/autocare-preflight/fixture.bin->private/autocare-preflight/fixture.bin',
            'head:private/autocare-preflight/fixture.bin',
            'get:private/autocare-preflight/fixture.bin',
            'delete:quarantine/autocare-preflight/fixture.bin',
        ])
    })

    it('classifies clean and EICAR payloads deterministically', async () => {
        const antivirus = new DeterministicFakeAntivirusAdapter()
        await expect(antivirus.scan(Buffer.from('clean fixture'))).resolves.toEqual({ status: 'clean' })
        await expect(antivirus.scan(DETERMINISTIC_EICAR_PAYLOAD)).resolves.toEqual({ status: 'infected', signature: 'EICAR' })
    })
})
