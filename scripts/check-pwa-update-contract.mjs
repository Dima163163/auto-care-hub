import { readFile } from 'node:fs/promises'

const serviceWorkerPath = new URL('../dist/sw.js', import.meta.url)
const source = await readFile(serviceWorkerPath, 'utf8')

const requiredContracts = [
    ['prompt skip-waiting message', /SKIP_WAITING/],
    ['skipWaiting handler', /\.skipWaiting\(\)/],
    ['open-tab clients claim', /\.clientsClaim\(\)/],
]

const missingContracts = requiredContracts
    .filter(([, pattern]) => !pattern.test(source))
    .map(([label]) => label)

if (missingContracts.length > 0) {
    throw new Error(
        `PWA update contract is incomplete in dist/sw.js: ${missingContracts.join(', ')}`,
    )
}

console.info('PWA update contract passed: skipWaiting and clientsClaim are present.')
