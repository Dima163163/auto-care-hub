import type { Cabinet } from '@/entities/cabinet'

export type CabinetMapPosition = [number, number]

type CityCenter = {
    aliases: string[]
    position: CabinetMapPosition
}

const DEFAULT_CITY_CENTER: CabinetMapPosition = [55.751244, 37.618423]

const CITY_CENTERS: CityCenter[] = [
    { aliases: ['moscow', 'москва'], position: [55.751244, 37.618423] },
    { aliases: ['saint petersburg', 'st petersburg', 'санкт-петербург', 'петербург'], position: [59.93428, 30.335099] },
    { aliases: ['kazan', 'казань'], position: [55.796127, 49.106405] },
    { aliases: ['samara', 'самара'], position: [53.195873, 50.100193] },
    { aliases: ['berlin', 'берлин'], position: [52.52, 13.405] },
    { aliases: ['chisinau', 'кишинёв', 'кишинев'], position: [47.0105, 28.8638] },
]

function getStableHash(value: string) {
    let hash = 0

    for (const character of value) {
        hash = ((hash << 5) - hash + character.charCodeAt(0)) | 0
    }

    return Math.abs(hash)
}

function getCityCenter(city: string): CabinetMapPosition {
    const normalizedCity = city.trim().toLocaleLowerCase()
    const match = CITY_CENTERS.find(({ aliases }) =>
        aliases.some((alias) => normalizedCity.includes(alias)),
    )

    return match?.position ?? DEFAULT_CITY_CENTER
}

/**
 * Public catalog intentionally shows an approximate city area until the
 * backend stores provider-verified coordinates for each cabinet.
 */
export function getCabinetMapPosition(cabinet: Cabinet): CabinetMapPosition {
    const [latitude, longitude] = getCityCenter(cabinet.city)
    const hash = getStableHash(cabinet.id)
    const latitudeOffset = ((hash % 7) - 3) * 0.003
    const longitudeOffset = (((hash >> 3) % 7) - 3) * 0.004

    return [latitude + latitudeOffset, longitude + longitudeOffset]
}
