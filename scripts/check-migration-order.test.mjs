import test from 'node:test'
import assert from 'node:assert/strict'

import {
    validateMigrationFile,
    validateMigrationOrder,
} from './check-migration-order.mjs'

test('validates a migration class against its filename', () => {
    assert.deepEqual(
        validateMigrationFile(
            '1785390000000-AddUserSessionExpiryIndex.ts',
            'export class AddUserSessionExpiryIndex1785390000000 {}',
        ),
        {
            fileName: '1785390000000-AddUserSessionExpiryIndex.ts',
            timestamp: 1785390000000,
            className: 'AddUserSessionExpiryIndex1785390000000',
        },
    )
})

test('rejects a migration with a mismatched class name', () => {
    assert.throws(
        () => validateMigrationFile(
            '1785390000000-AddUserSessionExpiryIndex.ts',
            'export class WrongMigration1785390000000 {}',
        ),
        /Migration class must be export class AddUserSessionExpiryIndex1785390000000/,
    )
})

test('rejects a migration with a mismatched TypeORM name', () => {
    assert.throws(
        () => validateMigrationFile(
            '1785390000000-AddUserSessionExpiryIndex.ts',
            "export class AddUserSessionExpiryIndex1785390000000 {}\nname = 'AddUserSessionExpiryIndex1785390000'",
        ),
        /Migration name must be AddUserSessionExpiryIndex1785390000000/,
    )
})

test('rejects migration timestamps outside the millisecond epoch range', () => {
    assert.throws(
        () => validateMigrationFile('42-OldMigration.ts', 'export class OldMigration42 {}'),
        /Migration timestamp is invalid/,
    )
})

test('rejects duplicate timestamps', () => {
    assert.throws(
        () => validateMigrationOrder([
            { fileName: 'a', timestamp: 1 },
            { fileName: 'b', timestamp: 1 },
        ]),
        /timestamp 1 is duplicated/,
    )
})

test('returns migrations in timestamp order', () => {
    assert.deepEqual(
        validateMigrationOrder([
            { fileName: 'new', timestamp: 2 },
            { fileName: 'old', timestamp: 1 },
        ]).map((migration) => migration.fileName),
        ['old', 'new'],
    )
})
