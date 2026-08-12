import test from 'node:test'
import assert from 'node:assert/strict'

import { checkDockerDaemon, getDockerDaemonFailure } from './check-docker.mjs'

test('recognizes a healthy Docker daemon', () => {
    assert.equal(getDockerDaemonFailure({ status: 0, stderr: '' }), null)
    assert.equal(checkDockerDaemon(() => ({ status: 0, stdout: '27.0.0', stderr: '' })), '27.0.0')
})

test('reports an actionable Docker Desktop message when the daemon is unavailable', () => {
    assert.equal(
        getDockerDaemonFailure({
            status: 1,
            stderr: 'Cannot connect to the Docker daemon at unix:///var/run/docker.sock.',
        }),
        'Docker daemon is unavailable. Start Docker Desktop and retry npm run db:up.',
    )
})

test('recognizes the Docker Desktop socket error emitted by the local CLI', () => {
    assert.equal(
        getDockerDaemonFailure({
            status: 1,
            stderr: 'failed to connect to the docker API at unix:///Users/a1/.docker/run/docker.sock',
        }),
        'Docker daemon is unavailable. Start Docker Desktop and retry npm run db:up.',
    )
})

test('does not leak arbitrary Docker stderr into the user-facing message', () => {
    assert.equal(
        getDockerDaemonFailure({ status: 1, stderr: 'password=secret internal socket details' }),
        'Docker CLI could not reach a working daemon. Verify Docker Desktop or the configured Docker context, then retry npm run db:up.',
    )
})

test('reports a setup message when the Docker CLI is missing', () => {
    assert.throws(
        () => checkDockerDaemon(() => {
            throw new Error('spawnSync docker ENOENT')
        }),
        {
            message: 'Docker CLI is unavailable. Install Docker Desktop and retry npm run db:up.',
        },
    )
})
