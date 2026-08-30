type BrandLogoProps = {
    size?: 'sm' | 'md' | 'lg'
}

const sizeStyles = {
    sm: 'w-[168px]',
    md: 'w-[190px]',
    lg: 'w-[214px]',
} as const

export function BrandLogo({ size = 'md' }: BrandLogoProps) {
    return (
        <svg
            viewBox="0 0 268 72"
            role="img"
            aria-labelledby="autocare-logo-title"
            className={`block h-auto shrink-0 ${sizeStyles[size]}`}
        >
            <title id="autocare-logo-title">AutoCare Hub — Сервис, которому доверяют</title>
            <g transform="translate(4 4)">
                <circle cx="32" cy="32" r="28" fill="var(--map-overlay)" stroke="var(--primary)" strokeWidth="2" />
                <path d="M32 4a28 28 0 0 1 23.8 13.3L43.9 24A14.4 14.4 0 0 0 32 17.6Z" fill="var(--primary)" />
                <path d="M55.8 17.3A28 28 0 0 1 57.7 42L44.9 36.6A14.4 14.4 0 0 0 43.9 24Z" fill="var(--status-info-foreground)" />
                <path d="M57.7 42A28 28 0 0 1 35.4 59.8l-1.7-13.6a14.4 14.4 0 0 0 11.2-9.6Z" fill="var(--map-pin)" />
                <path d="M35.4 59.8A28 28 0 0 1 9.2 45.5l11.2-7.2a14.4 14.4 0 0 0 13.3 7.9Z" fill="var(--status-info-foreground)" />
                <path d="M9.2 45.5A28 28 0 0 1 8.5 19.7l12 6.3a14.4 14.4 0 0 0-.1 12.3Z" fill="var(--map-pin)" />
                <path d="M8.5 19.7A28 28 0 0 1 32 4v13.6A14.4 14.4 0 0 0 20.5 26Z" fill="var(--primary)" />
                <circle cx="32" cy="32" r="13.8" fill="var(--hero-overlay)" stroke="var(--map-pin)" strokeWidth="1.3" />
                <path d="M9.5 18.6 21 25.1M8.5 46l12-7.2M35.2 59.8l-1.5-13.6M56.4 16.8 44 24" stroke="var(--map-overlay)" strokeWidth="2" />
                <path d="M15.4 12.2A27 27 0 0 1 32 5" fill="none" stroke="var(--map-pin)" strokeLinecap="round" strokeWidth="1.5" opacity=".85" />
            </g>
            <text x="73" y="33" fill="currentColor" fontFamily="Commissioner Variable, Commissioner, Arial, sans-serif" fontSize="24" fontWeight="750" letterSpacing="-.6">
                AutoCare <tspan fill="var(--primary)">Hub</tspan>
            </text>
            <text x="74" y="50" fill="var(--map-pin)" opacity=".75" fontFamily="IBM Plex Sans Variable, IBM Plex Sans, Arial, sans-serif" fontSize="9.2" fontWeight="500">
                Сервис, которому доверяют
            </text>
        </svg>
    )
}
