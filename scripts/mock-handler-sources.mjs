import { readFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'

// Only registered handler modules contribute to the public mock contract.
export async function readMockHandlerSources(root = process.cwd()) {
    const entry = resolve(root, 'src/app/mocks/handlers.ts')
    const source = await readFile(entry, 'utf8')
    const modules = [...source.matchAll(/from\s+['"](\.\/[^'"]+\.handlers)['"]/g)]
        .map((match) => resolve(dirname(entry), `${match[1]}.ts`))
    return [source, ...await Promise.all(modules.map((file) => readFile(file, 'utf8')))].join('\n')
}
