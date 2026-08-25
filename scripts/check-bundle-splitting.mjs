import { readdir, stat } from 'node:fs/promises'
import path from 'node:path'

const assetsDirectory = path.resolve('dist/assets')
const assets = await readdir(assetsDirectory)
const javascriptAssets = assets.filter((fileName) => fileName.endsWith('.js'))

const requiredChunkPrefixes = [
    'react-runtime-',
    'state-runtime-',
    'ui-runtime-',
    'autocare-results-',
    'autocare-provider-',
    'admin-dashboard-',
    'autocare-popular-',
    'popular-',
    'ro-',
    'ru-',
    'european-',
]

const missingChunks = requiredChunkPrefixes.filter(
    (prefix) => !javascriptAssets.some((fileName) => fileName.startsWith(prefix)),
)

const entryFileName = javascriptAssets.find((fileName) => fileName.startsWith('index-'))
const entryBytes = entryFileName
    ? (await stat(path.join(assetsDirectory, entryFileName))).size
    : Number.POSITIVE_INFINITY

console.info('Frontend bundle-splitting contract')
console.info(`  entry: ${entryFileName ?? 'missing'} (${(entryBytes / 1000).toFixed(1)} kB)`)
console.info(`  required chunks: ${requiredChunkPrefixes.length}`)

if (missingChunks.length > 0) {
    console.error(`Missing expected lazy/runtime chunks: ${missingChunks.join(', ')}`)
    process.exitCode = 1
}

if (entryBytes > 400_000) {
    console.error(`Initial entry exceeds 400.0 kB: ${(entryBytes / 1000).toFixed(1)} kB`)
    process.exitCode = 1
}
