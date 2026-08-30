import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

function check(name, source, fragments, detail) {
    const missing = fragments.filter((fragment) => !source.includes(fragment))
    return missing.length === 0
        ? { name, status: 'pass', detail }
        : { name, status: 'blocked', detail: `missing controls: ${missing.join('; ')}` }
}

/**
 * Protects the client journey from silently regressing while the real API is
 * still being exercised in staging. This is intentionally a source contract:
 * it verifies that the API snapshot, bonus and review flows remain wired to
 * the UI and that browser coverage keeps the critical branches explicit.
 */
export function evaluateClientPath(sourceMap) {
    return [
        check(
            'Vehicle identity snapshot',
            sourceMap.vehicleSnapshot,
            [
                'toRequestVehicleSnapshot',
                'fuelType:',
                'engineDisplacement:',
                'horsepower:',
                'color:',
                'licensePlate:',
                'internalNumber:',
                'vin:',
                'Number.isInteger(year)',
            ],
            'saved vehicle make/model/year and optional fuel, engine, plate, internal number and VIN are preserved for a request',
        ),
        check(
            'Booking snapshot projection',
            sourceMap.requestsPanel,
            [
                'vehicleSnapshot',
                'licensePlate',
                'internalNumber',
                'VIN ${vehicle.vin}',
                'booking.bonusDiscountMinor',
                'request.quoteHistory',
            ],
            'client booking cards keep immutable vehicle and price/quote snapshots visible',
        ),
        check(
            'Bonus lifecycle UI',
            sourceMap.requestsPanel,
            [
                'useGetMyAutoCareBonusAccountsQuery',
                'useRedeemAutoCareBonusMutation',
                "entry.type === 'refund'",
                "entry.type === 'expire'",
                'История операций',
                'Repeated clicks are idempotent',
            ],
            'client sees bonus balance, earn/redeem/refund/expiry history and an idempotent redemption action',
        ),
        check(
            'Quote lifecycle UI',
            sourceMap.requestsPanel,
            [
                'useAcceptAutoCareServiceQuoteMutation',
                'useDeclineAutoCareServiceQuoteMutation',
                "request.quote.status === 'expired'",
                "request.status === 'estimate_shared'",
                'request.quoteHistory',
            ],
            'client can accept or decline a pending quote while expired quotes remain read-only and history is preserved',
        ),
        check(
            'Review resolution flow',
            sourceMap.reviewResolution,
            [
                'useGetMyAutoCareReviewsQuery',
                'useRedeemAutoCareReviewPromoMutation',
                'useUpdateAutoCareReviewMutation',
                'if (reviews.isLoading)',
                'if (reviews.isError)',
                'review.canEdit',
            ],
            'service promo redemption and one-time review editing retain loading, retryable error and permission states',
        ),
        check(
            'Reviews page shell',
            sourceMap.reviewsPage,
            [
                '<ProfileNavigation />',
                '<ReviewsSkeleton label={t(\'review.loading\')} count={2} />',
                'variant="error"',
                'variant="empty"',
            ],
            'reviews route keeps navigation and shape-matched loading, error and empty states',
        ),
        check(
            'Browser client regression',
            sourceMap.e2e,
            [
                'renders bonus history, garage controls, and an attachment viewer for a client',
                'redeems client bonus points against a confirmed booking',
                'without duplicating the ledger entry',
                'accepts a pending quote once and preserves the booking snapshot on repeat',
                'shows an expired quote without an acceptance action',
                "await page.goto('/profile/bookings')",
            ],
            'Chromium smoke keeps the real client path, bonus redemption and attachment viewer covered',
        ),
    ]
}

export function loadClientPathSources(root = PROJECT_ROOT) {
    const files = {
        vehicleSnapshot: 'src/pages/autocare-request/ui/request-vehicle-snapshot.ts',
        requestsPanel: 'src/pages/profile-bookings/ui/AutoCareRequestsPanel.tsx',
        reviewResolution: 'src/pages/profile-reviews/ui/AutoCareReviewResolutionPanel.tsx',
        reviewsPage: 'src/pages/profile-reviews/ui/ProfileReviewsPage.tsx',
        e2e: 'e2e/autocare-client-public-states.spec.ts',
    }

    return Object.fromEntries(Object.entries(files).map(([name, relativePath]) => [
        name,
        readFileSync(resolve(root, relativePath), 'utf8'),
    ]))
}

export function formatClientPathResults(results) {
    const lines = ['Client path source contract']
    for (const result of results) {
        lines.push(`[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)
    }
    return lines.join('\n')
}

async function main() {
    const results = evaluateClientPath(loadClientPathSources())
    console.log(formatClientPathResults(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
