import { http, HttpResponse } from "msw"
import { automotiveServices } from "@/entities/automotive-service"
import { providerPreviews } from "@/entities/automotive-service/model/autocareMockProviders"
import { emitMockServiceChatEvent, type ServiceChatMessage } from "@/entities/automotive-service/lib/service-chat"
import { isMockEmpty, mockScenarioResponse } from ".././mock-scenario"
import { currentMockUser, hasMockProviderPermission } from './mock-access'
import { getMockProviderAvailabilitySlots, getMockZonedDateTimeParts } from './mock-availability'
import { awardMockAutoCareBonus, refundMockAutoCareBonusForCancelledRequest } from './mock-bonuses'
import { isMockChatMessagingBlocked, mockChatThreadFromRequest } from './mock-chat'
import { autoCareDefinitions, autoCareProviders, mockAutoCareAttachments, mockAutoCareChatReports, mockAutoCareMessages, mockAutoCareServiceRequests } from './mock-fixtures'
import type { MockAutoCareServiceRequest } from './mock-fixtures'
import { pushMockAutoCareNotification } from './mock-notifications'
import { expireMockAutoCareQuotes } from './mock-requests'
import { invalidMockBodyResponse } from './mock-validation'

export const requestsHandlers = [
{ order: 97, handler: http.post('/api/v1/service-requests', async ({ request }) => {
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'client') return HttpResponse.json({ message: 'Only clients can create service requests.' }, { status: 403 })
        const body = await request.json() as {
            providerId?: string
            locationId?: string
            offeringId?: string
            preferredAt?: string
            vehicleId?: string | null
            vehicleSnapshot?: Record<string, string | number | null> | null
            contactSnapshot?: Record<string, string | number | null>
            note?: string | null
            dataProcessingConsent?: boolean
        }
        const idempotencyKey = request.headers.get('Idempotency-Key')
        const fingerprint = JSON.stringify({ providerId: body.providerId, locationId: body.locationId, offeringId: body.offeringId, preferredAt: body.preferredAt, vehicleId: body.vehicleId ?? null, vehicleSnapshot: body.vehicleSnapshot ?? null, contactSnapshot: body.contactSnapshot, note: body.note ?? null })
        if (idempotencyKey) {
            if (!/^[a-zA-Z0-9_-]{8,128}$/.test(idempotencyKey)) return HttpResponse.json({ message: 'Invalid Idempotency-Key.' }, { status: 400 })
            const existing = mockAutoCareServiceRequests.find((item) => item.clientId === user.id && item.idempotencyKey === idempotencyKey)
            if (existing) {
                if (existing.idempotencyFingerprint !== fingerprint) return HttpResponse.json({ message: 'Idempotency key was already used for another service request.' }, { status: 409 })
                const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = existing
                return HttpResponse.json(response)
            }
        }
        const provider = autoCareProviders.find((item) => item.id === body.providerId || item.id.replace('api-', '') === body.providerId)
        const source = provider ? providerPreviews.find((item) => item.id === provider.id.replace('api-', '')) : undefined
        const service = automotiveServices.find((item) => body.offeringId?.endsWith(`-${item.id}`)) ?? automotiveServices[0]
        const definition = autoCareDefinitions.find((item) => item.slug === service?.id) ?? autoCareDefinitions[0]
        const offer = provider?.offers?.find((item) => item.id === body.offeringId)
        if (!provider || !body.locationId || !body.offeringId || !body.preferredAt || !body.contactSnapshot || !body.dataProcessingConsent || !definition) {
            return HttpResponse.json({ message: 'Invalid service request.' }, { status: 400 })
        }
        const timezone = provider.location.timezone ?? 'UTC'
        const requestedInstant = new Date(body.preferredAt)
        if (!Number.isFinite(requestedInstant.getTime())) return HttpResponse.json({ message: 'Invalid requested visit time.' }, { status: 400 })
        const requestedParts = getMockZonedDateTimeParts(requestedInstant, timezone)
        const durationMinutes = provider.offers?.find((offer) => offer.id === body.offeringId)?.durationMinutes ?? 60
        const slotIsAvailable = body.locationId === provider.location.id && getMockProviderAvailabilitySlots(provider, requestedParts.date, Date.now(), durationMinutes)
            .some((slot) => Date.parse(slot.startsAt) === requestedInstant.getTime())
        if (!slotIsAvailable) return HttpResponse.json({ message: 'The requested visit time is no longer available.' }, { status: 409 })

        const now = new Date().toISOString()
        const result: MockAutoCareServiceRequest = {
            id: `mock-request-${Date.now()}`,
            providerId: provider.id,
            providerName: provider.name,
            locationId: body.locationId,
            address: provider.location.address,
            definitionId: definition.id,
            serviceSlug: definition.slug,
            serviceLabels: definition.labels,
            serviceDescription: offer?.description ?? null,
            offeringId: body.offeringId,
            priceFromMinor: offer?.priceFromMinor ?? (source?.price ? source.price * 100 : null),
            currencyCode: offer?.currencyCode ?? 'RUB',
            offeringSnapshot: offer ? {
                serviceSlug: offer.serviceSlug ?? definition.slug,
                serviceLabels: offer.serviceLabels ?? definition.labels,
                description: offer.description ?? null,
                priceFromMinor: offer.priceFromMinor,
                priceToMinor: offer.priceToMinor,
                currencyCode: offer.currencyCode,
                durationMinutes: offer.durationMinutes,
                inclusions: offer.inclusions,
                warrantyText: offer.warrantyText,
                priceType: offer.priceType ?? definition.priceType,
            } : null,
            preferredAt: body.preferredAt,
            timezone,
            vehicleId: body.vehicleId ?? null,
            vehicleSnapshot: body.vehicleSnapshot ?? null,
            contactSnapshot: body.contactSnapshot,
            note: body.note ?? null,
            quote: null,
            quoteHistory: [],
            idempotencyKey,
            idempotencyFingerprint: fingerprint,
            status: 'awaiting_reply',
            clientId: user.id,
            clientConfirmedAt: now,
            providerConfirmedAt: null,
            createdAt: now,
            updatedAt: now,
        }
        mockAutoCareServiceRequests.unshift(result)
        pushMockAutoCareNotification({ userId: user.id, requestId: result.id, role: 'client', title: 'Заявка отправлена', message: 'Заявка передана автосервису и появится в переписке.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = result
        return HttpResponse.json(response, { status: 201 })
    }) },
{ order: 98, handler: http.get('/api/v1/service-requests/my', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        expireMockAutoCareQuotes()
        const items = isMockEmpty(request) ? [] : mockAutoCareServiceRequests.filter((item) => item.clientId === user.id).map(({ clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...item }) => item)
        return HttpResponse.json(items)
    }) },
{ order: 112, handler: http.get('/api/v1/service-requests/:requestId', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        expireMockAutoCareQuotes()
        const provider = autoCareProviders.find((candidate) => candidate.id === item.providerId)
        const allowed = item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId && hasMockProviderPermission(user.id, item.providerId, 'requests', item.locationId))
        if (!allowed) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) },
{ order: 113, handler: http.get('/api/v1/service-requests/:requestId/conversation', ({ params, request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(item && (item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId && hasMockProviderPermission(user.id, item.providerId, 'chats', item.locationId))))
        if (!allowed || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const now = new Date().toISOString()
        const allMessages = mockAutoCareMessages.get(item.id) ?? []
        const requestedLimit = Number(new URL(request.url).searchParams.get('limit') ?? 50)
        const limit = Number.isInteger(requestedLimit) && requestedLimit > 0 ? Math.min(requestedLimit, 100) : 50
        const query = new URL(request.url).searchParams
        const requestedOffset = Number(query.get('cursor') ?? 0)
        const requestedBeforeOffset = Number(query.get('beforeCursor') ?? NaN)
        const hasBeforeOffset = Number.isInteger(requestedBeforeOffset) && requestedBeforeOffset >= 0
        const offset = Number.isInteger(requestedOffset) && requestedOffset >= 0 ? requestedOffset : 0
        const isLatestPage = !query.has('cursor') && !hasBeforeOffset
        const end = hasBeforeOffset ? Math.min(requestedBeforeOffset, allMessages.length) : allMessages.length
        const start = hasBeforeOffset ? Math.max(0, end - limit) : isLatestPage ? Math.max(0, allMessages.length - limit) : offset
        const pageEnd = hasBeforeOffset || isLatestPage ? end : Math.min(allMessages.length, start + limit)
        const messages = allMessages.slice(start, pageEnd)
        const chatThread = mockChatThreadFromRequest(item)
        const moderationReviewActive = mockAutoCareChatReports.some((report) => report.threadId === chatThread.id && report.messageId !== null && report.status === 'pending')
        const evidenceRetained = allMessages.some((message) => message.evidenceRetainUntil && Date.parse(message.evidenceRetainUntil) > Date.now())
        const unread = messages.filter((message) => message.senderId !== user.id && !message.readAt)
        unread.forEach((message) => { message.readAt = now })
        if (unread.length) emitMockServiceChatEvent({ type: 'message.read', requestId: item.id, payload: { messageIds: unread.map((message) => message.id), readAt: now } })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        const attachments = (mockAutoCareAttachments.get(item.id) ?? []).map(({ contentBase64: _contentBase64, ...attachment }) => attachment)
        return HttpResponse.json({
            request: response,
            messages,
            attachments,
            nextCursor: pageEnd < allMessages.length && !isLatestPage ? String(pageEnd) : null,
            previousCursor: start > 0 && messages[0] ? String(start) : null,
            moderationReviewActive,
            messagesProtected: moderationReviewActive || evidenceRetained,
        })
    }) },
{ order: 114, handler: http.post('/api/v1/service-requests/:requestId/messages', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(item && (item.clientId === user?.id || (user?.role === 'owner' && provider?.id === item.providerId && hasMockProviderPermission(user.id, item.providerId, 'chats', item.locationId))))
        if (!user || !item || !allowed) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        if (isMockChatMessagingBlocked(`chat-request-${item.id}`, user.id)) return HttpResponse.json({ message: 'Messaging is unavailable because this chat is blocked.' }, { status: 403 })
        const body = await request.json() as { body?: string }
        if (!body.body?.trim()) return HttpResponse.json({ message: 'Message is required.' }, { status: 400 })
        const idempotencyKey = request.headers.get('Idempotency-Key')
        const normalizedBody = body.body.trim()
        const existing = idempotencyKey
            ? (mockAutoCareMessages.get(item.id) ?? []).find((candidate) => candidate.senderId === user.id && candidate.idempotencyKey === idempotencyKey)
            : undefined
        if (existing) {
            if (existing.idempotencyFingerprint !== normalizedBody) return HttpResponse.json({ message: 'Idempotency key was already used for another message.' }, { status: 409 })
            return HttpResponse.json(existing, { status: 201 })
        }
        const now = new Date().toISOString()
        const message: ServiceChatMessage = { id: `mock-message-${Date.now()}`, senderId: user.id, kind: 'text', body: normalizedBody, offer: null, deliveredAt: now, readAt: null, createdAt: now, idempotencyKey, idempotencyFingerprint: normalizedBody }
        mockAutoCareMessages.set(item.id, [...(mockAutoCareMessages.get(item.id) ?? []), message])
        emitMockServiceChatEvent({ type: 'message.created', requestId: item.id, payload: message })
        pushMockAutoCareNotification({ userId: user.id === item.clientId ? 'user-owner-1' : item.clientId, requestId: item.id, role: user.id === item.clientId ? 'owner' : 'client', title: 'Новое сообщение по заявке', message: 'В переписке по услуге появилось новое сообщение.' })
        return HttpResponse.json(message, { status: 201 })
    }) },
{ order: 115, handler: http.post('/api/owner/service-requests/:requestId/offers', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        if (!user || user.role !== 'owner' || !item || provider?.id !== item.providerId || !hasMockProviderPermission(user.id, item.providerId, 'chats', item.locationId)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        if (isMockChatMessagingBlocked(`chat-request-${item.id}`, user.id)) return HttpResponse.json({ message: 'Messaging is unavailable because this chat is blocked.' }, { status: 403 })
        const body = await request.json() as { type?: 'discount' | 'alternative'; title?: string; description?: string | null; discountPercent?: number | null; couponCode?: string | null; amountMinor?: number | null; currencyCode?: string | null; expiresAt?: string | null }
        if (!body.type || !body.title?.trim() || (body.type === 'discount' && !body.discountPercent)) return HttpResponse.json({ message: 'Invalid service offer.' }, { status: 400 })
        const now = new Date().toISOString()
        const message: ServiceChatMessage = { id: `mock-message-${Date.now()}`, senderId: user.id, kind: 'offer', body: body.title.trim(), offer: { type: body.type, title: body.title.trim(), description: body.description?.trim() || null, discountPercent: body.discountPercent ?? null, couponCode: body.type === 'discount' ? body.couponCode?.trim().toUpperCase() || `AC-${Math.random().toString(36).slice(2, 8).toUpperCase()}` : null, amountMinor: body.amountMinor ?? null, currencyCode: body.currencyCode ?? null, expiresAt: body.expiresAt ?? null, status: 'pending' }, deliveredAt: now, readAt: null, createdAt: now }
        mockAutoCareMessages.set(item.id, [...(mockAutoCareMessages.get(item.id) ?? []), message])
        emitMockServiceChatEvent({ type: 'message.created', requestId: item.id, payload: message })
        return HttpResponse.json(message, { status: 201 })
    }) },
{ order: 116, handler: http.post('/api/v1/service-requests/:requestId/offers/:messageId/decision', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const message = item ? mockAutoCareMessages.get(item.id)?.find((candidate) => candidate.id === params.messageId) : undefined
        if (!user || !item || user.id !== item.clientId || !message?.offer) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json() as { decision?: 'accept' | 'decline' }
        if (message.offer.status !== 'pending' || !body.decision) return HttpResponse.json({ message: 'Offer is no longer available.' }, { status: 409 })
        message.offer = { ...message.offer, status: body.decision === 'accept' ? 'accepted' : 'declined' }
        emitMockServiceChatEvent({ type: 'offer.updated', requestId: item.id, payload: message })
        return HttpResponse.json(message)
    }) },
{ order: 117, handler: http.post('/api/v1/service-requests/:requestId/read', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(user && item && (item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId && hasMockProviderPermission(user.id, item.providerId, 'chats', item.locationId))))
        if (!user || !item || !allowed) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const now = new Date().toISOString()
        const messages = mockAutoCareMessages.get(item.id) ?? []
        const unread = messages.filter((message) => message.senderId !== user.id && !message.readAt)
        unread.forEach((message) => { message.readAt = now })
        if (unread.length) emitMockServiceChatEvent({ type: 'message.read', requestId: item.id, payload: { messageIds: unread.map((message) => message.id), readAt: now } })
        return HttpResponse.json({ updated: unread.length })
    }) },
{ order: 118, handler: http.post('/api/v1/service-requests/:requestId/attachments', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(user && item && (item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId && hasMockProviderPermission(user.id, item.providerId, 'chats', item.locationId))))
        if (!allowed || !user || !item) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        if (isMockChatMessagingBlocked(`chat-request-${item.id}`, user.id)) return HttpResponse.json({ message: 'Messaging is unavailable because this chat is blocked.' }, { status: 403 })
        const body = await request.json() as { fileName?: string; contentType?: string; size?: number; contentBase64?: string }
        if (!body.fileName || !body.contentType || !body.size || !body.contentBase64) return HttpResponse.json({ message: 'Invalid attachment.' }, { status: 400 })
        const attachmentId = `mock-attachment-${Date.now()}`
        const attachment = { id: attachmentId, uploadedById: user.id, contentType: body.contentType, bytes: body.size, status: 'ready' as const, url: `/v1/service-requests/${item.id}/attachments/${attachmentId}`, createdAt: new Date().toISOString(), contentBase64: body.contentBase64 }
        mockAutoCareAttachments.set(item.id, [...(mockAutoCareAttachments.get(item.id) ?? []), attachment])
        emitMockServiceChatEvent({ type: 'attachment.created', requestId: item.id, payload: attachment })
        const { contentBase64: _contentBase64, ...response } = attachment
        return HttpResponse.json(response, { status: 201 })
    }) },
{ order: 119, handler: http.get('/api/v1/service-requests/:requestId/attachments/:attachmentId', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        const attachment = mockAutoCareAttachments.get(String(params.requestId))?.find((candidate) => candidate.id === params.attachmentId)
        const provider = item ? autoCareProviders.find((candidate) => candidate.id === item.providerId) : undefined
        const allowed = Boolean(user && item && attachment && (item.clientId === user.id || (user.role === 'owner' && provider?.id === item.providerId && hasMockProviderPermission(user.id, item.providerId, 'chats', item.locationId))))
        if (!allowed || !attachment) return HttpResponse.json({ message: 'Attachment not found.' }, { status: 404 })
        const [, encoded] = attachment.contentBase64.split(',', 2)
        const body = encoded ?? attachment.contentBase64
        const bytes = Uint8Array.from(atob(body), (character) => character.charCodeAt(0))
        return new HttpResponse(bytes, { headers: { 'Content-Type': attachment.contentType, 'Cache-Control': 'private, max-age=60' } })
    }) },
{ order: 120, handler: http.post('/api/v1/service-requests/:requestId/confirm', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        item.clientConfirmedAt ??= new Date().toISOString()
        item.updatedAt = new Date().toISOString()
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) },
{ order: 121, handler: http.post('/api/v1/service-requests/:requestId/cancel', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (item.status === 'cancelled') {
            const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
            return HttpResponse.json(response)
        }
        if (['declined', 'closed'].includes(item.status)) return HttpResponse.json({ message: 'This service request can no longer be cancelled.' }, { status: 409 })
        const body = await request.json().catch(() => ({})) as { reason?: string | null }
        const now = new Date().toISOString()
        item.status = 'cancelled'
        item.cancelledAt = now
        item.cancelledById = user.id
        item.cancellationReason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null
        item.updatedAt = now
        refundMockAutoCareBonusForCancelledRequest(item, user.id)
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: 'Клиент отменил заявку', message: 'Клиент отменил заявку на услугу.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) },
{ order: 122, handler: http.post('/api/owner/service-requests/:requestId/reschedule', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || user.role !== 'owner' || !item || !hasMockProviderPermission(user.id, item.providerId, 'requests', item.locationId)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json().catch(() => ({})) as { proposedAt?: string; reason?: string | null }
        const proposedAt = new Date(body.proposedAt ?? '')
        if (Number.isNaN(proposedAt.getTime()) || proposedAt.getTime() <= Date.now()) return HttpResponse.json({ message: 'The proposed visit time must be in the future.' }, { status: 400 })
        if (item.reschedule?.status === 'pending') return HttpResponse.json({ message: 'This service request already has a pending reschedule request.' }, { status: 409 })
        const result = { id: `mock-reschedule-${Date.now()}`, proposedAt: proposedAt.toISOString(), requestedById: user.id, status: 'pending' as const, reason: typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null, resolvedById: null, resolutionReason: null, createdAt: new Date().toISOString(), resolvedAt: null }
        item.reschedule = result
        item.updatedAt = result.createdAt
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Сервис предложил новое время', message: 'Проверьте новое время визита в заявке.' })
        return HttpResponse.json(result, { status: 201 })
    }) },
{ order: 123, handler: http.post('/api/v1/service-requests/:requestId/reschedule/decision', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || !item || item.clientId !== user.id) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        const body = await request.json().catch(() => ({})) as { decision?: 'accept' | 'reject'; reason?: string | null }
        const reschedule = item.reschedule
        if (!reschedule) return HttpResponse.json({ message: 'Reschedule request not found.' }, { status: 404 })
        if (reschedule.status !== 'pending') {
            if ((body.decision === 'accept' && reschedule.status === 'accepted') || (body.decision === 'reject' && reschedule.status === 'rejected')) {
                const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
                return HttpResponse.json(response)
            }
            return HttpResponse.json({ message: 'This reschedule request has already been resolved.' }, { status: 409 })
        }
        if (!body.decision) return HttpResponse.json({ message: 'Decision is required.' }, { status: 400 })
        const now = new Date().toISOString()
        reschedule.status = body.decision === 'accept' ? 'accepted' : 'rejected'
        reschedule.resolvedById = user.id
        reschedule.resolutionReason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null
        reschedule.resolvedAt = now
        if (body.decision === 'accept') {
            item.preferredAt = reschedule.proposedAt
            if (item.booking) item.booking.scheduledAt = reschedule.proposedAt
        }
        item.updatedAt = now
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: body.decision === 'accept' ? 'Клиент подтвердил новое время' : 'Клиент отклонил новое время', message: body.decision === 'accept' ? 'Новое время визита подтверждено клиентом.' : 'Клиент отклонил предложенное время визита.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) },
{ order: 124, handler: http.post('/api/owner/service-requests/:requestId/no-show', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || user.role !== 'owner' || !item || !hasMockProviderPermission(user.id, item.providerId, 'requests', item.locationId)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        if (item.status === 'no_show') {
            const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
            return HttpResponse.json(response)
        }
        if (item.status !== 'accepted' || !item.providerConfirmedAt || !item.preferredAt || new Date(item.preferredAt).getTime() > Date.now()) return HttpResponse.json({ message: 'Only confirmed visits after their scheduled time can be marked as no-show.' }, { status: 409 })
        const body = await request.json().catch(() => ({})) as { reason?: string | null }
        const now = new Date().toISOString()
        item.status = 'no_show'
        item.noShowAt = now
        item.noShowById = user.id
        item.noShowReason = typeof body.reason === 'string' ? body.reason.trim().slice(0, 1000) || null : null
        item.updatedAt = now
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Визит отмечен как неявка', message: 'Сервис отметил, что визит не состоялся.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) },
{ order: 125, handler: http.post('/api/owner/service-requests/:requestId/complete', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user || user.role !== 'owner' || !item || !hasMockProviderPermission(user.id, item.providerId, 'requests', item.locationId)) return HttpResponse.json({ message: 'Forbidden' }, { status: 403 })
        if (item.status === 'closed') {
            const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
            return HttpResponse.json(response)
        }
        if (item.status !== 'accepted' || !item.clientConfirmedAt || !item.providerConfirmedAt || !item.preferredAt || new Date(item.preferredAt).getTime() > Date.now()) {
            return HttpResponse.json({ message: 'Only confirmed visits after their scheduled time can be completed.' }, { status: 409 })
        }
        const body = await request.json().catch(() => ({})) as { note?: string | null }
        const now = new Date().toISOString()
        item.status = 'closed'
        item.completedAt = now
        item.completedById = user.id
        item.completionNote = typeof body.note === 'string' ? body.note.trim().slice(0, 1000) || null : null
        item.updatedAt = now
        awardMockAutoCareBonus(item, user.id)
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Визит завершён', message: 'Сервис отметил услугу завершённой. Теперь можно оставить отзыв.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) },
{ order: 126, handler: http.post('/api/v1/service-requests/:requestId/quote/accept', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        const body = await request.json().catch(() => ({})) as { quoteId?: string; quoteVersion?: number }
        const latestQuote = item.quoteHistory.at(-1)
        const quoteVersion = body.quoteVersion
        if (typeof body.quoteId !== 'string' || typeof quoteVersion !== 'number' || !Number.isInteger(quoteVersion) || quoteVersion < 1) return HttpResponse.json({ message: 'Quote id and version are required.' }, { status: 422 })
        if (!latestQuote || latestQuote.id !== body.quoteId || latestQuote.version !== quoteVersion) return HttpResponse.json({ message: 'The estimate changed. Review the latest estimate before deciding.' }, { status: 409 })
        if (item.status === 'accepted' && item.acceptedQuoteVersion !== null && item.acceptedQuoteVersion !== undefined) {
            const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
            return HttpResponse.json(response)
        }
        if (item.status !== 'estimate_shared' || !item.quote) return HttpResponse.json({ message: 'There is no pending estimate.' }, { status: 409 })
        if (latestQuote.status && latestQuote.status !== 'pending') return HttpResponse.json({ message: 'This estimate is no longer available.' }, { status: 409 })
        if (latestQuote.validUntil && new Date(latestQuote.validUntil).getTime() <= Date.now()) {
            latestQuote.status = 'expired'
            item.quote.status = 'expired'
            item.status = 'awaiting_reply'
            item.updatedAt = new Date().toISOString()
            return HttpResponse.json({ message: 'This estimate has expired.' }, { status: 409 })
        }
        item.status = 'accepted'
        const acceptedAt = new Date().toISOString()
        latestQuote.status = 'accepted'
        item.quote.status = 'accepted'
        const latestQuoteVersion = latestQuote && 'version' in latestQuote && typeof latestQuote.version === 'number' ? latestQuote.version : null
        item.clientConfirmedAt = acceptedAt
        item.acceptedQuoteVersion = latestQuoteVersion
        item.acceptedQuoteSnapshot = latestQuote ? { ...latestQuote, acceptedAt, acceptedFromQuoteVersion: latestQuoteVersion } : null
        item.acceptedQuoteAt = acceptedAt
        item.booking = latestQuote && latestQuoteVersion !== null && item.preferredAt
            ? {
                requestId: item.id,
                quoteVersion: latestQuoteVersion,
                amountMinor: latestQuote.amountMinor,
                currencyCode: latestQuote.currencyCode,
                lineItems: 'lineItems' in latestQuote && Array.isArray(latestQuote.lineItems) ? latestQuote.lineItems : [],
                scheduledAt: item.preferredAt,
                timezone: 'Europe/Moscow',
                serviceSlug: item.serviceSlug,
                providerId: item.providerId,
                locationId: item.locationId,
                status: 'confirmed',
                createdAt: acceptedAt,
                vehicleId: item.vehicleId ?? null,
                vehicleSnapshot: item.vehicleSnapshot,
            }
            : null
        item.updatedAt = acceptedAt
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: 'Клиент принял смету', message: 'Клиент подтвердил предварительную стоимость услуги.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) },
{ order: 127, handler: http.post('/api/v1/service-requests/:requestId/quote/decline', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (!item || item.clientId !== user.id) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        const body = await request.json().catch(() => ({})) as { quoteId?: string; quoteVersion?: number }
        const latestQuote = item.quoteHistory.at(-1)
        const quoteVersion = body.quoteVersion
        if (typeof body.quoteId !== 'string' || typeof quoteVersion !== 'number' || !Number.isInteger(quoteVersion) || quoteVersion < 1) return HttpResponse.json({ message: 'Quote id and version are required.' }, { status: 422 })
        if (!latestQuote || latestQuote.id !== body.quoteId || latestQuote.version !== quoteVersion) return HttpResponse.json({ message: 'The estimate changed. Review the latest estimate before deciding.' }, { status: 409 })
        if (item.status === 'declined' && item.clientConfirmedAt) {
            const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
            return HttpResponse.json(response)
        }
        if (item.status !== 'estimate_shared' || !item.quote) return HttpResponse.json({ message: 'There is no pending estimate.' }, { status: 409 })
        if (latestQuote.status && latestQuote.status !== 'pending') return HttpResponse.json({ message: 'This estimate is no longer available.' }, { status: 409 })
        if (latestQuote.validUntil && new Date(latestQuote.validUntil).getTime() <= Date.now()) {
            latestQuote.status = 'expired'
            item.quote.status = 'expired'
            item.status = 'awaiting_reply'
            item.updatedAt = new Date().toISOString()
            return HttpResponse.json({ message: 'This estimate has expired.' }, { status: 409 })
        }
        latestQuote.status = 'declined'
        item.quote.status = 'declined'
        item.status = 'declined'
        item.clientConfirmedAt = new Date().toISOString()
        item.acceptedQuoteVersion = null
        item.acceptedQuoteSnapshot = null
        item.acceptedQuoteAt = null
        item.updatedAt = new Date().toISOString()
        pushMockAutoCareNotification({ userId: 'user-owner-1', requestId: item.id, role: 'owner', title: 'Клиент отклонил смету', message: 'Клиент попросил не продолжать по этой смете.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) },
{ order: 128, handler: http.get('/api/owner/service-requests', ({ request }) => {
        const scenario = mockScenarioResponse(request)
        if (scenario) return scenario
        const user = currentMockUser()
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        expireMockAutoCareQuotes()
        if (user.role !== 'owner') return HttpResponse.json({ message: 'Only owners can view service requests.' }, { status: 403 })
        const items = isMockEmpty(request) ? [] : mockAutoCareServiceRequests
            .filter((item) => hasMockProviderPermission(user.id, item.providerId, 'requests', item.locationId))
            .map(({ clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...item }) => item)
        return HttpResponse.json(items)
    }) },
{ order: 129, handler: http.post('/api/owner/service-requests/:requestId/confirm', ({ params }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((request) => request.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'owner' || !item || !hasMockProviderPermission(user.id, item.providerId, 'requests', item.locationId)) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        item.providerConfirmedAt ??= new Date().toISOString()
        item.status = 'accepted'
        item.updatedAt = new Date().toISOString()
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Сервис подтвердил заявку', message: 'Сервис подтвердил заявку и готов перейти к следующему шагу.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) },
{ order: 130, handler: http.post('/api/owner/service-requests/:requestId/quote', async ({ params, request }) => {
        const user = currentMockUser()
        const item = mockAutoCareServiceRequests.find((candidate) => candidate.id === params.requestId)
        if (!user) return HttpResponse.json({ message: 'Unauthorized' }, { status: 401 })
        if (user.role !== 'owner' || !item || !hasMockProviderPermission(user.id, item.providerId, 'requests', item.locationId)) return HttpResponse.json({ message: 'Service request not found.' }, { status: 404 })
        if (item.status === 'accepted' || item.status === 'declined' || item.status === 'closed') return HttpResponse.json({ message: 'This service request cannot receive a new estimate.' }, { status: 409 })
        const body = await request.json() as { amountMinor?: number; currencyCode?: string; note?: string | null; validUntil?: string | null }
        const amountMinor = body.amountMinor
        const currencyCode = body.currencyCode
        if (typeof amountMinor !== 'number' || !Number.isInteger(amountMinor) || amountMinor <= 0 || !/^[A-Z]{3}$/.test(currencyCode ?? '')) return invalidMockBodyResponse()
        if (body.validUntil !== undefined && body.validUntil !== null && (!Number.isFinite(Date.parse(body.validUntil)) || Date.parse(body.validUntil) <= Date.now())) return HttpResponse.json({ message: 'The estimate expiration must be in the future.' }, { status: 409 })
        const now = new Date().toISOString()
        const validUntil = body.validUntil ?? null
        for (const previousQuote of item.quoteHistory) {
            if (previousQuote.status === 'pending') previousQuote.status = 'superseded'
        }
        const quoteId = `mock-quote-${Date.now()}`
        item.quote = { amountMinor, currencyCode: currencyCode!, note: body.note?.trim() || null, createdAt: now, status: 'pending', validUntil }
        item.quoteHistory.push({ id: quoteId, version: item.quoteHistory.length + 1, amountMinor, currencyCode: currencyCode!, note: body.note?.trim() || null, createdAt: now, status: 'pending', validUntil })
        item.status = 'estimate_shared'
        item.updatedAt = now
        pushMockAutoCareNotification({ userId: item.clientId, requestId: item.id, role: 'client', title: 'Сервис прислал предварительную смету', message: 'Проверьте предварительную стоимость услуги.' })
        const { clientId: _clientId, idempotencyKey: _idempotencyKey, idempotencyFingerprint: _fingerprint, ...response } = item
        return HttpResponse.json(response)
    }) }
]
