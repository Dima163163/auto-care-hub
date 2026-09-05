import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

export const DISCOVERY_FORM_CONTRACT = [
    {
        id: 'shared-controls',
        file: 'src/features/autocare-search/ui/AutoCareDiscoveryControls.tsx',
        fragments: [
            '<ServiceSelect disabled={isLoading}',
            '<RadiusSelect disabled={isLoading}',
            '<VehicleSelects brandId={brandId} disabled={isLoading}',
            '<ResultsQuickFilters',
            'disabled={isLoading}',
            '<button type="button" disabled={isLoading}',
        ],
        detail: 'the loaded discovery form keeps one structure and disables every mutating control while data is loading',
    },
    {
        id: 'service-placeholder',
        file: 'src/features/autocare-search/ui/AutoCareDiscoveryControls.tsx',
        fragments: [
            "label={t('autocare.serviceLabel')}",
            "t('autocare.servicePlaceholder')",
            'value={serviceId}',
            'floatLabelWhenEmpty',
        ],
        detail: 'the service select has a readable empty value and floating label without overlapping placeholder text',
    },
    {
        id: 'theme-tokens',
        file: 'src/features/autocare-search/ui/AutoCareDiscoveryControls.tsx',
        fragments: [
            'tone="dark"',
            'text-primary-foreground',
            'border-primary-foreground/15',
            'disabled:opacity-60',
        ],
        detail: 'dark and disabled states resolve through shared foreground/border tokens',
    },
    {
        id: 'loading-surface',
        file: 'src/shared/ui/loading-skeleton/AutoCareLoadingSkeletons.tsx',
        fragments: [
            '<AutoCareDiscoveryControls',
            'isLoading',
            'data-testid="autocare-results-title-skeleton"',
            'data-testid="autocare-results-map-skeleton"',
        ],
        detail: 'route fallback renders the same discovery form and shape-matched result surface',
    },
    {
        id: 'query-state-matrix',
        file: 'src/pages/autocare-results/ui/AutoCareResultsPage.tsx',
        fragments: [
            'resolveQueryViewState',
            "discoveryState === 'empty'",
            "discoveryState === 'error'",
            "discoveryState === 'offline'",
            "discoveryState === 'partial'",
            "discoveryState === 'stale-error'",
            "discoveryState === 'permission-denied'",
            "discoveryState === 'suspended'",
            "discoveryState === 'session-expired'",
            'onRetry={refetch}',
        ],
        detail: 'empty, error, partial, stale, offline, permission and session states all expose a recoverable result path',
    },
    {
        id: 'query-loading-wiring',
        file: 'src/pages/autocare-results/ui/AutoCareResultsPage.tsx',
        fragments: [
            '<ResultsToolbar',
            'isLoading={isLoading}',
            "discoveryState === 'loading'",
            '<AutoCareResultsDataSkeleton />',
            '<AutoCareMapPreview providers={[]} serviceId={filters.serviceId}',
        ],
        detail: 'the real results route passes query loading state to the visible form and keeps the map mounted',
    },
    {
        id: 'long-label-layout',
        file: 'src/features/autocare-search/ui/AutoCareDiscoveryControls.tsx',
        fragments: [
            'minmax(0,1.45fr)',
            'min-w-0',
            'flex-wrap',
            'getServiceLabel(service, locale)',
        ],
        detail: 'responsive grid and wrapping rules prevent long Russian/English service labels from escaping controls',
    },
    {
        id: 'provider-card-overflow',
        file: 'src/pages/autocare-results/ui/ProviderResultCard.tsx',
        fragments: [
            'overflow-hidden',
            'break-words font-black',
            'min-w-0',
            'flex flex-wrap items-center gap-x-5 gap-y-2',
        ],
        detail: 'provider cards wrap long names and metadata without horizontal overflow on narrow screens',
    },
]

export async function evaluateDiscoveryFormContract(root = PROJECT_ROOT) {
    const sourceCache = new Map()
    const results = []

    for (const contract of DISCOVERY_FORM_CONTRACT) {
        let source = sourceCache.get(contract.file)
        if (!source) {
            try {
                source = await readFile(resolve(root, contract.file), 'utf8')
                sourceCache.set(contract.file, source)
            } catch (error) {
                results.push({
                    id: contract.id,
                    status: 'blocked',
                    detail: `cannot read ${contract.file}: ${error instanceof Error ? error.message : String(error)}`,
                })
                continue
            }
        }

        const missing = contract.fragments.filter((fragment) => !source.includes(fragment))
        results.push(missing.length === 0
            ? { id: contract.id, status: 'pass', detail: contract.detail }
            : { id: contract.id, status: 'blocked', detail: `missing fragments: ${missing.join('; ')}` })
    }

    return results
}

export function formatDiscoveryFormContract(results) {
    return [
        'Discovery form source contract',
        ...results.map((result) => `[${result.status.toUpperCase()}] ${result.id}: ${result.detail}`),
    ].join('\n')
}

async function main() {
    const results = await evaluateDiscoveryFormContract()
    console.log(formatDiscoveryFormContract(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
