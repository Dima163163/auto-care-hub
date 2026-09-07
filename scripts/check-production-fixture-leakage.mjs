import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const assetsDirectory = path.resolve('dist/assets')
const assetNames = await readdir(assetsDirectory)
const entryName = assetNames.find((fileName) => fileName.startsWith('index-') && fileName.endsWith('.js'))
const fixtureMarkers = [
    'service@example.com',
    '+7 (495) 645-35-35',
]
if (!entryName) {
    console.error('Production fixture-leakage contract: Vite entry chunk is missing.')
    process.exitCode = 1
} else {
    const entry = await readFile(path.join(assetsDirectory, entryName), 'utf8')
    const leakedMarkers = fixtureMarkers.filter((marker) => entry.includes(marker))
    const fixtureAssets = []

    for (const assetName of assetNames.filter((fileName) => fileName.endsWith('.js'))) {
        const source = await readFile(path.join(assetsDirectory, assetName), 'utf8')
        if (fixtureMarkers.some((marker) => source.includes(marker))) fixtureAssets.push(assetName)
    }
    console.info('Production fixture-leakage contract')
    console.info(`  entry: ${entryName}`)

    if (leakedMarkers.length > 0) {
        console.error(`Demo-only contact markers leaked into the initial entry: ${leakedMarkers.join(', ')}`)
        process.exitCode = 1
    } else if (fixtureAssets.length > 0) {
        console.error(`Demo-only contact fixtures leaked into generated assets: ${fixtureAssets.join(', ')}`)
        process.exitCode = 1
    } else {
        console.info('  result: no demo-only contact fixtures in generated JavaScript assets')
    }
}
