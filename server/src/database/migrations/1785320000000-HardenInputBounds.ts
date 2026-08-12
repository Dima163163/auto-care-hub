import type { MigrationInterface, QueryRunner } from 'typeorm'

export class HardenInputBounds1785320000000 implements MigrationInterface {
    name = 'HardenInputBounds1785320000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`
            ALTER TABLE "users"
            ADD CONSTRAINT "CHK_users_input_bounds"
            CHECK (
                char_length("name") BETWEEN 2 AND 120 AND
                char_length("email") BETWEEN 3 AND 320 AND
                ("phone" IS NULL OR char_length("phone") <= 32) AND
                ("avatarUrl" IS NULL OR char_length("avatarUrl") <= 2048) AND
                ("preferredCity" IS NULL OR char_length("preferredCity") <= 120) AND
                cardinality("preferredCategories") <= 12
            )
        `)
        await queryRunner.query(`
            ALTER TABLE "cabinets"
            ADD CONSTRAINT "CHK_cabinets_input_bounds"
            CHECK (
                char_length("title") BETWEEN 2 AND 160 AND
                char_length("description") BETWEEN 10 AND 5000 AND
                char_length("address") BETWEEN 2 AND 240 AND
                char_length("city") BETWEEN 2 AND 120 AND
                char_length("timezone") BETWEEN 1 AND 80 AND
                "pricePerHour" BETWEEN 1 AND 1000000 AND
                cardinality("photos") <= 20 AND
                cardinality("amenities") <= 20 AND
                ("cancellationPolicy" IS NULL OR char_length("cancellationPolicy") <= 2000) AND
                ("houseRules" IS NULL OR char_length("houseRules") <= 2000)
            )
        `)
        await queryRunner.query(`
            ALTER TABLE "services"
            ADD CONSTRAINT "CHK_services_input_bounds"
            CHECK (
                char_length("title") BETWEEN 2 AND 160 AND
                ("description" IS NULL OR char_length("description") <= 500) AND
                "durationMinutes" BETWEEN 1 AND 1440 AND
                "price" BETWEEN 1 AND 1000000
            )
        `)
        await queryRunner.query(`
            ALTER TABLE "reviews"
            ADD CONSTRAINT "CHK_reviews_input_bounds"
            CHECK (
                "rating" BETWEEN 1 AND 5 AND
                char_length("text") BETWEEN 10 AND 1000
            )
        `)
        await queryRunner.query(`
            ALTER TABLE "oauth_identities"
            ADD CONSTRAINT "CHK_oauth_identities_input_bounds"
            CHECK (char_length("provider_subject") BETWEEN 1 AND 255)
        `)
        await queryRunner.query(`
            ALTER TABLE "oauth_link_requests"
            ADD CONSTRAINT "CHK_oauth_link_requests_state_hash"
            CHECK (char_length("state_hash") = 64)
        `)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'ALTER TABLE "oauth_link_requests" DROP CONSTRAINT "CHK_oauth_link_requests_state_hash"',
        )
        await queryRunner.query(
            'ALTER TABLE "oauth_identities" DROP CONSTRAINT "CHK_oauth_identities_input_bounds"',
        )
        await queryRunner.query(
            'ALTER TABLE "reviews" DROP CONSTRAINT "CHK_reviews_input_bounds"',
        )
        await queryRunner.query(
            'ALTER TABLE "services" DROP CONSTRAINT "CHK_services_input_bounds"',
        )
        await queryRunner.query(
            'ALTER TABLE "cabinets" DROP CONSTRAINT "CHK_cabinets_input_bounds"',
        )
        await queryRunner.query(
            'ALTER TABLE "users" DROP CONSTRAINT "CHK_users_input_bounds"',
        )
    }
}
