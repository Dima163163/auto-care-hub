export type AutomotiveService = {
    id: string
    icon: string
    labels: Record<string, string>
}

export const automotiveServices: readonly AutomotiveService[] = [
    { id: 'oil-change', icon: '◉', labels: { en: 'Oil change', ru: 'Замена масла', es: 'Cambio de aceite', ro: 'Schimb ulei' } },
    { id: 'tire-service', icon: '◌', labels: { en: 'Tire service', ru: 'Шиномонтаж', es: 'Neumáticos', ro: 'Anvelope' } },
    { id: 'diagnostics', icon: '⌁', labels: { en: 'Diagnostics', ru: 'Диагностика', es: 'Diagnóstico', ro: 'Diagnoză' } },
    { id: 'brakes', icon: '⊙', labels: { en: 'Brakes', ru: 'Тормозная система', es: 'Frenos', ro: 'Frâne' } },
    { id: 'detailing', icon: '✦', labels: { en: 'Detailing', ru: 'Детейлинг', es: 'Detallado', ro: 'Detailing' } },
    { id: 'body-paint', icon: '✧', labels: { en: 'Body & paint', ru: 'Кузов и покраска', es: 'Carrocería y pintura', ro: 'Caroserie și vopsire' } },
    { id: 'air-conditioning', icon: '❄', labels: { en: 'Air conditioning', ru: 'Кондиционер', es: 'Aire acondicionado', ro: 'Aer condiționat' } },
    { id: 'maintenance', icon: '⚙', labels: { en: 'Maintenance', ru: 'Техническое обслуживание', es: 'Mantenimiento', ro: 'Întreținere' } },
    { id: 'engine', icon: '◈', labels: { en: 'Engine', ru: 'Двигатель', es: 'Motor', ro: 'Motor' } },
    { id: 'suspension', icon: '⌁', labels: { en: 'Suspension', ru: 'Подвеска', es: 'Suspensión', ro: 'Suspensie' } },
    { id: 'electric', icon: 'ϟ', labels: { en: 'Auto electrician', ru: 'Электрика', es: 'Electricidad del auto', ro: 'Electrică auto' } },
    { id: 'tow-truck', icon: '↗', labels: { en: 'Tow truck', ru: 'Эвакуатор', es: 'Grúa', ro: 'Evacuator' } },
    { id: 'mobile-diagnostics', icon: '⌖', labels: { en: 'Mobile diagnostics', ru: 'Выездная диагностика', es: 'Diagnóstico móvil', ro: 'Diagnoză mobilă' } },
    { id: 'roadside-assistance', icon: '✚', labels: { en: 'Roadside assistance', ru: 'Помощь на дороге', es: 'Asistencia en carretera', ro: 'Asistență rutieră' } },
    { id: 'battery-service', icon: '▣', labels: { en: 'Battery and jump start', ru: 'Аккумулятор и запуск', es: 'Batería y arranque', ro: 'Baterie și pornire' } },
    { id: 'wheel-alignment', icon: '⊕', labels: { en: 'Wheel alignment', ru: 'Сход-развал', es: 'Alineación de ruedas', ro: 'Geometrie roți' } },
    { id: 'car-wash', icon: '◌', labels: { en: 'Car wash', ru: 'Автомойка', es: 'Lavado de coche', ro: 'Spălătorie auto' } },
    { id: 'windshield-repair', icon: '◇', labels: { en: 'Glass repair', ru: 'Ремонт стекол', es: 'Reparación de lunas', ro: 'Reparații parbriz' } },
]

export function getServiceLabel(service: AutomotiveService, locale: string) {
    return service.labels[locale] ?? service.labels.en ?? service.id
}
