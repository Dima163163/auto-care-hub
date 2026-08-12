import { describe, expect, it, vi } from 'vitest'

import { BookingPaymentDisputeStatus } from '../../entities/booking/booking-payment-dispute.entity.js'
import { BookingPaymentEntity } from '../../entities/booking/booking-payment.entity.js'
import { AppDataSource } from '../../database/data-source.js'
import { getAdminPaymentDisputes } from './admin.service.js'

describe('admin payment disputes', () => {
    it('returns bounded dispute history for an existing payment', async () => {
        const paymentRepository = {
            findOne: vi.fn().mockResolvedValue({ id: 'payment-1' }),
        }
        const disputeRepository = {
            find: vi.fn().mockResolvedValue([{
                id: 'dispute-1',
                paymentId: 'payment-1',
                bookingId: 'booking-1',
                providerDisputeId: 'dp_123',
                providerChargeId: 'ch_123',
                amountMinor: 2500,
                currency: 'rub',
                reason: 'fraudulent',
                providerStatus: 'needs_response',
                status: BookingPaymentDisputeStatus.Open,
                lastEventId: 'evt_123',
                lastEventCreatedAt: new Date('2026-08-01T00:00:00.000Z'),
                createdAt: new Date('2026-08-01T00:00:00.000Z'),
                updatedAt: new Date('2026-08-01T00:00:00.000Z'),
            }]),
        }
        const getRepository = vi.spyOn(AppDataSource, 'getRepository').mockImplementation((entity) => (
            entity === BookingPaymentEntity ? paymentRepository : disputeRepository
        ) as never)
        const admin = { role: 'admin' } as never

        await expect(getAdminPaymentDisputes(admin, 'payment-1')).resolves.toMatchObject([{
            providerDisputeId: 'dp_123',
            status: BookingPaymentDisputeStatus.Open,
        }])
        expect(disputeRepository.find).toHaveBeenCalledWith(expect.objectContaining({ take: 100 }))
        getRepository.mockRestore()
    })

    it('rejects unknown payments', async () => {
        const getRepository = vi.spyOn(AppDataSource, 'getRepository').mockReturnValue({
            findOne: vi.fn().mockResolvedValue(null),
        } as never)
        await expect(getAdminPaymentDisputes({ role: 'admin' } as never, 'missing')).rejects.toMatchObject({
            statusCode: 404,
        })
        getRepository.mockRestore()
    })
})
