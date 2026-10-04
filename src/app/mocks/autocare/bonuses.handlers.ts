import { http, HttpResponse } from "msw"
import { mockUsers } from ".././data"
import { mockSession } from ".././session"
import { isMockEmpty, mockScenarioResponse } from ".././mock-scenario"
import { currentMockUser, hasMockProviderRole } from './mock-access'
import { reconcileMockAutoCareBonusAccount } from './mock-bonuses'
import { mockAutoCareBonusAccounts, mockAutoCareBonusPrograms, mockAutoCareServiceRequests, ownerAutoCareProviders } from './mock-fixtures'
import type { MockAutoCareBonusAccount } from './mock-fixtures'
import { invalidMockBodyResponse } from './mock-validation'

export const bonusesHandlers = [
{ order: 71, handler: http.get('/api/v1/bonuses/my', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can view bonus balances.' }, { status: 403 })
        if (isMockEmpty(request)) return HttpResponse.json([])
        const accounts = mockAutoCareBonusAccounts.filter((account) => account.clientId === user.id)
        accounts.forEach((account) => reconcileMockAutoCareBonusAccount(account))
        return HttpResponse.json(accounts.map(({ clientId: _clientId, ...account }) => account))
    }) },
{ order: 72, handler: http.post('/api/v1/bonuses/redeem', async ({ request }) => {
        const user = currentMockUser()
        if (!user || user.role !== 'client') return HttpResponse.json({ message: 'Only clients can redeem bonus points.' }, { status: 403 })
        const body = await request.json() as { providerId?: string; requestId?: string; points?: number }
        if (!body.providerId || !body.requestId || typeof body.points !== 'number' || !Number.isInteger(body.points) || body.points <= 0) return invalidMockBodyResponse()
        const points = body.points
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === body.requestId && candidate.clientId === user.id && candidate.providerId === body.providerId)
        if (!item || item.status !== 'accepted') return HttpResponse.json({ message: 'Bonuses can be redeemed only for a confirmed service request.' }, { status: 409 })
        const account = mockAutoCareBonusAccounts.find((candidate) => candidate.clientId === user.id && candidate.providerId === body.providerId)
        if (!account) return HttpResponse.json({ message: 'No bonus balance is available for this service.' }, { status: 409 })
        reconcileMockAutoCareBonusAccount(account)
        if (account.entries.some((entry) => entry.requestId === item.id && entry.type === 'redeem')) {
            const { clientId: _clientId, ...response } = account
            return HttpResponse.json(response)
        }
        const maximumPoints = item.booking ? Math.floor((item.booking.payableAmountMinor ?? item.booking.amountMinor) / 100) : 0
        if (account.balancePoints < points) return HttpResponse.json({ message: 'The bonus balance is too low for this redemption.' }, { status: 409 })
        if (maximumPoints === 0 || points > maximumPoints) return HttpResponse.json({ message: 'The bonus redemption exceeds the confirmed service amount.' }, { status: 409 })
        const now = new Date().toISOString()
        account.balancePoints -= points
        account.redeemedPoints += points
        account.entries.unshift({ id: `bonus-entry-${Date.now()}`, type: 'redeem', points: -points, reason: 'Списание бонусов при подтверждённой записи', requestId: item.id, expiresAt: null, createdAt: now })
        if (item.booking) {
            item.booking.bonusDiscountMinor = points * 100
            item.booking.payableAmountMinor = Math.max(0, item.booking.amountMinor - points * 100)
        }
        const { clientId: _clientId, ...response } = account
        return HttpResponse.json(response)
    }) },
{ order: 147, handler: http.get('/api/owner/autocare-providers/:providerId/bonus-program', ({ params }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can manage bonus programs.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        return HttpResponse.json(mockAutoCareBonusPrograms.get(String(params.providerId)) ?? null)
    }) },
{ order: 148, handler: http.get('/api/owner/autocare-providers/:providerId/bonus-liability', ({ params }) => {
        const currentUser = currentMockUser()
        if (!currentUser || currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can view bonus liability.' }, { status: 403 })
        const accounts = mockAutoCareBonusAccounts.filter((account) => account.providerId === params.providerId)
        const entries = accounts.flatMap((account) => account.entries.map((entry) => ({
            ...entry,
            clientId: account.clientId,
            clientName: mockUsers.find((user) => user.id === account.clientId)?.name ?? 'Клиент AutoCare',
        }))).sort((left, right) => right.createdAt.localeCompare(left.createdAt))
        return HttpResponse.json({ providerId: String(params.providerId), activeAccounts: accounts.filter((account) => account.balancePoints > 0).length, liabilityPoints: accounts.reduce((total, account) => total + account.balancePoints, 0), entries })
    }) },
{ order: 149, handler: http.put('/api/owner/autocare-providers/:providerId/bonus-program', async ({ params, request }) => {
        const currentUser = mockUsers.find((user) => user.id === mockSession.currentUserId)
        if (!currentUser) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can manage bonus programs.' }, { status: 403 })
        const provider = ownerAutoCareProviders.find((candidate) => candidate.id === params.providerId)
        if (!provider) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const body = await request.json() as { name?: string; earnPercent?: number; maxEarnPointsPerVisit?: number | null; expiresAfterDays?: number | null; active?: boolean }
        if (!body.name?.trim() || typeof body.earnPercent !== 'number' || body.earnPercent < 0 || body.earnPercent > 100) return invalidMockBodyResponse()
        const now = new Date().toISOString()
        const existing = mockAutoCareBonusPrograms.get(provider.id)
        const program = { id: existing?.id ?? `bonus-program-${Date.now()}`, providerId: provider.id, name: body.name.trim(), earnPercent: body.earnPercent, maxEarnPointsPerVisit: body.maxEarnPointsPerVisit ?? null, expiresAfterDays: body.expiresAfterDays ?? null, active: body.active ?? true, createdAt: existing?.createdAt ?? now, updatedAt: now }
        mockAutoCareBonusPrograms.set(provider.id, program)
        return HttpResponse.json(program)
    }) },
{ order: 150, handler: http.post('/api/owner/autocare-providers/:providerId/bonus-accounts/:clientId/grants', async ({ params, request }) => {
        const currentUser = currentMockUser()
        if (!currentUser || currentUser.role !== 'owner' || !hasMockProviderRole(currentUser.id, String(params.providerId), ['owner'])) return HttpResponse.json({ message: 'Only provider owners can grant bonus points.' }, { status: 403 })
        if (!ownerAutoCareProviders.some((provider) => provider.id === params.providerId)) return HttpResponse.json({ message: 'Automotive service not found.' }, { status: 404 })
        const idempotencyKey = request.headers.get('Idempotency-Key')
        if (!idempotencyKey || !/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) return HttpResponse.json({ message: 'Idempotency-Key is required when granting bonus points.' }, { status: 400 })
        const body = await request.json() as { points?: number; reason?: string }
        if (typeof body.points !== 'number' || !Number.isInteger(body.points) || body.points <= 0 || body.points > 100_000 || !body.reason || body.reason.trim().length < 10) return invalidMockBodyResponse()
        const points = body.points
        const account = mockAutoCareBonusAccounts.find((candidate) => candidate.clientId === params.clientId && candidate.providerId === params.providerId)
            ?? (() => { const created: MockAutoCareBonusAccount = { id: `bonus-account-${Date.now()}`, clientId: String(params.clientId), providerId: String(params.providerId), balancePoints: 0, earnedPoints: 0, redeemedPoints: 0, entries: [] }; mockAutoCareBonusAccounts.push(created); return created })()
        if (account.entries.some((entry) => entry.id === `bonus-entry-${idempotencyKey}`)) {
            const { clientId: _clientId, ...response } = account
            return HttpResponse.json(response)
        }
        const now = new Date().toISOString()
        account.balancePoints += points
        account.earnedPoints += points
        account.entries.unshift({ id: `bonus-entry-${idempotencyKey}`, type: 'adjustment', points, reason: body.reason.trim(), requestId: null, expiresAt: null, createdAt: now })
        const { clientId: _clientId, ...response } = account
        return HttpResponse.json(response)
    }) }
]
