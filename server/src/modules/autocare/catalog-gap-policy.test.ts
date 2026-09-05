import { describe, expect, it } from 'vitest'

import { AutomotiveCatalogGapRequestStatus } from '../../entities/automotive/catalog-gap-request.entity.js'
import { normalizeAdminServiceDefinitionUpdate, normalizeCatalogGapRequestDecision, normalizeCatalogGapRequestInput, normalizeCatalogGapRequestStatus, normalizeCatalogGapRequestUuid } from './catalog-gap-policy.js'

describe('catalog gap request policy', () => {
    it('normalizes supported queue statuses', () => {
        expect(normalizeCatalogGapRequestStatus('  PENDING ')).toBe(AutomotiveCatalogGapRequestStatus.Pending)
        expect(normalizeCatalogGapRequestStatus('approved')).toBe(AutomotiveCatalogGapRequestStatus.Approved)
        expect(normalizeCatalogGapRequestStatus('unknown')).toBeNull()
        expect(normalizeCatalogGapRequestStatus(null)).toBeNull()
    })

    it('normalizes valid admin decisions and reasons', () => {
        expect(normalizeCatalogGapRequestDecision(' APPROVED ', '  Add this service.  ')).toEqual({
            status: AutomotiveCatalogGapRequestStatus.Approved,
            reason: 'Add this service.',
        })
        expect(normalizeCatalogGapRequestDecision(AutomotiveCatalogGapRequestStatus.Rejected, '  Не хватает данных.  ')).toEqual({
            status: AutomotiveCatalogGapRequestStatus.Rejected,
            reason: 'Не хватает данных.',
        })
        expect(normalizeCatalogGapRequestDecision('approved', null)).toEqual({ status: AutomotiveCatalogGapRequestStatus.Approved, reason: null })
    })

    it('rejects unsupported or unsafe decisions', () => {
        expect(normalizeCatalogGapRequestDecision('pending', 'reason')).toBeNull()
        expect(normalizeCatalogGapRequestDecision('rejected', null)).toBeNull()
        expect(normalizeCatalogGapRequestDecision('approved', 42)).toBeNull()
        expect(normalizeCatalogGapRequestDecision('rejected', 'x'.repeat(2_001))).toBeNull()
    })

    it('canonicalizes request identifiers', () => {
        expect(normalizeCatalogGapRequestUuid('  11111111-1111-4111-8111-111111111111  ')).toBe('11111111-1111-4111-8111-111111111111')
        expect(normalizeCatalogGapRequestUuid('not-a-uuid')).toBeNull()
        expect(normalizeCatalogGapRequestUuid({})).toBeNull()
    })

    it('normalizes an admin service definition update before persistence', () => {
        expect(normalizeAdminServiceDefinitionUpdate({
            categorySlug: '  brakes ',
            labels: { RU: '  Тормоза ', en: ' Brakes ' },
            priceType: ' FIXED ',
            comparisonAttributes: [' duration ', 'duration', '  brand '],
            active: true,
        })).toEqual({
            categorySlug: 'brakes',
            labels: { ru: 'Тормоза', en: 'Brakes' },
            priceType: 'fixed',
            comparisonAttributes: ['duration', 'brand'],
            active: true,
        })
    })

    it('rejects malformed service definition updates and normalized key collisions', () => {
        expect(normalizeAdminServiceDefinitionUpdate({ categorySlug: 'x', labels: { ru: 'Label' }, priceType: 'fixed', comparisonAttributes: [], active: true })).toBeNull()
        expect(normalizeAdminServiceDefinitionUpdate({ categorySlug: 'brakes', labels: { ru: 'Label', RU: 'Другой' }, priceType: 'fixed', comparisonAttributes: [], active: true })).toBeNull()
        expect(normalizeAdminServiceDefinitionUpdate({ categorySlug: 'brakes', labels: { ru: 'Label' }, priceType: 'unknown', comparisonAttributes: [], active: true })).toBeNull()
        expect(normalizeAdminServiceDefinitionUpdate({ categorySlug: 'brakes', labels: { ru: 'Label' }, priceType: 'fixed', comparisonAttributes: ['x'.repeat(81)], active: true })).toBeNull()
        expect(normalizeAdminServiceDefinitionUpdate({ categorySlug: 'brakes', labels: { ru: 'Label' }, priceType: 'fixed', comparisonAttributes: [], active: 'yes' })).toBeNull()
    })

    it('normalizes a catalog-gap creation payload before permission checks', () => {
        expect(normalizeCatalogGapRequestInput({
            providerId: '  11111111-1111-4111-8111-111111111111  ',
            proposedSlug: ' Wheel-Alignment ',
            categorySlug: ' chassis ',
            labels: { RU: '  Сход-развал ', en: ' Wheel alignment ' },
            priceType: ' FROM ',
            comparisonAttributes: [' duration ', 'duration'],
            rationale: '  The service is missing from the shared catalog.  ',
        })).toEqual({
            providerId: '11111111-1111-4111-8111-111111111111',
            proposedSlug: 'wheel-alignment',
            categorySlug: 'chassis',
            labels: { ru: 'Сход-развал', en: 'Wheel alignment' },
            priceType: 'from',
            comparisonAttributes: ['duration'],
            rationale: 'The service is missing from the shared catalog.',
        })
    })

    it('rejects malformed catalog-gap creation payloads without truncation', () => {
        const valid = {
            providerId: null,
            proposedSlug: 'wheel-alignment',
            categorySlug: 'chassis',
            labels: { ru: 'Сход-развал' },
            priceType: 'from',
            comparisonAttributes: ['duration'],
            rationale: 'The service is missing from the shared catalog.',
        }
        expect(normalizeCatalogGapRequestInput({ ...valid, providerId: 'not-a-uuid' })).toBeNull()
        expect(normalizeCatalogGapRequestInput({ ...valid, proposedSlug: 'Wheel alignment' })).toBeNull()
        expect(normalizeCatalogGapRequestInput({ ...valid, labels: {} })).toBeNull()
        expect(normalizeCatalogGapRequestInput({ ...valid, rationale: 'too short' })).toBeNull()
        expect(normalizeCatalogGapRequestInput({ ...valid, extra: true })).toBeNull()
        expect(normalizeCatalogGapRequestInput({ ...valid, comparisonAttributes: Array.from({ length: 31 }, (_, index) => `attribute-${index}`) })).toBeNull()
    })
})
