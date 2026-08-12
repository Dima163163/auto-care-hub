import type { MigrationInterface, QueryRunner } from 'typeorm'

export class ExpandEuropeanLocalePreferences1785730000000 implements MigrationInterface {
    name = 'ExpandEuropeanLocalePreferences1785730000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "CHK_users_locale_supported"')
        await queryRunner.query(
            'ALTER TABLE "users" ADD CONSTRAINT "CHK_users_locale_supported" CHECK ("locale" IS NULL OR "locale" IN (\'en\', \'ru\', \'ro\', \'es\', \'de\', \'fr\', \'pt\', \'it\', \'pl\', \'nl\', \'uk\', \'cs\', \'el\', \'sv\', \'zh\', \'ja\', \'ko\', \'ar\', \'tr\', \'hi\'))',
        )
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query('ALTER TABLE "users" DROP CONSTRAINT "CHK_users_locale_supported"')
        await queryRunner.query(
            'ALTER TABLE "users" ADD CONSTRAINT "CHK_users_locale_supported" CHECK ("locale" IS NULL OR "locale" IN (\'en\', \'ru\', \'ro\', \'es\', \'de\', \'fr\', \'pt\', \'zh\', \'ja\', \'ko\', \'ar\', \'tr\', \'hi\'))',
        )
    }
}
