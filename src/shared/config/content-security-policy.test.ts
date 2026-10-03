import { describe, expect, it } from 'vitest'
import { createContentSecurityPolicy } from './content-security-policy'
const base = { nonce: 'syntheticnonce01234567890123456789', apiOrigin: 'https://api.example.test/v1', frontendOrigin: 'https://app.example.test', development: false }
describe('request nonce CSP', () => {
    it('removes production inline/eval scripts and broad WebSocket schemes', () => {
        const policy = createContentSecurityPolicy(base)
        const scripts = policy.split('; ').find((item) => item.startsWith('script-src'))
        expect(scripts).toContain("'nonce-syntheticnonce01234567890123456789'")
        expect(scripts).toContain("'strict-dynamic'")
        expect(scripts).not.toContain('unsafe-inline')
        expect(scripts).not.toContain('unsafe-eval')
        expect(policy).toContain('wss://api.example.test')
        expect(policy).toContain('wss://app.example.test')
        expect(policy).not.toMatch(/\s(?:ws|wss):(?:\s|;)/)
    })
    it('allows development eval while keeping connect origins explicit', () => {
        const policy = createContentSecurityPolicy({ ...base, apiOrigin: 'http://127.0.0.1:4000', frontendOrigin: 'http://localhost:4173', development: true })
        expect(policy).toContain('unsafe-eval')
        expect(policy).toContain('ws://localhost:4173')
    })
    it('rejects header injection and credential-bearing/non-HTTP origins', () => {
        expect(() => createContentSecurityPolicy({ ...base, nonce: "bad'; script-src *" })).toThrow()
        for (const apiOrigin of ['https://user:secret@api.example.test', 'wss://api.example.test']) expect(() => createContentSecurityPolicy({ ...base, apiOrigin })).toThrow()
    })
})
