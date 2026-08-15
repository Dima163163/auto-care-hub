import test from 'node:test'
import assert from 'node:assert/strict'

import { assertRenderProductionConfig } from './check-render-production-config.mjs'

const validConfig = `
envVars:
      - key: NODE_ENV
        value: production
      - key: BOOTSTRAP_SUPER_ADMIN_EMAIL
        sync: false
      - key: OUTBOX_TOKEN_ENCRYPTION_KEY
        sync: false
      - key: CABINET_UPLOADS_DIR
        sync: false
      - key: MAIL_MODE
        value: smtp
preDeployCommand: "npm run release:migrate"
startCommand: "npm run start:server"
`

test('accepts a production Render config with safe startup ownership', () => {
    assert.equal(assertRenderProductionConfig(validConfig), true)
})

test('rejects a logger mail mode in production', () => {
    assert.throws(
        () => assertRenderProductionConfig(validConfig.replace('value: smtp', 'value: logger')),
        /no production logger mail mode/,
    )
})

test('rejects an implicit bootstrap email', () => {
    assert.throws(
        () => assertRenderProductionConfig(validConfig.replace('sync: false', 'value: admin@example.com')),
        /explicit bootstrap email/,
    )
})
