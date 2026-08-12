import { Star } from 'lucide-react'

type RatingStarsProps = {
    ariaLabel: string
    value: number
    onChange?: (value: number) => void
}

export function RatingStars({ ariaLabel, onChange, value }: RatingStarsProps) {
    return (
        <div
            aria-label={ariaLabel}
            role={onChange ? 'radiogroup' : 'img'}
            className="flex items-center gap-1"
        >
            {[1, 2, 3, 4, 5].map((rating) => {
                const isActive = rating <= value
                const className = isActive
                    ? 'size-5 fill-rating-fill text-rating-foreground'
                    : 'size-5 text-muted-foreground'

                if (!onChange) {
                    return (
                        <Star
                            key={rating}
                            aria-hidden="true"
                            className={className}
                        />
                    )
                }

                return (
                    <button
                        key={rating}
                        type="button"
                        role="radio"
                        aria-checked={rating === value}
                        aria-label={`${ariaLabel}: ${rating} / 5`}
                        className="cursor-pointer rounded-md p-1 transition-colors hover:bg-muted"
                        onClick={() => onChange(rating)}
                    >
                        <Star aria-hidden="true" className={className} />
                    </button>
                )
            })}
        </div>
    )
}
