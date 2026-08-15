import { readFile } from 'node:fs/promises'

const [openApiSource, mockSource, routeSources, usersRouteSource] = await Promise.all([
    readFile('server/src/routes/openapi.route.ts', 'utf8'),
    readFile('src/app/mocks/handlers.ts', 'utf8'),
    Promise.all([
        'server/src/routes/health.route.ts',
        'server/src/modules/cabinets/cabinets.routes.ts',
        'server/src/modules/bookings/bookings.routes.ts',
        'server/src/modules/notifications/notifications.routes.ts',
        'server/src/modules/admin/admin.routes.ts',
        'server/src/modules/users/users.routes.ts',
    ].map((path) => readFile(path, 'utf8'))),
    readFile('server/src/modules/users/users.routes.ts', 'utf8'),
])

const backendSource = routeSources.join('\n')
const expectedRoutes = [
    ['get', '/health/live'],
    ['get', '/health/ready'],
    ['get', '/cabinets'],
    ['get', '/cabinets/all'],
    ['get', '/bookings/my'],
    ['get', '/owner/bookings'],
    ['post', '/client/experiment-events'],
    ['get', '/notifications'],
    ['get', '/admin/users'],
    ['get', '/admin/account-deletion-requests'],
    ['patch', '/admin/account-deletion-requests/{id}/status'],
    ['get', '/admin/audit-logs'],
    ['get', '/admin/system-incidents'],
    ['get', '/admin/outbox/health'],
    ['get', '/users/me/export'],
    ['get', '/users/me/deletion-request'],
    ['post', '/users/me/deletion-request'],
    ['delete', '/users/me/deletion-request'],
]
const mockPaths = [
    '/cabinets',
    '/cabinets/all',
    '/bookings/my',
    '/notifications',
    '/admin/users',
    '/admin/audit-logs',
    '/admin/system-incidents',
    '/admin/outbox/health',
]

const routeKeys = expectedRoutes.map(([method, path]) => `${method}:${path}`)
if (new Set(routeKeys).size !== routeKeys.length) {
    throw new Error('API contract expected routes must not contain duplicate methods and paths.')
}

const expectedPaths = expectedRoutes.map(([, path]) => path)
function toFastifyPath(path) {
    return path.replace(/\{([^}]+)\}/g, ':$1')
}

const expectedBackendRoutes = expectedRoutes.map(([method, path]) => ({
    method,
    path,
    backendPath: toFastifyPath(path),
}))
const requiredOpenApiMethodMap = new Map([
    ['/users/me/export', ['get']],
    ['/users/me/deletion-request', ['get', 'post', 'delete']],
])

function routeMethodPattern(method, path) {
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`app\\.${method}\\b[\\s\\S]{0,300}?["']${escapedPath}["']`)
}

function openApiMethodPattern(method, path) {
    const escapedPath = path.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`["']${escapedPath}["']\\s*:\\s*\\{[\\s\\S]{0,2500}\\b${method}\\s*:`)
}

for (const route of expectedBackendRoutes) {
    if (!routeMethodPattern(route.method, route.backendPath).test(backendSource)) {
        throw new Error(`Backend route is missing ${route.method.toUpperCase()} ${route.path}`)
    }
}

for (const route of expectedBackendRoutes.filter(({ path }) => path.startsWith('/users/me/'))) {
    if (!routeMethodPattern(route.method, route.path).test(usersRouteSource)) {
        throw new Error(`Users route source is missing ${route.method.toUpperCase()} ${route.path}`)
    }
}

const expectedMockRoutes = [
    ...mockPaths.map((path) => ({ method: 'get', path })),
    { method: 'post', path: '/client/experiment-events' },
]

function mockMethodPattern(method, path) {
    const mockPath = path.replace(/\{([^}]+)\}/g, ':$1')
    const escapedPath = mockPath.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')
    return new RegExp(`http\\.${method}\\(\\s*["']/api${escapedPath}["']`)
}

for (const route of expectedMockRoutes) {
    if (!mockMethodPattern(route.method, route.path).test(mockSource)) {
        throw new Error(`MSW mock is missing ${route.method.toUpperCase()} /api${route.path}`)
    }
}

for (const route of expectedBackendRoutes) {
    if (!openApiMethodPattern(route.method, route.path).test(openApiSource)) {
        throw new Error(`OpenAPI is missing ${route.method.toUpperCase()} ${route.path}`)
    }
}

for (const [path, methods] of requiredOpenApiMethodMap) {
    for (const method of methods) {
        if (!openApiMethodPattern(method, path).test(openApiSource)) {
            throw new Error(`OpenAPI method map is missing ${method.toUpperCase()} ${path}`)
        }
    }
}

for (const path of expectedPaths) {
    if (!openApiSource.includes(`'${path}':`)) {
        throw new Error(`OpenAPI is missing ${path}`)
    }
    if (!backendSource.includes(`'${toFastifyPath(path)}'`)) {
        throw new Error(`Backend route source is missing ${path}`)
    }
}

console.log(`API contract route check passed for ${expectedPaths.length} backend/OpenAPI paths and ${mockPaths.length} mock paths.`)
