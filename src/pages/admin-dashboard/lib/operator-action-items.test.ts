import { describe, expect, it } from 'vitest'

import { buildOperatorActionItems, buildOperatorQueueMetrics } from './operator-action-items'

describe('buildOperatorActionItems', () => {
    it('prioritizes critical signals, computes SLA state, and keeps drill-down metadata bounded', () => {
        const now = new Date('2026-08-11T12:00:00.000Z')
        const items = buildOperatorActionItems({
            now,
            securitySummary: {
                recentEvents: [{
                    id: 'security-1',
                    type: 'route_scan',
                    severity: 'critical',
                    status: 'open',
                    assigneeId: null,
                    reasonCode: 'route_scan',
                    createdAt: '2026-08-11T10:00:00.000Z',
                    lastAction: null,
                    actionTimeline: [],
                }],
            },
            incidents: [{
                id: 'incident-1',
                type: 'background_job',
                severity: 'warning',
                status: 'open',
                title: 'Background job degraded',
                requestId: null,
                metadata: { secret: 'must not escape' },
                occurrenceCount: 3,
                firstOccurredAt: '2026-08-11T11:50:00.000Z',
                lastOccurredAt: '2026-08-11T11:55:00.000Z',
                acknowledgedAt: null,
                resolvedAt: null,
            }],
            outboxHealth: {
                counts: {},
                abandonedCount: 1,
                deadLetterCount: 0,
                failedEvents: [{
                    id: 'outbox-1',
                    type: 'email.send',
                    idempotencyKey: 'private-key',
                    status: 'failed',
                    attempts: 5,
                    availableAt: '2026-08-11T11:30:00.000Z',
                    lockedAt: null,
                    processedAt: null,
                    lastError: 'private error',
                    createdAt: '2026-08-11T11:30:00.000Z',
                }],
            },
        })

        expect(items).toHaveLength(3)
        expect(items[0]).toMatchObject({
            id: 'security:security-1',
            priority: 'critical',
            reasonCode: 'route_scan',
            ageMinutes: 120,
            slaMinutes: 30,
            slaBreached: true,
            href: '/admin/security-center',
        })
        expect(items[1]).toMatchObject({
            id: 'outbox:outbox-1',
            priority: 'high',
            status: 'failed',
            href: '/admin/audit-logs',
        })
        expect(items[2]).toMatchObject({
            id: 'incident:incident-1',
            priority: 'warning',
            reasonCode: 'background_job',
            href: '/admin/audit-logs?tab=incidents',
        })
        expect(JSON.stringify(items)).not.toContain('private-key')
        expect(JSON.stringify(items)).not.toContain('private error')
        expect(JSON.stringify(items)).not.toContain('must not escape')
    })

    it('filters resolved signals and caps the queue to twelve entries', () => {
        const events = Array.from({ length: 15 }, (_, index) => ({
            id: `security-${index}`,
            type: 'route_scan' as const,
            severity: 'warning' as const,
            status: index === 0 ? 'resolved' as const : 'open' as const,
            assigneeId: null,
            reasonCode: 'route_scan',
            createdAt: `2026-08-11T11:${String(index).padStart(2, '0')}:00.000Z`,
            lastAction: null,
            actionTimeline: [],
        }))

        const items = buildOperatorActionItems({
            now: new Date('2026-08-11T12:00:00.000Z'),
            securitySummary: { recentEvents: events },
            incidents: [],
        })

        expect(items).toHaveLength(12)
        expect(items.every((item) => item.status !== 'open' || item.id !== 'security:security-0')).toBe(true)
    })

    it('computes a bounded live queue snapshot without pretending it is durable MTTA/MTTR', () => {
        const items = buildOperatorActionItems({
            now: new Date('2026-08-11T12:00:00.000Z'),
            incidents: [],
            securitySummary: {
                recentEvents: [{
                    id: 'security-1',
                    type: 'route_scan',
                    severity: 'critical',
                    status: 'acknowledged',
                    assigneeId: 'admin-1',
                    reasonCode: 'route_scan',
                    createdAt: '2026-08-11T10:00:00.000Z',
                    lastAction: {
                        status: 'acknowledged',
                        operatorNote: null,
                        actorId: 'admin-1',
                        assigneeId: 'admin-1',
                        createdAt: '2026-08-11T10:05:00.000Z',
                    },
                    actionTimeline: [{
                        id: 'action-1',
                        status: 'acknowledged',
                        operatorNote: null,
                        actorId: 'admin-1',
                        assigneeId: 'admin-1',
                        createdAt: '2026-08-11T10:05:00.000Z',
                    }],
                }],
            },
        })

        expect(buildOperatorQueueMetrics(items)).toEqual({
            total: 1,
            assigned: 1,
            acknowledged: 1,
            slaBreached: 1,
            oldestAgeMinutes: 120,
            averageAgeMinutes: 120,
        })
    })
})
