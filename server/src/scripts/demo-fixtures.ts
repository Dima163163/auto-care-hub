export const DEMO_PASSWORD = '123456'
export const DEMO_BOOKING_DATE = '2099-02-15'
export const DEMO_CABINET_TITLE = 'Demo Wellness Cabinet'
export const DEMO_SERVICE_TITLE = 'Demo Consultation'
export const DEMO_BOOKING_START_TIMES = ['10:00', '12:00'] as const

export const DEMO_USERS = {
    client: {
        name: 'Demo Client',
        email: 'client.demo@autocarehub.test',
    },
    owner: {
        name: 'Demo Owner',
        email: 'owner.demo@autocarehub.test',
    },
    staff: {
        name: 'Demo ProService Staff',
        email: 'staff.demo@autocarehub.test',
    },
    admin: {
        name: 'Demo Admin',
        email: 'admin.demo@autocarehub.test',
    },
    superAdmin: {
        name: 'Demo Super Admin',
        email: 'superadmin.demo@autocarehub.test',
    },
} as const

export const DEMO_USER_EMAILS = Object.values(DEMO_USERS).map(({ email }) => email)
