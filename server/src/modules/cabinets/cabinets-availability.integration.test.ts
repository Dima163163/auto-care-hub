import { randomUUID } from 'node:crypto'
import { expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import { UserEntity, UserRole, UserStatus } from '../../entities/user/user.entity.js'
import { getAllPublicCabinets, getPublicCabinets } from './cabinets.service.js'

it('filters availability before pagination and refuses large flat catalogs', async () => {
    const users = AppDataSource.getRepository(UserEntity)
    const owner = await users.save(users.create({
        name: 'Cabinet filtering fixture',
        email: `cabinet-filter-${randomUUID()}@example.test`,
        role: UserRole.Owner,
        status: UserStatus.Active,
    }))
    const city = `Cabinet filter ${owner.id}`
    try {
        await AppDataSource.query(`
            WITH created AS (
                INSERT INTO cabinets ("ownerId", title, description, address, city, timezone, "pricePerHour", status)
                SELECT $1, 'Cabinet ' || number, 'Availability search fixture', 'Fixture address', $2, 'UTC', number, 'active'
                FROM generate_series(1, 1001) AS fixture(number)
                RETURNING id, "pricePerHour"
            ), services_created AS (
                INSERT INTO services ("cabinetId", title, "durationMinutes", price, "isActive")
                SELECT id, 'Fixture service', 60, 100, true FROM created
            )
            INSERT INTO cabinet_schedule_exceptions ("cabinetId", date, "isClosed")
            SELECT id, DATE '2099-02-15', true FROM created WHERE "pricePerHour" < 1001
        `, [owner.id, city])

        const result = await getPublicCabinets({
            city, sortBy: 'price_asc', availabilityDate: '2099-02-15', durationMinutes: 60, page: 1, limit: 1,
        })
        expect(result).toMatchObject({ total: 1, totalPages: 1 })
        expect(result.items).toMatchObject([{
            title: 'Cabinet 1001',
            availabilityPreview: { date: '2099-02-15', startTime: '08:00', freeSlots: 27 },
        }])
        await expect(getAllPublicCabinets()).rejects.toMatchObject({ statusCode: 409 })
    } finally {
        await AppDataSource.query('DELETE FROM cabinets WHERE "ownerId" = $1', [owner.id])
        await users.delete(owner.id)
    }
})
