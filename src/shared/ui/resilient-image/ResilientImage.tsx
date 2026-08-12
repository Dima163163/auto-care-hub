import { useEffect, useRef, useState, type ImgHTMLAttributes, type ReactNode } from 'react'

type ResilientImageProps = Omit<ImgHTMLAttributes<HTMLImageElement>, 'src' | 'srcSet'> & {
    src?: string | null
    srcSet?: string
    fallback?: ReactNode
}

export function ResilientImage({ src, alt = '', fallback, onLoad, onError, ...props }: ResilientImageProps) {
    const [failedSource, setFailedSource] = useState<string | null>(null)
    const [loadedSource, setLoadedSource] = useState<string | null>(null)
    const [srcSetDisabledFor, setSrcSetDisabledFor] = useState<string | null>(null)
    const imageRef = useRef<HTMLImageElement>(null)
    const isSrcSetDisabled = srcSetDisabledFor === src
    const hasError = failedSource === src

    useEffect(() => {
        const image = imageRef.current
        if (src && image?.complete && image.naturalWidth > 0) {
            setLoadedSource(src)
        }
    }, [src, srcSetDisabledFor])

    if (!src || hasError) {
        return (
            <div
                role="img"
                aria-label={alt}
                data-image-state="fallback"
                className={props.className}
            >
                {fallback}
            </div>
        )
    }

    return (
        <img
            {...props}
            ref={imageRef}
            src={src}
            srcSet={isSrcSetDisabled ? undefined : props.srcSet}
            alt={alt}
            data-image-state={loadedSource === src ? 'loaded' : 'loading'}
            onLoad={(event) => {
                const currentSource = src
                onLoad?.(event)
                setLoadedSource(currentSource)

                if (typeof event.currentTarget.decode !== 'function') {
                    return
                }

                void event.currentTarget.decode().catch(() => undefined)
            }}
            onError={(event) => {
                if (props.srcSet && !isSrcSetDisabled) {
                    setSrcSetDisabledFor(src ?? null)
                    setLoadedSource(null)
                    onError?.(event)
                    return
                }

                setFailedSource(src ?? null)
                setLoadedSource(null)
                onError?.(event)
            }}
        />
    )
}
