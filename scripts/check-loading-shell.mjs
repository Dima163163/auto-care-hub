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
 * Verifies the boot/loading contract at source level. The guard is deliberately
 * small and deterministic: it protects the visual stability decisions that
 * cannot be reliably asserted by an API test (static chrome first, remote data
 * second, and theme-aware placeholders).
 */
export function evaluateLoadingShell(sourceMap) {
    const results = [
        check(
            'Static public chrome',
            sourceMap.bootShell,
            [
                '<BootHeader />',
                '<BootFooter />',
                '<main className="min-h-0 flex-1" aria-busy="true" aria-label="Загрузка страницы">',
            ],
            'public loading renders header, main and footer without waiting for remote data',
        ),
        check(
            'Static workspace chrome',
            sourceMap.bootShell,
            [
                '<WorkspaceBootHeader role={role} />',
                '<WorkspaceBootSidebar role={role} />',
                'data-testid="workspace-boot-content"',
            ],
            'owner/client/admin loading keeps header, sidebar and content region visible',
        ),
        check(
            'Bundled home visual',
            sourceMap.bootShell,
            [
                'data-testid="home-boot-hero"',
                '/images/autocare/hero-map-generated.webp',
                '<HomeBootRemoteContent />',
            ],
            'the bundled hero map paints immediately while only API-backed sections wait',
        ),
        check(
            'Shape-matched discovery form',
            sourceMap.bootShell,
            [
                '<BootDiscoveryControls />',
                'data-testid="autocare-results-title-skeleton"',
                'data-testid="autocare-results-description-skeleton"',
                'data-testid="autocare-results-map-skeleton"',
            ],
            'services loading keeps the search form and reserves result title, text and map shapes',
        ),
        check(
            'Mounted discovery map',
            sourceMap.resultsPage,
            [
                '<AutoCareResultsDataSkeleton />',
                '<AutoCareMapPreview providers={[]} serviceId={filters.serviceId}',
                'aria-busy="true"',
            ],
            'discovery keeps the real map mounted while only server-backed result data uses skeletons',
        ),
        check(
            'Disabled loading controls',
            sourceMap.bootShell,
            [
                '<BootDiscoverySelect label="Какая услуга нужна?"',
                'disabled aria-label={label}',
                'disabled className="inline-flex h-10',
            ],
            'controls remain visible and are disabled instead of being replaced by a second form',
        ),
        check(
            'Next boot boundary',
            sourceMap.nextClientApp,
            [
                'Promise.all([',
                'enableMocking(),',
                'loadTranslations(getInitialLocale()),',
                'if (!ready) {',
                '<BootShell home={initialPathname === ROUTES.home}',
            ],
            'Next keeps the shell visible until route dependencies are ready and mocking cannot blank it',
        ),
        check(
            'Next route fallback',
            sourceMap.loadingRoute,
            ['return <RouteBootShell />'],
            'streaming route fallback uses the same pathname-aware shell',
        ),
        check(
            'Public layout fallback',
            sourceMap.publicLayout,
            ['<Suspense fallback=', 'AutoCareResultsRouteSkeleton', 'PageContentSkeleton'],
            'public routes use the discovery-shaped or generic shared fallback instead of a text-only loader',
        ),
        check(
            'Owner layout fallback',
            sourceMap.ownerLayout,
            ['<Suspense fallback={<PageContentSkeleton', 'tone="workspace"'],
            'owner routes use the shared workspace-themed fallback instead of a text-only loader',
        ),
        check(
            'Admin layout fallback',
            sourceMap.adminLayout,
            ['<Suspense fallback={<PageContentSkeleton', 'tone="workspace"'],
            'admin routes use the shared workspace-themed fallback instead of a text-only loader',
        ),
        check(
            'Auth layout fallback',
            sourceMap.authLayout,
            ['<Suspense fallback={<PageContentSkeleton', 'tone="auth"'],
            'auth routes use the shared auth-themed fallback instead of a text-only loader',
        ),
        check(
            'Single-surface map placeholder',
            sourceMap.loadingSkeletons,
            [
                'data-testid="autocare-results-map-skeleton"',
                'className="autocare-map-skeleton',
            ],
            'map loading is one shimmer surface rather than nested internal skeletons',
        ),
        check(
            'Theme-aware skeleton tokens',
            `${sourceMap.skeletonComponent}\n${sourceMap.indexCss}`,
            [
                'bg-muted',
                'var(--muted)',
                'var(--card)',
                ':root[data-theme="dark"]',
            ],
            'skeleton and map colors resolve through light/dark design tokens',
        ),
    ]

    return results
}

export function loadLoadingShellSources(root = PROJECT_ROOT) {
    const files = {
        bootShell: 'src/shared/ui/boot-shell/BootShell.tsx',
        nextClientApp: 'src/app/next/NextClientApp.tsx',
        loadingRoute: 'src/app/[[...slug]]/loading.tsx',
        publicLayout: 'src/app/layouts/public-layout/PublicLayout.tsx',
        ownerLayout: 'src/app/layouts/owner-layout/OwnerLayout.tsx',
        adminLayout: 'src/app/layouts/admin-layout/AdminLayout.tsx',
        authLayout: 'src/app/layouts/auth-layout/AuthLayout.tsx',
        loadingSkeletons: 'src/shared/ui/loading-skeleton/AutoCareLoadingSkeletons.tsx',
        resultsPage: 'src/pages/autocare-results/ui/AutoCareResultsPage.tsx',
        skeletonComponent: 'src/components/ui/skeleton.tsx',
        indexCss: 'src/index.css',
    }

    const sources = Object.fromEntries(Object.entries(files).map(([name, relativePath]) => [
        name,
        readFileSync(resolve(root, relativePath), 'utf8'),
    ]))
    return sources
}

export function formatLoadingShellResults(results) {
    const lines = ['Loading shell source contract']
    for (const result of results) {
        lines.push(`[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)
    }
    return lines.join('\n')
}

async function main() {
    const results = evaluateLoadingShell(loadLoadingShellSources())
    console.log(formatLoadingShellResults(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
