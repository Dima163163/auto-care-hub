import type { ReactNode } from 'react'

import { appMetadata } from './metadata'
import '../index.css'

// Next.js requires metadata to be exported from the layout module.
// eslint-disable-next-line react-refresh/only-export-components
export const metadata = appMetadata

export default function RootLayout({ children }: Readonly<{ children: ReactNode }>) {
    return (
        <html lang="en" suppressHydrationWarning>
            <body>{children}</body>
        </html>
    )
}
