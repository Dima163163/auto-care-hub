export const MOCK_SESSION_STORAGE_KEY = 'autocare-hub:mock-session'

export function clearMockSessionStorage() {
    if (typeof window === 'undefined' || typeof window.localStorage === 'undefined') {
        return
    }

    window.localStorage.removeItem(MOCK_SESSION_STORAGE_KEY)
}
