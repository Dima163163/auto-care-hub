import { ResilientImage } from '@/shared/ui/resilient-image'
import { getMediaUrl } from '@/shared/lib/getMediaUrl'

type ProviderLogoProps = {
    logoUrl?: string | null
    name: string
    fallbackLabel?: string
    className?: string
}

export function ProviderLogo({ logoUrl, name, fallbackLabel, className = 'size-8' }: ProviderLogoProps) {
    const initials = name.split(/\s+/).map((part) => part[0]).filter(Boolean).slice(0, 2).join('').toUpperCase()
    return <ResilientImage src={logoUrl ? getMediaUrl(logoUrl) : null} alt={`${name} logo`} className={`${className} rounded-[var(--radius-control)] object-contain`} fallback={<span className={`${className} flex items-center justify-center rounded-[var(--radius-control)] bg-primary px-1 text-[0.6rem] font-black text-primary-foreground`}>{fallbackLabel || initials || 'AC'}</span>} />
}
