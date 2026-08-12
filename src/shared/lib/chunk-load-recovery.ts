const CHUNK_RECOVERY_STORAGE_KEY = 'autocare-hub-chunk-recovery-at'
const CHUNK_RECOVERY_COOLDOWN_MS = 30_000

type RecoveryStorage = Pick<Storage, 'getItem' | 'setItem' | 'removeItem'>

export function recoverFromPreloadError(input: {
    storage: RecoveryStorage
    reload: () => void
    now?: number
}) {
    const now = input.now ?? Date.now()
    const storedAttempt = input.storage.getItem(CHUNK_RECOVERY_STORAGE_KEY)
    const previousAttempt = storedAttempt === null ? Number.NaN : Number(storedAttempt)

    if (Number.isFinite(previousAttempt) && now - previousAttempt < CHUNK_RECOVERY_COOLDOWN_MS) {
        return false
    }

    input.storage.setItem(CHUNK_RECOVERY_STORAGE_KEY, String(now))
    input.reload()
    return true
}

export function installChunkLoadRecovery() {
    const handlePreloadError = (event: Event) => {
        event.preventDefault()
        recoverFromPreloadError({
            storage: window.sessionStorage,
            reload: () => window.location.reload(),
        })
    }

    window.addEventListener('vite:preloadError', handlePreloadError)

    return () => window.removeEventListener('vite:preloadError', handlePreloadError)
}
