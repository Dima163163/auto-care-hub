import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity.js'
import { assertRefundActorIsSuperAdmin } from './refund-authorization.js'

describe('refund authorization', () => {
    it('allows only a super admin to initiate a financial refund mutation', () => {
        expect(() => assertRefundActorIsSuperAdmin(UserRole.SuperAdmin)).not.toThrow()
        expect(() => assertRefundActorIsSuperAdmin(UserRole.Admin)).toThrow(/super admins/i)
        expect(() => assertRefundActorIsSuperAdmin(UserRole.Owner)).toThrow(/super admins/i)
        expect(() => assertRefundActorIsSuperAdmin(UserRole.Client)).toThrow(/super admins/i)
    })
})
