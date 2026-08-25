import { ROUTES } from '@/shared/constants/routes'

const PUBLIC_WORKSPACE_PATHS = new Set<string>([
    ROUTES.profile,
    ROUTES.profileVehicles,
    ROUTES.profileBookings,
    ROUTES.profileReviews,
    ROUTES.notifications,
])

export function isPublicWorkspaceRoute(pathname: string) {
    return PUBLIC_WORKSPACE_PATHS.has(pathname)
}
