import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PWA_PORT ?? 4182)
const distDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')

const autoCareMarketResponse = [{
    id: 'market-moscow',
    countryCode: 'RU',
    countryName: 'Russia',
    cityCode: 'moscow',
    cityName: 'Moscow',
    regionCode: null,
    regionName: null,
    centerLatitude: 55.7558,
    centerLongitude: 37.6173,
    currencyCode: 'RUB',
    defaultLocale: 'ru',
    supportedLocales: ['ru', 'en'],
    timezone: 'Europe/Moscow',
    launchReady: true,
}]

const autoCareZoneResponse = [{
    id: 'zone-preview-center',
    marketId: 'market-moscow',
    parentId: null,
    slug: 'preview-center',
    zoneType: 'district',
    names: { en: 'Central Moscow', ru: 'Центр Москвы' },
    centerLatitude: 55.7558,
    centerLongitude: 37.6173,
    radiusKm: 5,
    imageUrl: null,
    serviceCount: 1,
}]

const autoCareDiscoveryResponse = {
    items: [{
        provider: {
            id: 'provider-preview',
            name: 'Preview AutoCare',
            description: null,
            status: 'active',
            verified: true,
            yearsActive: 8,
            staffCount: 12,
            rating: 4.8,
            reviewCount: 42,
            bonusSummary: null,
            logoUrl: null,
            coverImageUrl: null,
            galleryImageUrls: [],
            amenityIds: [],
            brandSpecializations: [],
            isMultibrand: true,
            location: {
                id: 'location-preview',
                marketId: 'market-moscow',
                address: 'Preview Street 1',
                hours: 'Mon-Sun 09:00–21:00',
                latitude: 55.7558,
                longitude: 37.6173,
            },
        },
        offer: {
            id: 'offering-preview',
            serviceDefinitionId: 'definition-brakes',
            serviceSlug: 'brakes',
            serviceLabels: { en: 'Brake service', ru: 'Тормозная система' },
            description: null,
            priceFromMinor: 290000,
            priceToMinor: null,
            currencyCode: 'RUB',
            durationMinutes: 60,
            inclusions: [],
            warrantyText: null,
            active: true,
            priceType: 'from',
        },
        distanceKm: 2.5,
        nextSlot: null,
    }],
    nextCursor: null,
}

const autoCareServiceDefinitionsResponse = [{
    id: 'definition-brakes',
    slug: 'brakes',
    categorySlug: 'maintenance',
    labels: { en: 'Brake service', ru: 'Тормозная система' },
    priceType: 'from',
    comparisonAttributes: [],
    active: true,
}]

const autoCareProviderProfileResponse = {
    ...autoCareDiscoveryResponse.items[0].provider,
    offers: [autoCareDiscoveryResponse.items[0].offer],
}

const previewUser = {
    id: 'preview-client',
    name: 'Preview Client',
    email: 'preview-client@example.com',
    phone: null,
    role: 'client',
    status: 'active',
    avatarUrl: null,
    provider: 'email',
    locale: null,
    emailVerifiedAt: '2026-01-01T00:00:00.000Z',
    emailNotifications: true,
    bookingEmailNotifications: true,
    preferredCity: null,
    preferredCategories: [],
    createdAt: '2026-01-01T00:00:00.000Z',
}

const previewSessions = new Map([
    ['preview-access-token', previewUser],
])

function sendJson(response, statusCode, body) {
    response.writeHead(statusCode, { 'Content-Type': 'application/json' })
    response.end(JSON.stringify(body))
}

async function readJson(request) {
    const chunks = []
    for await (const chunk of request) {
        chunks.push(Buffer.from(chunk))
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'))
    } catch {
        return null
    }
}

const contentTypes = {
    '.css': 'text/css',
    '.html': 'text/html',
    '.js': 'text/javascript',
    '.json': 'application/json',
    '.svg': 'image/svg+xml',
    '.webmanifest': 'application/manifest+json',
    '.webp': 'image/webp',
}

async function serveStatic(pathname, response) {
    const relativePath = pathname === '/' ? 'index.html' : pathname.slice(1)
    const filePath = path.resolve(distDirectory, relativePath)

    if (!filePath.startsWith(`${distDirectory}${path.sep}`)) {
        response.writeHead(400)
        response.end()
        return
    }

    try {
        let body = await readFile(filePath)
        response.writeHead(200, {
            'Content-Type': contentTypes[path.extname(filePath)] ?? 'application/octet-stream',
        })
        response.end(body)
    } catch {
        const body = await readFile(path.join(distDirectory, 'index.html'))
        response.writeHead(200, { 'Content-Type': 'text/html' })
        response.end(body)
    }
}

const server = createServer(async (request, response) => {
    const requestUrl = new URL(request.url ?? '/', `http://127.0.0.1:${port}`)

    if (request.method === 'GET' && requestUrl.pathname === '/api/auth/csrf') {
        sendJson(response, 200, { csrfToken: 'preview-csrf-token' })
        return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/v1/markets') {
        sendJson(response, 200, autoCareMarketResponse)
        return
    }

    if (request.method === 'GET' && /^\/api\/v1\/markets\/[^/]+\/zones$/.test(requestUrl.pathname)) {
        sendJson(response, 200, autoCareZoneResponse)
        return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/v1/service-definitions') {
        sendJson(response, 200, autoCareServiceDefinitionsResponse)
        return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/v1/discovery/providers') {
        sendJson(response, 200, autoCareDiscoveryResponse)
        return
    }

    if (request.method === 'GET' && /^\/api\/v1\/providers\/[^/]+$/.test(requestUrl.pathname)) {
        sendJson(response, 200, autoCareProviderProfileResponse)
        return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/v1/platform-reviews') {
        sendJson(response, 200, [])
        return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/auth/me') {
        const user = previewSessions.get(
            request.headers.authorization?.replace(/^Bearer\s+/, ''),
        )
        if (!user) {
            sendJson(response, 401, { message: 'Unauthorized' })
            return
        }

        sendJson(response, 200, { user })
        return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/auth/login') {
        await readJson(request)
        sendJson(response, 200, { accessToken: 'preview-access-token', user: previewUser })
        return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/auth/logout') {
        sendJson(response, 200, { success: true })
        return
    }

    await serveStatic(requestUrl.pathname, response)
})

server.listen(port, '127.0.0.1')

function shutdown() {
    server.close(() => process.exit(0))
}

process.on('SIGINT', shutdown)
process.on('SIGTERM', shutdown)
