import path from 'node:path'
import { fileURLToPath } from 'node:url'
import type { NextConfig } from 'next'

const apiOrigin = process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000'
const repoRoot = path.dirname(fileURLToPath(import.meta.url))

const nextConfig: NextConfig = {
    reactStrictMode: true,
    poweredByHeader: false,
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
}

export default nextConfig
