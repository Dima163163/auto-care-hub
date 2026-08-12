import test from 'node:test'
import assert from 'node:assert/strict'

import {
    formatIntegrationPrerequisiteFailure,
    getMissingIntegrationPrerequisites,
} from './check-integration-prerequisites.mjs'

test('integration prerequisite check reports missing variables', () => {
    assert.deepEqual(
        getMissingIntegrationPrerequisites({ DATABASE_HOST: 'localhost', DATABASE_PORT: '5432' }),
        [
            'REDIS_URL or REDIS_HOST/REDIS_PORT',
            'DATABASE_URL or DATABASE_HOST/DATABASE_PORT/DATABASE_USER/DATABASE_PASSWORD/DATABASE_NAME',
            'JWT_ACCESS_SECRET',
            'JWT_REFRESH_SECRET',
        ],
    )
})

test('integration prerequisite check accepts a complete environment', () => {
    const environment = {
        DATABASE_HOST: 'localhost', DATABASE_PORT: '5432', DATABASE_USER: 'autocarehub',
        DATABASE_PASSWORD: 'secret', DATABASE_NAME: 'autocarehub_test', REDIS_HOST: 'localhost',
        REDIS_PORT: '6379', JWT_ACCESS_SECRET: 'access', JWT_REFRESH_SECRET: 'refresh',
    }
    assert.deepEqual(getMissingIntegrationPrerequisites(environment), [])
})

test('integration prerequisite check accepts URL-based providers', () => {
    const environment = {
        DATABASE_URL: 'postgres://autocare-hub:secret@db.example.com:5432/autocarehub',
        REDIS_URL: 'redis://cache.example.com:6379',
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
    }

    assert.deepEqual(getMissingIntegrationPrerequisites(environment), [])
})

test('integration prerequisite check rejects unsupported or malformed provider URLs', () => {
    const missing = getMissingIntegrationPrerequisites({
        DATABASE_URL: 'mysql://autocare-hub:secret@db.example.com:3306/autocarehub',
        REDIS_URL: 'not-a-url',
        JWT_ACCESS_SECRET: 'access',
        JWT_REFRESH_SECRET: 'refresh',
    })

    assert.deepEqual(missing, [
        'REDIS_URL or REDIS_HOST/REDIS_PORT',
        'DATABASE_URL or DATABASE_HOST/DATABASE_PORT/DATABASE_USER/DATABASE_PASSWORD/DATABASE_NAME',
    ])
})

test('integration prerequisite failure stays actionable without exposing values', () => {
    const output = formatIntegrationPrerequisiteFailure(['DATABASE_URL', 'JWT_ACCESS_SECRET'])

    assert.match(output, /server\/\.env\.example/)
    assert.match(output, /npm run server:db:up/)
    assert.match(output, /npm run check-integration-prerequisites/)
    assert.doesNotMatch(output, /secret-value/)
})
