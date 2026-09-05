import { createHash } from 'node:crypto'

export const DETERMINISTIC_EICAR_PAYLOAD = Buffer.from('X5O!P%@AP[4\\PZX54(P^)7CC)7}$EICAR-STANDARD-ANTIVIRUS-TEST-FILE!$H+H*')

export type FakeMediaObject = {
    key: string
    body: Buffer
    contentType: string
    metadata: Record<string, string>
    lastModifiedAt: number
}

/**
 * In-memory S3-compatible adapter for deterministic unit harnesses. It keeps
 * operation history and never touches a network or a production bucket.
 */
export class DeterministicFakeS3Adapter {
    private readonly objects = new Map<string, FakeMediaObject>()
    private clock = 1_000

    readonly operations: string[] = []

    async put(input: { key: string; body: Buffer; contentType: string; metadata?: Record<string, string> }) {
        if (this.objects.has(input.key)) throw new Error(`Fake S3 object already exists: ${input.key}`)
        const object = {
            key: input.key,
            body: Buffer.from(input.body),
            contentType: input.contentType,
            metadata: { ...(input.metadata ?? {}) },
            lastModifiedAt: this.clock++,
        }
        this.objects.set(input.key, object)
        this.operations.push(`put:${input.key}`)
        return object
    }

    async copy(input: { sourceKey: string; targetKey: string; metadata?: Record<string, string>; contentType?: string }) {
        const source = this.objects.get(input.sourceKey)
        if (!source) throw new Error(`Fake S3 source is missing: ${input.sourceKey}`)
        if (this.objects.has(input.targetKey)) throw new Error(`Fake S3 target already exists: ${input.targetKey}`)
        const object = {
            key: input.targetKey,
            body: Buffer.from(source.body),
            contentType: input.contentType ?? source.contentType,
            metadata: { ...source.metadata, ...(input.metadata ?? {}) },
            lastModifiedAt: this.clock++,
        }
        this.objects.set(input.targetKey, object)
        this.operations.push(`copy:${input.sourceKey}->${input.targetKey}`)
        return object
    }

    async head(key: string) {
        const object = this.objects.get(key)
        if (!object) throw new Error(`Fake S3 object is missing: ${key}`)
        this.operations.push(`head:${key}`)
        return { ...object, body: Buffer.from(object.body) }
    }

    async get(key: string) {
        const object = await this.head(key)
        this.operations.push(`get:${key}`)
        return Buffer.from(object.body)
    }

    async remove(key: string) {
        this.objects.delete(key)
        this.operations.push(`delete:${key}`)
    }

    has(key: string) {
        return this.objects.has(key)
    }

    getObjectChecksum(key: string) {
        const object = this.objects.get(key)
        if (!object) return null
        return createHash('sha256').update(object.body).digest('hex')
    }
}

export type FakeScanResult =
    | { status: 'clean' }
    | { status: 'infected'; signature: 'EICAR' }

/** Deterministic AV substitute: clean bytes pass, the standard EICAR fixture fails. */
export class DeterministicFakeAntivirusAdapter {
    async scan(content: Buffer): Promise<FakeScanResult> {
        return content.includes(DETERMINISTIC_EICAR_PAYLOAD)
            ? { status: 'infected', signature: 'EICAR' }
            : { status: 'clean' }
    }
}
