import { useEffect } from 'react'
import { useLocation } from 'react-router'

import { useGetAutoCareProviderProfileQuery, type AutoCareApiProviderProfile } from '@/entities/automotive-service'
import { LOCALE_OPTIONS, type SupportedLocale } from '@/shared/config/i18n'
import { ROUTES } from '@/shared/constants/routes'
import { useTranslation } from '@/shared/lib/useTranslation'

type SeoCopy = { title: string; description: string }

const homeCopy: Record<SupportedLocale, SeoCopy> = {
    en: { title: 'AutoCare Hub — Compare auto services near you', description: 'Compare prices, ratings and available appointments at verified auto services.' },
    ru: { title: 'AutoCare Hub — Сравнение автосервисов рядом', description: 'Сравнивайте цены, рейтинги и время записи в проверенных автосервисах.' },
    ro: { title: 'AutoCare Hub — Compară service-uri auto', description: 'Compară prețuri, evaluări și programări la service-uri auto verificate.' },
    es: { title: 'AutoCare Hub — Compara talleres cerca de ti', description: 'Compara precios, valoraciones y citas disponibles en talleres verificados.' },
    de: { title: 'AutoCare Hub — Werkstätten in deiner Nähe vergleichen', description: 'Vergleiche Preise, Bewertungen und Termine bei geprüften Werkstätten.' },
    fr: { title: 'AutoCare Hub — Comparez les garages près de chez vous', description: 'Comparez les prix, avis et créneaux des garages vérifiés.' },
    pt: { title: 'AutoCare Hub — Compare oficinas perto de você', description: 'Compare preços, avaliações e horários em oficinas verificadas.' },
    it: { title: 'AutoCare Hub — Confronta officine vicino a te', description: 'Confronta prezzi, recensioni e appuntamenti nelle officine verificate.' },
    pl: { title: 'AutoCare Hub — Porównaj serwisy w swojej okolicy', description: 'Porównuj ceny, opinie i terminy w zweryfikowanych serwisach.' },
    nl: { title: 'AutoCare Hub — Vergelijk garages bij jou in de buurt', description: 'Vergelijk prijzen, beoordelingen en afspraken bij geverifieerde garages.' },
    uk: { title: 'AutoCare Hub — Порівнюйте автосервіси поруч', description: 'Порівнюйте ціни, відгуки й час запису в перевірених автосервісах.' },
    cs: { title: 'AutoCare Hub — Porovnejte autoservisy ve svém okolí', description: 'Porovnávejte ceny, hodnocení a termíny v ověřených autoservisech.' },
    el: { title: 'AutoCare Hub — Συγκρίνετε συνεργεία κοντά σας', description: 'Συγκρίνετε τιμές, αξιολογήσεις και ραντεβού σε επαληθευμένα συνεργεία.' },
    sv: { title: 'AutoCare Hub — Jämför bilverkstäder nära dig', description: 'Jämför priser, omdömen och tider hos verifierade verkstäder.' },
    zh: { title: 'AutoCare Hub — 比较附近汽车服务', description: '比较经过验证的汽车服务价格、评价和可预约时间。' },
    ja: { title: 'AutoCare Hub — 近くの自動車サービスを比較', description: '認証済み自動車サービスの料金、レビュー、予約時間を比較できます。' },
    ko: { title: 'AutoCare Hub — 가까운 자동차 서비스를 비교하세요', description: '검증된 자동차 서비스의 가격, 후기, 예약 가능 시간을 비교하세요.' },
    ar: { title: 'AutoCare Hub — قارن خدمات السيارات القريبة', description: 'قارن الأسعار والتقييمات والمواعيد المتاحة لدى خدمات السيارات الموثقة.' },
    tr: { title: 'AutoCare Hub — Yakınınızdaki oto servisleri karşılaştırın', description: 'Doğrulanmış oto servislerde fiyatları, yorumları ve randevu saatlerini karşılaştırın.' },
    hi: { title: 'AutoCare Hub — अपने पास की ऑटो सेवाओं की तुलना करें', description: 'सत्यापित ऑटो सेवाओं की कीमतों, रेटिंग और उपलब्ध समय की तुलना करें।' },
}

const sectionLabels: Record<SupportedLocale, { search: string; provider: string; owners: string }> = {
    en: { search: 'Search', provider: 'Auto service', owners: 'For businesses' },
    ru: { search: 'Поиск', provider: 'Автосервис', owners: 'Для компаний' },
    ro: { search: 'Caută', provider: 'Service auto', owners: 'Pentru companii' },
    es: { search: 'Buscar', provider: 'Taller', owners: 'Para empresas' },
    de: { search: 'Suche', provider: 'Werkstatt', owners: 'Für Unternehmen' },
    fr: { search: 'Recherche', provider: 'Garage', owners: 'Pour les professionnels' },
    pt: { search: 'Buscar', provider: 'Oficina', owners: 'Para empresas' },
    it: { search: 'Cerca', provider: 'Officina', owners: 'Per le aziende' },
    pl: { search: 'Szukaj', provider: 'Serwis samochodowy', owners: 'Dla firm' },
    nl: { search: 'Zoeken', provider: 'Garage', owners: 'Voor bedrijven' },
    uk: { search: 'Пошук', provider: 'Автосервіс', owners: 'Для компаній' },
    cs: { search: 'Hledat', provider: 'Autoservis', owners: 'Pro firmy' },
    el: { search: 'Αναζήτηση', provider: 'Συνεργείο', owners: 'Για επιχειρήσεις' },
    sv: { search: 'Sök', provider: 'Bilverkstad', owners: 'För företag' },
    zh: { search: '搜索', provider: '汽车服务', owners: '面向企业' },
    ja: { search: '検索', provider: '自動車整備工場', owners: '事業者向け' },
    ko: { search: '검색', provider: '자동차 정비소', owners: '업체용' },
    ar: { search: 'بحث', provider: 'خدمة سيارات', owners: 'للشركات' },
    tr: { search: 'Ara', provider: 'Oto servis', owners: 'İşletmeler için' },
    hi: { search: 'खोजें', provider: 'ऑटो सर्विस', owners: 'व्यवसायों के लिए' },
}

// eslint-disable-next-line react-refresh/only-export-components -- Export the pure copy resolver for focused tests.
export function getSeoCopy(pathname: string, locale: SupportedLocale): SeoCopy {
    const home = homeCopy[locale]
    const labels = sectionLabels[locale]

    if (pathname === ROUTES.serviceDiscovery) return { ...home, title: `${home.title} | ${labels.search}` }
    if (pathname.startsWith('/services/')) return { ...home, title: `${home.title} | ${labels.provider}` }
    if (pathname === ROUTES.about) return locale === 'ru'
        ? { title: 'О сервисе AutoCare Hub — сравнение автосервисов', description: 'Узнайте, как AutoCare Hub помогает водителям сравнивать автосервисы, общаться с мастерскими и записываться на обслуживание.' }
        : { title: 'About AutoCare Hub — Compare automotive services', description: 'Learn how AutoCare Hub helps drivers compare automotive services, message providers and book visits.' }
    if (pathname === ROUTES.owners) return { ...home, title: `${home.title} | ${labels.owners}` }
    if (pathname === ROUTES.agreement) return locale === 'ru'
        ? { title: 'Пользовательское соглашение AutoCare Hub', description: 'Правила регистрации, поиска автосервисов, заявок, сообщений и взаимодействия клиентов и владельцев на AutoCare Hub.' }
        : { title: 'AutoCare Hub User Agreement', description: 'Rules for accounts, service discovery, requests, messages and interactions between drivers and automotive service providers.' }
    if (pathname === ROUTES.rules) return locale === 'ru'
        ? { title: 'Условия использования AutoCare Hub', description: 'Условия использования каталога, заявок, отзывов, бонусов и инструментов автосервисов AutoCare Hub.' }
        : { title: 'AutoCare Hub Terms of Use', description: 'Terms for using the marketplace catalog, requests, reviews, bonuses and automotive service tools.' }
    if (pathname === ROUTES.privacy) return locale === 'ru'
        ? { title: 'Политика конфиденциальности AutoCare Hub', description: 'Как AutoCare Hub обрабатывает данные аккаунта, автомобиля, заявок, сообщений, фотографий и отзывов.' }
        : { title: 'AutoCare Hub Privacy Policy', description: 'How AutoCare Hub handles account, vehicle, request, message, photo and review data.' }
    return home
}

// eslint-disable-next-line react-refresh/only-export-components -- Export the pure SEO copy resolver for focused tests.
export function getProviderSeoCopy(provider: Pick<AutoCareApiProviderProfile, 'name' | 'description'>, locale: SupportedLocale): SeoCopy {
    return {
        title: `${provider.name} | AutoCare Hub`,
        description: provider.description?.trim() || (locale === 'ru'
            ? `Услуги, цены и варианты записи в автосервисе «${provider.name}».`
            : `Compare published service offers, customer reviews and appointment options from ${provider.name}.`),
    }
}

function getPublicImageUrl(value: string | null | undefined, fallback: string) {
    if (!value) return fallback
    const candidate = value.trim()
    if (candidate.startsWith('/') && !candidate.startsWith('//')) return new URL(candidate, window.location.origin).href
    try {
        const url = new URL(candidate)
        return url.protocol === 'https:' || url.protocol === 'http:' ? url.href : fallback
    } catch {
        return fallback
    }
}

function setMeta(attribute: 'name' | 'property', key: string, content: string) {
    const selector = `meta[${attribute}="${key}"]`
    const element = document.head.querySelector<HTMLMetaElement>(selector) ?? document.head.appendChild(document.createElement('meta'))
    element.setAttribute(attribute, key)
    element.content = content
}

function setLink(rel: string, href: string, hrefLang?: string) {
    const selector = hrefLang ? `link[rel="${rel}"][hreflang="${hrefLang}"]` : `link[rel="${rel}"]`
    const element = document.head.querySelector<HTMLLinkElement>(selector) ?? document.head.appendChild(document.createElement('link'))
    element.rel = rel
    element.href = href
    if (hrefLang) element.hreflang = hrefLang
}

export function SeoHead() {
    const { pathname } = useLocation()
    const { locale } = useTranslation()
    const providerId = pathname.match(/^\/services\/([^/]+)$/)?.[1]
    const providerQuery = useGetAutoCareProviderProfileQuery(providerId ?? '', { skip: !providerId })

    useEffect(() => {
        // Keep the title and description generated by Next.js until the
        // client-side provider query resolves. On direct visits that public
        // DTO is already hydrated into RTK Query, so this preserves the same
        // provider-specific metadata after hydration.
        if (providerId && providerQuery.isFetching && !providerQuery.data) return
        const copy = providerQuery.data && providerId
            ? getProviderSeoCopy(providerQuery.data, locale)
            : getSeoCopy(pathname, locale)
        const canonical = new URL(pathname, window.location.origin)
        if (locale !== 'en') canonical.searchParams.set('lang', locale)
        const canonicalUrl = canonical.href
        const isPrivate = pathname.startsWith('/profile') || pathname.startsWith('/owner') || pathname.startsWith('/admin') || pathname.startsWith('/chats') || pathname.startsWith('/onboarding') || pathname === ROUTES.notifications || pathname.startsWith('/community/clients/')
        // The canonical discovery landing page is indexable; only filtered
        // result states carry query parameters and should be noindex.
        const isSearch = pathname === ROUTES.serviceDiscovery && window.location.search.length > 0

        document.title = copy.title
        setMeta('name', 'description', copy.description)
        setMeta('name', 'robots', isPrivate || isSearch ? 'noindex,follow' : 'index,follow,max-image-preview:large')
        setMeta('property', 'og:type', 'website')
        setMeta('property', 'og:site_name', 'AutoCare Hub')
        setMeta('property', 'og:title', copy.title)
        setMeta('property', 'og:description', copy.description)
        setMeta('property', 'og:url', canonicalUrl)
        const defaultImage = new URL('/images/autocare/hero-map-generated.webp', window.location.origin).href
        const imageUrl = getPublicImageUrl(providerQuery.data?.coverImageUrl, defaultImage)
        setMeta('property', 'og:image', imageUrl)
        setMeta('property', 'og:locale', LOCALE_OPTIONS.find((item) => item.value === locale)?.intlTag.replace('-', '_') ?? 'en_US')
        setMeta('name', 'twitter:card', 'summary_large_image')
        setMeta('name', 'twitter:title', copy.title)
        setMeta('name', 'twitter:description', copy.description)
        setMeta('name', 'twitter:image', imageUrl)
        setLink('canonical', canonicalUrl)

        for (const option of LOCALE_OPTIONS) {
            const alternate = new URL(pathname, window.location.origin)
            if (option.value !== 'en') alternate.searchParams.set('lang', option.value)
            setLink('alternate', alternate.href, option.value)
        }

        const id = 'autocare-hub-structured-data'
        const script = document.head.querySelector<HTMLScriptElement>(`script#${id}`) ?? document.head.appendChild(document.createElement('script'))
        script.id = id
        script.type = 'application/ld+json'
        script.textContent = JSON.stringify({
            '@context': 'https://schema.org',
            '@graph': [
                { '@type': 'Organization', name: 'AutoCare Hub', url: window.location.origin, logo: new URL('/favicon.svg', window.location.origin).href },
                { '@type': 'WebSite', name: 'AutoCare Hub', url: window.location.origin, inLanguage: locale, potentialAction: { '@type': 'SearchAction', target: `${window.location.origin}${ROUTES.serviceDiscovery}?service={search_term_string}`, 'query-input': 'required name=search_term_string' } },
            ],
        })
    }, [locale, pathname, providerId, providerQuery.data, providerQuery.isFetching])

    return null
}
