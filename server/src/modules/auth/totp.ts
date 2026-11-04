import { createHmac, randomBytes, timingSafeEqual } from 'node:crypto'

const ALPHABET = 'ABCDEFGHIJKLMNOPQRSTUVWXYZ234567'
const SECRET_BYTES = 20
const STEP_SECONDS = 30

export function encodeTotpSecret(bytes: Buffer) {
    let bits = 0
    let value = 0
    let encoded = ''
    for (const byte of bytes) {
        value = (value << 8) | byte
        bits += 8
        while (bits >= 5) {
            bits -= 5
            encoded += ALPHABET[(value >>> bits) & 31]
        }
        value &= (1 << bits) - 1
    }
    if (bits > 0) encoded += ALPHABET[(value << (5 - bits)) & 31]
    return encoded
}

function decodeTotpSecret(secret: string) {
    if (!/^[A-Z2-7]{32}$/.test(secret)) throw new Error('TOTP secret is invalid.')
    let bits = 0
    let value = 0
    const output: number[] = []
    for (const character of secret) {
        value = (value << 5) | ALPHABET.indexOf(character)
        bits += 5
        if (bits >= 8) {
            bits -= 8
            output.push((value >>> bits) & 255)
            value &= (1 << bits) - 1
        }
    }
    if (output.length !== SECRET_BYTES || bits !== 0) throw new Error('TOTP secret is invalid.')
    return Buffer.from(output)
}

export function generateTotpSecret() {
    return encodeTotpSecret(randomBytes(SECRET_BYTES))
}

export function generateTotpCode(secret: string, counter: number, digits: 6 | 8 = 6) {
    if (!Number.isSafeInteger(counter) || counter < 0) throw new Error('TOTP counter is invalid.')
    const input = Buffer.alloc(8)
    input.writeBigUInt64BE(BigInt(counter))
    const digest = createHmac('sha1', decodeTotpSecret(secret)).update(input).digest()
    const offset = (digest[digest.length - 1] ?? 0) & 15
    const value = (digest.readUInt32BE(offset) & 0x7fffffff) % (10 ** digits)
    return String(value).padStart(digits, '0')
}

/** Returns the accepted step so callers can persist it under a row lock. */
export function matchTotpCode(secret: string, code: string, lastAcceptedCounter: number, now = Date.now()) {
    if (!/^\d{6}$/.test(code) || !Number.isSafeInteger(now) || now < 0) return null
    const current = Math.floor(now / (STEP_SECONDS * 1_000))
    let accepted: number | null = null
    for (const counter of [current - 1, current, current + 1]) {
        if (counter < 0 || counter <= lastAcceptedCounter) continue
        const expected = Buffer.from(generateTotpCode(secret, counter))
        if (timingSafeEqual(expected, Buffer.from(code))) accepted = counter
    }
    return accepted
}

export function createTotpUri(secret: string, email: string) {
    // The URI is a secret. Only show it during deliberate enrollment.
    const label = encodeURIComponent(`AutoCare Hub:${email}`)
    return `otpauth://totp/${label}?secret=${secret}&issuer=${encodeURIComponent('AutoCare Hub')}&algorithm=SHA1&digits=6&period=${STEP_SECONDS}`
}
