export const MAX_EXTERNAL_JSON_RESPONSE_BYTES = 1_048_576

export async function readJsonResponse<T>(
    response: Response,
    maxBytes = MAX_EXTERNAL_JSON_RESPONSE_BYTES,
): Promise<T> {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1 || maxBytes > MAX_EXTERNAL_JSON_RESPONSE_BYTES) {
        throw new Error('External response size limit is invalid.')
    }

    const declaredLength = response.headers.get('content-length')
    if (declaredLength !== null) {
        const length = Number(declaredLength)
        if (!Number.isSafeInteger(length) || length < 0 || length > maxBytes) {
            throw new Error('External response body is too large.')
        }
    }

    const body = await response.arrayBuffer()
    if (body.byteLength > maxBytes) {
        throw new Error('External response body is too large.')
    }

    try {
        return JSON.parse(new TextDecoder().decode(body)) as T
    } catch {
        throw new Error('External response body is not valid JSON.')
    }
}
