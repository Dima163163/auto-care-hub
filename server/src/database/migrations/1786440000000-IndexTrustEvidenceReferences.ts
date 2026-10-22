import type { MigrationInterface, QueryRunner } from 'typeorm'

import { createBlindIndex, createEncryptedFieldTransformer } from '../../shared/security/data-encryption/field-encryption.js'

type EvidenceRow = { id: string; reference: string }
const referenceTransformer = createEncryptedFieldTransformer('autocare_trust_evidence', 'reference', 'text')

export class IndexTrustEvidenceReferences1786440000000 implements MigrationInterface {
    name = 'IndexTrustEvidenceReferences1786440000000'

    public async up(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`ALTER TABLE "autocare_trust_evidence" ADD "referenceIndex" text`)
        const rows = await queryRunner.query(`SELECT "id", "reference" FROM "autocare_trust_evidence" WHERE "reference" IS NOT NULL ORDER BY "id"`) as EvidenceRow[]
        for (const row of rows) {
            const reference = referenceTransformer.from(row.reference)
            if (typeof reference !== 'string') throw new Error('Trust evidence reference is invalid.')
            await queryRunner.query(`UPDATE "autocare_trust_evidence" SET "referenceIndex" = $1 WHERE "id" = $2`, [
                createBlindIndex(reference, 'evidence-reference'), row.id,
            ])
        }
        await queryRunner.query(`CREATE INDEX "IDX_autocare_trust_evidence_reference" ON "autocare_trust_evidence" ("providerId", "kind", "referenceIndex")`)
    }

    public async down(queryRunner: QueryRunner): Promise<void> {
        await queryRunner.query(`DROP INDEX IF EXISTS "public"."IDX_autocare_trust_evidence_reference"`)
        await queryRunner.query(`ALTER TABLE "autocare_trust_evidence" DROP COLUMN "referenceIndex"`)
    }
}
