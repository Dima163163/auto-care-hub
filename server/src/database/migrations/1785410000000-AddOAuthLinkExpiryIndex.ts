import type { MigrationInterface, QueryRunner } from 'typeorm'

export class AddOAuthLinkExpiryIndex1785410000000 implements MigrationInterface {
    name = 'AddOAuthLinkExpiryIndex1785410000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'CREATE INDEX "IDX_oauth_link_requests_expires_at" ON "oauth_link_requests" ("expires_at")',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(
            'DROP INDEX "public"."IDX_oauth_link_requests_expires_at"',
        )
    }
}
