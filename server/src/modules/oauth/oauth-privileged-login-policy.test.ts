import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import { assertOAuthLoginRoleAllowed } from './oauth-privileged-login-policy.js'

describe('OAuth privileged login policy', () => {
    it.each([UserRole.Admin, UserRole.SuperAdmin])('rejects %s before issuing a session', (role) => {
        expect(() => assertOAuthLoginRoleAllowed(role)).toThrow(/Privileged accounts/)
    })

    it.each([UserRole.Client, UserRole.Owner])('allows %s', (role) => {
        expect(() => assertOAuthLoginRoleAllowed(role)).not.toThrow()
    })
})
