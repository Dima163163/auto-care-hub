import { readFile, readdir } from 'node:fs/promises'
import { join, relative, resolve } from 'node:path'

const root = resolve(new URL('..', import.meta.url).pathname)
const scanRoots = ['src', 'server/src', 'server/scripts', 'scripts', 'app'].map((path) => join(root, path))
const ignored = new Set(['node_modules', '.next', 'dist', 'coverage'])
const ignoredFiles = new Set([
  'check-no-bookly-runtime.mjs',
  'check-no-bookly-runtime.test.mjs',
  'check-legacy-cleanup.mjs',
  'check-local-mvp.mjs',
])
const matches = []

async function walk(path) {
  let entries
  try { entries = await readdir(path, { withFileTypes: true }) } catch { return }
  for (const entry of entries) {
    if (ignored.has(entry.name)) continue
    const child = join(path, entry.name)
    if (entry.isDirectory()) await walk(child)
    else if (!ignoredFiles.has(entry.name) && /\.(?:ts|tsx|mts|mjs|js|json|css|html)$/.test(entry.name)) {
      const content = await readFile(child, 'utf8')
      if (/bookly/i.test(content)) matches.push(relative(root, child))
    }
  }
}

await Promise.all(scanRoots.map((path) => walk(path)))
if (matches.length > 0) throw new Error(`Bookly runtime references remain: ${matches.join(', ')}`)
console.info('No Bookly runtime references found in production source trees.')
