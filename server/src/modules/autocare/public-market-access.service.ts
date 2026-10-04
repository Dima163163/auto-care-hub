import { In } from 'typeorm'
import { AppDataSource } from '../../database/data-source.js'
import { AutomotiveMarketEntity, AutomotiveMarketCountryEntity, AutomotiveServiceDefinitionEntity, AutomotiveServiceLocationEntity } from '../../entities/index.js'
import { isAutoCareCountryEnabled } from '../../config/enabled-market-countries.js'

export async function findServiceDefinition(value: string) {
    const repository = AppDataSource.getRepository(AutomotiveServiceDefinitionEntity)
    const bySlug = await repository.findOneBy({ slug: value })
    if (bySlug) return bySlug
    return /^[0-9a-f-]{36}$/i.test(value) ? repository.findOneBy({ id: value }) : null
}

export async function findMarket(value: string) {
    const repository = AppDataSource.getRepository(AutomotiveMarketEntity)
    const byCityCode = await repository.findOneBy({ cityCode: value })
    if (byCityCode) return byCityCode
    const cityCode = value.split('-').at(-1)
    if (cityCode) {
        const byMarketCode = await repository.findOneBy({ cityCode })
        if (byMarketCode) return byMarketCode
    }
    return /^[0-9a-f-]{36}$/i.test(value) ? repository.findOneBy({ id: value }) : null
}

async function filterLocationsToLaunchReadyMarkets(locations: AutomotiveServiceLocationEntity[]) {
    if (locations.length === 0) return []
    const marketIds = [...new Set(locations.map((location) => location.marketId))]
    const markets = await AppDataSource.getRepository(AutomotiveMarketEntity).find({
        where: { id: In(marketIds), launchReady: true },
        select: { id: true, countryId: true, countryCode: true },
    })
    const enabledMarkets = markets.filter((market) => isAutoCareCountryEnabled(market.countryCode))
    if (enabledMarkets.length === 0) return []
    const activeCountries = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).find({
        where: { id: In([...new Set(enabledMarkets.map((market) => market.countryId))]), active: true },
        select: { id: true },
    })
    const activeCountryIds = new Set(activeCountries.map((country) => country.id))
    const publicMarketIds = new Set(enabledMarkets.filter((market) => activeCountryIds.has(market.countryId)).map((market) => market.id))
    return locations.filter((location) => publicMarketIds.has(location.marketId))
}

export async function isPublicAutoCareMarket(market: AutomotiveMarketEntity) {
    if (!market.launchReady || !isAutoCareCountryEnabled(market.countryCode)) return false
    const country = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).findOneBy({ id: market.countryId, active: true })
    return Boolean(country)
}

export async function getPublicProviderLocations(providerId: string) {
    const locations = await AppDataSource.getRepository(AutomotiveServiceLocationEntity).find({
        where: { providerId },
        order: { id: 'ASC' },
    })
    return filterLocationsToLaunchReadyMarkets(locations)
}

export async function getPublicAutoCareMarketIds(markets: AutomotiveMarketEntity[]) {
    const readyMarkets = markets.filter((market) => market.launchReady && isAutoCareCountryEnabled(market.countryCode))
    if (readyMarkets.length === 0) return new Set<string>()
    const countries = await AppDataSource.getRepository(AutomotiveMarketCountryEntity).find({
        where: { id: In([...new Set(readyMarkets.map((market) => market.countryId))]), active: true },
        select: { id: true },
    })
    const activeCountryIds = new Set(countries.map((country) => country.id))
    return new Set(readyMarkets.filter((market) => activeCountryIds.has(market.countryId)).map((market) => market.id))
}
