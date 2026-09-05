import { readFileSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
const ROUTE_PATTERN = /app\.(get|post|put|patch|delete)(?:<[^>]*>)?\(\s*'([^']+)'([\s\S]*?)(?=\n\s*app\.(?:get|post|put|patch|delete)(?:<[^>]*>)?\(|\s*$)/g

/**
 * Source-level guard for protected API surfaces. Authentication is still
 * re-checked by the service layer, but this catches a newly added route that
 * accidentally bypasses the request auth boundary before it reaches review.
 */
export function evaluateRouteAuth(source, { prefix = '/owner/', mutationRequiresVerified = false } = {}) {
    const results = []
    for (const match of source.matchAll(ROUTE_PATTERN)) {
        const [, method, path, body] = match
        if (!path.startsWith(prefix)) continue
        const requiresAuth = body.includes('requireAuth(request)') || body.includes('requireVerifiedEmail(request)')
        const requiresVerified = !mutationRequiresVerified || method === 'get' || body.includes('requireVerifiedEmail(request)')
        const authIndex = [body.indexOf('requireAuth(request)'), body.indexOf('requireVerifiedEmail(request)')]
            .filter((index) => index >= 0)
            .sort((left, right) => left - right)[0] ?? -1
        const validationIndex = ['validateParams(', 'validateQuery(', 'validateBody(']
            .map((token) => body.indexOf(token))
            .filter((index) => index >= 0)
            .sort((left, right) => left - right)[0] ?? -1
        const authenticatesBeforeValidation = validationIndex === -1 || (authIndex >= 0 && authIndex < validationIndex)
        results.push({
            method: method.toUpperCase(),
            path,
            status: requiresAuth && requiresVerified && authenticatesBeforeValidation ? 'pass' : 'blocked',
            detail: !requiresAuth
                ? mutationRequiresVerified && method !== 'get'
                    ? 'route mutation must call requireVerifiedEmail(request)'
                    : 'route must call requireAuth(request) or requireVerifiedEmail(request)'
                : !requiresVerified
                    ? 'route mutation must call requireVerifiedEmail(request)'
                    : authenticatesBeforeValidation
                ? mutationRequiresVerified
                    ? 'route has request authentication and mutation verification'
                    : 'route has request authentication'
                    : 'route must authenticate before validating request input',
        })
    }
    return results
}

export function evaluateOwnerRouteAuth(source) {
    return evaluateRouteAuth(source, { prefix: '/owner/', mutationRequiresVerified: true })
}

export function evaluateAdminRouteAuth(source) {
    return evaluateRouteAuth(source, { prefix: '/admin/' })
}

export function loadOwnerRouteSource(root = PROJECT_ROOT) {
    return readFileSync(resolve(root, 'server/src/modules/autocare/autocare.routes.ts'), 'utf8')
}

export function loadAdminRouteSource(root = PROJECT_ROOT) {
    return readFileSync(resolve(root, 'server/src/modules/admin/admin.routes.ts'), 'utf8')
}

export function formatRouteAuthResults(results, title) {
    const lines = [title]
    for (const result of results) lines.push(`[${result.status.toUpperCase()}] ${result.method} ${result.path}: ${result.detail}`)
    return lines.join('\n')
}

export function formatOwnerRouteAuthResults(results) {
    return formatRouteAuthResults(results, 'Owner route authentication contract')
}

async function main() {
    const ownerResults = evaluateOwnerRouteAuth(loadOwnerRouteSource())
    const adminResults = evaluateAdminRouteAuth(loadAdminRouteSource())
    console.log(formatRouteAuthResults(ownerResults, 'Owner route authentication contract'))
    console.log(formatRouteAuthResults(adminResults, 'Admin route authentication contract'))
    if (
        ownerResults.length === 0 ||
        adminResults.length === 0 ||
        [...ownerResults, ...adminResults].some((result) => result.status === 'blocked')
    ) process.exitCode = 1
}

if (process.argv[1] === fileURLToPath(import.meta.url)) await main()
