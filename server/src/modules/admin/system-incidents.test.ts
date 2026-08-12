import { afterEach, describe, expect, it } from 'vitest'

import { AppDataSource } from '../../database/data-source.js'
import {
    SystemIncidentSeverity,
    SystemIncidentStatus,
    SystemIncidentType,
} from '../../entities/system-incident/system-incident.entity.js'
import {
    recordSystemIncidentSafely,
} from './system-incidents.service.js'

const incidentTitle = 'concurrent-deduplication-test'

describe('system incident deduplication', () => {
    afterEach(async () => {
        if (!AppDataSource.isInitialized) return

        await AppDataSource.getRepository('system_incidents').delete({
            type: SystemIncidentType.ServerError,
            title: incidentTitle,
        })
    })

    it('keeps concurrent identical failures in one row', async () => {
        if (!AppDataSource.isInitialized) return

        await Promise.all([
            recordSystemIncidentSafely({
                type: SystemIncidentType.ServerError,
                severity: SystemIncidentSeverity.Critical,
                title: incidentTitle,
                requestId: 'request-a',
            }),
            recordSystemIncidentSafely({
                type: SystemIncidentType.ServerError,
                severity: SystemIncidentSeverity.Critical,
                title: incidentTitle,
                requestId: 'request-b',
            }),
        ])

        const incidents = await AppDataSource
            .getRepository('system_incidents')
            .find({
                where: {
                    type: SystemIncidentType.ServerError,
                    title: incidentTitle,
                },
            }) as Array<{ occurrenceCount: number; status: SystemIncidentStatus }>

        expect(incidents).toHaveLength(1)
        expect(incidents[0]?.occurrenceCount).toBe(2)
        expect(incidents[0]?.status).toBe(SystemIncidentStatus.Open)
    })
})
