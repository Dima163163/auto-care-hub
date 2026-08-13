const icon = (content: string) => `<svg viewBox="0 0 24 24" focusable="false" aria-hidden="true" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round">${content}</svg>`

/**
 * Inline SVGs keep map markers crisp at every zoom and avoid loading a second
 * image asset for every service type. The keys mirror automotiveServices ids.
 */
const SERVICE_MARKER_ICONS: Record<string, string> = {
    'oil-change': icon('<path d="M12 3.2S6.8 8.8 6.8 13.1a5.2 5.2 0 0 0 10.4 0C17.2 8.8 12 3.2 12 3.2Z"/><path d="M9.8 14.2a2.7 2.7 0 0 0 2.7 2.2"/>'),
    'tire-service': icon('<circle cx="12" cy="12" r="7.7"/><circle cx="12" cy="12" r="3.1"/><path d="m12 4.3 1.4 4.8M19.7 12l-4.8 1.4M12 19.7l-1.4-4.8M4.3 12l4.8-1.4"/>'),
    diagnostics: icon('<rect x="5" y="4.5" width="14" height="11" rx="2"/><path d="M8 19.5h8M12 15.5v4M8.5 10.5h2l1.2-2.2 1.4 4 1.1-1.8h1.3"/>'),
    brakes: icon('<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4v5M20 12h-5M12 20v-5M4 12h5"/>'),
    detailing: icon('<path d="m12 3 1.2 4.1L17 8.4l-3.8 1.3L12 14l-1.2-4.3L7 8.4l3.8-1.3L12 3Z"/><path d="m18.2 14.2.7 2.2 2.1.7-2.1.7-.7 2.2-.7-2.2-2.1-.7 2.1-.7.7-2.2ZM5.2 14.5l.5 1.5 1.5.5-1.5.5-.5 1.5-.5-1.5-1.5-.5 1.5-.5.5-1.5Z"/>'),
    'body-paint': icon('<path d="M4 10.5h7.2l2.2 2.2H18a2 2 0 0 1 2 2v1.8H9.5v-3H4v-3Z"/><path d="M13.4 12.7 17 9.1h3M5.5 16.5v2M8 16.5v2"/><path d="m19.1 5.3.1.1M21 7.2l.1.1M17.2 7.2l.1.1"/>'),
    'air-conditioning': icon('<path d="M12 3v18M3 12h18M5.6 5.6l12.8 12.8M18.4 5.6 5.6 18.4"/><path d="m12 3-1.6 2M12 3l1.6 2M12 21l-1.6-2M12 21l1.6-2M3 12l2-1.6M3 12l2 1.6M21 12l-2-1.6M21 12l-2 1.6"/>'),
    maintenance: icon('<path d="M14.7 5.1a4.1 4.1 0 0 0-5.2 5.2l-5.1 5.1a1.8 1.8 0 1 0 2.5 2.5l5.1-5.1a4.1 4.1 0 0 0 5.2-5.2l-2.6 2.6-2.5-.6-.6-2.5 2.6-2.6Z"/>'),
}

export function getServiceMarkerIcon(serviceId: string | undefined) {
    return SERVICE_MARKER_ICONS[serviceId ?? ''] ?? SERVICE_MARKER_ICONS.maintenance
}
