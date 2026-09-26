import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { chmodSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const ENVELOPE_VERSION = 1
const ENVELOPE_ALGORITHM = 'A256GCM'
const INDEX_VERSION = 'h1'
const KEY_BYTES = 32
const NONCE_BYTES = 12
const MODULE_DIR = dirname(fileURLToPath(import.meta.url))

export type EncryptedFieldEnvelope = {
    $encrypted: 1
    algorithm: typeof ENVELOPE_ALGORITHM
    keyId: string
    redacted?: true
    nonce: string
    tag: string
    ciphertext: string
    wrappedDek: {
        nonce: string
        tag: string
        ciphertext: string
    }
}

export type DataEncryptionKeyProvider = {
    activeKeyId: string
    getKey(keyId: string): { kek: Buffer; indexKey: Buffer }
}

type LocalKeyring = {
    version: 1
    activeKeyId: string
    keys: Record<string, { kek: string; indexKey: string }>
}

let testKeyProvider: DataEncryptionKeyProvider | null = null
let configuredKeyProvider: DataEncryptionKeyProvider | null = null
let localProvider: DataEncryptionKeyProvider | null = null

function fieldAad(table: string, column: string) {
    return Buffer.from(`autocarehub:data:v${ENVELOPE_VERSION}:${table}:${column}`, 'utf8')
}

function encode(value: Buffer) {
    return value.toString('base64url')
}

function decode(value: unknown, expectedBytes?: number) {
    if (typeof value !== 'string' || !/^[A-Za-z0-9_-]+$/.test(value)) {
        throw new Error('Encrypted data is invalid.')
    }
    const decoded = Buffer.from(value, 'base64url')
    if (encode(decoded) !== value || (expectedBytes !== undefined && decoded.length !== expectedBytes)) {
        throw new Error('Encrypted data is invalid.')
    }
    return decoded
}

function parseKeyring(text: string): DataEncryptionKeyProvider {
    const parsed = JSON.parse(text) as LocalKeyring
    if (parsed.version !== 1 || typeof parsed.activeKeyId !== 'string' || !parsed.keys?.[parsed.activeKeyId]) {
        throw new Error('Local data encryption keyring is invalid.')
    }
    const keys = new Map<string, { kek: Buffer; indexKey: Buffer }>()
    for (const [keyId, value] of Object.entries(parsed.keys)) {
        const kek = decode(value.kek, KEY_BYTES)
        const indexKey = decode(value.indexKey, KEY_BYTES)
        keys.set(keyId, { kek, indexKey })
    }
    return {
        activeKeyId: parsed.activeKeyId,
        getKey(keyId) {
            const key = keys.get(keyId)
            if (!key) throw new Error('Data encryption key is unavailable.')
            return key
        },
    }
}

function loadLocalKeyProvider(): DataEncryptionKeyProvider {
    const configuredPath = process.env.DATA_ENCRYPTION_LOCAL_KEYRING
    const keyringPath = resolve(configuredPath || resolve(MODULE_DIR, '../../../../.local-keys/data-encryption.json'))
    try {
        const metadata = lstatSync(keyringPath)
        if (!metadata.isFile() || metadata.isSymbolicLink()) throw new Error('Local data encryption keyring must be a regular file.')
        if ((metadata.mode & 0o077) !== 0) chmodSync(keyringPath, 0o600)
        return parseKeyring(readFileSync(keyringPath, 'utf8'))
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        const runtime = process.env.NODE_ENV ?? 'development'
        if (runtime === 'production') {
            throw new Error('Production field encryption requires an external KMS key provider.')
        }
        const keyring: LocalKeyring = {
            version: 1,
            activeKeyId: `local-${randomBytes(6).toString('hex')}`,
            keys: {},
        }
        keyring.keys[keyring.activeKeyId] = {
            kek: encode(randomBytes(KEY_BYTES)),
            indexKey: encode(randomBytes(KEY_BYTES)),
        }
        mkdirSync(dirname(keyringPath), { recursive: true, mode: 0o700 })
        try {
            writeFileSync(keyringPath, `${JSON.stringify(keyring, null, 2)}\n`, { mode: 0o600, flag: 'wx' })
        } catch (writeError) {
            if ((writeError as NodeJS.ErrnoException).code === 'EEXIST') return parseKeyring(readFileSync(keyringPath, 'utf8'))
            throw writeError
        }
        chmodSync(keyringPath, 0o600)
        return parseKeyring(JSON.stringify(keyring))
    }
}

export function setDataEncryptionKeyProviderForTests(provider: DataEncryptionKeyProvider | null) {
    testKeyProvider = provider
}

/** Installs an application-owned key provider before the first encrypted ORM operation. */
export function configureDataEncryptionKeyProvider(provider: DataEncryptionKeyProvider) {
    configuredKeyProvider = provider
    localProvider = null
}

export function getDataEncryptionKeyProvider(): DataEncryptionKeyProvider {
    if (testKeyProvider) return testKeyProvider
    if (configuredKeyProvider) return configuredKeyProvider
    if ((process.env.NODE_ENV ?? 'development') === 'production') {
        throw new Error('Production field encryption requires an external KMS key provider.')
    }
    localProvider ??= loadLocalKeyProvider()
    return localProvider
}

export function assertDataEncryptionProviderReady() {
    getDataEncryptionKeyProvider()
}

export function isEncryptedFieldEnvelope(value: unknown): value is EncryptedFieldEnvelope {
    if (typeof value === 'string') {
        try {
            const parsed: unknown = JSON.parse(value)
            return isEncryptedFieldEnvelope(parsed)
        } catch {
            return false
        }
    }
    return Boolean(
        value
        && typeof value === 'object'
        && '$encrypted' in value
        && value.$encrypted === ENVELOPE_VERSION
        && 'algorithm' in value
        && value.algorithm === ENVELOPE_ALGORITHM,
    )
}

export function encryptFieldValue(table: string, column: string, value: unknown): EncryptedFieldEnvelope {
    const provider = getDataEncryptionKeyProvider()
    const { kek } = provider.getKey(provider.activeKeyId)
    const aad = fieldAad(table, column)
    const dek = randomBytes(KEY_BYTES)
    const nonce = randomBytes(NONCE_BYTES)
    const cipher = createCipheriv('aes-256-gcm', dek, nonce)
    cipher.setAAD(aad)
    const plaintext = Buffer.from(JSON.stringify(value), 'utf8')
    const ciphertext = Buffer.concat([cipher.update(plaintext), cipher.final()])
    const wrapNonce = randomBytes(NONCE_BYTES)
    const wrapCipher = createCipheriv('aes-256-gcm', kek, wrapNonce)
    wrapCipher.setAAD(Buffer.concat([aad, Buffer.from(':dek', 'utf8')]))
    const wrappedDek = Buffer.concat([wrapCipher.update(dek), wrapCipher.final()])
    return {
        $encrypted: ENVELOPE_VERSION,
        algorithm: ENVELOPE_ALGORITHM,
        keyId: provider.activeKeyId,
        nonce: encode(nonce),
        tag: encode(cipher.getAuthTag()),
        ciphertext: encode(ciphertext),
        wrappedDek: {
            nonce: encode(wrapNonce),
            tag: encode(wrapCipher.getAuthTag()),
            ciphertext: encode(wrappedDek),
        },
    }
}

export function encryptRedactedFieldValue(table: string, column: string, value: unknown): EncryptedFieldEnvelope {
    return { ...encryptFieldValue(table, column, value), redacted: true }
}

export function decryptFieldValue<T = unknown>(table: string, column: string, value: unknown): T {
    let envelope: unknown = value
    if (typeof envelope === 'string') {
        try { envelope = JSON.parse(envelope) } catch { throw new Error('Encrypted field is not migrated or is invalid.') }
    }
    if (!isEncryptedFieldEnvelope(envelope)) throw new Error('Encrypted field is not migrated or is invalid.')
    const candidate = envelope as EncryptedFieldEnvelope
    const provider = getDataEncryptionKeyProvider()
    const { kek } = provider.getKey(candidate.keyId)
    const aad = fieldAad(table, column)
    try {
        const unwrap = createDecipheriv('aes-256-gcm', kek, decode(candidate.wrappedDek.nonce, NONCE_BYTES))
        unwrap.setAAD(Buffer.concat([aad, Buffer.from(':dek', 'utf8')]))
        unwrap.setAuthTag(decode(candidate.wrappedDek.tag, 16))
        const dek = Buffer.concat([unwrap.update(decode(candidate.wrappedDek.ciphertext)), unwrap.final()])
        if (dek.length !== KEY_BYTES) throw new Error('invalid key')
        const decipher = createDecipheriv('aes-256-gcm', dek, decode(candidate.nonce, NONCE_BYTES))
        decipher.setAAD(aad)
        decipher.setAuthTag(decode(candidate.tag, 16))
        const plaintext = Buffer.concat([decipher.update(decode(candidate.ciphertext)), decipher.final()]).toString('utf8')
        return JSON.parse(plaintext) as T
    } catch {
        throw new Error('Encrypted field authentication failed.')
    }
}

export function createBlindIndex(value: string, domain: string): string {
    const normalized = domain === 'email'
        ? value.normalize('NFKC').trim().toLowerCase()
        : value.normalize('NFKC')
    if (normalized.length < 1 || normalized.length > 320) throw new Error('Blind-index value is invalid.')
    const provider = getDataEncryptionKeyProvider()
    const { indexKey } = provider.getKey(provider.activeKeyId)
    const digest = createHmac('sha256', indexKey).update(`autocarehub:${domain}:v1:${normalized}`, 'utf8').digest('base64url')
    return `${INDEX_VERSION}_${digest}`
}

export function createEmailBlindIndex(email: string) {
    if (email.trim().length < 3 || email.trim().length > 320) throw new Error('Email address is invalid.')
    return createBlindIndex(email, 'email')
}

export function isEmailBlindIndex(value: string) {
    return /^h1_[A-Za-z0-9_-]{43}$/.test(value)
}

export function verifyEmailBlindIndex(email: string, candidateIndex: string) {
    const expected = createEmailBlindIndex(email)
    const left = Buffer.from(expected, 'utf8')
    const right = Buffer.from(candidateIndex, 'utf8')
    return left.length === right.length && timingSafeEqual(left, right)
}

export function storageEnvelope(envelope: EncryptedFieldEnvelope, type: 'text' | 'jsonb') {
    return type === 'text' ? JSON.stringify(envelope) : envelope
}

export function createEncryptedFieldTransformer(table: string, column: string, type: 'text' | 'jsonb') {
    return {
        to(value: unknown) {
            if (value === null || value === undefined) return value
            return storageEnvelope(encryptFieldValue(table, column, value), type)
        },
        from(value: unknown) {
            if (value === null || value === undefined) return value
            return decryptFieldValue(table, column, value)
        },
    }
}

export const emailBlindIndexTransformer = {
    to(value: string | null | undefined) {
        if (value === null || value === undefined) return value
        if (isEmailBlindIndex(value)) return value
        return createEmailBlindIndex(value)
    },
    from(value: string | null | undefined) {
        return value
    },
}

export function createBlindIndexTransformer(domain: string) {
    return {
        to(value: string | null | undefined) {
            if (value === null || value === undefined) return value
            if (isEmailBlindIndex(value)) return value
            return createBlindIndex(value, domain)
        },
        from(value: string | null | undefined) {
            return value
        },
    }
}

function mapOutboxPii(value: unknown, direction: 'to' | 'from', path = 'payload'): unknown {
    if (Array.isArray(value)) return value.map((item, index) => mapOutboxPii(item, direction, `${path}[${index}]`))
    if (!value || typeof value !== 'object') return value
    const result: Record<string, unknown> = { ...(value as Record<string, unknown>) }
    for (const [key, raw] of Object.entries(result)) {
        if (key.endsWith('Ciphertext')) continue
        const nestedPath = `${path}.${key}`
        const ciphertextKey = `${key}Ciphertext`
        if (direction === 'to' && (key === 'email' || key === 'toEmail') && typeof raw === 'string') {
            result[ciphertextKey] = encryptFieldValue('outbox_events', nestedPath, raw)
            result[key] = createEmailBlindIndex(raw)
        } else if (direction === 'to' && key === 'recipientName' && typeof raw === 'string') {
            result[ciphertextKey] = encryptFieldValue('outbox_events', nestedPath, raw)
            result[key] = null
        } else if (direction === 'from' && result[ciphertextKey] !== undefined) {
            result[key] = decryptFieldValue('outbox_events', nestedPath, result[ciphertextKey])
            delete result[ciphertextKey]
        } else {
            result[key] = mapOutboxPii(raw, direction, nestedPath)
        }
    }
    return result
}

export const outboxPayloadEncryptionTransformer = {
    to(value: unknown) {
        if (value === null || value === undefined) return value
        return mapOutboxPii(value, 'to')
    },
    from(value: unknown) {
        if (value === null || value === undefined) return value
        return mapOutboxPii(value, 'from')
    },
}

export function invalidateLocalKeyProviderCacheForTests() {
    localProvider = null
}
