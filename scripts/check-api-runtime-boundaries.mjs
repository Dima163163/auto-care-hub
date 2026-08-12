import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const sourceRoots = [path.resolve('src/entities'), path.resolve('src/features')]
const endpointPattern = /^\s{8}\w+:\s+(?:build|builder)\.(?:query|mutation)\b/gm

async function collectApiFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name)

        if (entry.isDirectory()) {
            files.push(...await collectApiFiles(entryPath))
        } else if (entry.name.endsWith('Api.ts') && entry.name !== 'baseApi.ts') {
            files.push(entryPath)
        }
    }

    return files
}

const apiFiles = (await Promise.all(sourceRoots.map(collectApiFiles))).flat().sort()
const failures = []
let endpointCount = 0

for (const filePath of apiFiles) {
    const source = await readFile(filePath, 'utf8')
    const endpoints = [...source.matchAll(endpointPattern)]
    endpointCount += endpoints.length

    endpoints.forEach((match, index) => {
        const start = match.index ?? 0
        const end = endpoints[index + 1]?.index ?? source.length
        const endpointSource = source.slice(start, end)

        if (!/\btransformResponse\s*:/.test(endpointSource)) {
            failures.push(`${path.relative(process.cwd(), filePath)}:${source.slice(0, start).split('\n').length}`)
        }
    })
}

if (failures.length > 0) {
    console.error('Frontend API runtime-boundary contract failed:')
    failures.forEach((failure) => console.error(`- ${failure} has no transformResponse`))
    process.exitCode = 1
} else {
    console.info(`Frontend API runtime-boundary contract passed (${endpointCount} endpoints across ${apiFiles.length} API modules).`)
}
