import { MapPin, Minus, Plus, Star, Wrench } from 'lucide-react'

const offers = [
    { id: 'north', top: '9%', left: '41%', price: 'от 3 200 ₽', rating: '4.7', tone: 'green' },
    { id: 'north-east', top: '17%', left: '79%', price: 'от 2 900 ₽', rating: '4.5', tone: 'blue' },
    { id: 'west', top: '37%', left: '36%', price: 'от 3 500 ₽', rating: '4.8', tone: 'blue' },
    { id: 'east', top: '61%', left: '78%', price: 'от 2 800 ₽', rating: '4.6', tone: 'green' },
    { id: 'south-west', top: '68%', left: '36%', price: 'от 2 800 ₽', rating: '4.6', tone: 'green' },
    { id: 'south', top: '84%', left: '69%', price: 'от 3 900 ₽', rating: '4.4', tone: 'blue' },
] as const

const servicePins = [
    { top: '11%', left: '25%' }, { top: '20%', left: '64%' }, { top: '34%', left: '89%' },
    { top: '49%', left: '52%' }, { top: '55%', left: '26%' }, { top: '74%', left: '88%' },
    { top: '90%', left: '55%' },
] as const

export function AutoCareHeroMap() {
    return (
        <div className="absolute inset-0 overflow-hidden bg-map-surface">
            <img src="/images/autocare/hero-map-generated.webp" alt="" className="absolute inset-0 h-full w-full object-cover object-center" aria-hidden="true" />
            <div className="absolute inset-0 bg-hero-overlay/15" aria-hidden="true" />
            <div className="absolute left-[71%] top-[48%] size-44 -translate-x-1/2 -translate-y-1/2 rounded-full border border-primary/50 bg-primary/15 shadow-[0_0_34px_var(--hero-glow)] lg:size-56" aria-hidden="true">
                <span className="absolute left-1/2 top-1/2 size-8 -translate-x-1/2 -translate-y-1/2 rounded-full border-[3px] border-primary-foreground bg-primary shadow-[0_0_16px_var(--primary)]" />
            </div>
            <div className="hidden lg:block">
                {servicePins.map((pin) => <ServicePin key={`${pin.top}-${pin.left}`} {...pin} />)}
                {offers.map((offer) => <OfferMarker key={offer.id} {...offer} />)}
            </div>
            <div className="absolute bottom-12 right-8 hidden flex-col overflow-hidden rounded-[9px] border border-primary-foreground/20 bg-map-overlay/90 text-primary-foreground shadow-xl lg:flex">
                <button type="button" className="flex size-12 items-center justify-center border-b border-primary-foreground/15" aria-label="Увеличить карту"><Plus className="size-6" /></button>
                <button type="button" className="flex size-12 items-center justify-center" aria-label="Уменьшить карту"><Minus className="size-6" /></button>
            </div>
        </div>
    )
}

function ServicePin({ top, left }: { top: string; left: string }) {
    return <span className="absolute flex size-10 -translate-x-1/2 -translate-y-1/2 items-center justify-center rounded-full border border-primary-foreground/30 bg-map-overlay/85 text-primary-foreground shadow-lg" style={{ top, left }}><Wrench className="size-5" /></span>
}

function OfferMarker({ top, left, price, rating, tone }: typeof offers[number]) {
    const toneClass = tone === 'green' ? 'bg-map-marker-success' : 'bg-map-marker-primary'

    return (
        <span className="absolute flex -translate-x-1/2 -translate-y-1/2 items-center gap-2 rounded-[12px] border border-primary-foreground/20 bg-map-overlay/80 px-2.5 py-2 text-primary-foreground shadow-xl backdrop-blur-sm" style={{ top, left }}>
            <span className={`flex size-9 items-center justify-center rounded-full ${toneClass}`}><MapPin className="size-5" /></span>
            <span className="pr-1"><strong className="block whitespace-nowrap text-sm">{price}</strong><span className="flex items-center gap-1 text-xs font-semibold">{rating}<Star className="size-3 fill-map-rating text-map-rating" /></span></span>
        </span>
    )
}
