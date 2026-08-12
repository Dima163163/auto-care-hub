import { readFile } from 'node:fs/promises'
import assert from 'node:assert/strict'
import test from 'node:test'

import { validateOpenApiStructure } from './check-openapi-structure.mjs'

const source = await readFile(new URL('../server/src/routes/openapi.route.ts', import.meta.url), 'utf8')

test('OpenAPI structural checker accepts the current document structure', () => {
    assert.deepEqual(validateOpenApiStructure(source), { operations: 22 })
})

test('OpenAPI structural checker rejects a missing operation id', () => {
    assert.throws(
        () => validateOpenApiStructure(source.replace("operationId: 'getHealthLive'", 'operationId: \'changed\'')),
        /operation id mismatch/,
    )
})
