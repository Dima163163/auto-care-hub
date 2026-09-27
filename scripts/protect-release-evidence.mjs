import { readFile, writeFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

import { decryptReleaseEvidence, encryptReleaseEvidence } from './release-evidence-encryption.mjs'

function parseJson(value) {
    try {
        return JSON.parse(value)
    } catch {
        throw new Error('Input must contain valid JSON.')
    }
}

async function main() {
    const [, , operation, inputPath, outputPath] = process.argv
    if (!['encrypt', 'decrypt'].includes(operation) || !inputPath || !outputPath) {
        throw new Error('Usage: node scripts/protect-release-evidence.mjs <encrypt|decrypt> <input.json> <output.json>')
    }
    const input = parseJson(await readFile(resolve(inputPath), 'utf8'))
    const output = operation === 'encrypt'
        ? encryptReleaseEvidence(JSON.stringify(input))
        : parseJson(decryptReleaseEvidence(input))
    await writeFile(resolve(outputPath), `${JSON.stringify(output, null, 2)}\n`, { mode: 0o600 })
    console.log(`Release evidence ${operation}ed successfully.`)
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    main().catch((error) => {
        console.error(`[protect-release-evidence] ${error instanceof Error ? error.message : String(error)}`)
        process.exitCode = 1
    })
}
