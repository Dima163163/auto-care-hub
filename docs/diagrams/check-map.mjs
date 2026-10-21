import { createHash } from 'node:crypto'
import { readFile, readdir } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

export async function checkMap(manifest, repositoryRoot, scope) {
    if (scope && !manifest.diagrams.some((item) => item.scope === scope)) {
        throw new Error(`Unknown scope: ${scope}`)
    }
    const root = path.resolve(repositoryRoot)
    const selected = (item) => !scope || item.scopes.includes(scope)
    const drift = []
    let checked = 0
    for (const source of manifest.sources.filter(selected)) {
        const target = path.resolve(root, source.path)
        if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Source path escapes repository')
        checked += 1
        try {
            const digest = createHash('sha256').update(await readFile(target)).digest('hex')
            if (digest !== source.sha256) drift.push({ path: source.path, scopes: source.scopes, reason: 'content changed' })
        } catch (error) {
            if (error.code !== 'ENOENT') throw error
            drift.push({ path: source.path, scopes: source.scopes, reason: 'missing' })
        }
    }
    for (const inventory of manifest.inventories.filter(selected)) {
        const target = path.resolve(root, inventory.path)
        if (!target.startsWith(`${root}${path.sep}`)) throw new Error('Inventory path escapes repository')
        try {
            const entries = (await readdir(target, { withFileTypes: true }))
                .filter((entry) => inventory.kind === 'directories' ? entry.isDirectory() : entry.isFile() && /\.(?:ts|tsx)$/.test(entry.name) && !/\.(?:test|spec)\./.test(entry.name))
                .map((entry) => entry.name).sort()
            if (JSON.stringify(entries) !== JSON.stringify(inventory.entries)) drift.push({ path: inventory.path, scopes: inventory.scopes, reason: 'directory inventory changed' })
        } catch (error) {
            if (error.code !== 'ENOENT') throw error
            drift.push({ path: inventory.path, scopes: inventory.scopes, reason: 'directory missing' })
        }
    }
    return { baseline: manifest.baseline, scope: scope ?? 'all', checkedSources: checked, drift }
}

if (process.argv[1] && path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    try {
        const args = process.argv.slice(2)
        let root = fileURLToPath(new URL('../../', import.meta.url))
        let scope
        for (let index = 0; index < args.length; index += 2) {
            const value = args[index + 1]
            if (!value || !['--scope', '--repo'].includes(args[index])) throw new Error('Use --scope <name> and/or --repo <path>')
            if (args[index] === '--scope') scope = value
            else root = path.resolve(value)
        }
        const manifest = JSON.parse(await readFile(new URL('./sources.json', import.meta.url), 'utf8'))
        const result = await checkMap(manifest, root, scope)
        console.log(`Map ${result.baseline.slice(0, 7)} / ${result.scope}: ${result.checkedSources} source anchors checked.`)
        if (result.drift.length) {
            for (const item of result.drift) console.error(`DRIFT ${item.path}: ${item.reason} [${item.scopes.join(', ')}]`)
            process.exitCode = 1
        } else console.log('PASS: tracked source fingerprints and inventories match; consult the map for targeted reading.')
    } catch (error) {
        console.error(error.message)
        process.exitCode = 2
    }
}
