export type PublicAuthError = {
    code: 'unauthorized' | 'forbidden' | 'bad_request'
    message: string
}

export function getPublicAuthError(statusCode: number): PublicAuthError {
    if (statusCode === 401) {
        return { code: 'unauthorized', message: 'Authentication is required.' }
    }
    if (statusCode === 403) {
        return { code: 'forbidden', message: 'You cannot access this resource.' }
    }
    return { code: 'bad_request', message: 'The authentication request is invalid.' }
}
