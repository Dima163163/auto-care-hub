import test from 'node:test'
import assert from 'node:assert/strict'

import { evaluateLoadingShell } from './check-loading-shell.mjs'

const sourceMap = {
    bootShell: [
        '<BootHeader />',
        '<BootFooter />',
        '<main className="min-h-0 flex-1" aria-busy="true" aria-label="Загрузка страницы">',
        '<WorkspaceBootHeader role={role} />',
        '<WorkspaceBootSidebar role={role} />',
        'data-testid="workspace-boot-content"',
        'data-testid="home-boot-hero"',
        '/images/autocare/hero-map-generated.webp',
        '<HomeBootRemoteContent />',
        '<BootDiscoveryControls />',
        'data-testid="autocare-results-title-skeleton"',
        'data-testid="autocare-results-description-skeleton"',
        'data-testid="autocare-results-map-skeleton"',
        '<BootDiscoverySelect label="Какая услуга нужна?"',
        'disabled aria-label={label}',
        'disabled className="inline-flex h-10',
    ].join('\n'),
    resultsPage: [
        '<AutoCareResultsDataSkeleton />',
        '<AutoCareMapPreview providers={[]} serviceId={filters.serviceId}',
        'aria-busy="true"',
    ].join('\n'),
    nextClientApp: [
        'Promise.all([',
        'enableMocking(),',
        'loadTranslations(getInitialLocale()),',
        'if (!ready) {',
        '<BootShell home={initialPathname === ROUTES.home}',
    ].join('\n'),
    loadingRoute: 'return <RouteBootShell />',
    publicLayout: [
        '<Suspense fallback=',
        'AutoCareResultsRouteSkeleton',
        'PageContentSkeleton',
    ].join('\n'),
    ownerLayout: [
        '<Suspense fallback={<PageContentSkeleton',
        'tone="workspace"',
    ].join('\n'),
    adminLayout: [
        '<Suspense fallback={<PageContentSkeleton',
        'tone="workspace"',
    ].join('\n'),
    authLayout: [
        '<Suspense fallback={<PageContentSkeleton',
        'tone="auth"',
    ].join('\n'),
    loadingSkeletons: [
        'data-testid="autocare-results-map-skeleton"',
        'className="autocare-map-skeleton order-1',
    ].join('\n'),
    skeletonComponent: 'bg-muted',
    indexCss: [
        'var(--muted)',
        'var(--card)',
        ':root[data-theme="dark"]',
    ].join('\n'),
}

test('loading shell contract passes for static chrome and themed placeholders', () => {
    const results = evaluateLoadingShell(sourceMap)
    assert.equal(results.filter((result) => result.status === 'blocked').length, 0)
})

test('loading shell contract reports the exact missing static chrome control', () => {
    const results = evaluateLoadingShell({ ...sourceMap, bootShell: sourceMap.bootShell.replace('<BootFooter />', '') })
    const chrome = results.find((result) => result.name === 'Static public chrome')
    assert.equal(chrome?.status, 'blocked')
    assert.match(chrome?.detail ?? '', /BootFooter/)
})
