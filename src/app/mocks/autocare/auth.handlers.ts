import { http, HttpResponse } from "msw"
import type { User } from "@/entities/user"
import { isDeploymentOAuthProviderEnabled, type DeploymentOAuthProvider } from "@/shared/config/deployment"
import { mockUsers } from ".././data"
import { mockSession, clearMockSession, setMockSession } from ".././session"
import { parseMockJson } from ".././parseMockJson"
import { getMockScenario } from ".././mock-scenario"
import { getMockOAuthIdentities } from './mock-access'
import { loginRequestSchema, registerRequestSchema } from './mock-fixtures'
import { invalidMockBodyResponse } from './mock-validation'

export const authHandlers = [
{ order: 0, handler: http.get('/api/auth/me', ({ request }) => {
       if (getMockScenario(request) === 'expired-session') {
           return HttpResponse.json(
               { code: 'SESSION_EXPIRED', message: 'Mock session expired' },
               { status: 401 },
           )
       }

       const currentUser = mockUsers.find(
           (user) => user.id === mockSession.currentUserId
       )

        if (!currentUser) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

       return HttpResponse.json(currentUser)
    }) },
{ order: 9, handler: http.post('/api/auth/refresh', () => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId,
        )

        if (!currentUser) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 },
            )
        }

        return HttpResponse.json({
            accessToken: `mock-access-token-${currentUser.id}`,
        })
    }) },
{ order: 10, handler: http.get('/api/auth/oauth/identities', () => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        const identities = getMockOAuthIdentities(currentUser)

        return HttpResponse.json(
            (['google', 'yandex'] as const)
                .filter((provider) => isDeploymentOAuthProviderEnabled(provider))
                .map((provider) => ({
                provider,
                isLinked: identities.has(provider),
                identityCount: identities.has(provider) ? 1 : 0,
                createdAt: identities.has(provider)
                    ? currentUser.createdAt
                    : null,
                canUnlink: identities.has(provider) && identities.size > 1,
                }))
        )
    }) },
{ order: 11, handler: http.post('/api/auth/oauth/:provider/link/start', ({ params }) => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )
        const provider = params.provider

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (provider !== 'google' && provider !== 'yandex') {
            return HttpResponse.json({ message: 'Invalid provider' }, { status: 400 })
        }

        if (!isDeploymentOAuthProviderEnabled(provider as DeploymentOAuthProvider)) {
            return HttpResponse.json({ message: 'OAuth provider is not enabled for this deployment.' }, { status: 403 })
        }

        getMockOAuthIdentities(currentUser).add(provider)

        return HttpResponse.json({
            provider,
            authUrl: `/profile?tab=security&oauth=linked&provider=${provider}`,
        })
    }) },
{ order: 12, handler: http.post('/api/auth/oauth/:provider/unlink/start', ({ params }) => {
        const currentUser = mockUsers.find(
            (user) => user.id === mockSession.currentUserId
        )
        const provider = params.provider

        if (!currentUser) {
            return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        }

        if (provider !== 'google' && provider !== 'yandex') {
            return HttpResponse.json({ message: 'Invalid provider' }, { status: 400 })
        }

        if (!isDeploymentOAuthProviderEnabled(provider as DeploymentOAuthProvider)) {
            return HttpResponse.json({ message: 'OAuth provider is not enabled for this deployment.' }, { status: 403 })
        }

        const identities = getMockOAuthIdentities(currentUser)

        if (!identities.has(provider)) {
            return HttpResponse.json(
                {
                    code: 'OAUTH_IDENTITY_NOT_LINKED',
                    message: 'This OAuth provider is not linked to the account.',
                },
                { status: 409 }
            )
        }

        if (identities.size <= 1) {
            return HttpResponse.json(
                {
                    code: 'OAUTH_LAST_LOGIN_METHOD',
                    message: 'The last available login method cannot be removed.',
                },
                { status: 409 }
            )
        }

        identities.delete(provider)

        return HttpResponse.json({
            provider,
            authUrl: `/profile?tab=security&oauth=unlinked&provider=${provider}`,
        })
    }) },
{ order: 13, handler: http.post('/api/auth/login', async ({ request }) => {
        const body = await parseMockJson(request, loginRequestSchema)

        if (!body) return invalidMockBodyResponse()

        const user = mockUsers.find(
            (user) => user.email.toLowerCase() === body.email.toLowerCase()
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'Invalid email or password' },
                { status: 401 }
            )
        }

        if (user.status === 'blocked') {
            return HttpResponse.json(
                { message: 'User is blocked' },
                { status: 403 }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }) },
{ order: 14, handler: http.post('/api/auth/logout', () => {
        clearMockSession()

        return HttpResponse.json({
            message: 'Logged out'
        })
    }) },
{ order: 23, handler: http.post('/api/auth/register', async ({ request }) => {
        const body = await parseMockJson(request, registerRequestSchema)

        if (!body) return invalidMockBodyResponse()
        const existingUser = mockUsers.find(
            (user) => user.email.toLowerCase() === body.email.toLowerCase()
        )

        if (existingUser) {
            return HttpResponse.json(
                { message: 'User with this email already exists' },
                { status: 409 }
            )
        }

        const newUser: User = {
            id: `user-${Date.now()}`,
            name: body.name,
            email: body.email,
            phone: null,
            role: body.role,
            status: 'active' as const,
            avatarUrl: null,
            provider: 'email' as const,
            locale: null,
            emailVerifiedAt: null,
            emailNotifications: true,
            bookingEmailNotifications: true,
            preferredCity: null,
            preferredCategories: [],
            createdAt: new Date().toISOString(),
        }

        mockUsers.push(newUser)

        setMockSession({
            currentUserId: newUser.id,
            currentRole: newUser.role,
        })

        return HttpResponse.json(newUser, {
            status: 201
        })
    }) },
{ order: 24, handler: http.post('/api/auth/password/setup/verify', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-password-setup-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Password setup link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        return HttpResponse.json({
            email: 'admin@autocarehub.test',
            expiresAt: '2026-12-31T23:59:59.000Z',
        })
    }) },
{ order: 25, handler: http.post('/api/auth/password/setup/complete', async ({ request }) => {
        const body = await request.json() as {
            token: string
            password: string
        }

        if (
            body.token !== 'mock-password-setup-token-1234567890' ||
            body.password.length < 6
        ) {
            return HttpResponse.json(
                {
                    message: 'Password setup link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        const user = mockUsers.find(
            (item) => item.email === 'admin@autocarehub.test'
        )

        if (!user) {
            return HttpResponse.json(
                {
                    message: 'User not found.',
                },
                {
                    status: 404,
                }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }) },
{ order: 26, handler: http.post('/api/auth/password/reset/request', () => {
        return HttpResponse.json({
            success: true,
        })
    }) },
{ order: 27, handler: http.post('/api/auth/password/reset/verify', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-password-reset-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Password reset link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        return HttpResponse.json({
            email: 'emily.carter@example.com',
            expiresAt: '2026-12-31T23:59:59.000Z',
        })
    }) },
{ order: 28, handler: http.post('/api/auth/password/reset/complete', async ({ request }) => {
        const body = await request.json() as {
            token: string
            password: string
        }

        if (
            body.token !== 'mock-password-reset-token-1234567890' ||
            body.password.length < 6
        ) {
            return HttpResponse.json(
                {
                    message: 'Password reset link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        clearMockSession()

        return HttpResponse.json({
            success: true,
        })
    }) },
{ order: 29, handler: http.post('/api/auth/email-verification/request', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json({
            success: true,
        })
    }) },
{ order: 30, handler: http.post('/api/auth/email-verification/verify', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-email-verification-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Email verification link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        const user = mockUsers.find(
            (item) => item.id === mockSession.currentUserId
        )

        return HttpResponse.json({
            email: user?.email ?? 'user@example.com',
            expiresAt: '2026-12-31T23:59:59.000Z',
        })
    }) },
{ order: 31, handler: http.post('/api/auth/email-verification/complete', async ({ request }) => {
        const body = await request.json() as {
            token: string
        }

        if (body.token !== 'mock-email-verification-token-1234567890') {
            return HttpResponse.json(
                {
                    message: 'Email verification link is invalid or expired.',
                },
                {
                    status: 400,
                }
            )
        }

        const user = mockUsers.find(
            (item) => item.id === mockSession.currentUserId
        )

        if (user) {
            user.emailVerifiedAt = new Date().toISOString()
        }

        return HttpResponse.json({
            success: true,
        })
    }) },
{ order: 32, handler: http.post('/api/auth/change-password', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json({
            success: true,
        })
    }) },
{ order: 33, handler: http.get('/api/auth/sessions', () => {
        if (!mockSession.currentUserId) {
            return HttpResponse.json(
                { message: 'Unauthorized' },
                { status: 401 }
            )
        }

        return HttpResponse.json([
            {
                id: 'mock-session-1',
                userAgent: 'Mozilla/5.0 (Macintosh; Intel Mac OS X 10_15_7) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36',
                ipAddress: '127.0.0.1',
                lastActiveAt: new Date().toISOString(),
                isCurrent: true,
            },
            {
                id: 'mock-session-2',
                userAgent: 'Mozilla/5.0 (iPhone; CPU iPhone OS 17_2 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/17.2 Mobile/15E148 Safari/604.1',
                ipAddress: '192.168.1.5',
                lastActiveAt: new Date(Date.now() - 86400000).toISOString(),
                isCurrent: false,
            },
        ])
    }) },
{ order: 34, handler: http.delete('/api/auth/sessions/:id', () => {
        return HttpResponse.json({
            success: true,
        })
    }) },
{ order: 35, handler: http.post('/api/auth/sessions/revoke-all', () => {
        return HttpResponse.json({
            success: true,
        })
    }) },
{ order: 232, handler: http.post('/api/auth/google/mock', () => {
        if (!isDeploymentOAuthProviderEnabled('google')) {
            return HttpResponse.json({ message: 'OAuth provider is not enabled for this deployment.' }, { status: 403 })
        }

        const user = mockUsers.find(
            (user) => user.provider === 'google'
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'Google mock user not found' },
                { status: 404 }
            )
        }

        if (user.status === 'blocked') {
            return HttpResponse.json(
                { message: 'User is blocked' },
                { status: 403 }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }) },
{ order: 233, handler: http.post('/api/auth/yandex/mock', () => {
        if (!isDeploymentOAuthProviderEnabled('yandex')) {
            return HttpResponse.json({ message: 'OAuth provider is not enabled for this deployment.' }, { status: 403 })
        }

        const user = mockUsers.find(
            (user) => user.provider === 'yandex'
        )

        if (!user) {
            return HttpResponse.json(
                { message: 'Yandex mock user not found' },
                { status: 404 }
            )
        }

        if (user.status === 'blocked') {
            return HttpResponse.json(
                { message: 'User is blocked' },
                { status: 403 }
            )
        }

        setMockSession({
            currentUserId: user.id,
            currentRole: user.role,
        })

        return HttpResponse.json(user)
    }) }
]
