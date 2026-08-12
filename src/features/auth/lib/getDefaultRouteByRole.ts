import type { UserRole } from '@/entities/user'
import { ROUTES } from '@/shared/constants/routes'

export function getDefaultRouteByRole(role: UserRole) {
    if (role === 'admin' || role === 'super_admin') {
        return ROUTES.adminDashboard
    }

    if (role === 'owner') {
        return ROUTES.ownerDashboard
    }

    return ROUTES.profile
}
