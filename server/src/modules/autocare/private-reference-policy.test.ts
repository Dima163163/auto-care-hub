import { describe, expect, it } from 'vitest'

import { normalizeAutoCareMediaReferences, normalizeAutoCarePrivateDocuments } from './private-reference-policy.js'

describe('private media reference policy', () => {
    it('normalizes only references inside the requested namespace', () => {
        expect(normalizeAutoCareMediaReferences([
            ' private://autocare/claims/request-1/evidence.jpg ',
        ], ['claims'])).toEqual(['private://autocare/claims/request-1/evidence.jpg'])
        expect(normalizeAutoCareMediaReferences(['private://autocare/requests/request-1/evidence.jpg'], ['claims'])).toBeNull()
        expect(normalizeAutoCareMediaReferences(['https://example.com/evidence.jpg'], ['claims'])).toBeNull()
    })

    it('fails closed for non-string and oversized collections', () => {
        expect(normalizeAutoCareMediaReferences([null], ['claims'])).toBeNull()
        expect(normalizeAutoCareMediaReferences(Array.from({ length: 21 }, (_, index) => `private://autocare/claims/request-${index}/evidence.jpg`), ['claims'])).toBeNull()
    })

    it('supports the request and broadcast namespaces with their twelve-item bound', () => {
        expect(normalizeAutoCareMediaReferences([
            ' private://autocare/requests/request-1/photo-1 ',
            'private://autocare/broadcasts/request-1/photo-2',
        ], ['requests', 'broadcasts'], 12)).toEqual([
            'private://autocare/requests/request-1/photo-1',
            'private://autocare/broadcasts/request-1/photo-2',
        ])
        expect(normalizeAutoCareMediaReferences(Array.from({ length: 13 }, (_, index) => `private://autocare/requests/request-1/photo-${index}`), ['requests', 'broadcasts'], 12)).toBeNull()
        expect(normalizeAutoCareMediaReferences(['private://autocare/claims/request-1/photo-1'], ['requests', 'broadcasts'], 12)).toBeNull()
    })

    it('normalizes bounded provider documents and rejects malformed expiry values', () => {
        expect(normalizeAutoCarePrivateDocuments([
            { label: ' Лицензия ', reference: ' private://providers/docs/license.pdf ', expiresAt: '2026-12-01T00:00:00+04:00' },
            { label: 'Без срока', reference: 'private://providers/docs/registration.pdf' },
        ])).toMatchObject([
            { label: 'Лицензия', reference: 'private://providers/docs/license.pdf' },
            { label: 'Без срока', reference: 'private://providers/docs/registration.pdf', expiresAt: null },
        ])
        expect(normalizeAutoCarePrivateDocuments([{ label: '', reference: 'private://providers/docs/license.pdf' }])).toBeNull()
        expect(normalizeAutoCarePrivateDocuments([{ label: 'Лицензия', reference: 'private://providers/docs/license.pdf', expiresAt: '2026-12-01' }])).toBeNull()
        expect(normalizeAutoCarePrivateDocuments(Array.from({ length: 21 }, () => ({ label: 'Документ', reference: 'private://providers/docs/license.pdf' })))).toBeNull()
    })
})
