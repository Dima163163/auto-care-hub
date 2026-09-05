import { describe, expect, it } from 'vitest'

import { MAX_MEDIA_PREFLIGHT_RESPONSE_BYTES, readBoundedMediaResponse, validatePrivateObjectHead, validateSignedAttachmentUrl } from './check-production-media.js'

describe('production media signed-url preflight', () => {
    it('accepts a signed URL for a private object with the configured TTL', () => {
        expect(() => validateSignedAttachmentUrl(
            'https://objects.example.test/private/autocare-requests/file.bin?X-Amz-Algorithm=AWS4-HMAC-SHA256&X-Amz-Signature=abc123&X-Amz-Expires=300',
            300,
        )).not.toThrow()
    })

    it('rejects missing signatures, wrong TTLs and non-private paths', () => {
        expect(() => validateSignedAttachmentUrl('https://objects.example.test/private/file.bin?X-Amz-Expires=300', 300)).toThrow(/signature or TTL/)
        expect(() => validateSignedAttachmentUrl('https://objects.example.test/private/file.bin?X-Amz-Signature=abc&X-Amz-Expires=60', 300)).toThrow(/signature or TTL/)
        expect(() => validateSignedAttachmentUrl('https://objects.example.test/public/file.bin?X-Amz-Signature=abc&X-Amz-Expires=300', 300)).toThrow(/private object/)
    })

    it('never accepts a quarantine object even when it is signed', () => {
        expect(() => validateSignedAttachmentUrl(
            'https://objects.example.test/quarantine/autocare-requests/file.bin?X-Amz-Signature=abc&X-Amz-Expires=300',
            300,
        )).toThrow(/quarantine/)
    })

    it('supports path-style and virtual-hosted URLs and enforces private cache policy when requested', () => {
        expect(() => validateSignedAttachmentUrl('https://s3.example.test/bucket/private/file.bin?X-Amz-Signature=abc&X-Amz-Expires=300&response-cache-control=private%2C%20no-store', 300, { requirePrivateCacheControl: true })).not.toThrow()
        expect(() => validateSignedAttachmentUrl('https://bucket.s3.example.test/private/file.bin?X-Amz-Signature=abc&X-Amz-Expires=300&response-cache-control=public', 300, { requirePrivateCacheControl: true })).toThrow(/shared caching/)
        expect(() => validateSignedAttachmentUrl('https://bucket.s3.example.test/private/file.bin?X-Amz-Signature=abc&X-Amz-Expires=300&response-cache-control=private%2C%20no-store', 300, { requirePrivateCacheControl: true })).not.toThrow()
    })

    it('requires encrypted private metadata after quarantine promotion', () => {
        expect(() => validatePrivateObjectHead({
            ContentType: 'application/octet-stream',
            ContentDisposition: 'inline',
            Metadata: { state: 'private', sha256: 'a'.repeat(64) },
            ServerSideEncryption: 'AES256',
        })).not.toThrow()
        expect(() => validatePrivateObjectHead({
            ContentType: 'application/octet-stream',
            ContentDisposition: 'inline',
            Metadata: { state: 'quarantine', sha256: 'a'.repeat(64) },
            ServerSideEncryption: 'AES256',
        })).toThrow(/private state/)
        expect(() => validatePrivateObjectHead({
            ContentType: 'application/octet-stream',
            ContentDisposition: 'inline',
            Metadata: { state: 'private', sha256: 'a'.repeat(64) },
            ServerSideEncryption: undefined,
        })).toThrow(/encrypted/)
        expect(() => validatePrivateObjectHead({ ContentType: 'application/octet-stream', ContentDisposition: 'inline', Metadata: { state: 'private' }, ServerSideEncryption: 'AES256' })).toThrow(/checksum metadata/)
        expect(() => validatePrivateObjectHead({ ContentType: 'application/octet-stream', ContentDisposition: 'attachment', Metadata: { state: 'private', sha256: 'a'.repeat(64) }, ServerSideEncryption: 'AES256' })).toThrow(/inline disposition/)
    })

    it('bounds signed response bodies before assembling the buffer', async () => {
        const response = new Response(new Uint8Array([1, 2, 3]))
        await expect(readBoundedMediaResponse(response, 2)).rejects.toThrow(/exceeds the 2-byte limit/)
        await expect(readBoundedMediaResponse(new Response(new Uint8Array([1, 2, 3])))).resolves.toHaveLength(3)
        expect(MAX_MEDIA_PREFLIGHT_RESPONSE_BYTES).toBe(10 * 1024 * 1024)
    })
})
