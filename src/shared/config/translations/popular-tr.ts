import { enTranslations } from './en'

import { helpCenterPopular } from './help-center-popular'

import { landingExtraPopular, landingPopular } from './landing-popular'

import { longTailPopular, type PopularLocale } from './long-tail-popular'

type LocaleOverrides = {
    common?: Partial<typeof enTranslations.common>
    navigation?: Partial<typeof enTranslations.navigation>
    auth?: Partial<typeof enTranslations.auth>
    workspace?: Partial<typeof enTranslations.workspace>
    landing?: Partial<typeof enTranslations.landing>
    autocare?: Partial<typeof enTranslations.autocare>
    errors?: Partial<typeof enTranslations.errors>
    booking?: Partial<typeof enTranslations.booking>
    ownerDashboard?: Partial<typeof enTranslations.ownerDashboard>
    adminDashboard?: Omit<Partial<typeof enTranslations.adminDashboard>, 'operatorCenter'> & {
        operatorCenter?: Partial<typeof enTranslations.adminDashboard.operatorCenter>
    }
    adminUsers?: Partial<typeof enTranslations.adminUsers>
    adminOwners?: Partial<typeof enTranslations.adminOwners>
    adminCabinets?: Partial<typeof enTranslations.adminCabinets>
    adminReviews?: Partial<typeof enTranslations.adminReviews>
    systemIncidents?: Partial<typeof enTranslations.systemIncidents>
    securityCenter?: Partial<typeof enTranslations.securityCenter>
    adminAuditLogs?: Omit<Partial<typeof enTranslations.adminAuditLogs>, 'actions'> & {
        actions?: Partial<typeof enTranslations.adminAuditLogs.actions>
    }
    cabinet?: {
        title?: string
        publicList?: Partial<typeof enTranslations.cabinet.publicList>
    }
    profile?: {
        title?: string
        description?: string
        tabs?: Partial<typeof enTranslations.profile.tabs>
        viewMyBookings?: string
        viewMyReviews?: string
        accountDetails?: string
        name?: string
        email?: string
        phone?: string
        authProvider?: string
        role?: string
        status?: string
        createdAt?: string
        preferences?: Partial<typeof enTranslations.profile.preferences>
        privacy?: Partial<typeof enTranslations.profile.privacy>
    }
}

function createPopularLocale(locale: PopularLocale, overrides: LocaleOverrides): typeof enTranslations {
    const longTail = longTailPopular[locale]

    return {
        ...enTranslations,
        common: { ...enTranslations.common, ...overrides.common },
        routeError: { ...enTranslations.routeError, ...longTail.routeError },
        pwa: { ...enTranslations.pwa, ...longTail.pwa },
        navigation: { ...enTranslations.navigation, ...overrides.navigation },
        commission: { ...enTranslations.commission, ...longTail.commission },
        adminLayout: { ...enTranslations.adminLayout, ...longTail.adminLayout },
        auth: { ...enTranslations.auth, ...overrides.auth },
        workspace: { ...enTranslations.workspace, ...overrides.workspace },
        landing: { ...enTranslations.landing, ...overrides.landing },
        autocare: { ...enTranslations.autocare, ...overrides.autocare },
        errors: { ...enTranslations.errors, ...overrides.errors },
        booking: { ...enTranslations.booking, ...overrides.booking },
        favorites: { ...enTranslations.favorites, ...longTail.favorites },
        notifications: { ...enTranslations.notifications, ...longTail.notifications },
        info: {
            ...enTranslations.info,
            help: { ...enTranslations.info.help, ...helpCenterPopular[locale] },
        },
        ownerDashboard: {
            ...enTranslations.ownerDashboard,
            ...overrides.ownerDashboard,
        },
        adminDashboard: {
            ...enTranslations.adminDashboard,
            ...overrides.adminDashboard,
            operatorCenter: {
                ...enTranslations.adminDashboard.operatorCenter,
                ...overrides.adminDashboard?.operatorCenter,
            },
        },
        adminUsers: { ...enTranslations.adminUsers, ...overrides.adminUsers },
        adminOwners: { ...enTranslations.adminOwners, ...overrides.adminOwners },
        adminCabinets: { ...enTranslations.adminCabinets, ...overrides.adminCabinets },
        adminReviews: { ...enTranslations.adminReviews, ...overrides.adminReviews },
        systemIncidents: { ...enTranslations.systemIncidents, ...overrides.systemIncidents },
        securityCenter: { ...enTranslations.securityCenter, ...overrides.securityCenter },
        adminAuditLogs: {
            ...enTranslations.adminAuditLogs,
            ...overrides.adminAuditLogs,
            actions: {
                ...enTranslations.adminAuditLogs.actions,
                ...overrides.adminAuditLogs?.actions,
            },
        },
        cabinet: {
            ...enTranslations.cabinet,
            ...overrides.cabinet,
            publicList: {
                ...enTranslations.cabinet.publicList,
                ...overrides.cabinet?.publicList,
            },
        },
        profile: {
            ...enTranslations.profile,
            ...overrides.profile,
            tabs: {
                ...enTranslations.profile.tabs,
                ...overrides.profile?.tabs,
            },
            preferences: {
                ...enTranslations.profile.preferences,
                ...overrides.profile?.preferences,
            },
            privacy: {
                ...enTranslations.profile.privacy,
                ...overrides.profile?.privacy,
            },
        },
    }
}

const common = { tr: {
        loading: 'Yükleniyor...', loadingPage: 'Sayfa yükleniyor...', error: 'Hata',
        failedToLoad: 'Yüklenemedi.', create: 'Oluştur', edit: 'Düzenle', delete: 'Sil', cancel: 'İptal',
        confirm: 'Onayla', save: 'Kaydet', back: 'Geri', status: 'Durum', actions: 'İşlemler', name: 'Ad',
        email: 'E-posta', saving: 'Kaydediliyor...', close: 'Kapat', dismiss: 'Kapat', language: 'Dil', theme: 'Tema',
        menu: 'Menü', more: 'Daha fazla', switchToDarkTheme: 'Koyu temaya geç', switchToLightTheme: 'Açık temaya geç',
        notProvided: 'Belirtilmedi', tryAgainLater: 'Lütfen daha sonra tekrar deneyin.', retry: 'Tekrar dene',
    } } as const

const navigation = { tr: { home: 'Ana sayfa', features: 'Özellikler', cabinets: 'Odalar', owners: 'Ev sahipleri için', pricing: 'Fiyatlar', about: 'Hakkımızda', profile: 'Profil', myBookings: 'Rezervasyonlarım', favorites: 'Favoriler', notifications: 'Bildirimler', ownerDashboard: 'Sahip paneli', ownerCabinets: 'Odalarım', ownerBookings: 'Rezervasyonlar', ownerServices: 'Hizmetler', adminDashboard: 'Yönetici paneli', adminUsers: 'Kullanıcılar', adminOwners: 'Sahipler', adminCabinets: 'Odalar', adminReviews: 'Yorumlar', adminAuditLogs: 'Denetim kayıtları', ownerDashboardShort: 'Panel', ownerCalendar: 'Takvim' } } as const

const auth = { tr: { signIn: 'Giriş yap', logOut: 'Çıkış yap', createAccount: 'Hesap oluştur', welcomeBack: 'Tekrar hoş geldiniz', signInTitle: 'AutoCare Hub\'ya giriş yap', signInToContinue: 'Devam etmek için giriş yapın.', email: 'E-posta', password: 'Şifre', signingIn: 'Giriş yapılıyor...', failedToSignIn: 'Giriş yapılamadı.', alreadyHaveAccount: 'Zaten hesabınız var mı?', forgotPasswordLink: 'Şifrenizi mi unuttunuz?' } } as const

const workspace = { tr: { client: 'Müşteri çalışma alanı', owner: 'Sahip çalışma alanı', admin: 'Yönetici çalışma alanı', overview: 'Genel bakış', manage: 'Yönet', configure: 'Yapılandır', monitor: 'İzle', support: 'Destek', collapseSidebar: 'Kenar çubuğunu daralt', expandSidebar: 'Kenar çubuğunu genişlet', systemStatus: 'Tüm sistemler çalışıyor' } } as const

const ownerDashboard = { tr: {
        title: 'Kontrol paneli',
        description: 'Odalarınızı, hizmetlerinizi, rezervasyonlarınızı ve operasyonunuzu takip edin.',
        loading: 'Panel yükleniyor...',
        failedToLoad: 'Panel yüklenemedi',
        activeCount: '{{count}} aktif',
        bookingStatusCounts: '{{pending}} bekliyor · {{confirmed}} onaylandı',
        averageCabinetPrice: 'Ortalama oda fiyatı',
        perHour: 'Saatlik',
        upcomingBookings: 'Yaklaşan rezervasyonlar',
        upcomingBookingsDescription: 'Odalarınız için bekleyen ve onaylanan rezervasyonlar.',
        noUpcomingBookings: 'Şu anda yaklaşan rezervasyon yok.',
        activeServices: 'Aktif hizmetler',
        activeServicesDescription: 'Şu anda rezervasyona açık hizmetler.',
        noServices: 'Henüz hizmet oluşturulmadı.',
        viewAll: 'Tümünü gör',
        bookingMeta: 'Oda: {{cabinetId}} · Hizmet: {{serviceId}}',
        serviceMeta: '{{duration}} dk · {{price}}',
        analyticsTitle: 'Rezervasyon performansı',
        analyticsDescription: 'Önümüzdeki 30 gündeki planlı işleri net biçimde görün.',
        projectedRevenue: 'Planlanan gelir',
        bookedHours: 'Rezerve edilen saatler',
        bookingLoad: 'Rezervasyon yükü',
        popularServices: 'Popüler hizmetler',
        noBookingData: 'Müşteriler randevu aldığında rezervasyon verileri burada görünür.',
        mobileRevenue: 'Gelir',
        mobileOccupancy: 'Doluluk',
        mobileToday: 'Bugün',
        mobileAwaitingResponse: 'Yanıtınız bekleniyor',
        mobileBookingExpires: 'Bu rezervasyon yakında sona erecek',
        mobileConfirm: 'Onayla',
        mobileDecline: 'Reddet',
        mobileUpcomingToday: 'Bugünün yaklaşanları',
        mobileViewCalendar: 'Takvimi gör',
        mobileOfflineDraft: 'Bağlantı yeniden kurulduğunda taslak değişiklikler kaydedilir.',
        mobileReviewDraft: 'Taslağı incele',
        mobileAddSpace: 'Oda ekle',
        mobileMySpaces: 'Odalarım',
        clientListTitle: 'Müşteriler',
        clientListDescription: 'Hizmetlerinizden birini rezerve eden müşteriler, en son randevuya göre sıralanır.',
        noClients: 'Henüz sizinle rezervasyon yapan müşteri yok.',
        visits: '{{count}} ziyaret',
        lastBooking: 'Son rezervasyon: {{date}}',
        noOwnerNote: 'Henüz dahili not yok.',
        actionCenter: {
            eyebrow: 'İşlem merkezi',
            title: 'İlginizi gerektiren işler',
            description: 'Bekleyen işleri inceleyin ve çözüm için ilgili çalışma alanını açın.',
            allClear: 'Her şey güncel. Bekleyen iş yok.',
            pendingBookings: 'Bekleyen rezervasyonlar',
            pendingBookingsDescription: 'Onayınızı bekleyen rezervasyonlar.',
            rescheduleRequests: 'Tarih değişikliği istekleri',
            rescheduleRequestsDescription: 'Yeni bir saat için kararınızı bekleyen müşteriler.',
            draftCabinets: 'Taslak odalar',
            draftCabinetsDescription: 'Herkese açık rezervasyona hazır olmayan alanlar.',
            blockedCabinets: 'Engellenen odalar',
            blockedCabinetsDescription: 'İnceleme veya kurulum gerektiren alanlar.',
            readiness: 'Yayına hazırlık',
            readinessDescription: 'Rezervasyon almadan önce kalan kurulumu tamamlayın.',
            olderThan24Hours: '{{count}} 24 saatten eski',
            open: 'Çalışma alanını aç',
        },
    } } as const

const operatorCenterKeys = Object.keys(enTranslations.adminDashboard.operatorCenter) as Array<keyof typeof enTranslations.adminDashboard.operatorCenter>

function createOperatorCenterLocale(values: readonly string[]) {
    return Object.fromEntries(
        operatorCenterKeys.map((key, index) => [key, values[index] ?? enTranslations.adminDashboard.operatorCenter[key]]),
    ) as typeof enTranslations.adminDashboard.operatorCenter
}

const operatorCenter = {
    es: createOperatorCenterLocale([
        'Centro de acciones del operador', 'Trabajo de la plataforma que requiere atención', 'Revisa las señales de seguridad y las incidencias abiertas en un espacio de solo lectura.', 'Cargando señales del operador...', 'No se pudieron cargar las señales del operador', 'Eventos de seguridad abiertos', '{{count}} críticos', 'Incidencias abiertas', 'Incidencias sin resolver actuales', 'Señales bloqueadas', 'Eventos de alta gravedad', 'Últimas 24 horas', 'Atención de la bandeja de salida', '{{deadLetter}} fallos permanentes · {{abandoned}} abandonados', 'Atención de pagos', '{{failed}} pagos fallidos · {{disputes}} disputas activas', 'Cola de acciones priorizadas', 'Elementos de solo lectura con responsable, SLA y enlaces seguros.', '{{count}} de 12 elementos', 'Resumen de cola en vivo', 'Elementos visibles', 'Asignados', 'SLA incumplido', 'Elemento más antiguo', 'No hay acciones sin resolver en la ventana actual.', 'Crítica', 'Alta', 'Advertencia', 'Seguridad', 'Incidencia', 'Bandeja de salida', 'Pagos', 'Pagos fallidos', 'Disputas de pago activas', 'Estado', 'Abierto', 'Reconocido', 'En investigación', 'Entrega fallida', 'Código de motivo', 'Responsable', 'Asignado', 'Sin asignar', 'Antigüedad', '{{count}} min', 'SLA', 'Incumplido', 'Dentro de {{minutes}} min', 'Reconocimiento', 'Sin reconocer', 'Historial de acciones', '{{count}} cambios', 'Abrir espacio relacionado', 'Abrir Centro de seguridad', 'Abrir auditoría e incidencias',
    ]),
    de: createOperatorCenterLocale([
        'Operator-Aktionszentrum', 'Plattformaufgaben mit Handlungsbedarf', 'Sicherheitsmeldungen und offene Vorfälle in einem schreibgeschützten Bereich prüfen.', 'Operatorsignale werden geladen...', 'Operatorsignale konnten nicht geladen werden', 'Offene Sicherheitsereignisse', '{{count}} kritisch', 'Offene Vorfälle', 'Aktuell ungelöste Vorfälle', 'Blockierte Signale', 'Ereignisse mit hoher Schwere', 'Letzte 24 Stunden', 'Outbox-Aufmerksamkeit', '{{deadLetter}} endgültig fehlgeschlagen · {{abandoned}} aufgegeben', 'Zahlungsaufmerksamkeit', '{{failed}} fehlgeschlagene Zahlungen · {{disputes}} aktive Streitfälle', 'Priorisierte Aktionswarteschlange', 'Schreibgeschützte Einträge mit Zuständigkeit, SLA und sicheren Links.', '{{count}} von 12 Einträgen', 'Live-Warteschlangenübersicht', 'Sichtbare Einträge', 'Zugewiesen', 'SLA überschritten', 'Ältester Eintrag', 'Im aktuellen Zeitraum gibt es keine offenen Aktionen.', 'Kritisch', 'Hoch', 'Warnung', 'Sicherheit', 'Vorfall', 'Outbox', 'Zahlungen', 'Fehlgeschlagene Zahlungen', 'Aktive Zahlungsstreitfälle', 'Status', 'Offen', 'Bestätigt', 'Wird untersucht', 'Zustellung fehlgeschlagen', 'Ursachencode', 'Zuständig', 'Zugewiesen', 'Nicht zugewiesen', 'Alter', '{{count}} Min.', 'SLA', 'Überschritten', 'Innerhalb von {{minutes}} Min.', 'Bestätigung', 'Nicht bestätigt', 'Aktionsverlauf', '{{count}} Änderungen', 'Zugehörigen Bereich öffnen', 'Sicherheitszentrum öffnen', 'Audit und Vorfälle öffnen',
    ]),
    fr: createOperatorCenterLocale([
        'Centre d’action opérateur', 'Travail de la plateforme nécessitant une attention', 'Examinez les signaux de sécurité et les incidents ouverts dans un espace en lecture seule.', 'Chargement des signaux opérateur...', 'Impossible de charger les signaux opérateur', 'Événements de sécurité ouverts', '{{count}} critiques', 'Incidents ouverts', 'Incidents non résolus actuels', 'Signaux bloqués', 'Événements de gravité élevée', 'Dernières 24 heures', 'Attention à la file sortante', '{{deadLetter}} échecs définitifs · {{abandoned}} abandonnés', 'Attention aux paiements', '{{failed}} paiements échoués · {{disputes}} litiges actifs', 'File d’actions prioritaires', 'Éléments en lecture seule avec responsable, SLA et liens sûrs.', '{{count}} éléments sur 12', 'Instantané de file en direct', 'Éléments visibles', 'Attribués', 'SLA dépassé', 'Élément le plus ancien', 'Aucune action non résolue dans la période actuelle.', 'Critique', 'Élevée', 'Avertissement', 'Sécurité', 'Incident', 'File sortante', 'Paiements', 'Paiements échoués', 'Litiges de paiement actifs', 'Statut', 'Ouvert', 'Pris en compte', 'En cours d’examen', 'Échec de livraison', 'Code motif', 'Responsable', 'Attribué', 'Non attribué', 'Ancienneté', '{{count}} min', 'SLA', 'Dépassé', 'Dans {{minutes}} min', 'Prise en compte', 'Non pris en compte', 'Historique des actions', '{{count}} modifications', 'Ouvrir l’espace associé', 'Ouvrir le Centre de sécurité', 'Ouvrir les audits et incidents',
    ]),
    pt: createOperatorCenterLocale([
        'Central de ações do operador', 'Trabalho da plataforma que exige atenção', 'Revise sinais de segurança e incidentes abertos em um espaço somente leitura.', 'Carregando sinais do operador...', 'Não foi possível carregar os sinais do operador', 'Eventos de segurança abertos', '{{count}} críticos', 'Incidentes abertos', 'Incidentes não resolvidos atuais', 'Sinais bloqueados', 'Eventos de alta gravidade', 'Últimas 24 horas', 'Atenção à fila de saída', '{{deadLetter}} falhas permanentes · {{abandoned}} abandonados', 'Atenção a pagamentos', '{{failed}} pagamentos falhos · {{disputes}} disputas ativas', 'Fila de ações priorizadas', 'Itens somente leitura com responsável, SLA e links seguros.', '{{count}} de 12 itens', 'Resumo da fila ao vivo', 'Itens visíveis', 'Atribuídos', 'SLA excedido', 'Item mais antigo', 'Não há ações pendentes não resolvidas na janela atual.', 'Crítica', 'Alta', 'Aviso', 'Segurança', 'Incidente', 'Fila de saída', 'Pagamentos', 'Pagamentos falhos', 'Disputas de pagamento ativas', 'Status', 'Aberto', 'Reconhecido', 'Em investigação', 'Falha na entrega', 'Código do motivo', 'Responsável', 'Atribuído', 'Não atribuído', 'Idade', '{{count}} min', 'SLA', 'Excedido', 'Dentro de {{minutes}} min', 'Reconhecimento', 'Não reconhecido', 'Histórico de ações', '{{count}} alterações', 'Abrir espaço relacionado', 'Abrir Central de segurança', 'Abrir auditoria e incidentes',
    ]),
    zh: createOperatorCenterLocale([
        '运营行动中心', '需要处理的平台工作', '在一个只读工作区中查看安全信号和未解决事件。', '正在加载运营信号...', '无法加载运营信号', '未处理的安全事件', '{{count}} 个严重事件', '未解决事件', '当前未解决的事件', '已阻止的信号', '高严重级别事件', '最近 24 小时', '待处理的出站事件', '{{deadLetter}} 个永久失败 · {{abandoned}} 个已放弃', '支付注意事项', '{{failed}} 笔支付失败 · {{disputes}} 个活跃争议', '优先行动队列', '只读项目，包含负责人、SLA 和安全的详情链接。', '12 个项目中的 {{count}} 个', '实时队列摘要', '可见项目', '已分配', 'SLA 已超时', '最早项目', '当前时间窗口没有未解决的行动项目。', '严重', '高', '警告', '安全', '事件', '出站队列', '支付', '支付失败', '活跃支付争议', '状态', '开放', '已确认', '调查中', '投递失败', '原因代码', '负责人', '已分配', '未分配', '时长', '{{count}} 分钟', 'SLA', '已超时', '{{minutes}} 分钟内', '确认', '未确认', '操作历史', '{{count}} 次变更', '打开相关工作区', '打开安全中心', '打开审计和事件',
    ]),
    ja: createOperatorCenterLocale([
        'オペレーターアクションセンター', '対応が必要なプラットフォーム作業', '読み取り専用の画面でセキュリティシグナルと未解決インシデントを確認します。', 'オペレーターシグナルを読み込み中...', 'オペレーターシグナルを読み込めませんでした', '未処理のセキュリティイベント', '{{count}} 件の重大イベント', '未解決インシデント', '現在の未解決インシデント', 'ブロックされたシグナル', '高重大度イベント', '過去24時間', '送信キューの注意事項', '{{deadLetter}} 件の恒久的失敗 · {{abandoned}} 件の放棄', '支払いの注意事項', '{{failed}} 件の支払い失敗 · {{disputes}} 件の有効な異議申し立て', '優先アクションキュー', '担当者、SLA、安全な詳細リンクを含む読み取り専用項目です。', '12件中{{count}}件', 'ライブキュー概要', '表示中の項目', '割り当て済み', 'SLA超過', '最も古い項目', '現在の期間に未解決のアクションはありません。', '重大', '高', '警告', 'セキュリティ', 'インシデント', '送信キュー', '支払い', '支払い失敗', '有効な支払い異議', 'ステータス', 'オープン', '確認済み', '調査中', '配信失敗', '理由コード', '担当者', '割り当て済み', '未割り当て', '経過時間', '{{count}} 分', 'SLA', '超過', '{{minutes}} 分以内', '確認', '未確認', 'アクション履歴', '{{count}} 件の変更', '関連ワークスペースを開く', 'セキュリティセンターを開く', '監査とインシデントを開く',
    ]),
    ko: createOperatorCenterLocale([
        '운영 작업 센터', '주의가 필요한 플랫폼 작업', '읽기 전용 작업 공간에서 보안 신호와 미해결 인시던트를 검토하세요.', '운영 신호를 불러오는 중...', '운영 신호를 불러오지 못했습니다', '열린 보안 이벤트', '{{count}}개 심각', '열린 인시던트', '현재 미해결 인시던트', '차단된 신호', '높은 심각도의 이벤트', '최근 24시간', '아웃박스 주의', '{{deadLetter}}개 영구 실패 · {{abandoned}}개 중단', '결제 주의', '{{failed}}건 결제 실패 · {{disputes}}건 활성 분쟁', '우선 작업 대기열', '담당자, SLA, 안전한 상세 링크가 있는 읽기 전용 항목입니다.', '12개 중 {{count}}개 항목', '실시간 대기열 요약', '표시된 항목', '할당됨', 'SLA 초과', '가장 오래된 항목', '현재 기간에 미해결 작업 항목이 없습니다.', '심각', '높음', '경고', '보안', '인시던트', '아웃박스', '결제', '결제 실패', '활성 결제 분쟁', '상태', '열림', '확인됨', '조사 중', '전달 실패', '사유 코드', '담당자', '할당됨', '미할당', '경과 시간', '{{count}}분', 'SLA', '초과', '{{minutes}}분 이내', '확인', '확인되지 않음', '작업 기록', '{{count}}개 변경', '관련 작업 공간 열기', '보안 센터 열기', '감사 및 인시던트 열기',
    ]),
    ar: createOperatorCenterLocale([
        'مركز إجراءات المشغّل', 'أعمال في المنصة تحتاج إلى الانتباه', 'راجع إشارات الأمان والحوادث المفتوحة في مساحة للقراءة فقط.', 'جار تحميل إشارات المشغّل...', 'تعذر تحميل إشارات المشغّل', 'أحداث الأمان المفتوحة', '{{count}} حرجة', 'الحوادث المفتوحة', 'الحوادث غير المحلولة حاليًا', 'الإشارات المحظورة', 'أحداث عالية الخطورة', 'آخر 24 ساعة', 'تنبيهات صندوق الإرسال', '{{deadLetter}} فشل دائم · {{abandoned}} متروك', 'تنبيهات الدفع', '{{failed}} دفعة فاشلة · {{disputes}} نزاع نشط', 'قائمة الإجراءات ذات الأولوية', 'عناصر للقراءة فقط مع مالك وSLA وروابط آمنة للتفاصيل.', '{{count}} من أصل 12 عنصرًا', 'ملخص قائمة الانتظار المباشر', 'العناصر الظاهرة', 'مُسندة', 'تجاوز SLA', 'أقدم عنصر', 'لا توجد عناصر إجراءات غير محلولة في الفترة الحالية.', 'حرج', 'مرتفع', 'تحذير', 'الأمان', 'حادث', 'صندوق الإرسال', 'المدفوعات', 'عمليات الدفع الفاشلة', 'نزاعات الدفع النشطة', 'الحالة', 'مفتوح', 'تم الإقرار', 'قيد التحقيق', 'فشل التسليم', 'رمز السبب', 'المسؤول', 'مُسند', 'غير مُسند', 'العمر', '{{count}} دقيقة', 'SLA', 'تم التجاوز', 'خلال {{minutes}} دقيقة', 'الإقرار', 'لم يتم الإقرار', 'سجل الإجراءات', '{{count}} تغييرات', 'فتح مساحة العمل المرتبطة', 'فتح مركز الأمان', 'فتح التدقيق والحوادث',
    ]),
    tr: createOperatorCenterLocale([
        'Operatör işlem merkezi', 'İlgi gerektiren platform işleri', 'Güvenlik sinyallerini ve açık olayları salt okunur bir alanda inceleyin.', 'Operatör sinyalleri yükleniyor...', 'Operatör sinyalleri yüklenemedi', 'Açık güvenlik olayları', '{{count}} kritik', 'Açık olaylar', 'Mevcut çözülmemiş olaylar', 'Engellenen sinyaller', 'Yüksek önem dereceli olaylar', 'Son 24 saat', 'Giden kutusu dikkati', '{{deadLetter}} kalıcı hata · {{abandoned}} terk edildi', 'Ödeme dikkati', '{{failed}} başarısız ödeme · {{disputes}} etkin anlaşmazlık', 'Öncelikli işlem kuyruğu', 'Sorumlu, SLA ve güvenli ayrıntı bağlantıları içeren salt okunur öğeler.', '12 öğeden {{count}} tanesi', 'Canlı kuyruk özeti', 'Görünen öğeler', 'Atanan', 'SLA aşıldı', 'En eski öğe', 'Mevcut zaman aralığında çözülmemiş işlem yok.', 'Kritik', 'Yüksek', 'Uyarı', 'Güvenlik', 'Olay', 'Giden kutusu', 'Ödemeler', 'Başarısız ödemeler', 'Etkin ödeme anlaşmazlıkları', 'Durum', 'Açık', 'Onaylandı', 'İnceleniyor', 'Teslim başarısız', 'Neden kodu', 'Sorumlu', 'Atandı', 'Atanmadı', 'Yaş', '{{count}} dk', 'SLA', 'Aşıldı', '{{minutes}} dk içinde', 'Onay', 'Onaylanmadı', 'İşlem geçmişi', '{{count}} değişiklik', 'İlgili çalışma alanını aç', 'Güvenlik merkezini aç', 'Denetim ve olayları aç',
    ]),
    hi: createOperatorCenterLocale([
        'ऑपरेटर कार्रवाई केंद्र', 'प्लेटफ़ॉर्म का ध्यान देने योग्य काम', 'केवल-पठन कार्यक्षेत्र में सुरक्षा संकेतों और खुले मामलों की समीक्षा करें।', 'ऑपरेटर संकेत लोड हो रहे हैं...', 'ऑपरेटर संकेत लोड नहीं हो सके', 'खुले सुरक्षा इवेंट', '{{count}} गंभीर', 'खुले मामले', 'वर्तमान अनसुलझे मामले', 'ब्लॉक किए गए संकेत', 'उच्च गंभीरता वाले इवेंट', 'पिछले 24 घंटे', 'आउटबॉक्स ध्यान', '{{deadLetter}} स्थायी विफल · {{abandoned}} छोड़े गए', 'भुगतान ध्यान', '{{failed}} विफल भुगतान · {{disputes}} सक्रिय विवाद', 'प्राथमिकता वाली कार्रवाई कतार', 'जिम्मेदार व्यक्ति, SLA और सुरक्षित विवरण लिंक वाले केवल-पठन आइटम।', '12 में से {{count}} आइटम', 'लाइव कतार सारांश', 'दिखने वाले आइटम', 'सौंपे गए', 'SLA पार', 'सबसे पुराना आइटम', 'वर्तमान अवधि में कोई अनसुलझी कार्रवाई नहीं है।', 'गंभीर', 'उच्च', 'चेतावनी', 'सुरक्षा', 'मामला', 'आउटबॉक्स', 'भुगतान', 'विफल भुगतान', 'सक्रिय भुगतान विवाद', 'स्थिति', 'खुला', 'स्वीकृत', 'जांच में', 'डिलीवरी विफल', 'कारण कोड', 'जिम्मेदार', 'सौंपा गया', 'सौंपा नहीं गया', 'आयु', '{{count}} मिनट', 'SLA', 'पार हो गया', '{{minutes}} मिनट के भीतर', 'स्वीकृति', 'स्वीकृत नहीं', 'कार्रवाई इतिहास', '{{count}} बदलाव', 'संबंधित कार्यक्षेत्र खोलें', 'सुरक्षा केंद्र खोलें', 'ऑडिट और मामले खोलें',
    ]),
} satisfies Record<PopularLocale, typeof enTranslations.adminDashboard.operatorCenter>

const adminDashboard = { tr: {
        title: 'Yönetici paneli',
        description: 'Kullanıcıları, odaları, platform etkinliğini ve inceleme durumunu izleyin.',
        loading: 'Yönetici paneli yükleniyor...',
        failedToLoad: 'Yönetici paneli yüklenemedi',
        users: 'Kullanıcılar',
        userRoleCounts: '{{clients}} müşteri · {{owners}} sahip · {{admins}} yönetici',
        userStatusCounts: '{{active}} aktif · {{blocked}} engelli',
        activeCount: '{{count}} aktif',
        moderation: 'İnceleme',
        moderationBreakdown: '{{draftCabinets}} taslak oda · {{blockedCabinets}} engelli oda · {{blockedUsers}} engelli kullanıcı',
        averageCabinetPrice: 'Ortalama oda fiyatı',
        perHour: 'Saatlik',
        recentUsers: 'Son kullanıcılar',
        recentUsersDescription: 'Demo verilerindeki sıraya göre en son platform kullanıcıları.',
        recentCabinets: 'Son odalar',
        recentCabinetsDescription: 'İnceleme durumlarıyla birlikte son odalar.',
        noUsers: 'Kullanıcı bulunamadı.',
        noCabinets: 'Oda bulunamadı.',
        viewAll: 'Tümünü gör',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.tr,
    } } as const

const adminOwners = { tr: { description: 'Platform sahiplerini ve hesap erişimini yönetin.', emptyTitle: 'Sahip bulunamadı', emptyDescription: 'Sahipler hesap oluşturduktan sonra burada görünür.' } } as const

const adminCabinets = { tr: {
        title: 'Odalar', description: 'Oda ilanlarını inceleyin ve yönetin.', loading: 'Odalar yükleniyor...', failedToLoad: 'Odalar yüklenemedi', emptyTitle: 'Oda bulunamadı', emptyDescription: 'Platform odaları burada görünecek.', statusUpdatedSuccessfully: 'Oda durumu güncellendi.', statusUpdateFailed: 'Oda durumu güncellenemedi.', blockedSuccessfully: 'Oda engellendi.', blockFailed: 'Oda engellenemedi.', confirmBlockEyebrow: 'Oda engellemesini onayla', confirmBlockTitle: 'Bu oda engellensin mi?', confirmBlockDescription: 'Oda herkese açık listelerden gizlenir ve müşteriler rezervasyon yapamaz.', keepAvailable: 'Kullanılabilir kalsın', confirmBlocking: 'Engellemeyi onayla', blockingAction: 'Engelleniyor...',
    } } as const

const adminReviews = { tr: { title: 'Yorumlar', description: 'Müşteri yorumlarını yayınlanmadan önce yönetin.', loading: 'Yorumlar yükleniyor...', emptyTitle: 'Henüz yorum yok', emptyDescription: 'Müşteri yorumları gönderildikten sonra burada görünür.', statusUpdatedSuccessfully: 'Yorum durumu güncellendi.', statusUpdateFailed: 'Yorum durumu güncellenemedi.', pendingAction: 'İncelemeye geri gönder', approvedAction: 'Onayla', rejectedAction: 'Reddet', deleteAction: 'Sil', deleting: 'Siliniyor...', deletedSuccessfully: 'Yorum silindi.', deleteFailed: 'Yorum silinemedi.', confirmDeleteEyebrow: 'Yorumu sil', confirmDeleteTitle: 'Bu yorum silinsin mi?', confirmDeleteDescription: 'Bu işlem yorumu projeden kalıcı olarak kaldırır.' } } as const

const securityCenter = { tr: { title: 'Güvenlik merkezi', description: 'Süper yönetici çalışma alanında kimlik doğrulama hatalarını, kötüye kullanım sinyallerini, kaynak IP adreslerini, rotaları ve inceleme durumunu görün.', permissionTitle: 'Süper yönetici erişimi gerekli', permissionDescription: 'Bu alan hassas güvenlik telemetrisi içerir ve yalnızca süper yöneticilere açıktır.', loadError: 'Güvenlik telemetrisi yüklenemedi.', exportReport: 'Raporu dışa aktar', timeline: 'İnceleme zaman çizelgesi', assignee: 'Sorumlu', unassigned: 'Atanmamış', assignToMe: 'Bana ata', mitigationsTitle: 'Geçici önlemler', activeMitigations: 'Aktif engeller', topIps: 'En aktif kaynak IP adresleri', topRoutes: 'En çok hedeflenen rotalar', typeFilter: 'Olay türü', allTypes: 'Tüm türler', severityFilter: 'Önem', allSeverities: 'Tüm önem düzeyleri', statusFilter: 'İnceleme durumu', allStatuses: 'Tüm durumlar', eventsTitle: 'Güvenlik etkinliği', empty: 'Bu filtrelerle eşleşen güvenlik olayı yok.', loadMore: 'Daha fazla yükle', loadingMore: 'Daha fazla yükleniyor...', types: { login_failed: 'Başarısız giriş', account_locked: 'Hesap kilitlendi', refresh_token_reuse: 'Yenileme tokenı yeniden kullanımı', rate_limit_exceeded: 'İstek limiti aşıldı', invalid_token: 'Geçersiz token', csrf_violation: 'CSRF ihlali', route_scan: 'Bilinmeyen rota isteği', malformed_request: 'Bozuk istek', oversized_request: 'Büyük istek', privilege_denied: 'Yetki reddedildi', webhook_abuse: 'Webhook kötüye kullanımı', mutation_burst: 'Değişiklik yoğunluğu' }, severities: { info: 'Bilgi', warning: 'Uyarı', high: 'Yüksek', critical: 'Kritik' }, statuses: { open: 'Açık', acknowledged: 'Onaylandı', investigating: 'İnceleniyor', resolved: 'Çözüldü', suppressed: 'Bastırıldı' }, actorRoles: { client: 'Müşteri', owner: 'Sahip', admin: 'Yönetici', super_admin: 'Süper yönetici' }, authOutcomes: { unknown: 'Bilinmiyor', anonymous: 'Anonim', authenticated: 'Kimliği doğrulandı', failed: 'Başarısız' }, rateLimitResults: { not_checked: 'Kontrol edilmedi', allowed: 'İzin verildi', blocked: 'Engellendi' }, proxyProvenances: { unknown: 'Bilinmiyor', direct: 'Doğrudan bağlantı', trusted_proxy: 'Güvenilir proxy', forwarded_header_untrusted: 'Güvenilmeyen iletilen başlık' } } } as const

const systemIncidents = { tr: { tab: 'Sistem olayları', title: 'Sistem olayları', description: 'Operasyon olayları kullanıcı etkinliğinden ayrı tutulur ve burada onaylanıp çözülebilir.', incident: 'Olay', severity: 'Önem', occurrences: 'Oluşumlar', firstSeen: 'İlk görülme', lastSeen: 'Son görülme', requestId: 'İstek kimliği', acknowledge: 'Onayla', resolve: 'Çöz', statusOpen: 'Açık', statusAcknowledged: 'Onaylandı', statusResolved: 'Çözüldü', severityWarning: 'Uyarı', severityCritical: 'Kritik', metadata: 'Meta veriler', showMetadata: 'Meta verileri göster', copyRequestId: 'İstek kimliğini kopyala', copied: 'İstek kimliği kopyalandı', copyFailed: 'İstek kimliği kopyalanamadı.', emptyTitle: 'Aktif olay yok', emptyDescription: 'Sunucu ve operasyon olayları algılandığında burada görünür.', searchPlaceholder: 'Olaylarda ara...', statusFilter: 'Durum', allStatuses: 'Tümü', acknowledgedAt: 'Onaylandı', resolvedAt: 'Çözüldü', loadedCount: '{count} olay yüklendi', loadMore: 'Daha fazla yükle', loadingMore: 'Daha fazla yükleniyor...' } } as const

const adminAuditLogs = { tr: {
        title: 'Denetim günlükleri', description: 'Platformdaki tüm yönetim ve güvenlik işlemlerini takip edin.', timestamp: 'Zaman', actor: 'Yapan', action: 'İşlem', target: 'Hedef', metadata: 'Meta veriler', noLogs: 'Denetim günlüğü bulunamadı.', emptyDescription: 'İşlemler gerçekleştirildiğinde denetim olayları burada görünür.', searchPlaceholder: 'Günlüklerde ara...', export: 'CSV dışa aktar', auditTab: 'Etkinlik denetimi', showMetadata: 'Meta verileri göster', saveFilter: 'Filtreyi kaydet', clearFilter: 'Kayıtlı filtreyi temizle', savedFilter: 'Kayıtlı filtre: {query}', filterSaved: 'Denetim filtresi bu oturum için kaydedildi.', filterCleared: 'Kayıtlı denetim filtresi temizlendi.', loadedCount: '{count} olay yüklendi', loadMore: 'Daha fazla yükle', loadingMore: 'Daha fazla yükleniyor...',
        actions: { user_status_updated: 'Kullanıcı durumu güncellendi', user_role_updated: 'Kullanıcı rolü güncellendi', admin_created: 'Yönetici oluşturuldu', cabinet_status_updated: 'Oda durumu güncellendi', review_moderated: 'Yorum incelendi', review_deleted: 'Yorum silindi', subscription_created: 'Abonelik oluşturuldu', promo_subscription_issued: 'Promosyon aboneliği verildi', login_failed: 'Başarısız giriş denemesi', account_locked: 'Hesap kilitlendi', refresh_token_reuse: 'Yenileme tokenı yeniden kullanıldı', outbox_retried: 'Outbox olayı yeniden denendi', outbox_dead_lettered: 'Outbox olayı başarısız kuyruğuna taşındı', oauth_identity_linked: 'OAuth kimliği bağlandı', oauth_identity_unlinked: 'OAuth kimliği bağlantısı kaldırıldı', account_deletion_requested: 'Hesap silme talep edildi', account_deletion_cancelled: 'Hesap silme iptal edildi', account_deletion_completed: 'Hesap silme tamamlandı', security_events_viewed: 'Güvenlik olayları görüntülendi', security_center_viewed: 'Güvenlik merkezi görüntülendi', security_center_event_status_updated: 'Güvenlik olayı durumu güncellendi', security_center_report_exported: 'Güvenlik inceleme raporu dışa aktarıldı', security_user_sessions_revoked: 'Kullanıcı oturumları Güvenlik Merkezi’nden iptal edildi' },
    } } as const

const adminUsers = { tr: {
        title: 'Kullanıcılar',
        description: 'Kullanıcı durumlarını ve hesap erişimini yönetin.',
        loading: 'Kullanıcılar yükleniyor...',
        failedToLoad: 'Kullanıcılar yüklenemedi',
        emptyTitle: 'Kullanıcı bulunamadı',
        emptyDescription: 'Platform kullanıcıları burada görünür.',
        userColumn: 'Kullanıcı',
        statusUpdatedSuccessfully: 'Kullanıcı durumu güncellendi.',
        statusUpdateFailed: 'Kullanıcı durumu güncellenemedi.',
        blockedSuccessfully: 'Kullanıcı engellendi.',
        blockFailed: 'Kullanıcı engellenemedi.',
        confirmBlockEyebrow: 'Kullanıcı engellemesini onayla',
        confirmBlockTitle: 'Bu kullanıcı engellensin mi?',
        confirmBlockDescription: 'Kullanıcı giriş yapamaz veya korumalı sayfaları kullanamaz.',
        adminStatusRestricted: 'Yönetici hesaplarını yalnızca süper yönetici yönetebilir.',
        keepActive: 'Aktif tut',
        confirmBlocking: 'Engellemeyi onayla',
        blockingAction: 'Engelleniyor...',
        createAdminTitle: 'Yönetici oluştur',
        createAdminDescription: 'Bir yönetici davet edin. Aşağıdaki bağlantıyla şifre oluşturması gerekir.',
        adminCreatedSuccessfully: 'Yönetici başarıyla oluşturuldu.',
        adminCreateFailed: 'Yönetici oluşturulamadı.',
        setupUrlLabel: 'Kurulum bağlantısı',
        setupUrlDescription: 'Yeni yöneticinin şifresini oluşturması için bu bağlantıyı paylaşın.',
        roleUpdatedSuccessfully: 'Kullanıcı rolü güncellendi.',
        roleUpdateFailed: 'Kullanıcı rolü güncellenemedi.',
        roleClient: 'Müşteri',
        roleOwner: 'Sahip',
        roleAdmin: 'Yönetici',
        roleSuperAdmin: 'Süper yönetici',
    } } as const

const mockDashboard = { tr: { dashboardWelcome: 'Hoş geldin Anna!', dashboardSubtitle: 'Her şey kontrol altında.', dashboardBookings: 'Rezervasyonlar', dashboardRequests: 'Yeni talepler', dashboardCabinets: 'Odalar', dashboardReviews: 'Yorumlar', latestBookings: 'Son rezervasyonlar', viewAllBookings: 'Tüm rezervasyonları gör', calendarMonth: 'Mayıs 2025', weekdayMonShort: 'Pzt', weekdayTueShort: 'Sal', weekdayWedShort: 'Çar', weekdayThuShort: 'Per', weekdayFriShort: 'Cum', weekdaySatShort: 'Cmt', weekdaySunShort: 'Paz', loadTitle: 'Oda doluluğu', bookingConfirmed: 'Onaylandı', bookingPending: 'Bekliyor', bookingName1: 'İrem S.', bookingName2: 'Alex O.', bookingName3: 'Ekaterina P.', bookingCabinet1: 'Oda 1', bookingCabinet2: 'Oda 2', bookingCabinet3: 'Oda 3', bookingToday1100: 'Bugün, 11:00', bookingToday1230: 'Bugün, 12:30', bookingTomorrow1000: 'Yarın, 10:00' } } as const

const errors = { tr: { VALIDATION_ERROR: 'Doğrulama başarısız. Formu kontrol edin.', NOT_FOUND: 'İstenen kaynak bulunamadı.', INTERNAL_SERVER_ERROR: 'Bir sorun oluştu. Lütfen daha sonra tekrar deneyin.', BAD_REQUEST: 'Geçersiz istek.', UNAUTHORIZED: 'Devam etmek için giriş yapın.', FORBIDDEN: 'Bu işlemi gerçekleştirme izniniz yok.', CONFLICT: 'Bir çakışma oluştu. Kayıt zaten mevcut olabilir.', TOO_MANY_REQUESTS: 'Çok fazla istek var. Lütfen biraz bekleyin.', CSRF_ORIGIN_MISMATCH: 'Güvenlik kontrolü başarısız oldu.', CSRF_TOKEN_MISMATCH: 'Oturumun süresi doldu veya geçersiz.', EMAIL_VERIFICATION_REQUIRED: 'Bu işlemi yapmak için e-postanızı doğrulayın.', BREACHED_PASSWORD: 'Bilinen bir veri sızıntısında yer almayan bir şifre seçin.' } } as const

const cabinetCatalog = { tr: {
        title: 'Alan',
        publicList: {
            eyebrow: 'Herkese açık katalog', title: 'Uygun alanlar', description: 'Güzellik, sağlık, danışmanlık ve uzman randevuları için aktif alanları keşfedin.', loading: 'Alanlar yükleniyor...', failedToLoad: 'Alanlar yüklenemedi', emptyTitle: 'Alan bulunamadı', emptyDescription: 'Şu anda uygun aktif alan yok.', photoFallback: 'Alan fotoğrafı', from: 'Başlangıç', perHourShort: '/ saat', searchPlaceholder: 'İsim veya şehirle ara...', sortBy: 'Sıralama', sortNewest: 'Yeniler önce', sortPopular: 'Popülerler önce', sortPriceAsc: 'Fiyat: düşükten yükseğe', sortPriceDesc: 'Fiyat: yüksekten düşüğe', advancedFilters: 'Filtreler', cityLabel: 'Şehir', cityPlaceholder: 'Herhangi bir şehir', categoryLabel: 'Kategori', allCategories: 'Tüm kategoriler', categoryBeauty: 'Güzellik', categoryMedical: 'Sağlık', categoryConsultation: 'Danışmanlık', categoryWellness: 'Wellness', categoryOffice: 'Ofis', priceRangeLabel: 'Saatlik fiyat', minPrice: 'En az', maxPrice: 'En fazla', ratingLabel: 'Puan', anyRating: 'Tüm puanlar', stars: 'yıldız', serviceLabel: 'Hizmet', servicePlaceholder: 'ör. masaj', availableToday: 'Bugün uygun', clearFilters: 'Filtreleri temizle', resultsEyebrow: 'Uygunluğa göre keşfedin', resultsTitle: 'Yakınınızdaki alanlar', resultsCount: '{{count}} alan bulundu', viewMode: 'Katalog görünümü', splitView: 'Liste + harita', listView: 'Liste', mapView: 'Harita', backToSplitView: 'Liste ve haritaya dön', view: 'Detayları gör', imageAlt: '{{title}} iç mekânı', todayAvailability: 'Bugün', freeSlots: '{{count}} zaman kaldı', mapTitle: 'Bölge haritası', mapApproximate: 'Yaklaşık bölge görünümü. Kesin adres alan sayfasında gösterilir.', mapZoomIn: 'Yakınlaştır', mapZoomOut: 'Uzaklaştır', mapCurrentLocation: 'Konumumu kullan', mapLocationLoading: 'Konumunuz bulunuyor...', mapLocationFound: 'Harita konumunuza ortalandı.', mapLocationError: 'Konum kullanılamıyor. Harita yaklaşık olarak kalır.', mapTileError: 'Harita verileri geçici olarak kullanılamıyor. Listeyi kullanın veya haritayı dışarıda açın.', openMap: 'Haritayı aç', selectedCabinet: 'Seçili alan',
        },
    } } as const

const profilePrivacy = { tr: {
        title: 'Veriler ve gizlilik',
        description: 'AutoCare Hub verilerinin bir kopyasını ve hesap silme talebini yönetin.',
        exportTitle: 'Verilerimi dışa aktar',
        exportDescription: 'Hesabınızın, rezervasyonlarınızın, bildirimlerinizin, favorilerinizin ve odalarınızın sınırlı JSON kopyasını indirin.',
        exportAction: 'Verileri indir',
        exporting: 'Dışa aktarma hazırlanıyor...',
        exportSuccess: 'Veri dışa aktarmanız hazır.',
        exportError: 'Verileriniz dışa aktarılamadı.',
        deletionTitle: 'Hesabımı sil',
        deletionDescription: 'İnceleme için hesap silme talebi gönderin. Finansal ve rezervasyon kayıtları saklama politikasına tabidir.',
        requestAction: 'Silme talebi gönder',
        reasonLabel: 'Neden (isteğe bağlı)',
        reasonPlaceholder: 'Neden ayrıldığınızı anlatın',
        confirmRequest: 'Talebi gönder',
        requestPending: 'Hesap silme talebi incelenmeyi bekliyor.',
        requestedAt: 'Talep tarihi: {{date}}',
        cancelRequest: 'Talebi iptal et',
        cancelConfirm: 'Bekleyen hesap silme talebi iptal edilsin mi?',
        requestSuccess: 'Hesap silme talebi gönderildi.',
        requestError: 'Hesap silme talebi gönderilemedi.',
        cancelSuccess: 'Hesap silme talebi iptal edildi.',
        cancelError: 'Hesap silme talebi iptal edilemedi.',
    } } as const

const booking = { tr: {
        title: 'Rezervasyonlar', myBookings: 'Rezervasyonlarım', noBookingsYet: 'Henüz rezervasyon yok', loadingBookings: 'Rezervasyonlar yükleniyor...', failedToLoadBookings: 'Rezervasyonlar yüklenemedi.', upcoming: 'Yaklaşan', cancelled: 'İptal edildi', completed: 'Tamamlandı', cancelBooking: 'Rezervasyonu iptal et', confirmCancellation: 'İptali onayla', cancelThisBooking: 'Bu rezervasyon iptal edilsin mi?', keepBooking: 'Rezervasyonu koru', cancelling: 'İptal ediliyor...', bookingCancelledSuccessfully: 'Rezervasyon iptal edildi.', failedToCancelBooking: 'Rezervasyon iptal edilemedi.', bookThisCabinet: 'Bu alanı rezerve et', chooseServiceAndTime: 'Bir hizmet ve uygun zaman seçin.', selectService: 'Hizmet seç', selectDate: '2. Tarih seç', selectTime: '3. Saat seç', noAvailableTimes: 'Bu tarih için uygun saat yok.', createBooking: 'Rezervasyon oluştur', creatingBooking: 'Rezervasyon oluşturuluyor...', bookingCreatedSuccessfully: 'Rezervasyon oluşturuldu.', successTitle: 'Zamanınız rezerve edildi', viewMyBookings: 'Rezervasyonlarımı gör', openDirections: 'Yol tarifini aç', pendingStatusLabel: 'Bekliyor', confirmedStatusLabel: 'Onaylandı', cancelledStatusLabel: 'İptal edildi', completedStatusLabel: 'Tamamlandı',
    } } as const

export const trTranslations = createPopularLocale('tr', { common: common.tr, navigation: navigation.tr, auth: auth.tr, workspace: workspace.tr, ownerDashboard: ownerDashboard.tr, adminDashboard: adminDashboard.tr, adminUsers: adminUsers.tr, adminOwners: adminOwners.tr, adminCabinets: adminCabinets.tr, adminReviews: adminReviews.tr, adminAuditLogs: adminAuditLogs.tr, systemIncidents: systemIncidents.tr, securityCenter: securityCenter.tr, errors: errors.tr, booking: booking.tr, cabinet: cabinetCatalog.tr, profile: { privacy: profilePrivacy.tr }, landing: { ...landingExtraPopular.tr, ...landingPopular.tr, ...mockDashboard.tr, eyebrow: 'Alan kiralama için rezervasyon CRM', title: 'Odaları, hizmetleri ve rezervasyonları tek yerden yönetin.', description: 'AutoCare Hub müşterilerin rezervasyon yapmasına, sahiplerin ilanlarını yönetmesine yardımcı olur.' } })
