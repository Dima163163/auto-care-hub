import test from 'node:test'
import assert from 'node:assert/strict'

import { collectNotValidConstraints, evaluateMigrationValidation } from './check-migration-validation.mjs'

const migrationSources = {
    '001-safe.ts': `/* NOT VALID in a comment */\nawait queryRunner.query(\`ALTER TABLE "one" ADD CONSTRAINT "CHK_one" CHECK (id > 0) NOT VALID\`)`,
    '002-safe.ts': `await queryRunner.query(\`ALTER TABLE "two" ADD CONSTRAINT "FK_two" FOREIGN KEY (id) REFERENCES one(id) NOT VALID\`)`,
}

const sourceMap = {
    migrationSources,
    integritySource: [
        'relation.relname LIKE \'autocare_%\'',
        'NOT constraint_row.convalidated',
        "process.argv.includes('--validate')",
        'VALIDATE CONSTRAINT',
    ].join('\n'),
    packageSource: '"release:migrate": "npm run migration:run && npm run check:autocare-integrity -- --validate"',
    releaseChecklistSource: 'check:autocare-integrity -- --validate\nfrom `NOT VALID`',
}

test('collects executable NOT VALID clauses and ignores comments', () => {
    assert.deepEqual(collectNotValidConstraints(migrationSources), [
        { fileName: '001-safe.ts', constraintName: 'CHK_one' },
        { fileName: '002-safe.ts', constraintName: 'FK_two' },
    ])
})

test('passes the complete migration validation contract', () => {
    const evaluation = evaluateMigrationValidation(sourceMap)
    assert.equal(evaluation.constraints.length, 2)
    assert.equal(evaluation.results.filter((result) => result.status === 'blocked').length, 0)
})

test('fails closed when release validation is removed', () => {
    const evaluation = evaluateMigrationValidation({ ...sourceMap, packageSource: '"release:migrate": "npm run migration:run"' })
    const gate = evaluation.results.find((result) => result.name === 'Release migration gate')
    assert.equal(gate?.status, 'blocked')
})
