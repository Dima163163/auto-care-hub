import type { User } from '@/entities/user'
import { routePaths } from '@/shared/constants/routes'

export function getPreferenceShortcutPath(
    user?: Pick<User, 'role' | 'preferredCity' | 'preferredCategories'> | null,
) {
    if (!user || user.role !== 'client') return null

    const city = user.preferredCity?.trim() || undefined
    const service = user.preferredCategories[0]?.trim() || undefined
    if (!city && !service) return null

    return routePaths.cabinets({ city, service })
}
