import { defineConfig } from 'vitest/config'
import { INTEGRATION_GLOBS, TEST_GLOBS } from './src/test/test-profile-policy.js'

export default defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
        globals: true,
        environment: 'node',
        include: TEST_GLOBS,
        exclude: INTEGRATION_GLOBS,
        // No database setup: pure tests must never connect to a developer DB.
    },
})
