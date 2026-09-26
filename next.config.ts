import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000'
const apiConnectionOrigin = new URL(apiOrigin).origin
const repoRoot = path.dirname(fileURLToPath(import.meta.url))
const scriptSources = process.env.NODE_ENV === 'production'
    ? "'self' 'unsafe-inline'"
    : "'self' 'unsafe-inline' 'unsafe-eval'"
const contentSecurityPolicy = [
    "default-src 'self'",
    `script-src ${scriptSources}`,
    "style-src 'self' 'unsafe-inline'",
    "img-src 'self' data: blob: https:",
    "font-src 'self' data: blob: https:",
    `connect-src 'self' ${apiConnectionOrigin} ws: wss:`,
    "object-src 'none'",
    "base-uri 'self'",
    "form-action 'self'",
    "frame-ancestors 'none'",
].join('; ')

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
    // Browser checks can run a mock shell and a real-API shell at the same
    // time. Give the latter an isolated build directory so it never competes
    // for the default `.next/dev/lock` held by an interactive local session.
    distDir: process.env.NEXT_DIST_DIR ?? '.next',
    outputFileTracingRoot: repoRoot,
    // The legacy feature-sliced tree uses `src/pages` as a component folder.
    // Restricting Next page extensions prevents it from being mistaken for
    // the Pages Router while we migrate routes incrementally into `app/`.
    pageExtensions: ['page.tsx', 'page.ts', 'route.ts', 'route.tsx'],
    async rewrites() {
        return [
            {
                source: '/api/:path*',
                destination: `${apiOrigin}/:path*`,
            },
        ]
    },
    async headers() {
        return [{
            source: '/:path*',
            headers: [
                { key: 'Content-Security-Policy', value: contentSecurityPolicy },
                { key: 'X-Content-Type-Options', value: 'nosniff' },
                { key: 'X-Frame-Options', value: 'DENY' },
                { key: 'Referrer-Policy', value: 'strict-origin-when-cross-origin' },
                { key: 'Permissions-Policy', value: 'camera=(self), geolocation=(self), microphone=()' },
            ],
        }]
    },
}

export default nextConfig
