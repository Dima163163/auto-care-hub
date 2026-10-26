import { afterEach, beforeEach, describe, expect, it } from 'vitest'
import type { EntityManager, QueryRunner } from 'typeorm'

import { EncryptRawOutboxRecipients1786420000000 } from '../../database/migrations/1786420000000-EncryptRawOutboxRecipients.js'
import {
    createEmailBlindIndex,
    getOutboxPayloadRecordId,
    outboxPayloadEncryptionTransformer,
    setOutboxPayloadRecordId,
    setDataEncryptionKeyProviderForTests,
} from '../../shared/security/data-encryption/field-encryption.js'
import { enqueueOutboxEvent } from './outbox.service.js'
import { redactOutboxSecrets } from './outbox-secret.js'

beforeEach(() => {
    setDataEncryptionKeyProviderForTests({
        activeKeyId: 'outbox-test-key',
        getIndexKey: () => Buffer.alloc(32, 37),
        getKey: () => ({ kek: Buffer.alloc(32, 38) }),
    })
})

afterEach(() => setDataEncryptionKeyProviderForTests(null))

describe('raw outbox recipient encryption', () => {
    it('encrypts recipient fields before the atomic raw insert', async () => {
        const queries: Array<{ sql: string; parameters: unknown[] }> = []
        const manager = {
            getRepository: () => ({ findOneByOrFail: async () => ({ id: 'event-1' }) }),
            query: async (sql: string, parameters: unknown[]) => {
                queries.push({ sql, parameters })
                return []
            },
        } as unknown as EntityManager
        const payload = {
            template: 'booking' as const,
            bookingId: '123e4567-e89b-42d3-a456-426614174000',
            toEmail: 'client@example.test',
            recipientName: 'Private Client',
            bookingDetails: {
                date: '2026-10-20',
                startTime: '10:00',
                endTime: '11:00',
                cabinetTitle: 'Cabinet',
                serviceTitle: 'Service',
            },
            status: 'created' as const,
            isForOwner: false,
            frontendOrigin: 'https://autocarehub.example',
            locale: null,
        }

        await enqueueOutboxEvent({ type: 'email.send', payload, idempotencyKey: 'booking:private-1' }, manager)
        const [insert] = queries
        expect(insert?.sql).toContain('ON CONFLICT ("idempotencyKey") DO NOTHING')
        const raw = String(insert?.parameters[2])
        expect(raw).not.toContain(payload.toEmail)
        expect(raw).not.toContain(payload.recipientName)
        const stored = JSON.parse(raw) as Record<string, unknown>
        expect(stored.toEmail).toBe(createEmailBlindIndex(payload.toEmail))
        expect(stored.$recordId).toBe(insert?.parameters[0])
        expect(stored.toEmailCiphertext).toHaveProperty('recordBinding')
        expect(stored.recipientNameCiphertext).toHaveProperty('recordBinding')
        expect(outboxPayloadEncryptionTransformer.from(stored)).toMatchObject(payload)
        expect(getOutboxPayloadRecordId(outboxPayloadEncryptionTransformer.from(stored) as Record<string, unknown>))
            .toBe(insert?.parameters[0])
    })

    it('backfills plaintext rows, including mixed encrypted/plaintext recipients', async () => {
        const alreadyEncrypted = outboxPayloadEncryptionTransformer.to({ email: 'mixed@example.test' }) as Record<string, unknown>
        const rows = [
            { id: 'event-1', payload: { email: 'old@example.test', recipientName: 'Old Client' } },
            { id: 'event-2', payload: { ...alreadyEncrypted, recipientName: 'Mixed Client' } },
        ]
        const updates: Array<{ id: string; payload: Record<string, unknown> }> = []
        let scans = 0
        const queryRunner = {
            query: async (sql: string, parameters?: unknown[]) => {
                if (sql.startsWith('SELECT')) return scans++ === 0 ? rows : []
                updates.push({ id: String(parameters?.[1]), payload: JSON.parse(String(parameters?.[0])) })
                return []
            },
        } as unknown as QueryRunner

        await new EncryptRawOutboxRecipients1786420000000().up(queryRunner)

        expect(updates).toHaveLength(2)
        for (const { payload } of updates) {
            expect(JSON.stringify(payload)).not.toMatch(/old@example|mixed@example|Old Client|Mixed Client/)
        }
        expect(outboxPayloadEncryptionTransformer.from(updates[0]?.payload)).toEqual(rows[0]?.payload)
        expect(outboxPayloadEncryptionTransformer.from(updates[1]?.payload)).toEqual({ email: 'mixed@example.test', recipientName: 'Mixed Client' })
    })

    it('preserves the event binding when a secret is redacted before save', () => {
        const id = '123e4567-e89b-42d3-a456-426614174000'
        const payload = setOutboxPayloadRecordId({ email: 'client@example.test', encryptedToken: 'secret' }, id)
        const stored = outboxPayloadEncryptionTransformer.to(payload)
        const opened = outboxPayloadEncryptionTransformer.from(stored) as Record<string, unknown>
        const redacted = redactOutboxSecrets(opened)
        expect(redacted).not.toHaveProperty('encryptedToken')
        expect(getOutboxPayloadRecordId(redacted)).toBe(id)
        expect(outboxPayloadEncryptionTransformer.to(redacted)).toHaveProperty('emailCiphertext.recordBinding')
    })
})
