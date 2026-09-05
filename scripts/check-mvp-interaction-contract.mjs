import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const SCRIPT_DIRECTORY = resolve(fileURLToPath(new URL('.', import.meta.url)))
export const PROJECT_ROOT = resolve(SCRIPT_DIRECTORY, '..')

const CONTRACTS = [
    {
        id: 13,
        name: 'Keyboard dropdown and Escape smoke',
        files: { 'e2e/autocare-release-audit.spec.ts': [
            "test('discovery filters and sort controls are keyboard operable'",
            "test('city listbox supports arrows, Home, End and Escape'",
            "press('Escape')",
            "press('Enter')",
        ] },
        detail: 'release audit covers keyboard sorting, dropdown navigation and Escape close/focus return',
    },
    {
        id: 14,
        name: 'Focus-visible actions',
        files: {
            'src/index.css': ['*:focus-visible'],
            'src/components/ui/button-variants.ts': ['focus-visible:ring-3', 'focus-visible:border-ring'],
            'src/shared/ui/floating-field/FloatingField.tsx': ['focus-within:ring-2', 'focus-visible:ring-0'],
        },
        detail: 'global and primitive focus-visible styles keep keyboard focus visible without square native rings',
    },
    {
        id: 15,
        name: 'Icon-only aria labels',
        files: {
            'src/pages/autocare-results/ui/AutoCareMapPreview.tsx': ['aria-label="Zoom in"', 'aria-label="Zoom out"', 'mapCurrentLocation'],
            'src/widgets/workspace-shell/ui/WorkspaceHeader.tsx': ["aria-label={t('common.menu')}", "aria-label={t('navigation.notifications')}"],
            'src/widgets/workspace-shell/ui/WorkspaceMobileMenu.tsx': ["aria-label={t('common.close')}"],
        },
        detail: 'map, header and mobile-menu icon buttons expose accessible names while decorative icons remain hidden',
    },
    {
        id: 16,
        name: 'No empty full-screen loader',
        files: {
            'src/shared/ui/boot-shell/BootShell.tsx': ['<BootHeader />', '<BootFooter />', 'aria-busy="true"'],
            'scripts/check-loading-shell.mjs': ['Static public chrome', 'Shape-matched discovery form', 'Theme-aware skeleton tokens'],
        },
        detail: 'loading keeps static chrome and shaped content visible instead of rendering a text-only full-screen loader',
    },
    {
        id: 17,
        name: 'Filter preservation after retry',
        files: {
            'src/pages/autocare-results/ui/AutoCareResultsPage.tsx': ['draftState', 'onRetry={refetch}', 'writeAutoCareResultFilters', 'key={searchParams.toString()}'],
            'src/pages/autocare-results/lib/autocareResultFilters.ts': ['URLSearchParams'],
        },
        detail: 'retry refetches the current query while URL-backed and draft filters remain stable',
    },
    {
        id: 18,
        name: 'Deterministic offline/reconnect fixture',
        files: {
            'src/app/mocks/mock-scenario.ts': ["'offline'", "'expired-session'", 'mockScenarioResponse'],
            'e2e/autocare-client-public-states.spec.ts': ['useMockScenario(page,', 'failNextRequestSubmission', "for (const failure of ['offline', 'timeout']"],
        },
        detail: 'mock state headers and client browser fixtures deterministically cover offline and recovery paths',
    },
    {
        id: 19,
        name: 'Platform payment-provider runtime guard',
        files: {
            'scripts/check-no-legacy-provider.mjs': ['prohibitedProvider', 'prohibitedFlag', 'runtime references are absent'],
            'package.json': ['"check:no-legacy-provider"'],
        },
        detail: 'Third-party payment runtime and platform payment flags are blocked; direct provider payment guidance remains documentation-only',
    },
    {
        id: 20,
        name: 'Unified local MVP summary',
        files: {
            'scripts/check-local-mvp.mjs': ['--json', 'counts', 'writeLocalMvpJsonArtifact', 'formatLocalMvpGate'],
        },
        detail: 'local MVP gate emits a machine-readable summary with per-check statuses, counts, commit and timestamp',
    },
]

function checkContract(contract, sources) {
    const missing = []
    for (const [file, fragments] of Object.entries(contract.files)) {
        const source = sources[file]
        if (source === undefined) {
            missing.push(`${file}: missing file`)
            continue
        }
        for (const fragment of fragments) if (!source.includes(fragment)) missing.push(`${file}: ${fragment}`)
    }
    return missing.length === 0
        ? { id: contract.id, name: contract.name, status: 'pass', detail: contract.detail }
        : { id: contract.id, name: contract.name, status: 'blocked', detail: `missing controls: ${missing.join('; ')}` }
}

export async function evaluateMvpInteractionContract(root = PROJECT_ROOT) {
    const entries = [...new Set(Object.values(CONTRACTS).flatMap((contract) => Object.keys(contract.files)))]
    const sources = Object.fromEntries(await Promise.all(entries.map(async (relativePath) => {
        try { return [relativePath, await readFile(resolve(root, relativePath), 'utf8')] }
        catch { return [relativePath, undefined] }
    })))
    return CONTRACTS.map((contract) => checkContract(contract, sources))
}

export function formatMvpInteractionContract(results) {
    const blocked = results.filter((result) => result.status === 'blocked').length
    return [
        'AutoCare Hub local MVP interaction contract',
        ...results.map((result) => `[${result.status.toUpperCase()}] #${result.id} ${result.name}: ${result.detail}`),
        blocked === 0 ? 'Result: all local MVP interaction checks passed.' : `Result: blocked by ${blocked} check(s).`,
    ].join('\n')
}

async function main() {
    const results = await evaluateMvpInteractionContract()
    if (process.argv.includes('--json')) console.log(JSON.stringify({ schemaVersion: 1, status: results.some((result) => result.status === 'blocked') ? 'blocked' : 'pass', results }, null, 2))
    else console.log(formatMvpInteractionContract(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
