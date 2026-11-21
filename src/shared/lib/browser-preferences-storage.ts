export function readBrowserPreference(key: string): string | null {
    try {
        return typeof window === 'undefined' ? null : window.localStorage.getItem(key)
    } catch {
        return null
    }
}

export function saveBrowserPreference(key: string, value: string): void {
    try {
        if (typeof window !== 'undefined') window.localStorage.setItem(key, value)
    } catch {
        // The preference still applies to this page when storage is unavailable.
    }
}
