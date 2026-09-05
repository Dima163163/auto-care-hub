import { readdir, readFile, writeFile } from 'node:fs/promises'
import { join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))
export const DEFAULT_SNAPSHOT_PATH = 'docs/operations/MOCK_BACKEND_ROUTE_SNAPSHOT.json'

const MOCK_ROUTE_PATTERN = /http\.(get|post|patch|put|delete)\s*\(\s*['"]\/api([^'"]+)['"]/g
const BACKEND_ROUTE_PATTERN = /\bapp\.(get|post|patch|put|delete)\b[\s\S]{0,500}?\(\s*['"]([^'"]+)['"]/g

export function collectRoutes(source, pattern) {
    const routes = new Set()
    for (const match of String(source).matchAll(pattern)) routes.add(`${match[1]}:${match[2]}`)
    return [...routes].sort()
}

export function buildRouteSnapshot({ mockSource, backendSource }) {
    const mockRoutes = collectRoutes(mockSource, MOCK_ROUTE_PATTERN)
    const backendRoutes = collectRoutes(backendSource, BACKEND_ROUTE_PATTERN)
    return {
        schemaVersion: 1,
        mockRoutes,
        backendRoutes,
        websocketRoutes: ['get:/v1/chats/:chatId/ws', 'get:/v1/service-requests/:requestId/ws'],
    }
}

export function compareRouteSnapshots(expected, actual) {
    const expectedJson = JSON.stringify(expected)
    const actualJson = JSON.stringify(actual)
    return expectedJson === actualJson
        ? { matches: true, differences: [] }
        : {
            matches: false,
            differences: [
                expected.schemaVersion !== actual.schemaVersion ? 'schemaVersion' : null,
                JSON.stringify(expected.mockRoutes) !== JSON.stringify(actual.mockRoutes) ? 'mockRoutes' : null,
                JSON.stringify(expected.backendRoutes) !== JSON.stringify(actual.backendRoutes) ? 'backendRoutes' : null,
                JSON.stringify(expected.websocketRoutes) !== JSON.stringify(actual.websocketRoutes) ? 'websocketRoutes' : null,
            ].filter(Boolean),
        }
}

export async function readCurrentRouteSnapshot(root = PROJECT_ROOT) {
    const [mockSource, backendFiles] = await Promise.all([
        readFile(resolve(root, 'src/app/mocks/handlers.ts'), 'utf8'),
        collectBackendFiles(resolve(root, 'server/src')),
    ])
    const backendSource = (await Promise.all(backendFiles.map((file) => readFile(file, 'utf8')))).join('\n')
    return buildRouteSnapshot({ mockSource, backendSource })
}

async function collectBackendFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
        const file = join(directory, entry.name)
        if (entry.isDirectory()) files.push(...await collectBackendFiles(file))
        else if (entry.isFile() && file.endsWith('.ts') && !file.endsWith('.test.ts')) files.push(file)
    }
    return files.sort()
}

export async function checkRouteSnapshot(root = PROJECT_ROOT, snapshotPath = DEFAULT_SNAPSHOT_PATH) {
    const [expectedSource, actual] = await Promise.all([
        readFile(resolve(root, snapshotPath), 'utf8'),
        readCurrentRouteSnapshot(root),
    ])
    let expected
    try {
        expected = JSON.parse(expectedSource)
    } catch (error) {
        throw new Error(`Route snapshot is not valid JSON: ${error instanceof Error ? error.message : String(error)}`)
    }
    const comparison = compareRouteSnapshots(expected, actual)
    if (!comparison.matches) throw new Error(`Mock/backend route snapshot drifted: ${comparison.differences.join(', ')}`)
    return actual
}

export function formatRouteSnapshot(snapshot) {
    return [
        `Mock/backend route snapshot passed (mock=${snapshot.mockRoutes.length}, backend=${snapshot.backendRoutes.length})`,
        `WebSocket contracts: ${snapshot.websocketRoutes.length}`,
    ].join('\n')
}

async function main() {
    const args = new Set(process.argv.slice(2))
    if (args.has('--write')) {
        const snapshot = await readCurrentRouteSnapshot()
        await writeFile(resolve(PROJECT_ROOT, DEFAULT_SNAPSHOT_PATH), `${JSON.stringify(snapshot, null, 2)}\n`, 'utf8')
        console.log(`Wrote ${DEFAULT_SNAPSHOT_PATH}`)
        return
    }
    const snapshot = await checkRouteSnapshot()
    console.log(formatRouteSnapshot(snapshot))
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) await main()
