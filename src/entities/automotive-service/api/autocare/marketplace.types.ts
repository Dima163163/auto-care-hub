

export type AutoCareBroadcastOffer = { id: string; broadcastRequestId: string; providerId: string; providerName: string; locationId: string; address: string; offerSnapshot: Record<string, unknown>; status: string; createdAt: string }

export type AutoCareBroadcastRequest = { id: string; serviceDefinitionId: string; serviceSlug: string; marketId: string | null; issueDescription: string; vehicleSnapshot: Record<string, string | number | null> | null; preferredAt: string | null; status: string; maxProviders: number; expiresAt: string; createdAt: string; offers: AutoCareBroadcastOffer[] }

export type CreateAutoCareBroadcastRequestInput = { serviceDefinitionId: string; marketId?: string | null; issueDescription: string; vehicleSnapshot?: Record<string, string | number | null> | null; photoUrls?: string[]; preferredAt?: string | null; maxProviders?: number }

export type CreateAutoCareBroadcastOfferInput = { broadcastId: string; locationId: string; amountMinor: number; currencyCode: string; note?: string | null; durationMinutes?: number; validUntil?: string | null }

export type AutoCareGuaranteeClaim = { id: string; requestId: string; claimType: string; status: string; summary: string; evidenceUrls: string[]; resolution: string | null; createdAt: string; updatedAt: string }

export type CreateAutoCareGuaranteeClaimInput = { requestId: string; claimType: string; summary: string; evidenceUrls?: string[] }

export type AutoCareExpertQuestion = { id: string; symptoms: string; categorySlug: string | null; vehicleSnapshot: Record<string, unknown> | null; status: string; answer: string | null; createdAt: string; answeredAt: string | null }

export type CreateAutoCareExpertQuestionInput = { symptoms: string; categorySlug?: string | null; vehicleSnapshot?: Record<string, string | number | null> | null }

export type AutoCareFleetVehicle = { id: string; fleetId: string; label: string; vehicleSnapshot: Record<string, unknown>; approvalPolicy: string | null; createdAt: string }

export type AutoCareFleet = { id: string; name: string; notes: string | null; vehicles: AutoCareFleetVehicle[]; createdAt: string; updatedAt: string }

export type CreateAutoCareFleetInput = { name: string; notes?: string | null }

export type CreateAutoCareFleetVehicleInput = { fleetId: string; label: string; vehicleSnapshot: Record<string, unknown>; approvalPolicy?: string | null }
