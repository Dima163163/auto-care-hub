import { describe, expect, it } from 'vitest'

import {
    mergeFavoriteCabinets,
    removeSyncedFavorites,
    toggleLocalFavorite,
    type FavoriteCabinet,
} from './favorites'

const firstFavorite: FavoriteCabinet = {
    id: 'cabinet-1',
    title: 'First cabinet',
    area: 'Berlin',
    price: 'EUR 20 / hour',
    to: '/cabinets/cabinet-1',
}

const secondFavorite: FavoriteCabinet = {
    id: 'cabinet-2',
    title: 'Second cabinet',
    area: 'Munich',
    price: 'EUR 25 / hour',
    to: '/cabinets/cabinet-2',
}

describe('favorite cabinet state helpers', () => {
    it('adds and removes local favorites without mutating the source list', () => {
        const added = toggleLocalFavorite([], firstFavorite)

        expect(added).toEqual([firstFavorite])
        expect(toggleLocalFavorite(added, firstFavorite)).toEqual([])
        expect(added).toEqual([firstFavorite])
    })

    it('keeps remote favorites first and local-only previews once', () => {
        expect(mergeFavoriteCabinets([firstFavorite, secondFavorite], [firstFavorite]))
            .toEqual([firstFavorite, secondFavorite])
    })

    it('removes only records accepted by the server during migration', () => {
        expect(removeSyncedFavorites([firstFavorite, secondFavorite], ['cabinet-1']))
            .toEqual([secondFavorite])
    })
})
