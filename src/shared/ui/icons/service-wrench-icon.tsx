type ServiceWrenchIconProps = {
    className?: string
    title?: string
}

export function ServiceWrenchIcon({ className, title }: ServiceWrenchIconProps) {
    return <svg viewBox="0 0 24 24" fill="none" aria-hidden={title ? undefined : true} className={className} role={title ? 'img' : undefined}><title>{title}</title><path d="M14.56 5.15a5.2 5.2 0 0 0-6.68 6.68L3.7 16.01a2.45 2.45 0 1 0 3.47 3.47l4.18-4.18a5.2 5.2 0 0 0 6.68-6.68l-2.89 2.89-2.65-.44-.44-2.65 2.51-3.27Z" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round" /><path d="m4.8 17.11 2.26 2.26" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" /></svg>
}
