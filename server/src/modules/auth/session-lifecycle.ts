export function isUserSessionExpired(expiresAt: Date, now = new Date()) {
    return expiresAt.getTime() <= now.getTime()
}

export function isUserSessionActive(expiresAt: Date, now = new Date()) {
    return !isUserSessionExpired(expiresAt, now)
}
