import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const ROUTE_PATTERN = /app\.(get|post|put|patch|delete)\(\s*'([^']+)'([\s\S]*?)(?=\n\s*app\.(?:get|post|put|patch|delete)\(|\s*$)/g

/**
 * Source-level guard for the owner API surface. Authentication is still
 * re-checked by the service layer, but this catches a newly added route that
 * accidentally bypasses the request auth boundary before it reaches review.
 */
export function evaluateOwnerRouteAuth(source) {
    const results = []
    for (const match of source.matchAll(ROUTE_PATTERN)) {
        const [, method, path, body] = match
        if (!path.startsWith('/owner/')) continue
        const requiresAuth = body.includes('requireAuth(request)') || body.includes('requireVerifiedEmail(request)')
        const requiresVerified = method === 'get' || body.includes('requireVerifiedEmail(request)')
        results.push({
            method: method.toUpperCase(),
            path,
            status: requiresAuth && requiresVerified ? 'pass' : 'blocked',
            detail: requiresAuth && requiresVerified
                ? 'owner route has request authentication and mutation verification'
                : method === 'get'
                    ? 'owner route must call requireAuth(request) or requireVerifiedEmail(request)'
                    : 'owner mutation must call requireVerifiedEmail(request)',
        })
    }
    return results
}

export function loadOwnerRouteSource(root = PROJECT_ROOT) {
    return readFileSync(resolve(root, 'server/src/modules/autocare/autocare.routes.ts'), 'utf8')
}

export function formatOwnerRouteAuthResults(results) {
    const lines = ['Owner route authentication contract']
    for (const result of results) lines.push(`[${result.status.toUpperCase()}] ${result.method} ${result.path}: ${result.detail}`)
    return lines.join('\n')
}

async function main() {
    const results = evaluateOwnerRouteAuth(loadOwnerRouteSource())
    console.log(formatOwnerRouteAuthResults(results))
    if (results.length === 0 || results.some((result) => result.status === 'blocked')) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
