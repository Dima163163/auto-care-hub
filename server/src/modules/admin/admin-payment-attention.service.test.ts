import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { BookingPaymentEntity } from '../../entities/booking/booking-payment.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { getAdminPaymentAttention } from './admin.service.js'

describe('admin payment attention', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('returns bounded provider outcome counters only for super admins', async () => {
        const paymentRepository = {
            countBy: vi.fn().mockResolvedValue(3),
        }
        const disputeRepository = {
            countBy: vi.fn()
                .mockResolvedValueOnce(2)
                .mockResolvedValueOnce(1),
        }

        vi.spyOn(AppDataSource, 'getRepository').mockImplementation((entity) => (
            entity === BookingPaymentEntity ? paymentRepository : disputeRepository
        ) as never)

        await expect(getAdminPaymentAttention({ role: UserRole.SuperAdmin } as never)).resolves.toEqual({
            failedPaymentCount: 3,
            openDisputeCount: 2,
            fundsWithdrawnDisputeCount: 1,
        })
        expect(JSON.stringify(paymentRepository)).not.toContain('stripe')
        expect(disputeRepository.countBy).toHaveBeenCalledTimes(2)
    })

    it('rejects regular admins because the aggregate is operator-sensitive', async () => {
        await expect(getAdminPaymentAttention({ role: UserRole.Admin } as never))
            .rejects.toMatchObject({ statusCode: 403 })
    })
})
