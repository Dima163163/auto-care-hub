import { readdir, readFile } from 'node:fs/promises'
import { join } from 'node:path'

const MOCK_ROUTE_PATTERN = /http\.(get|post|patch|put|delete)\s*\(\s*['"]\/api([^'"]+)['"]/g
const BACKEND_ROUTE_PATTERN = /\bapp\.(get|post|patch|put|delete)\b[\s\S]{0,500}?\(\s*['"]([^'"]+)['"]/g

async function collectTypeScriptFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        const path = join(directory, entry.name)
        if (entry.isDirectory()) {
            files.push(...await collectTypeScriptFiles(path))
        } else if (entry.isFile() && path.endsWith('.ts') && !path.endsWith('.test.ts')) {
            files.push(path)
        }
    }

    return files
}

function collectRoutes(source, pattern) {
    const routes = new Set()

    for (const match of source.matchAll(pattern)) {
        const method = match[1]
        const path = match[2]
        routes.add(`${method}:${path}`)
    }

    return routes
}

const [mockSource, backendFiles] = await Promise.all([
    readFile('src/app/mocks/handlers.ts', 'utf8'),
    collectTypeScriptFiles('server/src'),
])
const backendSource = (await Promise.all(backendFiles.map((path) => readFile(path, 'utf8')))).join('\n')
const mockRoutes = collectRoutes(mockSource, MOCK_ROUTE_PATTERN)
const backendRoutes = collectRoutes(backendSource, BACKEND_ROUTE_PATTERN)
const missingRoutes = [...mockRoutes].filter((route) => !backendRoutes.has(route)).sort()
const backendOnlyRoutes = [...backendRoutes].filter((route) => !mockRoutes.has(route)).sort()
const requiredWebSocketRoutes = [
    'get:/v1/chats/:chatId/ws',
    'get:/v1/service-requests/:requestId/ws',
]
const missingWebSocketRoutes = requiredWebSocketRoutes.filter((route) => !backendRoutes.has(route))

if (missingRoutes.length > 0) {
    throw new Error([
        `Backend is missing ${missingRoutes.length} route(s) used by MSW:`,
        ...missingRoutes.map((route) => `- ${route}`),
    ].join('\n'))
}

if (missingWebSocketRoutes.length > 0) {
    throw new Error([
        'Backend is missing a required WebSocket route declaration:',
        ...missingWebSocketRoutes.map((route) => `- ${route}`),
    ].join('\n'))
}

console.log([
    `Mock routes: ${mockRoutes.size}`,
    `Backend routes: ${backendRoutes.size}`,
    `Covered mock routes: ${mockRoutes.size}`,
    `WebSocket routes: ${requiredWebSocketRoutes.length}/${requiredWebSocketRoutes.length}`,
    `Backend-only routes (including health, auth and WebSocket support): ${backendOnlyRoutes.length}`,
].join('\n'))
