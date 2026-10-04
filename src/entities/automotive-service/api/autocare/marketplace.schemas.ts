import { z } from 'zod'
import { autoCareScalarRecordSchema } from './requests.schemas'

export const autoCareBroadcastOfferSchema = z.object({ id: z.string(), broadcastRequestId: z.string(), providerId: z.string(), providerName: z.string(), locationId: z.string(), address: z.string(), offerSnapshot: z.record(z.string(), z.unknown()), status: z.string(), createdAt: z.string() }).passthrough()

export const autoCareBroadcastSchema = z.object({ id: z.string(), serviceDefinitionId: z.string(), serviceSlug: z.string(), marketId: z.string().nullable(), issueDescription: z.string(), vehicleSnapshot: autoCareScalarRecordSchema.nullable(), preferredAt: z.string().nullable(), status: z.string(), maxProviders: z.number().int().positive(), expiresAt: z.string(), createdAt: z.string(), offers: z.array(autoCareBroadcastOfferSchema) }).passthrough()

export const autoCareBroadcastsSchema = z.array(autoCareBroadcastSchema)

export const autoCareGuaranteeClaimSchema = z.object({ id: z.string(), requestId: z.string(), claimType: z.string(), status: z.string(), summary: z.string(), evidenceUrls: z.array(z.string()), resolution: z.string().nullable(), createdAt: z.string(), updatedAt: z.string() }).passthrough()

export const autoCareGuaranteeClaimsSchema = z.array(autoCareGuaranteeClaimSchema)

export const autoCareExpertQuestionSchema = z.object({ id: z.string(), symptoms: z.string(), categorySlug: z.string().nullable(), vehicleSnapshot: z.record(z.string(), z.unknown()).nullable(), status: z.string(), answer: z.string().nullable(), createdAt: z.string(), answeredAt: z.string().nullable() }).passthrough()

export const autoCareExpertQuestionsSchema = z.array(autoCareExpertQuestionSchema)

export const autoCareFleetVehicleSchema = z.object({ id: z.string(), fleetId: z.string(), label: z.string(), vehicleSnapshot: z.record(z.string(), z.unknown()), approvalPolicy: z.string().nullable(), createdAt: z.string() }).passthrough()

export const autoCareFleetSchema = z.object({ id: z.string(), name: z.string(), notes: z.string().nullable(), vehicles: z.array(autoCareFleetVehicleSchema), createdAt: z.string(), updatedAt: z.string() }).passthrough()

export const autoCareFleetsSchema = z.array(autoCareFleetSchema)
