import { readFile } from 'node:fs/promises'
import { fileURLToPath } from 'node:url'

export async function assertNextRouteInventory() {
    const [routeSource, contractSource, documentation] = await Promise.all([
        readFile('src/shared/constants/routes.ts', 'utf8'),
        readFile('src/app/next/next-route-contract.ts', 'utf8'),
        readFile('docs/operations/NEXT_ROUTE_MATRIX_2026-08-25.md', 'utf8'),
    ])
    const routeEntries = [...routeSource.matchAll(/^\s+(\w+): '([^']+)'/gm)]
    const missing = routeEntries
        .filter(([, , path]) => !documentation.includes(`\`${path}\``))
        .map(([, name, path]) => `${name} (${path})`)

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

    return { routeCount: routeEntries.length }
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const result = await assertNextRouteInventory()
    console.log(`Next.js route inventory passed (${result.routeCount} route constants documented).`)
}
