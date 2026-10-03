import { defineConfig } from 'vitest/config'
import { INTEGRATION_GLOBS } from './src/test/test-profile-policy.js'

export default defineConfig({
    resolve: { tsconfigPaths: true },
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['src/test/setup.ts'],
        include: INTEGRATION_GLOBS,
        fileParallelism: false,
    },
})
