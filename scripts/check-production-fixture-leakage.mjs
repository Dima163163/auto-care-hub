import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const fixtureMarkers = ['service@example.com', '+7 (495) 645-35-35', 'admin@autocarehub.test', 'emily.carter@example.com', 'sophia.miller@example.com', 'ilya.orlov@proservice.test', 'proservice-moscow', 'formula-moscow']
const textAsset = /\.(?:js|mjs|json|html|rsc|txt|map)$/

async function collectFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []
    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name)
        if (entry.isDirectory()) files.push(...await collectFiles(entryPath))
        else if (entry.isFile() && textAsset.test(entry.name)) files.push(entryPath)
        // Do not follow links out of the selected build directory.
    }
    return files
}

export async function inspectProductionFixtureLeakage({ format = 'next', directory = '.next' } = {}) {
    if (!['next', 'vite'].includes(format)) throw new Error(`Unsupported artifact format: ${format}`)
    const root = path.resolve(directory)
    let files
    if (format === 'next') {
        const buildId = await readFile(path.join(root, 'BUILD_ID'), 'utf8')
        if (!buildId.trim()) throw new Error('Next production BUILD_ID is empty')
        const manifest = JSON.parse(await readFile(path.join(root, 'build-manifest.json'), 'utf8'))
        if (!Array.isArray(manifest.rootMainFiles) || manifest.rootMainFiles.length === 0) throw new Error('Next production client manifest is missing entry assets')
        for (const entry of manifest.rootMainFiles) await readFile(path.join(root, entry))
        const clientFiles = await collectFiles(path.join(root, 'static'))
        if (!clientFiles.some((file) => file.endsWith('.js'))) throw new Error('Next client JavaScript is missing')
        files = [...clientFiles, ...await collectFiles(path.join(root, 'server'))]
    } else {
        files = await collectFiles(path.join(root, 'assets'))
        if (!files.some((file) => /[\\/]index-[^/\\]+\.js$/.test(file))) throw new Error('Vite production entry chunk is missing')
        files.push(path.join(root, 'index.html'))
    }
    const leaks = []
    for (const file of files) {
        const source = await readFile(file, 'utf8')
        // Report paths only; never print fixture content or production data.
        if (fixtureMarkers.some((marker) => source.includes(marker))) leaks.push(path.relative(root, file))
    }
    return { format, directory: root, scanned: files.length, leaks }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const args = process.argv.slice(2)
        let format = 'next'
        let directory = process.env.NEXT_DIST_DIR ?? '.next'
        for (let index = 0; index < args.length; index += 2) {
            const value = args[index + 1]
            if (!value || !['--format', '--dist-dir'].includes(args[index])) throw new Error('Use --format next|vite --dist-dir <build>')
            if (args[index] === '--format') format = value
            else directory = value
        }
        const result = await inspectProductionFixtureLeakage({ format, directory })
        console.info(`Production fixture leakage: ${format}, ${result.scanned} files checked`)
        if (result.leaks.length > 0) {
            console.error(`Synthetic fixtures found in: ${result.leaks.join(', ')}`)
            process.exitCode = 1
        } else console.info('PASS: no synthetic contact/account markers in production assets')
    } catch (error) {
        console.error(`Production fixture leakage check failed: ${error instanceof Error ? error.message : String(error)}`)
        process.exitCode = 1
    }
}
