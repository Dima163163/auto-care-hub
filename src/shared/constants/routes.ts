import type { EntityId } from '@/shared/types/common'

export const ROUTES = {
    home: '/',
    platformReviews: '/reviews',
    features: '/features',
    owners: '/for-owners',
    about: '/about',
    favorites: '/favorites',
    notifications: '/notifications',
    chats: '/chats',
    blog: '/blog',
    partners: '/partners',
    contacts: '/contacts',
    help: '/help',
    agreement: '/agreement',
    rules: '/rules',
    privacy: '/privacy',

    cabinets: '/cabinets',
    cabinetDetails: '/cabinets/:id',
    serviceDiscovery: '/services',
    serviceProviderDetails: '/services/:id',
    serviceRequest: '/services/:id/request',

    login: '/login',
    loginCallback: '/login/callback',
    register: '/register',
    forgotPassword: '/forgot-password',
    passwordSetup: '/password/setup',
    passwordReset: '/password/reset',
    verifyEmail: '/verify-email',
    onboarding: '/onboarding',

    profile: '/profile',
    profileVehicles: '/profile/vehicles',
    profileBookings: '/profile/bookings',
    profileReviews: '/profile/reviews',

    pricing: '/pricing',

    ownerDashboard: '/owner/dashboard',
    ownerAutoCareProviders: '/owner/autocare-providers',
    ownerAutoCareProviderDetails: '/owner/autocare-providers/:id',
    ownerAutoCareProviderReviews: '/owner/autocare-providers/:id/reviews',
    ownerCabinets: '/owner/cabinets',
    ownerCabinetCreate: '/owner/cabinets/create',
    ownerCabinetEdit: '/owner/cabinets/:id/edit',
    ownerBookings: '/owner/bookings',
    ownerAutoCareRequests: '/owner/autocare-requests',
    ownerClients: '/owner/clients',
    ownerServices: '/owner/services',
    ownerChats: '/owner/chats',

    adminDashboard: '/admin/dashboard',
    adminUsers: '/admin/users',
    adminOwners: '/admin/owners',
    adminCabinets: '/admin/cabinets',
    adminReviews: '/admin/reviews',
    adminPlatformReviews: '/admin/platform-reviews',
    adminAuditLogs: '/admin/audit-logs',
    adminSecurityCenter: '/admin/security-center',
    adminChats: '/admin/chats',

    superAdminDashboard: '/super-admin/dashboard',
    superAdminChats: '/super-admin/chats',
} as const

export const routePaths = {
    serviceDiscovery: (params?: {
        service?: string
        market?: string
        radius?: string | number
    }) => {
        const searchParams = new URLSearchParams()

        if (params?.service?.trim()) searchParams.set('service', params.service.trim())
        if (params?.market?.trim()) searchParams.set('market', params.market.trim())
        if (params?.radius !== undefined && String(params.radius).trim()) searchParams.set('radius', String(params.radius).trim())

        const query = searchParams.toString()
        return query ? `${ROUTES.serviceDiscovery}?${query}` : ROUTES.serviceDiscovery
    },
    serviceProviderDetails: (id: EntityId) => `/services/${id}`,
    serviceRequest: (id: EntityId, serviceId?: string) => serviceId ? `/services/${id}/request?service=${encodeURIComponent(serviceId)}` : `/services/${id}/request`,
    cabinets: (params?: {
        search?: string | undefined
        sortBy?: string | undefined
        city?: string | undefined
        service?: string | undefined
        date?: string | undefined
        duration?: string | number | undefined
        availableToday?: boolean | undefined
    }) => {
        const searchParams = new URLSearchParams()

        if (params?.search?.trim()) {
            searchParams.set('search', params.search.trim())
        }

        if (params?.sortBy?.trim()) {
            searchParams.set('sortBy', params.sortBy.trim())
        }

        if (params?.city?.trim()) {
            searchParams.set('city', params.city.trim())
        }

        if (params?.service?.trim()) {
            searchParams.set('service', params.service.trim())
        }

        if (params?.date?.trim()) {
            searchParams.set('date', params.date.trim())
        }

        if (params?.duration !== undefined && String(params.duration).trim()) {
            searchParams.set('duration', String(params.duration).trim())
        }

        if (params?.availableToday) {
            searchParams.set('availableToday', 'true')
        }

        const query = searchParams.toString()

        return query ? `${ROUTES.cabinets}?${query}` : ROUTES.cabinets
    },
    cabinetDetails: (id: EntityId, params?: {
        serviceId?: EntityId
        source?: 'book_again'
        sourceBookingId?: EntityId
        from?: 'filtered-catalog'
    }) => {
        const searchParams = new URLSearchParams()

        if (params?.serviceId) {
            searchParams.set('serviceId', params.serviceId)
        }

        if (params?.source) {
            searchParams.set('source', params.source)
        }

        if (params?.sourceBookingId) {
            searchParams.set('sourceBookingId', params.sourceBookingId)
        }

        if (params?.from) {
            searchParams.set('from', params.from)
        }

        const query = searchParams.toString()
        return query ? `/cabinets/${id}?${query}` : `/cabinets/${id}`
    },
    cabinetReviewEdit: (cabinetId: EntityId, reviewId: EntityId) =>
        `/cabinets/${cabinetId}?reviewId=${reviewId}`,
    ownerCabinetEdit: (id: string) => `/owner/cabinets/${id}/edit`,
    ownerAutoCareProviderDetails: (id: EntityId) => `/owner/autocare-providers/${id}`,
    ownerAutoCareProviderReviews: (id: EntityId) => `/owner/autocare-providers/${id}/reviews`,
} as const
