import { describe, expect, it } from 'vitest'

import {
    getCabinetImageObjectKeyPrefix,
    getCabinetImageObjectNamespace,
} from './cabinet-image-object-key.js'

describe('cabinet image object namespace', () => {
    it('scopes objects to a normalized cabinet UUID', () => {
        const id = 'A0000000-0000-4000-8000-000000000001'
        expect(getCabinetImageObjectNamespace(id)).toBe('cabinet/a0000000-0000-4000-8000-000000000001')
        expect(getCabinetImageObjectKeyPrefix(id)).toBe('cabinet/a0000000-0000-4000-8000-000000000001/')
    })

    it('rejects traversal-shaped namespaces', () => {
        expect(() => getCabinetImageObjectNamespace('../cabinet')).toThrow('Invalid cabinet image namespace.')
    })
})
