const ownedUploadedPhotoPattern =
    /^\/uploads\/cabinets\/[a-f0-9-]+\.(jpg|png|webp)$/

export function isAllowedCabinetPhotoUrl(value: string, allowedHosts: readonly string[]) {
    if (ownedUploadedPhotoPattern.test(value)) return true

    try {
        const url = new URL(value)

        return url.protocol === 'https:'
            && !url.username
            && !url.password
            && !url.hash
            && allowedHosts.includes(url.hostname.toLowerCase())
    } catch {
        return false
    }
}
