import { readFile, readdir } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export function findMutableActions(source) {
    const failures = []
    for (const [index, line] of source.split('\n').entries()) {
        const match = line.match(/^\s*(?:-\s*)?uses:\s*([^\s#]+)/)
        if (!match) continue
        const reference = match[1].replace(/^['"]|['"]$/g, '')
        if (reference.startsWith('./')) continue
        if (/^[\w.-]+\/[\w./-]+@[a-f0-9]{40}$/.test(reference)) continue
        if (/^docker:\/\/[^\s]+@sha256:[a-f0-9]{64}$/.test(reference)) continue
        failures.push({ line: index + 1, reference })
    }
    return failures
}

export async function checkWorkflowActionPins(root) {
    const directory = resolve(root, '.github/workflows')
    const files = (await readdir(directory)).filter((name) => /\.ya?ml$/.test(name))
    const failures = []
    for (const file of files) for (const failure of findMutableActions(await readFile(resolve(directory, file), 'utf8'))) failures.push({ file, ...failure })
    return failures
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const failures = await checkWorkflowActionPins(fileURLToPath(new URL('..', import.meta.url)))
    for (const failure of failures) console.error(`${failure.file}:${failure.line}: action must use an immutable reference (${failure.reference})`)
    console.log(`GitHub Actions immutable-reference check: ${failures.length === 0 ? 'PASS' : 'FAIL'}`)
    if (failures.length > 0) process.exitCode = 1
}
