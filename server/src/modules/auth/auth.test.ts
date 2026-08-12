import request from 'supertest'
import { describe, expect, it } from 'vitest'
import { buildApp } from '../../app'
import { AppDataSource } from '../../database/data-source'
import {
    SecurityTokenEntity,
    SecurityTokenPurpose,
} from '../../entities/security-token/security-token.entity'

describe('Auth Flow Integration', () => {
    it('registers a new user and returns tokens after CSRF exchange', async () => {
        const app = await buildApp()
        await app.ready()

        // 1. Get CSRF token
        const csrfResponse = await request(app.server)
            .get('/auth/csrf')
            .set('Origin', 'http://localhost:5173')
        
        const csrfToken = csrfResponse.body.csrfToken
        const cookies = csrfResponse.headers['set-cookie']

        expect(csrfToken).toBeDefined()
        expect(cookies).toBeDefined()

        // 2. Register with CSRF token and cookie
        const email = `test-${Date.now()}@example.com`
        const response = await request(app.server)
            .post('/auth/register')
            .set('Origin', 'http://localhost:5173')
            .set('X-CSRF-Token', csrfToken)
            .set('Cookie', cookies)
            .send({
                name: 'Test User',
                email,
                password: 'password123',
                role: 'client'
            })

        expect(response.status).toBe(200)
        expect(response.body.user.email).toBe(email)
        expect(response.body.accessToken).toBeDefined()
        expect(response.headers['set-cookie']).toBeDefined()

        const verificationToken = await AppDataSource.getRepository(SecurityTokenEntity).findOne({
            where: {
                userId: response.body.user.id,
                purpose: SecurityTokenPurpose.EmailVerification,
            },
        })

        expect(verificationToken).toBeDefined()
        expect(verificationToken?.usedAt).toBeNull()

        await app.close()
    })
})
