import { describe, expect, it } from 'vitest'

import { UserRole } from '../../entities/user/user.entity'
import { AppError } from '../../shared/errors/app-error'
import { ERROR_CODES } from '../../shared/errors/error-codes'
import { assertCabinetOwner } from './cabinet-owner-access'

describe('cabinet owner access', () => {
    it('allows owner accounts', () => {
        expect(() =>
            assertCabinetOwner({
                role: UserRole.Owner,
            })
        ).not.toThrow()
    })

    it.each([
        UserRole.Client,
        UserRole.Admin,
        UserRole.SuperAdmin,
    ])('rejects %s accounts', (role) => {
        expect(() =>
            assertCabinetOwner({
                role,
            })
        ).toThrow(AppError)

        try {
            assertCabinetOwner({
                role,
            })
        } catch (error) {
            expect((error as AppError).code).toBe(ERROR_CODES.Forbidden)
        }
    })
})
