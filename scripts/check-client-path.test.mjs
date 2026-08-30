import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateClientPath } from './check-client-path.mjs'

const sourceMap = {
    vehicleSnapshot: [
        'toRequestVehicleSnapshot', 'fuelType:', 'engineDisplacement:',
        'horsepower:', 'color:', 'licensePlate:', 'internalNumber:', 'vin:',
        'Number.isInteger(year)',
    ].join('\n'),
    requestsPanel: [
        'vehicleSnapshot', 'licensePlate', 'internalNumber', 'VIN ${vehicle.vin}',
        'booking.bonusDiscountMinor', 'request.quoteHistory',
        "entry.type === 'refund'", "entry.type === 'expire'", 'История операций',
        'Repeated clicks are idempotent', 'useGetMyAutoCareBonusAccountsQuery',
        'useRedeemAutoCareBonusMutation', 'useAcceptAutoCareServiceQuoteMutation',
        'useDeclineAutoCareServiceQuoteMutation', "request.quote.status === 'expired'",
        "request.status === 'estimate_shared'",
    ].join('\n'),
    reviewResolution: [
        'useGetMyAutoCareReviewsQuery', 'useRedeemAutoCareReviewPromoMutation',
        'useUpdateAutoCareReviewMutation', 'if (reviews.isLoading)',
        'if (reviews.isError)', 'review.canEdit',
    ].join('\n'),
    reviewsPage: [
        '<ProfileNavigation />', '<ReviewsSkeleton label={t(\'review.loading\')} count={2} />',
        'variant="error"', 'variant="empty"',
    ].join('\n'),
    e2e: [
        'renders bonus history, garage controls, and an attachment viewer for a client',
        'redeems client bonus points against a confirmed booking',
        'without duplicating the ledger entry',
        'accepts a pending quote once and preserves the booking snapshot on repeat',
        'shows an expired quote without an acceptance action',
        "await page.goto('/profile/bookings')",
    ].join('\n'),
}

test('client path contract covers snapshots, bonuses, reviews and browser smoke', () => {
    const results = evaluateClientPath(sourceMap)
    assert.equal(results.filter((result) => result.status === 'blocked').length, 0)
})

test('client path contract reports the exact missing lifecycle control', () => {
    const results = evaluateClientPath({ ...sourceMap, requestsPanel: sourceMap.requestsPanel.replace("entry.type === 'expire'", '') })
    const bonus = results.find((result) => result.name === 'Bonus lifecycle UI')
    assert.equal(bonus?.status, 'blocked')
    assert.match(bonus?.detail ?? '', /entry\.type === 'expire'/)
})
