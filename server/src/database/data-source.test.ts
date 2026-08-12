import { describe, expect, it } from 'vitest'

import { getMigrationPaths } from './data-source.js'

describe('database migration discovery', () => {
    it('excludes test files from the development TypeORM glob', () => {
        expect(getMigrationPaths('development')).toEqual([
            'src/database/migrations/!(*.test).ts',
        ])
        expect(getMigrationPaths('test')).toEqual([
            'dist/database/migrations/*.js',
        ])
    })
})
