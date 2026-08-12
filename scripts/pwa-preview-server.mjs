import { createServer } from 'node:http'
import { readFile } from 'node:fs/promises'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const port = Number(process.env.PWA_PORT ?? 4182)
const distDirectory = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..', 'dist')
let serviceWorkerPreviewVersion = 0

const cabinetResponse = JSON.stringify({
    items: [
        {
            id: 'preview-cabinet',
            ownerId: 'preview-owner',
            title: 'Preview demo cabinet',
            description: 'Production PWA preview fixture.',
            address: 'Preview Street 1',
            city: 'Berlin',
            pricePerHour: 1200,
            status: 'active',
            photos: ['/images/cabinets/cabinet-beauty-bright-01.webp'],
            createdAt: '2026-01-01T00:00:00.000Z',
            availabilityPreview: null,
        },
    ],
    total: 1,
    page: 1,
    totalPages: 1,
})

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

const previewOwner = {
    ...previewUser,
    id: 'preview-owner',
    name: 'Preview Owner',
    email: 'preview-owner@example.com',
    role: 'owner',
}

const previewSessions = new Map([
    ['preview-access-token', previewUser],
    ['preview-owner-access-token', previewOwner],
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
        if (pathname === '/sw.js') {
            body = Buffer.concat([
                body,
                Buffer.from(`\n// deterministic preview version ${serviceWorkerPreviewVersion}\n`),
            ])
        }
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

    if (request.method === 'POST' && requestUrl.pathname === '/__pwa-preview/upgrade') {
        serviceWorkerPreviewVersion += 1
        sendJson(response, 200, { version: serviceWorkerPreviewVersion })
        return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/auth/csrf') {
        sendJson(response, 200, { csrfToken: 'preview-csrf-token' })
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
        const body = await readJson(request)
        const isOwner = body?.email === previewOwner.email
        const accessToken = isOwner
            ? 'preview-owner-access-token'
            : 'preview-access-token'
        const user = isOwner ? previewOwner : previewUser
        sendJson(response, 200, { accessToken, user })
        return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/auth/logout') {
        sendJson(response, 200, { success: true })
        return
    }

    if (request.method === 'POST' && requestUrl.pathname === '/api/cabinets') {
        const user = previewSessions.get(
            request.headers.authorization?.replace(/^Bearer\s+/, ''),
        )
        if (user?.role !== 'owner') {
            sendJson(response, 403, { message: 'Owner access required.' })
            return
        }

        sendJson(response, 503, { message: 'Preview cabinet mutation unavailable.' })
        return
    }

    if (
        request.method === 'GET'
        && ['/api/owner/cabinets', '/api/owner/services', '/api/owner/bookings'].includes(requestUrl.pathname)
    ) {
        const user = previewSessions.get(
            request.headers.authorization?.replace(/^Bearer\s+/, ''),
        )
        if (user?.role !== 'owner') {
            sendJson(response, 403, { message: 'Owner access required.' })
            return
        }

        if (requestUrl.pathname === '/api/owner/cabinets') {
            sendJson(response, 200, JSON.parse(cabinetResponse).items)
            return
        }

        sendJson(response, 200, [])
        return
    }

    if (request.method === 'GET' && requestUrl.pathname === '/api/cabinets') {
        sendJson(response, 200, JSON.parse(cabinetResponse))
        return
    }

    if (
        request.method === 'GET'
        && /^\/api\/cabinets\/cabinet-[^/]+$/.test(requestUrl.pathname)
    ) {
        sendJson(response, 200, JSON.parse(cabinetResponse).items[0])
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
