import { CarFront } from 'lucide-react'

import { ResilientImage } from '@/shared/ui/resilient-image'

type AutoCareImageProps = {
    src?: string | null
    alt: string
    className?: string
    loading?: 'eager' | 'lazy'
}

export function AutoCareImage({ src, alt, className, loading = 'lazy' }: AutoCareImageProps) {
    return (
        <ResilientImage
            src={src}
            alt={alt}
            loading={loading}
            className={className}
            fallback={
                <div className="flex h-full w-full items-center justify-center bg-secondary text-primary" aria-hidden="true">
                    <CarFront className="size-10" strokeWidth={1.6} />
                </div>
            }
        />
    )
}
