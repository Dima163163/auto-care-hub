import { autoCareBonusAccountSchema, autoCareBonusAccountsSchema, autoCareBonusProgramSchema, ownerAutoCareBonusLiabilitySchema } from './bonuses.schemas'
import type { AutoCareBonusAccount, AutoCareBonusProgram, GrantAutoCareBonusInput, OwnerAutoCareBonusLiability, OwnerAutoCareBonusProgramInput, RedeemAutoCareBonusInput } from './bonuses.types'
import type { AutoCareEndpointBuilder } from './endpoint-builder'

export function createBonusesEndpoints(build: AutoCareEndpointBuilder) {
    return {
getOwnerAutoCareBonusLiability: build.query<OwnerAutoCareBonusLiability, string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/bonus-liability`,
            transformResponse: (value: unknown) => ownerAutoCareBonusLiabilitySchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `BONUS_LIABILITY_${providerId}` }],
        }),
getMyAutoCareBonusAccounts: build.query<AutoCareBonusAccount[], void>({
            query: () => '/v1/bonuses/my',
            transformResponse: (value: unknown) => autoCareBonusAccountsSchema.parse(value),
            providesTags: [{ type: 'AutoCareMarketplace', id: 'BONUSES_MY' }],
        }),
redeemAutoCareBonus: build.mutation<AutoCareBonusAccount, RedeemAutoCareBonusInput>({
            query: ({ idempotencyKey, ...body }) => ({ url: '/v1/bonuses/redeem', method: 'POST', ...(idempotencyKey ? { headers: { 'Idempotency-Key': idempotencyKey } } : {}), body }),
            transformResponse: (value: unknown) => autoCareBonusAccountSchema.parse(value),
            invalidatesTags: (_result, _error, { requestId }) => [{ type: 'AutoCareMarketplace', id: 'BONUSES_MY' }, { type: 'AutoCareServiceRequest', id: requestId }, { type: 'AutoCareServiceRequest', id: 'LIST' }],
        }),
grantAutoCareBonus: build.mutation<AutoCareBonusAccount, GrantAutoCareBonusInput>({
            query: ({ providerId, clientId, idempotencyKey, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/bonus-accounts/${encodeURIComponent(clientId)}/grants`, method: 'POST', headers: { 'Idempotency-Key': idempotencyKey }, body }),
            transformResponse: (value: unknown) => autoCareBonusAccountSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `BONUS_${providerId}` }],
        }),
getOwnerAutoCareBonusProgram: build.query<AutoCareBonusProgram | null, string>({
            query: (providerId) => `/owner/autocare-providers/${encodeURIComponent(providerId)}/bonus-program`,
            transformResponse: (value: unknown) => value === null ? null : autoCareBonusProgramSchema.parse(value),
            providesTags: (_result, _error, providerId) => [{ type: 'AutoCareProvider', id: `BONUS_${providerId}` }],
        }),
upsertOwnerAutoCareBonusProgram: build.mutation<AutoCareBonusProgram, OwnerAutoCareBonusProgramInput>({
            query: ({ providerId, ...body }) => ({ url: `/owner/autocare-providers/${encodeURIComponent(providerId)}/bonus-program`, method: 'PUT', body }),
            transformResponse: (value: unknown) => autoCareBonusProgramSchema.parse(value),
            invalidatesTags: (_result, _error, { providerId }) => [{ type: 'AutoCareProvider', id: `BONUS_${providerId}` }, { type: 'AutoCareProvider', id: providerId }],
        })
    }
}
