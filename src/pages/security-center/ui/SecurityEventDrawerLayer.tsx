import type { ReactNode } from 'react'
import { createPortal } from 'react-dom'

// A fixed modal cannot escape the workspace main's stacking context. Desktop
// details remain in their grid; mobile details share the document overlay layer.
export function SecurityEventDrawerLayer({ isMobile, children }: { isMobile: boolean; children: ReactNode }) {
    return isMobile ? createPortal(children, document.body) : children
}
