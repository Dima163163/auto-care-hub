import { gzipSync } from 'node:zlib'
import { readdir, readFile, stat } from 'node:fs/promises'
import path from 'node:path'

const assetsDirectory = path.resolve('dist/assets')
const budgets = {
    // Locale and route chunks are lazy. Full-build totals are reported for
    // observability, while launch gates apply to the initial entry and the
    // largest locale/route payload a user can actually download at once.
    largestLocaleBytes: 90_000,
    // Keep the initial entry below 400 kB after moving framework/runtime code
    // into named Rolldown chunks. The map-enabled discovery flow remains lazy.
    largestEntryBytes: 400_000,
    largestChunkBytes: 300_000,
    largestCssBytes: 175_000,
    javascriptChunkCount: 90,
}

const formatBytes = (bytes) => `${(bytes / 1000).toFixed(1)} kB`

const readAsset = async (fileName) => {
    const filePath = path.join(assetsDirectory, fileName)
    const [metadata, contents] = await Promise.all([
        stat(filePath),
        readFile(filePath),
    ])

    return {
        fileName,
        bytes: metadata.size,
        gzipBytes: gzipSync(contents).length,
    }
}

const assets = (await readdir(assetsDirectory)).filter(
    (fileName) => fileName.endsWith('.js') || fileName.endsWith('.css'),
)

const assetSizes = await Promise.all(assets.map(readAsset))
const javascriptAssets = assetSizes.filter(({ fileName }) => fileName.endsWith('.js'))
const cssAssets = assetSizes.filter(({ fileName }) => fileName.endsWith('.css'))
const totalJavaScriptBytes = javascriptAssets.reduce((total, asset) => total + asset.bytes, 0)
const totalJavaScriptGzipBytes = javascriptAssets.reduce((total, asset) => total + asset.gzipBytes, 0)
const totalCssBytes = cssAssets.reduce((total, asset) => total + asset.bytes, 0)
const largestJavaScriptAsset = javascriptAssets.reduce((largest, asset) =>
    asset.bytes > largest.bytes ? asset : largest,
)
const entryAsset = javascriptAssets.find(({ fileName }) => fileName.startsWith('index-'))
const nonEntryJavaScriptAssets = javascriptAssets.filter(
    ({ fileName }) => !fileName.startsWith('index-'),
)
const largestNonEntryAsset = nonEntryJavaScriptAssets.reduce((largest, asset) =>
    asset.bytes > largest.bytes ? asset : largest,
)
const localeAssets = javascriptAssets.filter(({ fileName }) => /^(?:popular-|ru-|ro-|european-)/.test(fileName))
const largestLocaleAsset = localeAssets.reduce((largest, asset) => asset.bytes > largest.bytes ? asset : largest, { fileName: 'none', bytes: 0, gzipBytes: 0 })
const largestCssAsset = cssAssets.reduce((largest, asset) => asset.bytes > largest.bytes ? asset : largest, { fileName: 'none', bytes: 0, gzipBytes: 0 })

const checks = [
    [
        'largest entry',
        entryAsset?.bytes ?? Number.POSITIVE_INFINITY,
        budgets.largestEntryBytes,
    ],
    [
        'largest JS chunk',
        largestNonEntryAsset.bytes,
        budgets.largestChunkBytes,
    ],
    ['largest locale chunk', largestLocaleAsset.bytes, budgets.largestLocaleBytes],
    ['largest CSS asset', largestCssAsset.bytes, budgets.largestCssBytes],
    [
        'JS chunk count',
        javascriptAssets.length,
        budgets.javascriptChunkCount,
    ],
]

console.info('Frontend performance budget')
console.info(`  JS: ${formatBytes(totalJavaScriptBytes)} raw / ${formatBytes(totalJavaScriptGzipBytes)} gzip`)
console.info(`  entry: ${entryAsset?.fileName ?? 'missing'} (${formatBytes(entryAsset?.bytes ?? 0)})`)
console.info(`  largest chunk: ${largestNonEntryAsset.fileName} (${formatBytes(largestNonEntryAsset.bytes)})`)
console.info(`  largest non-entry chunk: ${largestNonEntryAsset.fileName} (${formatBytes(largestNonEntryAsset.bytes)})`)
console.info(`  CSS: ${formatBytes(totalCssBytes)} / JS chunks: ${javascriptAssets.length}`)
console.info(`  largest locale chunk: ${largestLocaleAsset.fileName} (${formatBytes(largestLocaleAsset.bytes)})`)
console.info(`  largest CSS asset: ${largestCssAsset.fileName} (${formatBytes(largestCssAsset.bytes)})`)

const failures = checks.filter(([, actual, limit]) => actual > limit)

if (failures.length > 0) {
    for (const [name, actual, limit] of failures) {
        const format = name === 'JS chunk count' ? (value) => String(value) : formatBytes
        console.error(`Budget exceeded: ${name} is ${format(actual)}, limit is ${format(limit)}`)
    }

    process.exitCode = 1
}
