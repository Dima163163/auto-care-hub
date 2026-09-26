import { describe, expect, it } from 'vitest'

import { getProviderSeoCopy, getSeoCopy } from './SeoHead'

describe('localized route SEO titles', () => {
    it('uses Russian labels for discovery, provider and business pages', () => {
        expect(getSeoCopy('/services', 'ru').title.endsWith('| Поиск')).toBe(true)
        expect(getSeoCopy('/services/api-proservice-moscow', 'ru').title.endsWith('| Автосервис')).toBe(true)
        expect(getSeoCopy('/for-owners', 'ru').title.endsWith('| Для компаний')).toBe(true)
    })

    it('keeps English route labels in English', () => {
        expect(getSeoCopy('/services/api-proservice-moscow', 'en').title.endsWith('| Auto service')).toBe(true)
        expect(getSeoCopy('/for-owners', 'en').title.endsWith('| For businesses')).toBe(true)
    })

    it('keeps public provider metadata specific after the client app hydrates', () => {
        expect(getProviderSeoCopy({ name: 'ProService', description: 'Public provider description' }, 'ru')).toEqual({
            title: 'ProService | AutoCare Hub',
            description: 'Public provider description',
        })
        expect(getProviderSeoCopy({ name: 'ProService', description: null }, 'en').description).toContain('ProService')
        expect(getProviderSeoCopy({ name: 'ProService', description: null }, 'ru').description).toContain('«ProService»')
    })
})
