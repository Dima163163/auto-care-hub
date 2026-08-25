import type { AutomotiveAmenityId } from '../model/automotiveAmenities'
import type { ReactNode } from 'react'

type AutomotiveAmenityIconProps = {
    amenityId: AutomotiveAmenityId
    className?: string
}

export function AutomotiveAmenityIcon({ amenityId, className }: AutomotiveAmenityIconProps) {
    const paths = iconPaths[amenityId]

    return <svg viewBox="0 0 24 24" fill="none" aria-hidden="true" className={className} stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">{paths}</svg>
}

const iconPaths: Record<AutomotiveAmenityId, ReactNode> = {
    waiting_room: <><path d="M5 19v-6.5A2.5 2.5 0 0 1 7.5 10h3A2.5 2.5 0 0 1 13 12.5V19" /><path d="M3 19h12M7 10V7.5A2.5 2.5 0 0 1 9.5 5h1A2.5 2.5 0 0 1 13 7.5V10" /><path d="M15 19h6" /></>,
    customer_parking: <><rect x="5" y="3" width="14" height="18" rx="2" /><path d="M9 17V7h3.2a3 3 0 0 1 0 6H9" /></>,
    wifi: <><path d="M3.5 9.5a12.5 12.5 0 0 1 17 0" /><path d="M6.5 12.5a8.2 8.2 0 0 1 11 0" /><path d="M9.5 15.5a3.8 3.8 0 0 1 5 0" /><path d="M12 19h.01" /></>,
    online_booking: <><rect x="4" y="5" width="16" height="15" rx="2" /><path d="M8 3v4M16 3v4M4 10h16" /><path d="m9.5 15 1.7 1.7 3.5-3.5" /></>,
    coffee: <><path d="M5 7h11v7a4 4 0 0 1-4 4H9a4 4 0 0 1-4-4V7Z" /><path d="M16 9h1.5a2.5 2.5 0 0 1 0 5H16M8 3v2M12 3v2" /><path d="M4 21h13" /></>,
    card_payment: <><rect x="3" y="6" width="18" height="12" rx="2" /><path d="M3 10h18M7 15h3" /></>,
    electric_charging: <><path d="M8 4h8l-1 6h3l-6 10 1-7H9l-1-9Z" /><path d="M6 5H4v5M18 5h2v5" /></>,
    pickup_delivery: <><path d="M3 7h12v10H3zM15 10h3l3 3v4h-6" /><circle cx="7" cy="19" r="2" /><circle cx="17" cy="19" r="2" /></>,
}
