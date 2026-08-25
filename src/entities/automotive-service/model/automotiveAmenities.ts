export type AutomotiveAmenityId =
    | 'waiting_room'
    | 'customer_parking'
    | 'wifi'
    | 'online_booking'
    | 'coffee'
    | 'card_payment'
    | 'electric_charging'
    | 'pickup_delivery'

export type AutomotiveAmenity = {
    id: AutomotiveAmenityId
    labels: Record<string, string>
}

export const automotiveAmenities: readonly AutomotiveAmenity[] = [
    { id: 'waiting_room', labels: { en: 'Waiting room', ru: 'Комната ожидания', es: 'Sala de espera', ro: 'Sală de așteptare' } },
    { id: 'customer_parking', labels: { en: 'Customer parking', ru: 'Парковка для клиентов', es: 'Aparcamiento para clientes', ro: 'Parcare pentru clienți' } },
    { id: 'wifi', labels: { en: 'Free Wi‑Fi', ru: 'Бесплатный Wi‑Fi', es: 'Wi‑Fi gratuito', ro: 'Wi‑Fi gratuit' } },
    { id: 'online_booking', labels: { en: 'Online booking 24/7', ru: 'Онлайн-запись 24/7', es: 'Reserva online 24/7', ro: 'Programare online 24/7' } },
    { id: 'coffee', labels: { en: 'Coffee and drinks', ru: 'Кофе и напитки', es: 'Café y bebidas', ro: 'Cafea și băuturi' } },
    { id: 'card_payment', labels: { en: 'Card and cashless payment', ru: 'Оплата картой и наличными', es: 'Tarjeta y efectivo', ro: 'Plată cu cardul și numerar' } },
    { id: 'electric_charging', labels: { en: 'EV charging', ru: 'Зарядка электромобиля', es: 'Carga para vehículos eléctricos', ro: 'Încărcare pentru vehicule electrice' } },
    { id: 'pickup_delivery', labels: { en: 'Vehicle pickup and return', ru: 'Забор и возврат автомобиля', es: 'Recogida y entrega del vehículo', ro: 'Preluare și returnare auto' } },
]

export const defaultAutomotiveAmenityIds: readonly AutomotiveAmenityId[] = [
    'waiting_room',
    'customer_parking',
    'wifi',
    'online_booking',
    'coffee',
    'card_payment',
]

export function getAutomotiveAmenityLabel(amenity: AutomotiveAmenity, locale: string) {
    return amenity.labels[locale] ?? amenity.labels.en ?? amenity.id
}
