import { execFileSync } from 'node:child_process'
import { gzipSync } from 'node:zlib'
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs'
import { dirname, resolve, relative } from 'node:path'
import { fileURLToPath } from 'node:url'

const projectRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const nextStaticRoot = resolve(projectRoot, '.next/static')
const nextServerAppRoot = resolve(projectRoot, '.next/server/app')
const publicRoot = resolve(projectRoot, 'public')

export const MAX_SEO_HTML_RESPONSE_BYTES = 2 * 1024 * 1024
const SEO_METADATA_IMAGE_PATHS = [
    '/images/autocare/hero-map-generated.webp',
]
const LAUNCH_LOCALES = ['ru', 'en', 'es', 'ro']

const PUBLIC_ROUTES = [
    '/',
    '/services',
    '/services?service=oil-change',
    '/for-owners',
    '/about',
    '/reviews',
    '/features',
    '/help',
    '/agreement',
    '/rules',
    '/privacy',
]

const PRIVATE_ROUTES = ['/profile', '/owner/dashboard', '/admin/dashboard']
const DEFAULT_PROVIDER_IDS = ['api-proservice-moscow', 'api-autolux-moscow', 'api-formula-moscow']
const configuredProviderIds = (process.env.NEXT_PUBLIC_PRERENDER_PROVIDER_IDS ?? DEFAULT_PROVIDER_IDS.join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)
const PROVIDER_ROUTES = (process.env.SEO_PROVIDER_PATHS ?? configuredProviderIds.map((id) => `/services/${id}`).join(','))
    .split(',')
    .map((value) => value.trim())
    .filter(Boolean)

const BUDGETS = {
    largestJavaScriptBytes: 600_000,
    largestCssBytes: 250_000,
    totalJavaScriptBytes: 5_500_000,
    totalCssBytes: 500_000,
    mapImageBytes: 350_000,
    largestPublicImageBytes: 2_000_000,
    totalPublicImageBytes: 7_000_000,
}

export function normalizeSeoBaseUrl(value) {
    const raw = String(value ?? '').trim()
    if (!raw) throw new Error('SEO_BASE_URL must be a non-empty URL.')

    let parsed
    try {
        parsed = new URL(raw)
    } catch {
        throw new Error('SEO_BASE_URL must be a valid absolute URL.')
    }

    const localHost = ['localhost', '127.0.0.1', '[::1]', '::1'].includes(parsed.hostname)
    if (!['http:', 'https:'].includes(parsed.protocol)) throw new Error('SEO_BASE_URL must use http or https.')
    if (!localHost && parsed.protocol !== 'https:') throw new Error('SEO_BASE_URL must use HTTPS outside localhost.')
    if (parsed.username || parsed.password) throw new Error('SEO_BASE_URL must not contain embedded credentials.')

    parsed.hash = ''
    parsed.search = ''
    parsed.pathname = parsed.pathname.replace(/\/+$/, '')
    return parsed.toString().replace(/\/$/, '')
}

function walk(directory) {
    if (!existsSync(directory)) return []
    return readdirSync(directory, { withFileTypes: true }).flatMap((entry) => {
        const filePath = resolve(directory, entry.name)
        return entry.isDirectory() ? walk(filePath) : [filePath]
    })
}

function check(name, status, detail) {
    return { name, status, detail }
}

function parseArgs(args) {
    const urlIndex = args.indexOf('--url')
    return {
        baseUrl: process.env.SEO_BASE_URL?.trim() || (urlIndex >= 0 ? args[urlIndex + 1] : undefined),
        json: args.includes('--json'),
        strict: args.includes('--strict') || process.env.REQUIRE_PRODUCTION_SEO === 'true',
    }
}

function checkBuildBudgets() {
    const assets = walk(nextStaticRoot).filter((filePath) => /\.(?:js|css)$/i.test(filePath))
    if (assets.length === 0) {
        return [check('Next.js production assets', 'blocked', 'run npm run build before checking JS/CSS budgets')]
    }

    const records = assets.map((filePath) => {
        const contents = readFileSync(filePath)
        return {
            path: relative(projectRoot, filePath),
            extension: filePath.endsWith('.css') ? 'css' : 'js',
            bytes: contents.length,
            gzipBytes: gzipSync(contents).length,
        }
    })
    const javascript = records.filter((record) => record.extension === 'js')
    const css = records.filter((record) => record.extension === 'css')
    const largestJavaScript = javascript.reduce((largest, record) => record.bytes > largest.bytes ? record : largest, { bytes: 0, path: 'none' })
    const largestCss = css.reduce((largest, record) => record.bytes > largest.bytes ? record : largest, { bytes: 0, path: 'none' })
    const totalJavaScript = javascript.reduce((total, record) => total + record.bytes, 0)
    const totalCss = css.reduce((total, record) => total + record.bytes, 0)

    return [
        check('JavaScript budget', largestJavaScript.bytes <= BUDGETS.largestJavaScriptBytes && totalJavaScript <= BUDGETS.totalJavaScriptBytes ? 'pass' : 'blocked', `${(totalJavaScript / 1000).toFixed(1)} kB total; largest ${(largestJavaScript.bytes / 1000).toFixed(1)} kB (${largestJavaScript.path})`),
        check('CSS budget', largestCss.bytes <= BUDGETS.largestCssBytes && totalCss <= BUDGETS.totalCssBytes ? 'pass' : 'blocked', `${(totalCss / 1000).toFixed(1)} kB total; largest ${(largestCss.bytes / 1000).toFixed(1)} kB (${largestCss.path})`),
    ]
}

function checkMediaBudgets() {
    const assets = walk(publicRoot).filter((filePath) => /\.(?:png|jpe?g|webp|avif|gif)$/i.test(filePath))
    const records = assets.map((filePath) => ({ path: relative(projectRoot, filePath), bytes: statSync(filePath).size }))
    const largest = records.reduce((current, record) => record.bytes > current.bytes ? record : current, { bytes: 0, path: 'none' })
    const total = records.reduce((sum, record) => sum + record.bytes, 0)
    const mapAssets = records.filter((record) => /(?:map|location)/i.test(record.path))
    const largestMap = mapAssets.reduce((current, record) => record.bytes > current.bytes ? record : current, { bytes: 0, path: 'none' })

    return [
        check('Public image budget', largest.bytes <= BUDGETS.largestPublicImageBytes && total <= BUDGETS.totalPublicImageBytes ? 'pass' : 'blocked', `${(total / 1_000_000).toFixed(2)} MB total; largest ${(largest.bytes / 1000).toFixed(1)} kB (${largest.path})`),
        check('Map/image budget', largestMap.bytes <= BUDGETS.mapImageBytes ? 'pass' : 'blocked', largestMap.path === 'none' ? 'no map/location asset found' : `${(largestMap.bytes / 1000).toFixed(1)} kB (${largestMap.path})`),
    ]
}

function checkPrerenderContract() {
    const pageSource = readFileSync(resolve(projectRoot, 'src/app/[[...slug]]/page.page.tsx'), 'utf8')
    const discoverySource = readFileSync(resolve(projectRoot, 'src/app/services/page.page.tsx'), 'utf8')
    const providerSource = readFileSync(resolve(projectRoot, 'src/app/services/[providerId]/page.page.tsx'), 'utf8')
    const metadataSource = readFileSync(resolve(projectRoot, 'src/app/metadata.ts'), 'utf8')
    const requiredFragments = ['generateStaticParams', 'dynamicParams = true', 'revalidate = 300']
    const missing = requiredFragments.filter((fragment) => !pageSource.includes(fragment))
    if (!discoverySource.includes('searchParams') || !discoverySource.includes('hasSearchParams')) missing.push('services/page.page.tsx: query-aware metadata')
    if (!providerSource.includes('generateStaticParams') || !providerSource.includes('NEXT_PUBLIC_PRERENDER_PROVIDER_IDS')) missing.push('services/[providerId]/page.page.tsx: provider static params')
    const metadataFragments = ['openGraph:', 'alternates:', 'robots:']
    missing.push(...metadataFragments.filter((fragment) => !metadataSource.includes(fragment)).map((fragment) => `metadata.ts: ${fragment}`))
    return missing.length === 0
        ? [check('Dynamic provider prerender', 'pass', `selected public routes and ${PROVIDER_ROUTES.length} provider variants are configured for ISR/static generation`)]
        : [check('Dynamic provider prerender', 'blocked', `missing contract fragments: ${missing.join(', ')}`)]
}

function resolvePublicAssetPath(assetPath) {
    const raw = String(assetPath ?? '').trim()
    if (!raw || !raw.startsWith('/')) return null

    const pathname = raw.split(/[?#]/, 1)[0]
    if (!pathname || pathname.includes('..')) return null
    return resolve(publicRoot, `.${pathname}`)
}

export function checkOgImageExistence() {
    const metadataPath = resolve(projectRoot, 'src/app/metadata.ts')
    const metadataSource = readFileSync(metadataPath, 'utf8')
    const referencedPaths = [...new Set([
        ...SEO_METADATA_IMAGE_PATHS,
        ...[...metadataSource.matchAll(/['"](\/images\/[^'"]+)['"]/g)].map((match) => match[1]),
    ])]
    const missing = referencedPaths.filter((assetPath) => {
        const resolvedPath = resolvePublicAssetPath(assetPath)
        return !resolvedPath || !existsSync(resolvedPath) || !statSync(resolvedPath).isFile()
    })

    return missing.length === 0
        ? check('Open Graph image assets', 'pass', `${referencedPaths.length} metadata image path(s) resolve inside public/`)
        : check('Open Graph image assets', 'blocked', `missing or unsafe public assets: ${missing.join(', ')}`)
}

export function checkCanonicalRobotsConsistency() {
    const metadataSource = readFileSync(resolve(projectRoot, 'src/app/metadata.ts'), 'utf8')
    const clientSeoSource = readFileSync(resolve(projectRoot, 'src/shared/ui/seo-head/SeoHead.tsx'), 'utf8')
    const requiredMetadataFragments = [
        'alternates: { canonical }',
        'robots: isNoIndex ? { index: false, follow: true } : indexRobots',
        'const isSearchResult = path === \'/services\' && options.hasSearchParams === true',
        'const privatePrefixes =',
    ]
    const missing = requiredMetadataFragments.filter((fragment) => !metadataSource.includes(fragment))
    if (!clientSeoSource.includes("setMeta('name', 'robots'") || !clientSeoSource.includes("setLink('canonical'")) {
        missing.push('SeoHead canonical/robots client parity')
    }

    return missing.length === 0
        ? check('Canonical/robots consistency', 'pass', 'server metadata and hydrated SeoHead apply the same canonical/noindex boundaries')
        : check('Canonical/robots consistency', 'blocked', `missing source contract: ${missing.join(', ')}`)
}

export function checkProductionUrlSafety() {
    const source = readFileSync(new URL(import.meta.url), 'utf8')
    const requiredFragments = [
        'normalizeSeoBaseUrl',
        'HTTPS outside localhost',
        'embedded credentials',
        'AbortSignal.timeout(10_000)',
    ]
    const missing = requiredFragments.filter((fragment) => !source.includes(fragment))
    return missing.length === 0
        ? check('SEO runner URL safety', 'pass', 'remote probes require HTTPS without embedded credentials and use bounded timeouts')
        : check('SEO runner URL safety', 'blocked', `missing safety guard: ${missing.join(', ')}`)
}

export function checkLocaleCoverage() {
    const i18nSource = readFileSync(resolve(projectRoot, 'src/shared/config/i18n.ts'), 'utf8')
    const loaderSource = readFileSync(resolve(projectRoot, 'src/shared/config/translations/index.ts'), 'utf8')
    const translationTestSource = readFileSync(resolve(projectRoot, 'src/shared/config/translations/translations.test.ts'), 'utf8')
    const expectedFiles = {
        ru: ['ru-part-1.ts', 'ru-part-2.ts', 'ru-part-3.ts', 'ru-part-4.ts', 'autocare-popular.ts'],
        en: ['en.ts'],
        es: ['popular-es.ts', 'autocare-popular.ts'],
        ro: ['ro.ts', 'autocare-popular.ts'],
    }
    const missing = []
    for (const locale of LAUNCH_LOCALES) {
        if (!i18nSource.includes(`'${locale}'`)) missing.push(`i18n:${locale}`)
        if (!new RegExp(`\\b${locale}:\\s*async`).test(loaderSource)) missing.push(`loader:${locale}`)
        for (const fileName of expectedFiles[locale]) {
            if (!existsSync(resolve(projectRoot, 'src/shared/config/translations', fileName))) missing.push(`${locale}:${fileName}`)
        }
    }
    if (!translationTestSource.includes('loadAllTranslations') || !translationTestSource.includes('critical customer-facing copy')) {
        missing.push('translation coverage tests')
    }

    return missing.length === 0
        ? check('Launch locale coverage', 'pass', `${LAUNCH_LOCALES.length} launch locales have loaders, source files and schema coverage tests`)
        : check('Launch locale coverage', 'blocked', `missing locale coverage: ${missing.join(', ')}`)
}

function generatedHtmlPath(routePath) {
    const normalized = routePath === '/' ? 'index' : routePath.replace(/^\/+/, '')
    if (!normalized || normalized.includes('..') || normalized.includes('?') || normalized.includes('#')) return null
    return resolve(nextServerAppRoot, `${normalized}.html`)
}

function staticMetadataRoutes() {
    return [
        ...PUBLIC_ROUTES.filter((pathname) => !pathname.includes('?') && pathname !== '/services'),
        ...PROVIDER_ROUTES,
    ]
}

export async function readBoundedSeoResponse(response, maxBytes = MAX_SEO_HTML_RESPONSE_BYTES) {
    if (!Number.isSafeInteger(maxBytes) || maxBytes < 1) throw new Error('SEO HTML response limit must be a positive integer.')

    const contentLength = Number(response.headers.get('content-length') ?? '')
    if (Number.isFinite(contentLength) && contentLength > maxBytes) {
        throw new Error(`SEO_HTML_RESPONSE_TOO_LARGE:${maxBytes}`)
    }

    if (!response.body) {
        const text = await response.text()
        if (Buffer.byteLength(text, 'utf8') > maxBytes) throw new Error(`SEO_HTML_RESPONSE_TOO_LARGE:${maxBytes}`)
        return text
    }

    const reader = response.body.getReader()
    const chunks = []
    let totalBytes = 0
    try {
        while (true) {
            const { done, value } = await reader.read()
            if (done) break
            totalBytes += value.byteLength
            if (totalBytes > maxBytes) {
                await reader.cancel('SEO HTML response exceeded bounded limit')
                throw new Error(`SEO_HTML_RESPONSE_TOO_LARGE:${maxBytes}`)
            }
            chunks.push(Buffer.from(value))
        }
    } finally {
        reader.releaseLock()
    }
    return Buffer.concat(chunks).toString('utf8')
}

export function checkLocalHtmlMetadataReport() {
    if (!existsSync(nextServerAppRoot)) {
        return check('Local HTML metadata report', 'manual', 'run npm run build before inspecting rendered .next/server/app HTML')
    }

    const missingRoutes = []
    const invalidRoutes = []
    for (const routePath of staticMetadataRoutes()) {
        const htmlPath = generatedHtmlPath(routePath)
        if (!htmlPath || !existsSync(htmlPath)) {
            missingRoutes.push(routePath)
            continue
        }
        const html = readFileSync(htmlPath, 'utf8')
        const metadata = extractHtmlMetadata(html)
        const required = ['title', 'description', 'canonical', 'ogTitle', 'ogUrl', 'ogImage', 'twitterCard']
        const missing = required.filter((key) => !metadata[key])
        const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
        if (missing.length > 0 || noindex) invalidRoutes.push(`${routePath}: ${[...missing, ...(noindex ? ['robots unexpectedly noindex'] : [])].join(', ')}`)
    }

    const serviceSource = readFileSync(resolve(projectRoot, 'src/app/services/page.page.tsx'), 'utf8')
    if (!serviceSource.includes('getRouteMetadata') || !serviceSource.includes('hasSearchParams')) invalidRoutes.push('/services: query-aware metadata source')

    if (missingRoutes.length > 0 || invalidRoutes.length > 0) {
        return check('Local HTML metadata report', 'blocked', `missing routes: ${missingRoutes.join(', ') || 'none'}; invalid routes: ${invalidRoutes.join('; ') || 'none'}`)
    }
    return check('Local HTML metadata report', 'pass', `${staticMetadataRoutes().length} generated public/provider HTML routes contain title, description, canonical, OG and Twitter metadata`)
}

function extractHtmlMetadata(html) {
    const get = (pattern) => html.match(pattern)?.[1]?.trim() ?? ''
    return {
        title: get(/<title[^>]*>([^<]+)<\/title>/i),
        description: get(/<meta[^>]+name=["']description["'][^>]+content=["']([^"']+)["']/i),
        canonical: get(/<link[^>]+rel=["']canonical["'][^>]+href=["']([^"']+)["']/i),
        ogTitle: get(/<meta[^>]+property=["']og:title["'][^>]+content=["']([^"']+)["']/i),
        ogUrl: get(/<meta[^>]+property=["']og:url["'][^>]+content=["']([^"']+)["']/i),
        ogImage: get(/<meta[^>]+property=["']og:image["'][^>]+content=["']([^"']+)["']/i),
        twitterCard: get(/<meta[^>]+name=["']twitter:card["'][^>]+content=["']([^"']+)["']/i),
    }
}

async function checkHttpMetadata(baseUrl) {
    if (!baseUrl) {
        return [check('Production HTML metadata', 'manual', 'set SEO_BASE_URL or pass --url to validate rendered title, canonical and Open Graph tags')]
    }

    const routes = [...PUBLIC_ROUTES, ...PROVIDER_ROUTES, ...PRIVATE_ROUTES]
    const checks = []
    for (const pathname of routes) {
        const routePath = pathname.split('?', 1)[0] ?? pathname
        const hasSearchParams = pathname.includes('?')
        let response
        try {
            response = await fetch(new URL(pathname, baseUrl), { signal: AbortSignal.timeout(10_000), headers: { accept: 'text/html' } })
        } catch (error) {
            checks.push(check(`HTML ${pathname}`, 'blocked', `request failed: ${error instanceof Error ? error.message : 'unknown error'}`))
            continue
        }

        let html
        try {
            html = await readBoundedSeoResponse(response)
        } catch (error) {
            const detail = error instanceof Error ? error.message : 'response body could not be read safely'
            checks.push(check(`HTML ${pathname}`, 'blocked', `HTTP ${response.status}; ${detail}`))
            continue
        }
        const metadata = extractHtmlMetadata(html)
        const isPrivate = routePath.startsWith('/admin') || routePath.startsWith('/owner') || routePath.startsWith('/profile')
        const isSearchResult = routePath === '/services' && hasSearchParams
        const required = isPrivate
            ? ['title', 'description', 'canonical']
            : ['title', 'description', 'canonical', 'ogTitle', 'ogUrl', 'ogImage', 'twitterCard']
        const missing = required.filter((key) => !metadata[key])
        const noindex = /<meta[^>]+name=["']robots["'][^>]+content=["'][^"']*noindex/i.test(html)
        if (isPrivate || isSearchResult) {
            if (!noindex) missing.push('robots=noindex')
        } else if (noindex) {
            missing.push('robots unexpectedly noindex')
        }
        checks.push(missing.length === 0 && response.ok
            ? check(`HTML ${pathname}`, 'pass', `HTTP ${response.status}; metadata and robots contract present`)
            : check(`HTML ${pathname}`, 'blocked', `HTTP ${response.status}; missing ${missing.join(', ') || 'successful response'}`))
    }
    return checks
}

function checkLighthouseAvailability(baseUrl) {
    if (!baseUrl) return check('Production Lighthouse', 'manual', 'set SEO_BASE_URL and run Lighthouse against the deployed production URL')
    const binary = process.env.LIGHTHOUSE_BIN?.trim() || (() => {
        try {
            return execFileSync('sh', ['-lc', 'command -v lighthouse || true'], { encoding: 'utf8' }).trim()
        } catch {
            return ''
        }
    })()
    if (!binary) return check('Production Lighthouse', 'manual', 'Lighthouse CLI is not installed; run npx lighthouse against the deployed URL and attach the JSON report')
    return check('Production Lighthouse', 'manual', `Lighthouse CLI found at ${binary}; run it in the release environment and attach the performance/SEO report`)
}

export async function runSeoReleaseChecks(options = {}) {
    const baseUrl = options.baseUrl ? normalizeSeoBaseUrl(options.baseUrl) : undefined
    return [
        ...checkBuildBudgets(),
        ...checkMediaBudgets(),
        ...checkPrerenderContract(),
        checkOgImageExistence(),
        checkCanonicalRobotsConsistency(),
        checkProductionUrlSafety(),
        checkLocaleCoverage(),
        checkLocalHtmlMetadataReport(),
        checkLighthouseAvailability(baseUrl),
        ...(await checkHttpMetadata(baseUrl)),
    ]
}

function formatReport(checks) {
    const lines = ['AutoCare Hub SEO, prerender and media budget check']
    for (const item of checks) lines.push(`[${item.status.toUpperCase()}] ${item.name}: ${item.detail}`)
    const blocked = checks.filter((item) => item.status === 'blocked').length
    const manual = checks.filter((item) => item.status === 'manual').length
    lines.push(`Result: ${blocked ? `blocked by ${blocked} gate(s)` : 'repository checks are ready'}; ${manual} production evidence gate(s) remain manual.`)
    return lines.join('\n')
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
    const options = parseArgs(process.argv.slice(2))
    const checks = await runSeoReleaseChecks(options)
    if (options.json) console.log(JSON.stringify(checks, null, 2))
    else console.log(formatReport(checks))

    if (checks.some((item) => item.status === 'blocked') || (options.strict && checks.some((item) => item.status === 'manual'))) process.exitCode = 1
}
