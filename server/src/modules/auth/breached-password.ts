import { createHash } from 'node:crypto'

export const MAX_BREACHED_PASSWORD_RESPONSE_BYTES = 64 * 1024
export const BREACHED_PASSWORD_HASH_PREFIX_LENGTH = 5
export const BREACHED_PASSWORD_LOOKUP_ORIGIN = 'https://api.pwnedpasswords.com'
export const BREACHED_PASSWORD_CHECK_TIMEOUT_MS = 3_000

export type BreachedPasswordEntry = {
    suffix: string
    count: number
}

export function parseBreachedPasswordResponse(body: string): BreachedPasswordEntry[] {
    return body
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter(Boolean)
        .flatMap((line) => {
            const [suffix, count] = line.split(':')
            if (!suffix || !/^\d+$/.test(count ?? '')) return []

            const normalizedSuffix = suffix.trim().toUpperCase()
            const normalizedCount = Number(count)
            if (!/^[A-F0-9]{35}$/.test(normalizedSuffix) || !Number.isSafeInteger(normalizedCount)) {
                return []
            }

            return [{ suffix: normalizedSuffix, count: normalizedCount }]
        })
}

export function getBreachedPasswordHashParts(password: string) {
    const hash = createHash('sha1').update(password).digest('hex').toUpperCase()
    return {
        prefix: hash.slice(0, BREACHED_PASSWORD_HASH_PREFIX_LENGTH),
        suffix: hash.slice(BREACHED_PASSWORD_HASH_PREFIX_LENGTH),
    }
}

export function buildBreachedPasswordLookupRequest(password: string) {
    const { prefix, suffix } = getBreachedPasswordHashParts(password)

    return {
        url: `${BREACHED_PASSWORD_LOOKUP_ORIGIN}/range/${prefix}`,
        suffix,
    }
}

export function isBreachedPasswordResponseWithinBounds(body: string) {
    return Buffer.byteLength(body, 'utf8') <= MAX_BREACHED_PASSWORD_RESPONSE_BYTES
}

export function parseBoundedBreachedPasswordResponse(body: string) {
    if (!isBreachedPasswordResponseWithinBounds(body)) return []
    return parseBreachedPasswordResponse(body)
}

export type BreachedPasswordCheckResult =
    | { status: 'not_breached' }
    | { status: 'breached'; count: number }
    | { status: 'unavailable'; reason: 'timeout' | 'http' | 'invalid_response' | 'response_too_large' }

type BreachedPasswordCheckOptions = {
    mode: 'off' | 'shadow' | 'enforce'
    timeoutMs?: number
    fetchImpl?: typeof fetch
}

async function readBoundedResponseBody(response: Response) {
    if (!response.body) {
        const body = await response.text()
        return isBreachedPasswordResponseWithinBounds(body) ? body : null
    }

    const reader = response.body.getReader()
    const chunks: Uint8Array[] = []
    let totalBytes = 0

    try {
        while (true) {
            const result = await reader.read()
            if (result.done) break

            totalBytes += result.value.byteLength
            if (totalBytes > MAX_BREACHED_PASSWORD_RESPONSE_BYTES) {
                await reader.cancel()
                return null
            }

            chunks.push(result.value)
        }
    } finally {
        reader.releaseLock()
    }

    return Buffer.concat(chunks).toString('utf8')
}

export async function checkBreachedPassword(
    password: string,
    options: BreachedPasswordCheckOptions,
): Promise<BreachedPasswordCheckResult> {
    if (options.mode === 'off') return { status: 'not_breached' }

    const request = buildBreachedPasswordLookupRequest(password)
    const controller = new AbortController()
    const timeout = setTimeout(
        () => controller.abort(),
        options.timeoutMs ?? BREACHED_PASSWORD_CHECK_TIMEOUT_MS,
    )

    try {
        const response = await (options.fetchImpl ?? fetch)(request.url, {
            headers: {
                Accept: 'text/plain',
            },
            signal: controller.signal,
        })

        if (!response.ok) {
            return { status: 'unavailable', reason: 'http' }
        }

        const body = await readBoundedResponseBody(response)
        if (body === null) {
            return { status: 'unavailable', reason: 'response_too_large' }
        }

        const entries = parseBoundedBreachedPasswordResponse(body)
        const match = entries.find((entry) => entry.suffix === request.suffix)

        return match
            ? { status: 'breached', count: match.count }
            : { status: 'not_breached' }
    } catch (error) {
        return {
            status: 'unavailable',
            reason: error instanceof Error && error.name === 'AbortError'
                ? 'timeout'
                : 'invalid_response',
        }
    } finally {
        clearTimeout(timeout)
    }
}
