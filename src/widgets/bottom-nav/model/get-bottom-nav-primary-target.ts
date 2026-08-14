import type { UserRole } from '@/entities/user'
import { ROUTES } from '@/shared/constants/routes'
import type { TranslationKey } from '@/shared/lib/i18n'

export type BottomNavPrimaryTarget = {
    labelKey: TranslationKey
    to: string
}

export function getBottomNavPrimaryTarget(
    role: UserRole | null | undefined,
): BottomNavPrimaryTarget {
    if (role === 'owner') {
        return {
            labelKey: 'common.create',
            to: ROUTES.ownerCabinetCreate,
        }
    }

    if (role === 'client') {
        return {
            labelKey: 'navigation.myBookings',
            to: ROUTES.profileBookings,
        }
    }

    if (role === 'super_admin') {
        return {
            labelKey: 'user.superAdmin',
            to: ROUTES.superAdminDashboard,
        }
    }

    if (role === 'admin') {
        return {
            labelKey: 'navigation.adminDashboard',
            to: ROUTES.adminDashboard,
        }
    }

    return {
        labelKey: 'auth.signIn',
        to: ROUTES.login,
    }
}
