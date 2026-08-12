export type PasswordStrength = 'weak' | 'fair' | 'strong'

export function evaluatePasswordStrength(password: string): PasswordStrength {
    const score = [
        password.length >= 12,
        /[a-z]/.test(password),
        /[A-Z]/.test(password),
        /[0-9]/.test(password),
        /[^A-Za-z0-9]/.test(password),
    ].filter(Boolean).length

    if (score <= 2) return 'weak'
    if (score <= 4) return 'fair'
    return 'strong'
}
