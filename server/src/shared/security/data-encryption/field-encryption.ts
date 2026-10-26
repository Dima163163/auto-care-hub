import { createCipheriv, createDecipheriv, createHmac, randomBytes, timingSafeEqual } from 'node:crypto'
import { chmodSync, lstatSync, mkdirSync, readFileSync, writeFileSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'
import { requireOutboxRecordBinding } from './record-binding-policy.js'

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
    /** Expansion-phase record MAC. Legacy envelopes remain readable until backfill. */
    recordBinding?: string
}

export type EncryptedRecordScope = { rowId: string; ownerId?: string; context?: string }

export type DataEncryptionKeyProvider = {
    activeKeyId: string
    getKey(keyId: string): { kek: Buffer }
    /** A stable lookup key, independent of active and historical encryption KEKs. */
    getIndexKey(): Buffer
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

export function parseDataEncryptionKeyring(text: string): DataEncryptionKeyProvider {
    const parsed = JSON.parse(text) as LocalKeyring
    if (parsed.version !== 1 || typeof parsed.activeKeyId !== 'string' || !parsed.keys?.[parsed.activeKeyId]) {
        throw new Error('Local data encryption keyring is invalid.')
    }
    const keys = new Map<string, { kek: Buffer }>()
    let stableIndexKey: Buffer | undefined
    for (const [keyId, value] of Object.entries(parsed.keys)) {
        const kek = decode(value.kek, KEY_BYTES)
        const indexKey = decode(value.indexKey, KEY_BYTES)
        if (stableIndexKey && !timingSafeEqual(stableIndexKey, indexKey)) {
            throw new Error('Blind-index key rotation requires an explicit index migration.')
        }
        stableIndexKey ??= indexKey
        keys.set(keyId, { kek })
    }
    if (!stableIndexKey) throw new Error('Local data encryption keyring is invalid.')
    const indexKey = stableIndexKey
    return {
        activeKeyId: parsed.activeKeyId,
        getIndexKey: () => Buffer.from(indexKey),
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
        return parseDataEncryptionKeyring(readFileSync(keyringPath, 'utf8'))
    } catch (error) {
        if ((error as NodeJS.ErrnoException).code !== 'ENOENT') throw error
        const runtime = process.env.NODE_ENV ?? 'development'
        if (runtime === 'production') {
            throw new Error('Production field encryption requires an external KMS key provider.', { cause: error })
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
            if ((writeError as NodeJS.ErrnoException).code === 'EEXIST') return parseDataEncryptionKeyring(readFileSync(keyringPath, 'utf8'))
            throw writeError
        }
        chmodSync(keyringPath, 0o600)
        return parseDataEncryptionKeyring(JSON.stringify(keyring))
    }
}

function withStableIndexKey(provider: DataEncryptionKeyProvider): DataEncryptionKeyProvider {
    const key = provider.getIndexKey()
    if (!Buffer.isBuffer(key) || key.length !== KEY_BYTES) {
        throw new Error('Blind-index key must contain 32 bytes.')
    }
    const indexKey = Buffer.from(key)
    return {
        get activeKeyId() { return provider.activeKeyId },
        getKey: (keyId) => provider.getKey(keyId),
        getIndexKey: () => Buffer.from(indexKey),
    }
}

export function setDataEncryptionKeyProviderForTests(provider: DataEncryptionKeyProvider | null) {
    testKeyProvider = provider ? withStableIndexKey(provider) : null
}

/** Installs an application-owned key provider before the first encrypted ORM operation. */
export function configureDataEncryptionKeyProvider(provider: DataEncryptionKeyProvider) {
    const candidate = withStableIndexKey(provider)
    const installed = configuredKeyProvider ?? localProvider
    if (installed && !timingSafeEqual(installed.getIndexKey(), candidate.getIndexKey())) {
        throw new Error('Blind-index key rotation requires an explicit index migration.')
    }
    configuredKeyProvider = candidate
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
    const keyId = provider.activeKeyId
    const { kek } = provider.getKey(keyId)
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
        keyId,
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

function recordBindingDigest(table: string, column: string, envelope: EncryptedFieldEnvelope, scope: EncryptedRecordScope) {
    const uuid = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i
    if (!uuid.test(scope.rowId) || (scope.ownerId !== undefined && !uuid.test(scope.ownerId))
        || (scope.context !== undefined && !/^[a-z][a-z0-9_-]{0,63}$/.test(scope.context))) {
        throw new Error('Encrypted record scope is invalid.')
    }
    const parts = [
        'autocarehub:record-binding:v1', table, column, scope.rowId.toLowerCase(), scope.ownerId?.toLowerCase() ?? null,
        envelope.$encrypted, envelope.algorithm, envelope.keyId, envelope.redacted === true,
        envelope.nonce, envelope.tag, envelope.ciphertext,
        envelope.wrappedDek.nonce, envelope.wrappedDek.tag, envelope.wrappedDek.ciphertext,
    ] as Array<string | number | boolean | null>
    // Preserve the original MAC format for existing email and outbox envelopes.
    if (scope.context !== undefined) parts.push('context', scope.context)
    const message = JSON.stringify(parts)
    return createHmac('sha256', getDataEncryptionKeyProvider().getIndexKey()).update(message, 'utf8').digest()
}

/** Adds a domain-separated record/owner MAC without changing the legacy AES-GCM envelope. */
export function encryptRecordBoundFieldValue(table: string, column: string, value: unknown, scope: EncryptedRecordScope): EncryptedFieldEnvelope {
    const envelope = encryptFieldValue(table, column, value)
    return { ...envelope, recordBinding: `r1_${encode(recordBindingDigest(table, column, envelope, scope))}` }
}

/** Authenticates a legacy envelope before adding record scope without changing its DEK. */
export function bindExistingEncryptedFieldValue(table: string, column: string, value: unknown, scope: EncryptedRecordScope): EncryptedFieldEnvelope {
    let envelope: unknown = value
    if (typeof envelope === 'string') {
        try { envelope = JSON.parse(envelope) } catch { throw new Error('Encrypted field is not migrated or is invalid.') }
    }
    if (!isEncryptedFieldEnvelope(envelope)) throw new Error('Encrypted field is not migrated or is invalid.')
    const candidate = envelope as EncryptedFieldEnvelope
    if (Object.hasOwn(candidate, 'recordBinding')) {
        decryptRecordBoundFieldValue(table, column, candidate, scope)
        return candidate
    }
    decryptFieldValue(table, column, candidate)
    return { ...candidate, recordBinding: `r1_${encode(recordBindingDigest(table, column, candidate, scope))}` }
}

export function decryptRecordBoundFieldValue<T = unknown>(
    table: string,
    column: string,
    value: unknown,
    scope: EncryptedRecordScope,
    options: { allowLegacy?: boolean } = {},
): T {
    let envelope: unknown = value
    if (typeof envelope === 'string') {
        try { envelope = JSON.parse(envelope) } catch { throw new Error('Encrypted field is not migrated or is invalid.') }
    }
    if (!isEncryptedFieldEnvelope(envelope)) throw new Error('Encrypted field is not migrated or is invalid.')
    const candidate = envelope as EncryptedFieldEnvelope
    if (!Object.hasOwn(candidate, 'recordBinding')) {
        if (!options.allowLegacy) throw new Error('Encrypted record binding is missing.')
        return decryptFieldValue<T>(table, column, candidate)
    }
    const binding = candidate.recordBinding
    if (typeof binding !== 'string' || !/^r1_[A-Za-z0-9_-]{43}$/.test(binding)) {
        throw new Error('Encrypted record binding is invalid.')
    }
    const expected = Buffer.from(`r1_${encode(recordBindingDigest(table, column, candidate, scope))}`, 'utf8')
    const actual = Buffer.from(binding, 'utf8')
    if (expected.length !== actual.length || !timingSafeEqual(expected, actual)) {
        throw new Error('Encrypted record binding authentication failed.')
    }
    return decryptFieldValue<T>(table, column, candidate)
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
    const maxLength = domain === 'evidence-reference' ? 500 : 320
    if (normalized.length < 1 || normalized.length > maxLength) throw new Error('Blind-index value is invalid.')
    const provider = getDataEncryptionKeyProvider()
    const indexKey = provider.getIndexKey()
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

const OUTBOX_RECORD_ID_KEY = '$recordId'
const outboxLoadedPayload = Symbol('outboxLoadedPayload')
const UUID_PATTERN = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i

export function setOutboxPayloadRecordId(payload: Record<string, unknown>, rowId: string) {
    if (!UUID_PATTERN.test(rowId)) throw new Error('Encrypted outbox record ID is invalid.')
    // TypeORM deep-merges JSONB before applying column transformers.
    // An enumerable marker survives that merge; a hidden property does not.
    payload[OUTBOX_RECORD_ID_KEY] = rowId.toLowerCase()
    return payload
}

export function getOutboxPayloadRecordId(payload: Record<string, unknown>) {
    return payload[OUTBOX_RECORD_ID_KEY] as string | undefined
}

export function isOutboxPayloadFromStorage(payload: Record<string, unknown>) {
    return Boolean((payload as Record<symbol, unknown>)[outboxLoadedPayload])
}

function mapOutboxPii(value: unknown, direction: 'to' | 'from', rowId?: string, path = 'payload', allowLegacy = true): unknown {
    if (Array.isArray(value)) return value.map((item, index) => mapOutboxPii(item, direction, rowId, `${path}[${index}]`, allowLegacy))
    if (!value || typeof value !== 'object') return value
    const result: Record<string, unknown> = { ...(value as Record<string, unknown>) }
    for (const [key, raw] of Object.entries(result)) {
        if (key.endsWith('Ciphertext')) {
            if (!(key in result)) continue
            if (direction === 'from' && key === 'recipientNameCiphertext' && !('recipientName' in result)) {
                throw new Error('Encrypted outbox field pair is invalid.')
            }
            if (direction === 'from' && (key === 'emailCiphertext' || key === 'toEmailCiphertext')) {
                const index = result[key === 'emailCiphertext' ? 'email' : 'toEmail']
                if (typeof index !== 'string' || !isEmailBlindIndex(index)) {
                    throw new Error('Encrypted outbox email index is invalid.')
                }
            }
            continue
        }
        const nestedPath = `${path}.${key}`
        const ciphertextKey = `${key}Ciphertext`
        if (direction === 'to' && (key === 'email' || key === 'toEmail') && typeof raw === 'string') {
            result[ciphertextKey] = rowId
                ? encryptRecordBoundFieldValue('outbox_events', nestedPath, raw, { rowId })
                : encryptFieldValue('outbox_events', nestedPath, raw)
            result[key] = createEmailBlindIndex(raw)
        } else if (direction === 'to' && key === 'recipientName' && typeof raw === 'string') {
            result[ciphertextKey] = rowId
                ? encryptRecordBoundFieldValue('outbox_events', nestedPath, raw, { rowId })
                : encryptFieldValue('outbox_events', nestedPath, raw)
            result[key] = null
        } else if (direction === 'from' && result[ciphertextKey] !== undefined) {
            const plaintext = rowId
                ? decryptRecordBoundFieldValue('outbox_events', nestedPath, result[ciphertextKey], { rowId }, { allowLegacy })
                : decryptFieldValue('outbox_events', nestedPath, result[ciphertextKey])
            if (!rowId && (result[ciphertextKey] as EncryptedFieldEnvelope)?.recordBinding !== undefined) {
                throw new Error('Encrypted outbox record ID is missing.')
            }
            if (key === 'email' || key === 'toEmail') {
                if (typeof raw !== 'string' || !isEmailBlindIndex(raw)) {
                    throw new Error('Encrypted outbox email index is invalid.')
                }
                if (typeof plaintext !== 'string' || !verifyEmailBlindIndex(plaintext, raw)) {
                    throw new Error('Encrypted outbox email index authentication failed.')
                }
            }
            result[key] = plaintext
            delete result[ciphertextKey]
        } else if (direction === 'from' && !allowLegacy
            && (key === 'email' || key === 'toEmail' || key === 'recipientName') && typeof raw === 'string'
            && result[ciphertextKey] === undefined) {
            throw new Error('Encrypted outbox recipient binding is missing.')
        } else if (direction === 'from' && (key === 'email' || key === 'toEmail')
            && typeof raw === 'string' && isEmailBlindIndex(raw)) {
            throw new Error('Encrypted outbox email ciphertext is missing.')
        } else {
            result[key] = mapOutboxPii(raw, direction, rowId, nestedPath, allowLegacy)
        }
    }
    return result
}

export function hasOutboxRecipientFields(value: unknown): boolean {
    if (Array.isArray(value)) return value.some(hasOutboxRecipientFields)
    if (!value || typeof value !== 'object') return false
    return Object.entries(value as Record<string, unknown>).some(([key, item]) =>
        ['emailCiphertext', 'toEmailCiphertext', 'recipientNameCiphertext'].includes(key)
            || (['email', 'toEmail', 'recipientName'].includes(key) && typeof item === 'string')
            || hasOutboxRecipientFields(item))
}

function openOutboxPayload(value: unknown, allowLegacy: boolean) {
    const stored = value as Record<string, unknown>
    const rowId = stored[OUTBOX_RECORD_ID_KEY]
    if (rowId !== undefined && (typeof rowId !== 'string' || !UUID_PATTERN.test(rowId))) {
        throw new Error('Encrypted outbox record ID is invalid.')
    }
    if (!allowLegacy && rowId === undefined && hasOutboxRecipientFields(stored)) {
        throw new Error('Encrypted outbox record binding is missing.')
    }
    const plaintext = { ...stored }
    delete plaintext[OUTBOX_RECORD_ID_KEY]
    const opened = mapOutboxPii(plaintext, 'from', rowId as string | undefined, 'payload', allowLegacy) as Record<string, unknown>
    if (rowId) {
        setOutboxPayloadRecordId(opened, rowId as string)
        Object.defineProperty(opened, outboxLoadedPayload, { value: true })
    }
    return opened
}

export function openOutboxPayloadForBindingBackfill(value: Record<string, unknown>, rowId: string) {
    if (!UUID_PATTERN.test(rowId)) throw new Error('Encrypted outbox record ID is invalid.')
    const storedId = value[OUTBOX_RECORD_ID_KEY]
    if (storedId !== undefined && storedId !== rowId) {
        throw new Error('Encrypted outbox record binding authentication failed.')
    }
    return openOutboxPayload({ ...value, [OUTBOX_RECORD_ID_KEY]: rowId }, true)
}

export function verifyOutboxPayloadRecordBinding(value: Record<string, unknown>, rowId: string) {
    if (value[OUTBOX_RECORD_ID_KEY] !== undefined && value[OUTBOX_RECORD_ID_KEY] !== rowId) {
        throw new Error('Encrypted outbox record binding authentication failed.')
    }
    if (!hasOutboxRecipientFields(value)) return
    if (value[OUTBOX_RECORD_ID_KEY] !== rowId) {
        throw new Error('Encrypted outbox record binding authentication failed.')
    }
    openOutboxPayload(value, false)
}

export const outboxPayloadEncryptionTransformer = {
    to(value: unknown) {
        if (value === null || value === undefined) return value
        const payload = value as Record<string, unknown>
        const rowId = getOutboxPayloadRecordId(payload)
        if (rowId === undefined) return mapOutboxPii(value, 'to')
        const stored = mapOutboxPii(value, 'to', rowId) as Record<string, unknown>
        stored[OUTBOX_RECORD_ID_KEY] = rowId
        return stored
    },
    from(value: unknown) {
        if (value === null || value === undefined) return value
        return openOutboxPayload(value, !requireOutboxRecordBinding())
    },
}

export function invalidateLocalKeyProviderCacheForTests() {
    localProvider = null
}
