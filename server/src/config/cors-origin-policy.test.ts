import { afterEach, describe, expect, it } from 'vitest'

import { getCorsOrigins } from './env.js'

const originalCorsOrigins = process.env.CORS_ORIGINS

afterEach(() => {
    if (originalCorsOrigins === undefined) {
        delete process.env.CORS_ORIGINS
    } else {
        process.env.CORS_ORIGINS = originalCorsOrigins
    }
})

describe('getCorsOrigins', () => {
    it('allows the local Next release smoke origins only outside production', () => {
        process.env.CORS_ORIGINS = 'http://localhost:5173'

        const developmentOrigins = getCorsOrigins('development', 'http://localhost:5173')
        process.env.CORS_ORIGINS = 'https://autocare.example'
        const productionOrigins = getCorsOrigins('production', 'https://autocare.example')

        expect(developmentOrigins).toContain('http://localhost:4175')
        expect(developmentOrigins).toContain('http://127.0.0.1:4175')
        expect(productionOrigins).toEqual(['https://autocare.example'])
        expect(productionOrigins).not.toContain('http://localhost:4175')
        expect(productionOrigins).not.toContain('http://127.0.0.1:4175')
    })

    it('deduplicates configured origins while retaining the development defaults', () => {
        process.env.CORS_ORIGINS = 'http://localhost:4175,http://localhost:4175'

        const origins = getCorsOrigins('test', 'http://localhost:5173')

        expect(origins.filter((origin) => origin === 'http://localhost:4175')).toHaveLength(1)
        expect(origins).toContain('http://127.0.0.1:4175')
    })
})
