import type { MigrationInterface, QueryRunner } from "typeorm"

export class SeedCabinetsAndServices1781370829298 implements MigrationInterface {

    public async up(queryRunner: QueryRunner): Promise<void> {
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
                        (
                            'Modern beauty cabinet',
                            'Bright cabinet for beauty specialists, massage sessions, and private appointments.',
                            'Tverskaya street, 10',
                            'Moscow',
                            1800,
                            ARRAY[
                                'https://images.unsplash.com/photo-1600948836101-f9ffda59d250',
                                'https://images.unsplash.com/photo-1522337360788-8b13dee7a37e'
                            ]::text[]
                        ),
                        (
                            'Medical consultation room',
                            'Clean and quiet room for medical consultations, diagnostics, and private practice.',
                            'Nevsky prospect, 25',
                            'Saint Petersburg',
                            2200,
                            ARRAY[
                                'https://images.unsplash.com/photo-1519494026892-80bbd2d6fd0d',
                                'https://images.unsplash.com/photo-1586773860418-d37222d8fce3'
                            ]::text[]
                        ),
                        (
                            'Consulting office',
                            'Comfortable office for consultants, coaches, psychologists, and private sessions.',
                            'Lenina avenue, 8',
                            'Kazan',
                            1500,
                            ARRAY[
                                'https://images.unsplash.com/photo-1497366754035-f200968a6e72',
                                'https://images.unsplash.com/photo-1497366811353-6870744d04b2'
                            ]::text[]
                        )
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
                service.title,
                service.description,
                service.duration_minutes,
                service.price,
                true
            FROM inserted_cabinets
            CROSS JOIN LATERAL (
                VALUES
                    ('Standard appointment', 'Base service for a standard client appointment.', 60, 2500),
                    ('Extended appointment', 'Longer service for complex client cases.', 90, 3500)
            ) AS service(title, description, duration_minutes, price);
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DELETE FROM services WHERE title IN ('Standard appointment', 'Extended appointment')`)
        await queryRunner.query(`DELETE FROM cabinets WHERE title IN ('Modern beauty cabinet', 'Medical consultation room', 'Consulting office')`)
    }

}
