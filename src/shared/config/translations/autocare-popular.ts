import { enTranslations } from './en'

type AutoCareLocale = 'ru' | 'ro' | 'es' | 'de' | 'fr' | 'pt' | 'zh' | 'ja' | 'ko' | 'ar' | 'tr' | 'hi'

const autocareOverrides = {
    ru: { heroTitle: 'Найдите лучший автосервис рядом', heroDescription: 'Сравните цены, рейтинги и время записи за пару кликов', byService: 'По услуге', byProvider: 'По автосервису', searchAction: 'Найти сервисы', resultsTitle: 'Сравните автосервисы', bookAction: 'Выбрать и записаться', detailsAction: 'Подробнее' },
    ro: { heroTitle: 'Găsește cel mai bun service auto în apropiere', heroDescription: 'Compară prețuri, evaluări și programări în câteva clicuri', byService: 'După serviciu', byProvider: 'După service', searchAction: 'Găsește service-uri', resultsTitle: 'Compară service-uri auto', bookAction: 'Alege și rezervă', detailsAction: 'Detalii' },
    es: { heroTitle: 'Encuentra el mejor taller cerca de ti', heroDescription: 'Compara precios, valoraciones y citas en unos pocos clics', byService: 'Por servicio', byProvider: 'Por taller', searchAction: 'Buscar talleres', resultsTitle: 'Compara servicios de auto', bookAction: 'Elegir y reservar', detailsAction: 'Detalles' },
    de: { heroTitle: 'Finde die beste Werkstatt in deiner Nähe', heroDescription: 'Vergleiche Preise, Bewertungen und Termine mit wenigen Klicks', byService: 'Nach Leistung', byProvider: 'Nach Werkstatt', searchAction: 'Werkstätten finden', resultsTitle: 'Autodienste vergleichen', bookAction: 'Auswählen und buchen', detailsAction: 'Details' },
    fr: { heroTitle: 'Trouvez le meilleur garage près de chez vous', heroDescription: 'Comparez les prix, avis et créneaux en quelques clics', byService: 'Par service', byProvider: 'Par garage', searchAction: 'Trouver des garages', resultsTitle: 'Comparez les services auto', bookAction: 'Choisir et réserver', detailsAction: 'Détails' },
    pt: { heroTitle: 'Encontre a melhor oficina perto de você', heroDescription: 'Compare preços, avaliações e horários em poucos cliques', byService: 'Por serviço', byProvider: 'Por oficina', searchAction: 'Encontrar oficinas', resultsTitle: 'Compare serviços automotivos', bookAction: 'Escolher e agendar', detailsAction: 'Detalhes' },
    zh: { heroTitle: '查找附近最好的汽车服务', heroDescription: '只需几次点击即可比较价格、评价和预约时间', byService: '按服务', byProvider: '按服务商', searchAction: '查找服务商', resultsTitle: '比较汽车服务', bookAction: '选择并预约', detailsAction: '详情' },
    ja: { heroTitle: '近くの最適な自動車サービスを探す', heroDescription: '料金、レビュー、予約可能時間を数クリックで比較', byService: 'サービスから', byProvider: '店舗から', searchAction: 'サービスを探す', resultsTitle: '自動車サービスを比較', bookAction: '選択して予約', detailsAction: '詳細' },
    ko: { heroTitle: '가까운 최고의 자동차 서비스를 찾아보세요', heroDescription: '몇 번의 클릭으로 가격, 후기, 예약 시간을 비교하세요', byService: '서비스별', byProvider: '정비소별', searchAction: '서비스 찾기', resultsTitle: '자동차 서비스 비교', bookAction: '선택하고 예약', detailsAction: '자세히 보기' },
    ar: { heroTitle: 'اعثر على أفضل خدمة سيارات بالقرب منك', heroDescription: 'قارن الأسعار والتقييمات ومواعيد الحجز ببضع نقرات', byService: 'حسب الخدمة', byProvider: 'حسب مركز الخدمة', searchAction: 'ابحث عن خدمات', resultsTitle: 'قارن خدمات السيارات', bookAction: 'اختر واحجز', detailsAction: 'التفاصيل' },
    tr: { heroTitle: 'Yakınınızdaki en iyi oto servisini bulun', heroDescription: 'Fiyatları, yorumları ve randevu saatlerini birkaç tıklamayla karşılaştırın', byService: 'Hizmete göre', byProvider: 'Servise göre', searchAction: 'Servisleri bul', resultsTitle: 'Oto servislerini karşılaştırın', bookAction: 'Seç ve randevu al', detailsAction: 'Detaylar' },
    hi: { heroTitle: 'अपने पास की सर्वश्रेष्ठ ऑटो सेवा खोजें', heroDescription: 'कुछ क्लिक में कीमतों, रेटिंग और उपलब्ध समय की तुलना करें', byService: 'सेवा के अनुसार', byProvider: 'सर्विस सेंटर के अनुसार', searchAction: 'सेवाएं खोजें', resultsTitle: 'ऑटो सेवाओं की तुलना करें', bookAction: 'चुनें और बुक करें', detailsAction: 'विवरण' },
} as const satisfies Record<AutoCareLocale, Partial<typeof enTranslations.autocare>>

export function withAutoCareTranslations<T extends typeof enTranslations>(locale: AutoCareLocale, translations: T): T {
    return {
        ...translations,
        autocare: { ...translations.autocare, ...autocareOverrides[locale] },
    }
}
