import { readFileSync, readdirSync } from 'node:fs'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const PROJECT_ROOT = resolve(fileURLToPath(new URL('..', import.meta.url)))

function check(name, status, detail) {
    return { name, status, detail }
}

function parseErrorCodes(source) {
    const entries = []
    const pattern = /^\s*([A-Za-z0-9_]+):\s*'([^']+)'\s*,?$/gm
    for (const match of String(source).matchAll(pattern)) {
        entries.push({ key: match[1], value: match[2] })
    }
    return entries
}

function collectTypeScriptFiles(directory) {
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filePath = resolve(directory, entry.name)
        if (entry.isDirectory()) return collectTypeScriptFiles(filePath)
        return entry.isFile() && entry.name.endsWith('.ts') ? [filePath] : []
    })
}

export function evaluateErrorCodeContract({ errorCodesSource, sourceFiles }) {
    const entries = parseErrorCodes(errorCodesSource)
    const codeKeys = new Set(entries.map((entry) => entry.key))
    const values = entries.map((entry) => entry.value)
    const duplicateValues = values.filter((value, index) => values.indexOf(value) !== index)
    const invalidEntries = entries.filter((entry) => !/^[A-Z][A-Z0-9_]+$/.test(entry.value))
    const unknownReferences = []
    const referencePattern = /ERROR_CODES\.([A-Za-z0-9_]+)/g

    for (const [fileName, source] of Object.entries(sourceFiles)) {
        if (fileName.endsWith('/error-codes.ts') || fileName === 'error-codes.ts') continue
        for (const match of String(source).matchAll(referencePattern)) {
            if (!codeKeys.has(match[1])) unknownReferences.push(`${fileName}: ${match[1]}`)
        }
    }

    return [
        entries.length > 0
            ? check('Error-code registry', 'pass', `${entries.length} canonical error codes declared`)
            : check('Error-code registry', 'blocked', 'ERROR_CODES registry is empty or could not be parsed'),
        invalidEntries.length === 0
            ? check('Error-code value format', 'pass', 'all values use the canonical uppercase underscore format')
            : check('Error-code value format', 'blocked', `invalid values: ${invalidEntries.map((entry) => entry.value).join(', ')}`),
        duplicateValues.length === 0
            ? check('Error-code uniqueness', 'pass', 'all canonical error-code values are unique')
            : check('Error-code uniqueness', 'blocked', `duplicate values: ${[...new Set(duplicateValues)].join(', ')}`),
        unknownReferences.length === 0
            ? check('Error-code references', 'pass', 'all ERROR_CODES references resolve to the registry')
            : check('Error-code references', 'blocked', `unknown references: ${unknownReferences.join(', ')}`),
    ]
}

export function loadErrorCodeSources(root = PROJECT_ROOT) {
    const serverSourceRoot = resolve(root, 'server/src')
    const errorCodesPath = resolve(serverSourceRoot, 'shared/errors/error-codes.ts')
    const sourceFiles = Object.fromEntries(
        collectTypeScriptFiles(serverSourceRoot).map((filePath) => [
            filePath.slice(serverSourceRoot.length + 1),
            readFileSync(filePath, 'utf8'),
        ]),
    )
    return {
        errorCodesSource: readFileSync(errorCodesPath, 'utf8'),
        sourceFiles,
    }
}

export function formatErrorCodeResults(results) {
    const lines = ['Error-code source contract']
    for (const result of results) lines.push(`[${result.status.toUpperCase()}] ${result.name}: ${result.detail}`)
    return lines.join('\n')
}

if (process.argv[1] === fileURLToPath(import.meta.url)) {
    const results = evaluateErrorCodeContract(loadErrorCodeSources())
    console.log(formatErrorCodeResults(results))
    if (results.some((result) => result.status === 'blocked')) process.exitCode = 1
}
