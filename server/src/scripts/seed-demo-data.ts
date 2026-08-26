import { hash } from 'bcryptjs'

import { AppDataSource } from '../database/data-source.js'
import { BookingEntity, BookingStatus } from '../entities/booking/booking.entity.js'
import { CabinetEntity, CabinetStatus } from '../entities/cabinet/cabinet.entity.js'
import { ServiceEntity } from '../entities/service/service.entity.js'
import {
    UserEntity,
    UserProvider,
    UserRole,
    UserStatus,
} from '../entities/user/user.entity.js'
import {
    DEMO_BOOKING_DATE,
    DEMO_CABINET_TITLE,
    DEMO_PASSWORD,
    DEMO_SERVICE_TITLE,
    DEMO_USERS,
} from './demo-fixtures.js'

type DemoUserInput = {
    name: string
    email: string
    role: UserRole
}

async function upsertDemoUser(input: DemoUserInput, passwordHash: string) {
    const userRepository = AppDataSource.getRepository(UserEntity)
    const existingUser = await userRepository.findOneBy({ email: input.email })

    const user = userRepository.create({
        ...existingUser,
        name: input.name,
        email: input.email,
        passwordHash,
        phone: null,
        role: input.role,
        status: UserStatus.Active,
        avatarUrl: null,
        provider: UserProvider.Email,
        emailVerifiedAt: existingUser?.emailVerifiedAt ?? new Date(),
        emailNotifications: true,
        bookingEmailNotifications: true,
    })

    return userRepository.save(user)
}

async function upsertDemoCabinet(ownerId: string) {
    const cabinetRepository = AppDataSource.getRepository(CabinetEntity)
    const existingCabinet = await cabinetRepository.findOneBy({ title: DEMO_CABINET_TITLE })

    const cabinet = cabinetRepository.create({
        ...existingCabinet,
        ownerId,
        title: DEMO_CABINET_TITLE,
        description: 'Stable demo cabinet for real-mode smoke tests and portfolio walkthroughs.',
        address: 'Demo street 10',
        city: 'Demo City',
        pricePerHour: 1200,
        status: CabinetStatus.Active,
        photos: [
            '/images/cabinets/cabinet-beauty-bright-01.webp',
        ],
    })

    return cabinetRepository.save(cabinet)
}

async function upsertDemoService(cabinetId: string) {
    const serviceRepository = AppDataSource.getRepository(ServiceEntity)
    const existingService = await serviceRepository.findOneBy({
        cabinetId,
        title: DEMO_SERVICE_TITLE,
    })

    const service = serviceRepository.create({
        ...existingService,
        cabinetId,
        title: DEMO_SERVICE_TITLE,
        description: 'Stable demo service for booking flows.',
        durationMinutes: 60,
        price: 2500,
        isActive: true,
    })

    return serviceRepository.save(service)
}

async function upsertDemoBooking(input: {
    clientId: string
    cabinetId: string
    serviceId: string
    startTime: string
    endTime: string
    status: BookingStatus
    comment: string
}) {
    const bookingRepository = AppDataSource.getRepository(BookingEntity)
    const existingBooking = await bookingRepository.findOneBy({
        clientId: input.clientId,
        cabinetId: input.cabinetId,
        serviceId: input.serviceId,
        date: DEMO_BOOKING_DATE,
        startTime: input.startTime,
    })

    const booking = bookingRepository.create({
        ...existingBooking,
        clientId: input.clientId,
        cabinetId: input.cabinetId,
        serviceId: input.serviceId,
        date: DEMO_BOOKING_DATE,
        startTime: input.startTime,
        endTime: input.endTime,
        status: input.status,
        comment: input.comment,
    })

    return bookingRepository.save(booking)
}

async function seedDemoData() {
    await AppDataSource.initialize()

    try {
        const passwordHash = await hash(DEMO_PASSWORD, 10)

        const client = await upsertDemoUser({
            name: DEMO_USERS.client.name,
            email: DEMO_USERS.client.email,
            role: UserRole.Client,
        }, passwordHash)

        const owner = await upsertDemoUser({
            name: DEMO_USERS.owner.name,
            email: DEMO_USERS.owner.email,
            role: UserRole.Owner,
        }, passwordHash)

        // Provider team members use the same base account role as owners.
        // Their actual workspace access is constrained by a branch membership.
        await upsertDemoUser({
            name: DEMO_USERS.staff.name,
            email: DEMO_USERS.staff.email,
            role: UserRole.Owner,
        }, passwordHash)

        await upsertDemoUser({
            name: DEMO_USERS.admin.name,
            email: DEMO_USERS.admin.email,
            role: UserRole.Admin,
        }, passwordHash)

        await upsertDemoUser({
            name: DEMO_USERS.superAdmin.name,
            email: DEMO_USERS.superAdmin.email,
            role: UserRole.SuperAdmin,
        }, passwordHash)

        const cabinet = await upsertDemoCabinet(owner.id)
        const service = await upsertDemoService(cabinet.id)


        await upsertDemoBooking({
            clientId: client.id,
            cabinetId: cabinet.id,
            serviceId: service.id,
            startTime: '10:00',
            endTime: '11:00',
            status: BookingStatus.Pending,
            comment: 'Demo pending booking.',
        })

        await upsertDemoBooking({
            clientId: client.id,
            cabinetId: cabinet.id,
            serviceId: service.id,
            startTime: '12:00',
            endTime: '13:00',
            status: BookingStatus.Confirmed,
            comment: 'Demo confirmed booking.',
        })

        console.info('Demo data seeded successfully.')
        console.info(`Demo password for all seeded users: ${DEMO_PASSWORD}`)
    } finally {
        await AppDataSource.destroy()
    }
}

seedDemoData().catch((error: unknown) => {
    console.error(error)
    process.exitCode = 1
})
