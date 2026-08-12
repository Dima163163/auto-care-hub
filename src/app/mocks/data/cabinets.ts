import type { Cabinet } from "@/entities/cabinet"

const professionalCabinetPhotos = [
    "/images/cabinets/cabinet-beauty-bright-01.webp",
    "/images/cabinets/cabinet-medical-consultation-01.webp",
    "/images/cabinets/cabinet-coaching-private-01.webp",
    "/images/cabinets/cabinet-massage-wellness-draft-01.webp",
] as const

function getProfessionalCabinetPhotos(index: number) {
    const coverPhoto = professionalCabinetPhotos[(index - 1) % professionalCabinetPhotos.length]

    return [
        coverPhoto ?? '/images/cabinets/cabinet-beauty-bright-01.webp',
        ...professionalCabinetPhotos.filter((photo) => photo !== coverPhoto),
    ]
}

export const mockCabinets: Cabinet[] = [
    {
        id: "cabinet-1",
        ownerId: "user-owner-1",
        title: "Bright beauty cabinet near city center",
        description: "A clean and fully equipped cabinet for beauty specialists, consultations, and private appointments.",
        address: "Main Street 12",
        city: "Berlin",
        pricePerHour: 1500,
        status: "active" as const,
        photos: [
            "/images/cabinets/cabinet-beauty-bright-01.webp",
            "/images/cabinets/cabinet-medical-consultation-01.webp",
            "/images/cabinets/cabinet-coaching-private-01.webp",
            "/images/cabinets/cabinet-massage-wellness-draft-01.webp",
        ],
        amenities: ["Natural light", "Sink", "Storage", "Air conditioning", "Wi-Fi"],
        cancellationPolicy: "Free cancellation up to 24 hours before the appointment.\n50% refund for cancellations made less than 24 hours in advance.",
        houseRules: "No smoking in the space\nNo pets allowed",
        createdAt: "2026-01-11T09:00:00.000Z"
    },
    {
        id: "cabinet-2",
        ownerId: "user-owner-1",
        title: "Medical consultation room",
        description: "Quiet consultation room suitable for private medical appointments and wellness services.",
        address: "Health Avenue 7",
        city: "Berlin",
        pricePerHour: 2200,
        status: "active" as const,
        photos: ["/images/cabinets/cabinet-medical-consultation-01.webp"],
        createdAt: "2026-01-12T11:00:00.000Z"
    },
    {
        id: "cabinet-3",
        ownerId: "user-owner-2",
        title: "Private coaching room",
        description: "Minimal and comfortable room for consultants, coaches, psychologists, and private specialists.",
        address: "Consulting Road 4",
        city: "Munich",
        pricePerHour: 1800,
        status: "active" as const,
        photos: ["/images/cabinets/cabinet-coaching-private-01.webp"],
        createdAt: "2026-01-15T14:20:00.000Z"
    },
    {
        id: "cabinet-4",
        ownerId: "user-owner-2",
        title: "Draft massage cabinet",
        description: "Cabinet draft that is not visible for public booking yet.",
        address: "Wellness Street 21",
        city: "Hamburg",
        pricePerHour: 1700,
        status: "draft" as const,
        photos: ["/images/cabinets/cabinet-massage-wellness-draft-01.webp"],
        createdAt: "2026-01-18T16:10:00.000Z"
    },
    {
        id: "cabinet-prof-1",
        ownerId: "user-owner-1",
        title: "Professional Workspace 1",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 1",
        city: "Saint Petersburg",
        pricePerHour: 1100,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(1),
        createdAt: "2026-06-15T06:49:40.465Z"
    },
    {
        id: "cabinet-prof-2",
        ownerId: "user-owner-1",
        title: "Professional Workspace 2",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 2",
        city: "Moscow",
        pricePerHour: 1200,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(2),
        createdAt: "2026-06-14T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-3",
        ownerId: "user-owner-1",
        title: "Professional Workspace 3",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 3",
        city: "Kazan",
        pricePerHour: 1300,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(3),
        createdAt: "2026-06-13T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-4",
        ownerId: "user-owner-1",
        title: "Professional Workspace 4",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 4",
        city: "Moscow",
        pricePerHour: 1400,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(4),
        createdAt: "2026-06-12T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-5",
        ownerId: "user-owner-1",
        title: "Professional Workspace 5",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 5",
        city: "Saint Petersburg",
        pricePerHour: 1500,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(5),
        createdAt: "2026-06-11T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-6",
        ownerId: "user-owner-1",
        title: "Professional Workspace 6",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 6",
        city: "Moscow",
        pricePerHour: 1600,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(6),
        createdAt: "2026-06-10T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-7",
        ownerId: "user-owner-1",
        title: "Professional Workspace 7",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 7",
        city: "Saint Petersburg",
        pricePerHour: 1700,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(7),
        createdAt: "2026-06-09T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-8",
        ownerId: "user-owner-1",
        title: "Professional Workspace 8",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 8",
        city: "Moscow",
        pricePerHour: 1800,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(8),
        createdAt: "2026-06-08T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-9",
        ownerId: "user-owner-1",
        title: "Professional Workspace 9",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 9",
        city: "Kazan",
        pricePerHour: 1900,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(9),
        createdAt: "2026-06-07T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-10",
        ownerId: "user-owner-1",
        title: "Professional Workspace 10",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 10",
        city: "Moscow",
        pricePerHour: 2000,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(10),
        createdAt: "2026-06-06T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-11",
        ownerId: "user-owner-1",
        title: "Professional Workspace 11",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 11",
        city: "Saint Petersburg",
        pricePerHour: 2100,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(11),
        createdAt: "2026-06-05T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-12",
        ownerId: "user-owner-1",
        title: "Professional Workspace 12",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 12",
        city: "Moscow",
        pricePerHour: 2200,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(12),
        createdAt: "2026-06-04T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-13",
        ownerId: "user-owner-1",
        title: "Professional Workspace 13",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 13",
        city: "Saint Petersburg",
        pricePerHour: 2300,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(13),
        createdAt: "2026-06-03T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-14",
        ownerId: "user-owner-1",
        title: "Professional Workspace 14",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 14",
        city: "Moscow",
        pricePerHour: 2400,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(14),
        createdAt: "2026-06-02T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-15",
        ownerId: "user-owner-1",
        title: "Professional Workspace 15",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 15",
        city: "Kazan",
        pricePerHour: 2500,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(15),
        createdAt: "2026-06-01T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-16",
        ownerId: "user-owner-1",
        title: "Professional Workspace 16",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 16",
        city: "Moscow",
        pricePerHour: 2600,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(16),
        createdAt: "2026-05-31T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-17",
        ownerId: "user-owner-1",
        title: "Professional Workspace 17",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 17",
        city: "Saint Petersburg",
        pricePerHour: 2700,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(17),
        createdAt: "2026-05-30T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-18",
        ownerId: "user-owner-1",
        title: "Professional Workspace 18",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 18",
        city: "Moscow",
        pricePerHour: 2800,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(18),
        createdAt: "2026-05-29T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-19",
        ownerId: "user-owner-1",
        title: "Professional Workspace 19",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 19",
        city: "Saint Petersburg",
        pricePerHour: 2900,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(19),
        createdAt: "2026-05-28T06:49:40.468Z"
    },
    {
        id: "cabinet-prof-20",
        ownerId: "user-owner-1",
        title: "Professional Workspace 20",
        description: "A great and quiet workspace for professionals. Perfect for consultations and private work.",
        address: "Business Avenue 20",
        city: "Moscow",
        pricePerHour: 3000,
        status: "active" as const,
        photos: getProfessionalCabinetPhotos(20),
        createdAt: "2026-05-27T06:49:40.468Z"
    },
]
