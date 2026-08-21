import { defineConfig } from 'vitest/config'

export default defineConfig({
    resolve: {
        tsconfigPaths: true,
    },
    test: {
        globals: true,
        environment: 'node',
        setupFiles: ['src/test/setup.ts'],
        include: [
            'src/modules/outbox/outbox.service.test.ts',
            'src/modules/admin/system-incidents.test.ts',
            'src/modules/auth/session.service.integration.test.ts',
            'src/modules/jobs/maintenance-lease.integration.test.ts',
            'src/modules/oauth/oauth-link-callback.integration.test.ts',
            'src/modules/users/account-deletion.service.integration.test.ts',
            'src/modules/users/users.routes.integration.test.ts',
            'src/modules/autocare/autocare.routes.integration.test.ts',
        'src/database/schema-contract.integration.test.ts',
        ],
        fileParallelism: false,
    },
})
