import { CABINET_IMAGE_ACCEPT } from '../lib/cabinetImageUpload'
import { ResilientImage } from '@/shared/ui/resilient-image'

type CabinetImageFieldProps = {
    error: string | null
    imageUrl?: string | null | undefined
    label: string
    hint: string
    onChange: (file?: File | undefined) => void
}

export function CabinetImageField({
    error,
    imageUrl,
    label,
    hint,
    onChange,
}: CabinetImageFieldProps) {
    const hintId = 'cabinetImageHint'
    const errorId = 'cabinetImageError'

    return (
        <div>
            <label htmlFor="cabinetImage" className="text-sm font-medium">
                {label}
            </label>

            <input
                id="cabinetImage"
                type="file"
                accept={CABINET_IMAGE_ACCEPT}
                className="mt-2 w-full rounded-xl border bg-background px-3 py-2 text-sm outline-none transition-colors file:mr-3 file:rounded-lg file:border-0 file:bg-muted file:px-3 file:py-1.5 file:text-sm file:font-medium focus:border-foreground"
                aria-describedby={error ? `${hintId} ${errorId}` : hintId}
                aria-invalid={Boolean(error)}
                onChange={(event) => {
                    onChange(event.target.files?.[0])
                }}
            />

            <p id={hintId} className="mt-2 text-sm text-muted-foreground">
                {hint}
            </p>

            {error && (
                <p id={errorId} role="alert" className="mt-2 text-sm text-destructive">
                    {error}
                </p>
            )}

            {imageUrl && (
                <div className="mt-4 h-44 overflow-hidden rounded-2xl border bg-muted">
                    <ResilientImage
                        src={imageUrl}
                        alt={label}
                        className="h-full w-full object-cover"
                        fallback={
                            <span className="flex h-full items-center justify-center px-4 text-center text-sm text-muted-foreground">
                                {label}
                            </span>
                        }
                    />
                </div>
            )}
        </div>
    )
}
