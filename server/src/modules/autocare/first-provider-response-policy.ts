import { AutomotiveProviderMembershipStatus } from '../../entities/automotive/provider-membership.entity.js'

type Provider = { id: string; ownerId?: string | null }
type Membership = { providerId: string; userId: string; locationId: string | null; status: string }
type Request = { id: string; providerId: string; locationId: string; clientId: string; createdAt: Date }
type Message = { requestId: string | null; senderId: string; kind?: string; createdAt: Date }

/** Current access is used for historical messages until membership audit intervals exist. */
export function getFirstProviderResponseMinutes(input: {
    providers: readonly Provider[]
    memberships: readonly Membership[]
    requests: readonly Request[]
    messages: readonly Message[]
}): Map<string, number> {
    const providerById = new Map(input.providers.map((provider) => [provider.id, provider]))
    const requestById = new Map(input.requests.map((request) => [request.id, request]))
    const activeMembersByProvider = new Map<string, Membership[]>()
    for (const membership of input.memberships) {
        if (membership.status !== AutomotiveProviderMembershipStatus.Active) continue
        const members = activeMembersByProvider.get(membership.providerId) ?? []
        members.push(membership)
        activeMembersByProvider.set(membership.providerId, members)
    }

    const firstResponseMs = new Map<string, number>()
    for (const message of input.messages) {
        if (!message.requestId || message.kind === 'system') continue
        const request = requestById.get(message.requestId)
        const provider = request && providerById.get(request.providerId)
        if (!request || !provider || message.senderId === request.clientId) continue
        const createdAtMs = request.createdAt.getTime()
        const sentAtMs = message.createdAt.getTime()
        if (!Number.isFinite(createdAtMs) || !Number.isFinite(sentAtMs) || sentAtMs < createdAtMs) continue
        const authorized = provider.ownerId === message.senderId || (activeMembersByProvider.get(request.providerId) ?? []).some((member) =>
            member.userId === message.senderId && (member.locationId === null || member.locationId === request.locationId))
        if (!authorized) continue
        const previous = firstResponseMs.get(request.id)
        if (previous === undefined || sentAtMs < previous) firstResponseMs.set(request.id, sentAtMs)
    }
    return new Map(input.requests.flatMap((request) => {
        const sentAtMs = firstResponseMs.get(request.id)
        return sentAtMs === undefined ? [] : [[request.id, (sentAtMs - request.createdAt.getTime()) / 60_000] as const]
    }))
}
