import { afterEach, describe, expect, it, vi } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { BookingPaymentEntity } from '../../entities/booking/booking-payment.entity.js'
import { BookingPaymentRefundStatus } from '../../entities/booking/booking-payment-refund.entity.js'
import { UserRole } from '../../entities/user/user.entity.js'
import { getAdminPaymentRefunds } from './admin.service.js'

const admin = { role: UserRole.Admin } as never

describe('admin payment refund history', () => {
    afterEach(() => {
        vi.restoreAllMocks()
    })

    it('requires an existing payment and returns bounded ledger fields', async () => {
        const createdAt = new Date('2026-08-01T00:00:00.000Z')
        const updatedAt = new Date('2026-08-01T00:01:00.000Z')
        const paymentRepository = {
            findOne: vi.fn().mockResolvedValue({ id: 'payment-1' }),
        }
        const refundRepository = {
            find: vi.fn().mockResolvedValue([{
                id: 'refund-1',
                paymentId: 'payment-1',
                bookingId: 'booking-1',
                providerRefundId: 're_123',
                providerChargeId: 'ch_123',
                amountMinor: 2500,
                currency: 'rub',
                reason: 'requested_by_customer',
                status: BookingPaymentRefundStatus.Succeeded,
                createdAt,
                updatedAt,
            }]),
        }
        vi.spyOn(AppDataSource, 'getRepository').mockImplementation((entity) => (
            entity === BookingPaymentEntity
                ? paymentRepository
                : refundRepository
        ) as never)

        await expect(getAdminPaymentRefunds(admin, 'payment-1')).resolves.toEqual([{
            id: 'refund-1',
            paymentId: 'payment-1',
            bookingId: 'booking-1',
            providerRefundId: 're_123',
            providerChargeId: 'ch_123',
            amountMinor: 2500,
            currency: 'rub',
            reason: 'requested_by_customer',
            status: BookingPaymentRefundStatus.Succeeded,
            createdAt,
            updatedAt,
        }])
        expect(refundRepository.find).toHaveBeenCalledWith({
            where: { paymentId: 'payment-1' },
            order: { createdAt: 'ASC', id: 'ASC' },
            take: 100,
        })
    })

    it('returns not found for an unknown payment', async () => {
        vi.spyOn(AppDataSource, 'getRepository').mockReturnValue({
            findOne: vi.fn().mockResolvedValue(null),
        } as never)

        await expect(getAdminPaymentRefunds(admin, 'missing')).rejects.toMatchObject({
            statusCode: 404,
        })
    })
})
