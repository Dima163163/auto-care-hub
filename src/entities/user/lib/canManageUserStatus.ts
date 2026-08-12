import type { UserRole } from '../model/types'

export function canManageUserStatus(
    actorRole: UserRole | undefined,
    targetRole: UserRole,
) {
    if (actorRole === 'super_admin') {
        return true
    }

    if (actorRole === 'admin') {
        return targetRole === 'client' || targetRole === 'owner'
    }

    return false
}
