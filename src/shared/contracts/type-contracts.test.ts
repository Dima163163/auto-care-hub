import { describe, expectTypeOf, it } from 'vitest'

import type { Cabinet } from '@/entities/cabinet'
import { normalizeCabinetResponse } from '@/entities/cabinet/lib/cabinet-response-schema'
import { normalizeBookingResponse } from '@/entities/booking/lib/booking-response-schema'
import type { Booking } from '@/entities/booking'
import { getBottomNavPrimaryTarget, type BottomNavPrimaryTarget } from '@/widgets/bottom-nav/model/get-bottom-nav-primary-target'
import { getPaymentReturnState, type PaymentReturnState } from '@/pages/profile-bookings/lib/get-payment-return-state'
import { parseLoginLocationState, type LoginLocationState } from '@/pages/login/lib/parse-login-location-state'

describe('cross-layer type contracts', () => {
    it('keeps runtime wire mappers aligned with entity models', () => {
        expectTypeOf(normalizeCabinetResponse).returns.toEqualTypeOf<Cabinet>()
        expectTypeOf(normalizeBookingResponse).returns.toEqualTypeOf<Booking>()
    })

    it('keeps route and UI state helpers discriminated', () => {
        expectTypeOf(parseLoginLocationState).returns.toEqualTypeOf<LoginLocationState>()
        expectTypeOf(getPaymentReturnState).returns.toEqualTypeOf<PaymentReturnState>()
        expectTypeOf(getBottomNavPrimaryTarget).returns.toEqualTypeOf<BottomNavPrimaryTarget>()
    })
})
