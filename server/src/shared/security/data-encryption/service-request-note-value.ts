export function serializeServiceRequestNote(value: unknown): string {
    if (typeof value !== 'string') throw new Error('Encrypted autocare_service_requests.note is invalid.')
    return value
}
