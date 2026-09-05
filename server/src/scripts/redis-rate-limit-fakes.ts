export type FakeRedisState = 'ready' | 'outage'

/** Deterministic ping adapter for outage/reconnect tests; it never opens a socket. */
export class DeterministicFakeRedisAdapter {
    private state: FakeRedisState = 'ready'

    readonly pings: FakeRedisState[] = []

    setState(state: FakeRedisState) {
        this.state = state
    }

    async ping() {
        this.pings.push(this.state)
        if (this.state === 'outage') throw new Error('synthetic Redis outage')
        return 'PONG'
    }
}
