import type { UserEntity } from '../../entities/user/user.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'

export function isAdminRole(role: UserRole) {
    return role === UserRole.Admin || role === UserRole.SuperAdmin
}

export function isSuperAdmin(user: UserEntity) {
    return user.role === UserRole.SuperAdmin
}

export function canManageUserStatus(actorRole: UserRole, targetRole: UserRole) {
    if (actorRole === UserRole.SuperAdmin) {
        return true
    }

    if (actorRole === UserRole.Admin) {
        return targetRole === UserRole.Client || targetRole === UserRole.Owner
    }

    return false
}
