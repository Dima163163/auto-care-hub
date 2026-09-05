import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export function parseNextRouteEntries(routeSource) {
    return [...String(routeSource).matchAll(/^\s+(\w+): '([^']+)'/gm)]
        .map(([, name, path]) => ({ name, path }))
}

export function findDuplicateRoutePaths(entries) {
    const seen = new Map()
    const duplicates = []
    for (const entry of entries) {
        const names = seen.get(entry.path) ?? []
        names.push(entry.name)
        seen.set(entry.path, names)
    }
    for (const [path, names] of seen) {
        if (names.length > 1) duplicates.push({ path, names })
    }
    return duplicates
}

export async function assertNextRouteInventory() {
    const [routeSource, contractSource, documentation] = await Promise.all([
        readFile('src/shared/constants/routes.ts', 'utf8'),
        readFile('src/app/next/next-route-contract.ts', 'utf8'),
        readFile('docs/operations/NEXT_ROUTE_MATRIX_2026-08-25.md', 'utf8'),
    ])
    const routeEntries = parseNextRouteEntries(routeSource)
    const duplicatePaths = findDuplicateRoutePaths(routeEntries)
    const missing = routeEntries
        .filter(({ path }) => !documentation.includes(`\`${path}\``))
        .map(({ name, path }) => `${name} (${path})`)
    if (duplicatePaths.length > 0) {
        missing.push(...duplicatePaths.map(({ path, names }) => `duplicate path ${path} (${names.join(', ')})`))
    }

    if (!documentation.includes('## Canonical route inventory and runtime owners')) {
        missing.push('runtime-owner inventory section')
    }
    if (!documentation.includes('### Dynamic route variants')) {
        missing.push('dynamic route variants section')
    }
    if (!contractSource.includes('dynamicRoutes')) {
        missing.push('server dynamic route allow-list')
    }

    if (missing.length > 0) {
        throw new Error(`Next.js route inventory is incomplete: ${missing.join(', ')}`)
    }

    return { routeCount: routeEntries.length, duplicatePaths }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const result = await assertNextRouteInventory()
    console.log(`Next.js route inventory passed (${result.routeCount} route constants documented).`)
}
