export function getAccountScopedStorageKey(
    namespace: string,
    accountId: string | null | undefined,
    ...segments: string[]
) {
    if (!accountId) {
        return null
    }

    return [namespace, accountId, ...segments].join(':')
}
