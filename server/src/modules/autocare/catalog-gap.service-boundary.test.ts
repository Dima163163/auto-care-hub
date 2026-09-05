import { describe, expect, it } from 'vitest'

import { AutomotiveCatalogGapRequestStatus } from '../../entities/automotive/catalog-gap-request.entity.js'
import { AutomotivePriceType } from '../../entities/automotive/automotive.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import {
    createAutoCareCatalogGapRequest,
    decideAdminCatalogGapRequest,
    listAdminCatalogGapRequests,
    updateAdminAutoCareServiceDefinition,
} from './catalog-gap.service.js'

const client = { id: '11111111-1111-4111-8111-111111111111', role: UserRole.Client } as never
const admin = { id: '22222222-2222-4222-8222-222222222222', role: UserRole.Admin } as never

const validGap = {
    proposedSlug: 'wheel-alignment',
    categorySlug: 'maintenance',
    labels: { en: 'Wheel alignment' },
    priceType: AutomotivePriceType.Fixed,
    comparisonAttributes: ['duration'],
    rationale: 'This service is frequently requested but missing from the catalog.',
}

const validDefinition = {
    categorySlug: 'maintenance',
    labels: { en: 'Wheel alignment' },
    priceType: AutomotivePriceType.Fixed,
    comparisonAttributes: ['duration'],
    active: true,
}

describe('Catalog gap service boundaries', () => {
    it('rejects malformed catalog proposals before provider lookup', async () => {
        await expect(createAutoCareCatalogGapRequest(client, null as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(createAutoCareCatalogGapRequest(client, { ...validGap, providerId: 'not-a-uuid' })).rejects.toMatchObject({ statusCode: 422 })
    })

    it('bounds admin catalog-gap filters before repository access', async () => {
        await expect(listAdminCatalogGapRequests(admin, 'unknown' as never)).rejects.toMatchObject({ statusCode: 422 })
        await expect(listAdminCatalogGapRequests(client, AutomotiveCatalogGapRequestStatus.Pending)).rejects.toMatchObject({ statusCode: 403 })
    })

    it('keeps admin authorization and id validation ahead of gap decisions', async () => {
        await expect(decideAdminCatalogGapRequest(client, 'not-a-uuid', AutomotiveCatalogGapRequestStatus.Approved)).rejects.toMatchObject({ statusCode: 403 })
        await expect(decideAdminCatalogGapRequest(admin, 'not-a-uuid', AutomotiveCatalogGapRequestStatus.Approved)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed service-definition ids before repository access', async () => {
        await expect(updateAdminAutoCareServiceDefinition(admin, 'not-a-uuid', validDefinition)).rejects.toMatchObject({ statusCode: 422 })
    })

    it('rejects malformed definition payloads and preserves admin authorization order', async () => {
        await expect(updateAdminAutoCareServiceDefinition(admin, '11111111-1111-4111-8111-111111111111', { ...validDefinition, extra: true })).rejects.toMatchObject({ statusCode: 422 })
        await expect(updateAdminAutoCareServiceDefinition(client, 'not-a-uuid', null as never)).rejects.toMatchObject({ statusCode: 403 })
    })
})
