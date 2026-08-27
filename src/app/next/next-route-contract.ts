import { ROUTES } from '@/shared/constants/routes'

/**
 * Routes that the Next.js App Router shell is allowed to serve directly.
 *
 * The feature tree still renders through React Router inside the shell. Keeping
 * the server-side allow-list here prevents the catch-all App Router page from
 * returning a 200 response for a typo, while preserving the existing dynamic
 * provider and cabinet URLs.
 */
const exactRoutes = [
    ROUTES.home,
    ROUTES.platformReviews,
    ROUTES.features,
    ROUTES.owners,
    ROUTES.about,
    ROUTES.favorites,
    ROUTES.notifications,
    ROUTES.chats,
    ROUTES.blog,
    ROUTES.partners,
    ROUTES.contacts,
    ROUTES.help,
    ROUTES.agreement,
    ROUTES.rules,
    ROUTES.privacy,
    ROUTES.cabinets,
    ROUTES.serviceDiscovery,
    ROUTES.login,
    ROUTES.loginCallback,
    ROUTES.register,
    ROUTES.forgotPassword,
    ROUTES.passwordSetup,
    ROUTES.passwordReset,
    ROUTES.verifyEmail,
    ROUTES.onboarding,
    ROUTES.profile,
    ROUTES.profileVehicles,
    ROUTES.profileBookings,
    ROUTES.profileReviews,
    ROUTES.ownerDashboard,
    ROUTES.ownerAutoCareProviders,
    ROUTES.ownerCabinets,
    ROUTES.ownerCabinetCreate,
    ROUTES.ownerBookings,
    ROUTES.ownerAutoCareRequests,
    ROUTES.ownerReviews,
    ROUTES.ownerClients,
    ROUTES.ownerServices,
    ROUTES.ownerChats,
    ROUTES.adminDashboard,
    ROUTES.adminUsers,
    ROUTES.adminOwners,
    ROUTES.adminCabinets,
    ROUTES.adminReviews,
    ROUTES.adminPlatformReviews,
    ROUTES.adminAuditLogs,
    ROUTES.adminSecurityCenter,
    ROUTES.adminChats,
    ROUTES.superAdminDashboard,
    ROUTES.superAdminChats,
] as const

const dynamicRoutes = [
    /^\/services\/[^/]+$/,
    /^\/services\/[^/]+\/request$/,
    /^\/cabinets\/[^/]+$/,
    /^\/owner\/autocare-providers\/[^/]+$/,
    /^\/owner\/autocare-providers\/[^/]+\/reviews$/,
    /^\/owner\/cabinets\/[^/]+\/edit$/,
] as const

function normalizePathname(pathname: string) {
    const pathOnly = pathname.trim().split(/[?#]/, 1)[0] ?? ''
    // Strip only the terminal slash. Collapsing interior slashes could turn a
    // malformed dynamic URL such as `/services//request` into a valid route.
    const normalized = pathOnly.replace(/\/+$/, '')

    return normalized || ROUTES.home
}

export function isNextRoutePath(pathname: string) {
    const normalized = normalizePathname(pathname)

    return exactRoutes.includes(normalized as (typeof exactRoutes)[number])
        || dynamicRoutes.some((pattern) => pattern.test(normalized))
}

export function getNextRoutePath(pathname: string) {
    return normalizePathname(pathname)
}

export const nextRouteContract = {
    exactRoutes,
    dynamicRoutes,
} as const
