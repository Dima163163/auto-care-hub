import { readdir, readFile } from 'node:fs/promises'
import path from 'node:path'

const stylesheetPath = path.resolve('src/index.css')
const stylesheet = await readFile(stylesheetPath, 'utf8')
const packageManifest = JSON.parse(await readFile(path.resolve('package.json'), 'utf8'))

const sourceRoot = path.resolve('src')
const sourceExtensions = new Set(['.ts', '.tsx'])
const rawColorPattern = /(?:\b(?:amber|blue|emerald|gray|green|indigo|orange|purple|red|slate|yellow)-(?:50|100|200|300|400|500|600|700|800|900)\b|#[0-9a-fA-F]{3,8})/g
const legacyRadiusPattern = /\brounded-3xl\b/g
const tinyLabelPattern = /\btext-\[(?:9|10|11)px\]\b/g

const designExceptions = {
    tinyLabel: new Set([
        'src/pages/admin-audit-logs/ui/AdminAuditLogsPage.tsx',
        'src/widgets/bottom-nav/ui/BottomNav.tsx',
    ]),
}

async function collectSourceFiles(directory) {
    const entries = await readdir(directory, { withFileTypes: true })
    const files = []

    for (const entry of entries) {
        const entryPath = path.join(directory, entry.name)

        if (entry.isDirectory()) {
            files.push(...await collectSourceFiles(entryPath))
            continue
        }

        if (sourceExtensions.has(path.extname(entry.name))) {
            files.push(entryPath)
        }
    }

    return files
}

const semanticTokens = [
    '--background',
    '--foreground',
    '--card',
    '--card-foreground',
    '--muted',
    '--muted-foreground',
    '--primary',
    '--primary-foreground',
    '--destructive',
    '--success-strong',
    '--rating-fill',
    '--rating-foreground',
    '--border',
    '--input',
    '--ring',
]

const foundationTokens = [
    '--font-display',
    '--font-body',
    '--type-label-size',
    '--type-label-line',
    '--type-body-size',
    '--type-body-line',
    '--type-heading-line',
    '--measure-readable',
    '--layout-public-max',
    '--layout-operational-max',
    '--layout-gutter',
    '--mobile-nav-height',
    '--space-control',
    '--space-section',
    '--space-page',
    '--radius-control',
    '--radius-card',
    '--radius-panel',
    '--radius-pill',
    '--focus-ring-width',
    '--focus-ring-offset',
    '--motion-duration-fast',
    '--motion-duration-standard',
    '--motion-duration-slow',
    '--motion-duration-hero',
    '--motion-ease-standard',
]

const typographyContract = [
    {
        label: 'Commissioner font import',
        value: '@import "@fontsource-variable/commissioner";',
    },
    {
        label: 'IBM Plex Sans font import',
        value: '@import "@fontsource-variable/ibm-plex-sans";',
    },
    {
        label: 'display font token',
        value: "--font-display: 'Commissioner Variable'",
    },
    {
        label: 'body font token',
        value: "--font-body: 'IBM Plex Sans Variable'",
    },
]

const requiredDeclarations = (scope) => semanticTokens
    .filter((token) => !new RegExp(`${token}\\s*:`).test(scope))

const rootScope = stylesheet.match(/:root\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
// The dark theme intentionally supports both the class and the data-theme
// bootstrap attribute. Capture the shared declaration block instead of only
// matching a standalone `.dark {` selector.
const darkScope = stylesheet.match(/\.dark\s*,\s*:root\[data-theme="dark"\]\s*\{([\s\S]*?)\n\}/)?.[1] ?? ''
const failures = [
    ...requiredDeclarations(rootScope).map((token) => `:root is missing ${token}`),
    ...requiredDeclarations(darkScope).map((token) => `.dark is missing ${token}`),
    ...foundationTokens
        .filter((token) => !new RegExp(`${token}\\s*:`).test(rootScope))
        .map((token) => `:root is missing foundation ${token}`),
    ...typographyContract
        .filter(({ value }) => !stylesheet.includes(value))
        .map(({ label }) => `typography contract is missing ${label}`),
]

const fontDependencies = [
    '@fontsource-variable/commissioner',
    '@fontsource-variable/ibm-plex-sans',
]
const declaredDependencies = {
    ...(packageManifest.dependencies ?? {}),
    ...(packageManifest.devDependencies ?? {}),
}

for (const dependency of fontDependencies) {
    if (!declaredDependencies[dependency]) {
        failures.push(`typography dependency ${dependency} is not declared`)
    }
}

for (const filePath of await collectSourceFiles(sourceRoot)) {
    const relativePath = path.relative(process.cwd(), filePath)
    const source = await readFile(filePath, 'utf8')

    if (rawColorPattern.test(source)) {
        failures.push(`${relativePath} contains a raw color; use a semantic design token`)
    }
    rawColorPattern.lastIndex = 0

    if (legacyRadiusPattern.test(source)) {
        failures.push(`${relativePath} contains legacy rounded-3xl geometry; use the shared radius scale`)
    }
    legacyRadiusPattern.lastIndex = 0

    if (!designExceptions.tinyLabel.has(relativePath) && tinyLabelPattern.test(source)) {
        failures.push(`${relativePath} contains a 9-11px label; use the shared text-xs floor`)
    }
    tinyLabelPattern.lastIndex = 0
}

if (!stylesheet.includes('.text-success-strong')) {
    failures.push('semantic success utility .text-success-strong is missing')
}

if (!stylesheet.includes('.pb-safe')) {
    failures.push('safe-area utility .pb-safe is missing')
}

if (!stylesheet.includes('.pb-mobile-nav-safe')) {
    failures.push('mobile navigation safe-area utility .pb-mobile-nav-safe is missing')
}

try {
    await readFile(path.resolve('docs/design/design-token-contract.md'), 'utf8')
} catch {
    failures.push('docs/design/design-token-contract.md is missing')
}

try {
    await readFile(path.resolve('docs/design/font-license-contract.md'), 'utf8')
} catch {
    failures.push('docs/design/font-license-contract.md is missing')
}

if (failures.length > 0) {
    console.error('Design token contract failed:')
    failures.forEach((failure) => console.error(`- ${failure}`))
    process.exitCode = 1
} else {
    console.info(`Design token contract passed (${semanticTokens.length} semantic roles, ${foundationTokens.length} foundation tokens, light/dark overrides).`)
}
