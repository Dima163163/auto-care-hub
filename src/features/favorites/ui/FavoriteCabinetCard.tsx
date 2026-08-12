import type { Cabinet } from '@/entities/cabinet'
import { CabinetCard } from '@/entities/cabinet'
import { useFavorites } from '../lib/useFavorites'

type FavoriteCabinetCardProps = {
    cabinet: Cabinet
    layout?: 'card' | 'row'
    onSelect?: (cabinet: Cabinet) => void
    onOpenDetails?: (cabinet: Cabinet) => void
    detailsFrom?: 'filtered-catalog'
}

export function FavoriteCabinetCard({
    cabinet,
    layout = 'card',
    onSelect,
    onOpenDetails,
    detailsFrom,
}: FavoriteCabinetCardProps) {
    const { isFavorite, toggleCabinetFavorite } = useFavorites()

    return (
        <CabinetCard
            cabinet={cabinet}
            isFavorite={isFavorite(cabinet.id)}
            onToggleFavorite={toggleCabinetFavorite}
            layout={layout}
            onSelect={onSelect}
            onOpenDetails={onOpenDetails}
            detailsFrom={detailsFrom}
        />
    )
}
