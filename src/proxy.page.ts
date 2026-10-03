import { randomBytes } from 'node:crypto'
import { NextResponse } from 'next/server'
import type { NextRequest } from 'next/server'
import { createContentSecurityPolicy } from './shared/config/content-security-policy'

export function proxy(request: NextRequest) {
    const nonce = randomBytes(24).toString('base64')
    const policy = createContentSecurityPolicy({ nonce,
        apiOrigin: process.env.NEXT_PUBLIC_API_ORIGIN ?? 'http://127.0.0.1:4000',
        frontendOrigin: request.nextUrl.origin, development: process.env.NODE_ENV !== 'production',
    })
    const headers = new Headers(request.headers)
    // Always replace caller-supplied values before passing headers into SSR.
    headers.set('x-nonce', nonce)
    headers.set('Content-Security-Policy', policy)
    const response = NextResponse.next({ request: { headers } })
    response.headers.set('Content-Security-Policy', policy)
    response.headers.set('Cache-Control', 'private, no-store')
    return response
}
export const config = { matcher: ['/((?!api/|_next/static|_next/image|.*\\.(?:js|css|svg|png|jpg|jpeg|webp|ico)$).*)'] }
