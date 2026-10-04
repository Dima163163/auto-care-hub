import type { MockSuperAdminMarket, MockSuperAdminZone } from './mock-fixtures'

export function toMockMarket(market: MockSuperAdminMarket) {
    return {
        ...market,
        capabilities: market.capabilities ?? {},
        legalLinks: market.legalLinks ?? {},
    }
}

export function toMockZone(zone: MockSuperAdminZone) {
    return {
        ...zone,
        displayOrder: zone.displayOrder ?? 0,
        active: zone.active ?? true,
    }
}
