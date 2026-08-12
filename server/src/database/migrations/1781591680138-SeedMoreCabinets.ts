import type { MigrationInterface, QueryRunner } from "typeorm"

export class SeedMoreCabinets1781591680138 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
        // Generate 20 distinct cabinets with random Picsum images
        const cabinetValues = Array.from({ length: 20 }).map((_, index) => {
            const num = index + 1
            const price = 1000 + (num * 100)
            const city = num % 2 === 0 ? 'Moscow' : (num % 3 === 0 ? 'Kazan' : 'Saint Petersburg')
            const photos = [
                `https://picsum.photos/seed/cabinet${num}a/800/600`,
                `https://picsum.photos/seed/cabinet${num}b/800/600`
            ]
            
            return `(
                'Professional Workspace ${num}',
                'A great and quiet workspace for professionals. Perfect for consultations and private work.',
                'Business Avenue ${num}',
                '${city}',
                ${price},
                ARRAY['${photos[0]}', '${photos[1]}']::text[]
            )`
        }).join(',\n                        ')

        await queryRunner.query(`
            WITH owner_user AS (
                SELECT id
                FROM users
                WHERE email = 'owner@example.com'
                LIMIT 1
            ),
            inserted_cabinets AS (
                INSERT INTO cabinets (
                    "ownerId",
                    title,
                    description,
                    address,
                    city,
                    "pricePerHour",
                    status,
                    photos
                )
                SELECT
                    owner_user.id,
                    cabinet.title,
                    cabinet.description,
                    cabinet.address,
                    cabinet.city,
                    cabinet.price_per_hour,
                    'active'::cabinet_status,
                    cabinet.photos
                FROM owner_user
                CROSS JOIN (
                    VALUES
                        ${cabinetValues}
                ) AS cabinet(title, description, address, city, price_per_hour, photos)
                WHERE NOT EXISTS (
                    SELECT 1 FROM cabinets WHERE cabinets.title = cabinet.title
                )
                RETURNING id, title
            )
            INSERT INTO services (
                "cabinetId",
                title,
                description,
                "durationMinutes",
                price,
                "isActive"
            )
            SELECT
                inserted_cabinets.id,
                'Standard 60 min session',
                'Base service for this cabinet.',
                60,
                1500,
                true
            FROM inserted_cabinets;
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            DELETE FROM services 
            WHERE title = 'Standard 60 min session'
            AND "cabinetId" IN (
                SELECT id FROM cabinets WHERE title LIKE 'Professional Workspace %'
            );
        `)
        await queryRunner.query(`
            DELETE FROM cabinets 
            WHERE title LIKE 'Professional Workspace %';
        `)
    }

}
