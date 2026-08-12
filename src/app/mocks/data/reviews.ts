import type { AdminReview } from '@/entities/review'

export const mockReviews = [
    {
        id: 'review-1',
        clientId: 'user-client-1',
        cabinetId: 'cabinet-1',
        bookingId: 'booking-1',
        rating: 5,
        text: 'Clean, bright, and comfortable cabinet.',
        status: 'approved',
        createdAt: '2026-02-06T18:00:00.000Z',
        updatedAt: '2026-02-06T18:30:00.000Z',
        client: {
            id: 'user-client-1',
            name: 'Emily Carter',
        },
        cabinet: {
            id: 'cabinet-1',
            title: 'Bright beauty cabinet near city center',
        },
    },
    {
        id: 'review-2',
        clientId: 'user-client-2',
        cabinetId: 'cabinet-2',
        bookingId: 'booking-2',
        rating: 4,
        text: 'Good location and professional environment.',
        status: 'pending',
        createdAt: '2026-02-07T13:20:00.000Z',
        updatedAt: '2026-02-07T13:20:00.000Z',
        client: {
            id: 'user-client-2',
            name: 'Michael Brown',
        },
        cabinet: {
            id: 'cabinet-2',
            title: 'Medical consultation room',
        },
    },
    {
        id: 'review-3',
        clientId: 'user-client-1',
        cabinetId: 'cabinet-3',
        bookingId: 'booking-3',
        rating: 5,
        text: 'Private and calm room, good fit for focused sessions.',
        status: 'rejected',
        createdAt: '2026-02-08T11:15:00.000Z',
        updatedAt: '2026-02-08T12:00:00.000Z',
        client: {
            id: 'user-client-1',
            name: 'Emily Carter',
        },
        cabinet: {
            id: 'cabinet-3',
            title: 'Private coaching room',
        },
    },
] satisfies AdminReview[]
