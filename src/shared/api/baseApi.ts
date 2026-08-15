import {
    createApi,
    fetchBaseQuery,
    type BaseQueryFn,
    type FetchArgs,
    type FetchBaseQueryError,
} from '@reduxjs/toolkit/query/react'

import { API_BASE_URL, IS_REAL_API } from '@/shared/config/api'

import {
    clearAccessToken,
    getAccessToken,
    setAccessToken,
} from '@/shared/lib/auth-token'
import {
    clearCsrfToken,
    getCsrfToken,
    setCsrfToken,
} from '@/shared/lib/csrf-token'
import { getStoredLocale } from '@/shared/config/i18n'
import { refreshAccessTokenSingleFlight } from './refresh-access-token'
import {
    parseAccessTokenResponse,
    parseCsrfTokenResponse,
} from './security-response-schema'
import { parseApiErrorData } from './api-error-shape'
import { clearIdentityScopedPwaCaches } from '@/shared/pwa/identity-cache'

const AUTH_SECURITY_ERROR_CODES = new Set([
    'CSRF_ORIGIN_MISMATCH',
    'CSRF_TOKEN_MISMATCH',
])

const CSRF_PROTECTED_PATHS = new Set([
    '/auth/register',
    '/auth/login',
    '/auth/refresh',
    '/auth/logout',
    '/auth/password/setup/complete',
    '/auth/password/reset/request',
    '/auth/password/reset/complete',
    '/auth/email-verification/request',
    '/auth/email-verification/complete',
    '/auth/change-password',
    '/auth/sessions/revoke-all',
    '/owner/action-center/events',
    '/owner/autocare-providers',
    '/owner/autocare-providers/logo',
    '/owner/autocare-providers/media',
    '/v1/service-requests',
    '/client/experiment-events',
    '/users/me/deletion-request',
    '/users/me/vehicles',
])

let csrfTokenRequest: Promise<string | null> | null = null
let authRefreshBlocked = false

function getRequestPath(args: string | FetchArgs) {
    const requestUrl = typeof args === 'string' ? args : args.url

    const path = requestUrl.split('?')[0]?.split('#')[0]
    return path ?? ''
}

function isCsrfTokenMismatch(error: FetchBaseQueryError | undefined) {
    if (!error || typeof error.data !== 'object' || error.data === null) {
        return false
    }

    return parseApiErrorData(error.data)?.code === 'CSRF_TOKEN_MISMATCH'
}

function getApiErrorCode(error: FetchBaseQueryError | undefined) {
    if (!error || typeof error.data !== 'object' || error.data === null) {
        return undefined
    }

    return parseApiErrorData(error.data)?.code
}

function logAuthSecurityError(
    args: string | FetchArgs,
    error: FetchBaseQueryError | undefined,
    context: string
) {
    const code = getApiErrorCode(error)

    if (!code || !AUTH_SECURITY_ERROR_CODES.has(code)) {
        return
    }

    console.warn('[AutoCare Hub auth security]', {
        code,
        context,
        status: error?.status,
        path: getRequestPath(args),
    })
}

function needsCsrfToken(args: string | FetchArgs) {
    if (!IS_REAL_API || typeof args === 'string') {
        return false
    }

    const isOAuthFlowStart =
        args.url.startsWith('/auth/oauth/') && args.url.endsWith('/start')
    const isServiceRequestTransition =
        args.url.startsWith('/v1/service-requests/') || args.url.startsWith('/owner/service-requests/')
    const isVehicleMutation =
        args.url === '/users/me/vehicles' || args.url.startsWith('/users/me/vehicles/')

    const method = args.method?.toUpperCase() ?? ''
    const isVehicleWrite = isVehicleMutation && ['POST', 'PATCH', 'DELETE'].includes(method)
    const isMutationPath = args.url.startsWith('/v1/')
        || args.url.startsWith('/owner/')
        || args.url.startsWith('/users/me/')
    const isExistingProtectedPost = ['POST', 'PUT', 'PATCH', 'DELETE'].includes(method) && (
        CSRF_PROTECTED_PATHS.has(args.url) || isOAuthFlowStart || isServiceRequestTransition || isMutationPath
    )

    return isVehicleWrite || isExistingProtectedPost
}

function createRequestHeaders(headersInit: FetchArgs['headers']) {
    const headers = new Headers()

    if (!headersInit) {
        return headers
    }

    if (headersInit instanceof Headers) {
        headersInit.forEach((value, name) => {
            headers.set(name, value)
        })

        return headers
    }

    if (Array.isArray(headersInit)) {
        headersInit.forEach(([name, value]) => {
            if (name && value !== undefined) {
                headers.set(name, value)
            }
        })

        return headers
    }

    Object.entries(headersInit).forEach(([name, value]) => {
        if (value !== undefined) {
            headers.set(name, value)
        }
    })

    return headers
}

function shouldSkipRefresh(args: string | FetchArgs) {
    const url = getRequestPath(args)

    return (
        url === '/auth/login' ||
        url === '/auth/register' ||
        url === '/auth/refresh' ||
        url === '/auth/logout' ||
        url === '/auth/password/setup/verify' ||
        url === '/auth/password/setup/complete' ||
        url === '/auth/password/reset/request' ||
        url === '/auth/password/reset/verify' ||
        url === '/auth/password/reset/complete' ||
        url === '/auth/email-verification/request' ||
        url === '/auth/email-verification/verify' ||
        url === '/auth/email-verification/complete'
    )
}

function clearAuthenticatedClientState(
    api: Parameters<typeof rawBaseQuery>[1],
) {
    authRefreshBlocked = true
    clearAccessToken()
    clearCsrfToken()
    api.dispatch(baseApi.util.resetApiState())
    void clearIdentityScopedPwaCaches()
}

const rawBaseQuery = fetchBaseQuery({
    baseUrl: API_BASE_URL,
    credentials: 'include',
    prepareHeaders: (headers) => {
        const accessToken = getAccessToken()

    if (accessToken) {
        headers.set('Authorization', `Bearer ${accessToken}`)
    }

    headers.set('Accept-Language', getStoredLocale())

    return headers
    },
})

async function fetchCsrfToken(
    api: Parameters<typeof rawBaseQuery>[1],
    extraOptions: Parameters<typeof rawBaseQuery>[2]
) {
    const existingToken = getCsrfToken()

    if (existingToken) {
        return existingToken
    }

    csrfTokenRequest ??= (async () => {
        const result = await rawBaseQuery('/auth/csrf', api, extraOptions)

        const csrfToken = parseCsrfTokenResponse(result.data)
        if (!csrfToken) return null

        setCsrfToken(csrfToken)

        return csrfToken
    })().finally(() => {
        csrfTokenRequest = null
    })

    return csrfTokenRequest
}

async function baseQueryWithCsrf(
    args: string | FetchArgs,
    api: Parameters<typeof rawBaseQuery>[1],
    extraOptions: Parameters<typeof rawBaseQuery>[2]
) {
    if (!needsCsrfToken(args) || typeof args === 'string') {
        return rawBaseQuery(args, api, extraOptions)
    }

    let csrfToken = await fetchCsrfToken(api, extraOptions)

    if (!csrfToken) {
        return rawBaseQuery(args, api, extraOptions)
    }

    const runProtectedRequest = (token: string) => {
        const headers = createRequestHeaders(args.headers)

        headers.set('X-CSRF-Token', token)

        return rawBaseQuery(
            {
                ...args,
                headers,
            },
            api,
            extraOptions
        )
    }

    let result = await runProtectedRequest(csrfToken)

    if (!isCsrfTokenMismatch(result.error)) {
        logAuthSecurityError(args, result.error, 'protected-request')

        return result
    }

    logAuthSecurityError(args, result.error, 'protected-request-retry')

    clearCsrfToken()
    csrfToken = await fetchCsrfToken(api, extraOptions)

    if (!csrfToken) {
        return result
    }

    result = await runProtectedRequest(csrfToken)
    logAuthSecurityError(args, result.error, 'protected-request-after-retry')

    return result
}

const baseQueryWithReauth: BaseQueryFn<
    string | FetchArgs,
    unknown,
    FetchBaseQueryError
> = async (args, api, extraOptions) => {
    if (getAccessToken()) {
        authRefreshBlocked = false
    }

    let result = await baseQueryWithCsrf(args, api, extraOptions)

    logAuthSecurityError(args, result.error, 'base-query')

    if (
        result.error?.status !== 401
        || shouldSkipRefresh(args)
        || authRefreshBlocked
        || !IS_REAL_API
    ) {
        return result
    }

    const refreshedAccessToken = await refreshAccessTokenSingleFlight(async () => {
        const refreshResult = await baseQueryWithCsrf(
            {
                url: '/auth/refresh',
                method: 'POST',
            },
            api,
            extraOptions
        )

        return parseAccessTokenResponse(refreshResult.data)
    })

    if (!refreshedAccessToken) {
        clearAuthenticatedClientState(api)

        return result
    }

    setAccessToken(refreshedAccessToken)
    authRefreshBlocked = false

    result = await baseQueryWithCsrf(args, api, extraOptions)

    return result
}

export const baseApi = createApi({
    reducerPath: 'api',
    baseQuery: baseQueryWithReauth,
    tagTypes: [
        'Cabinet',
        'Service',
        'Booking',
        'User',
        'UserVehicle',
        'Review',
        'UserSessions',
        'AuditLogs',
        'SystemIncidents',
        'SecurityEvents',
        'Notification',
        'Favorites',
        'OAuthIdentities',
        'CabinetSchedule',
        'CabinetScheduleExceptions',
        'CabinetBlockedPeriods',
        'OwnerReadiness',
        'AutoCareMarket',
        'AutoCareServiceDefinition',
        'AutoCareProvider',
        'AutoCareReview',
        'AutoCareServiceRequest',
        'AutoCareVehicleCatalog',
        'AutoCareMarketplace',
        'PlatformReview',
    ],
    endpoints: () => ({}),
})
