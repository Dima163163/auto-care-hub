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

const common = { ar: {
        loading: 'جار التحميل...', loadingPage: 'جار تحميل الصفحة...', error: 'خطأ',
        failedToLoad: 'تعذر التحميل.', create: 'إنشاء', edit: 'تعديل', delete: 'حذف', cancel: 'إلغاء',
        confirm: 'تأكيد', save: 'حفظ', back: 'رجوع', status: 'الحالة', actions: 'الإجراءات', name: 'الاسم',
        email: 'البريد الإلكتروني', saving: 'جار الحفظ...', close: 'إغلاق', dismiss: 'تجاهل', language: 'اللغة',
        theme: 'المظهر', menu: 'القائمة', more: 'المزيد', switchToDarkTheme: 'التبديل إلى المظهر الداكن',
        switchToLightTheme: 'التبديل إلى المظهر الفاتح', notProvided: 'غير متوفر', tryAgainLater: 'يرجى المحاولة لاحقًا.', retry: 'إعادة المحاولة',
    } } as const

const navigation = { ar: { home: 'الرئيسية', features: 'المزايا', cabinets: 'المساحات', owners: 'للمالكين', pricing: 'الأسعار', about: 'حول المنصة', profile: 'الملف الشخصي', myBookings: 'حجوزاتي', favorites: 'المفضلة', notifications: 'الإشعارات', ownerDashboard: 'لوحة المالك', ownerCabinets: 'مساحاتي', ownerBookings: 'الحجوزات', ownerServices: 'الخدمات', adminDashboard: 'لوحة الإدارة', adminUsers: 'المستخدمون', adminOwners: 'المالكون', adminCabinets: 'المساحات', adminReviews: 'التقييمات', adminAuditLogs: 'سجلات التدقيق', ownerDashboardShort: 'لوحة التحكم', ownerCalendar: 'التقويم' } } as const

const auth = { ar: { signIn: 'تسجيل الدخول', logOut: 'تسجيل الخروج', createAccount: 'إنشاء حساب', welcomeBack: 'مرحبًا بعودتك', signInTitle: 'تسجيل الدخول إلى AutoCare Hub', signInToContinue: 'سجّل الدخول للمتابعة.', email: 'البريد الإلكتروني', password: 'كلمة المرور', signingIn: 'جار تسجيل الدخول...', failedToSignIn: 'تعذر تسجيل الدخول.', alreadyHaveAccount: 'لديك حساب بالفعل؟', forgotPasswordLink: 'هل نسيت كلمة المرور؟' } } as const

const workspace = { ar: { client: 'مساحة العميل', owner: 'مساحة المالك', admin: 'مساحة الإدارة', overview: 'نظرة عامة', manage: 'إدارة', configure: 'إعداد', monitor: 'مراقبة', support: 'الدعم', collapseSidebar: 'طي الشريط الجانبي', expandSidebar: 'توسيع الشريط الجانبي', systemStatus: 'جميع الأنظمة تعمل' } } as const

const ownerDashboard = { ar: {
        title: 'لوحة التحكم',
        description: 'تابع المساحات والخدمات والحجوزات والنشاط التشغيلي.',
        loading: 'جار تحميل لوحة التحكم...',
        failedToLoad: 'تعذر تحميل لوحة التحكم',
        activeCount: '{{count}} نشط',
        bookingStatusCounts: '{{pending}} معلقة · {{confirmed}} مؤكدة',
        averageCabinetPrice: 'متوسط سعر المساحة',
        perHour: 'بالساعة',
        upcomingBookings: 'الحجوزات القادمة',
        upcomingBookingsDescription: 'الحجوزات المعلقة والمؤكدة لمساحاتك.',
        noUpcomingBookings: 'لا توجد حجوزات قادمة الآن.',
        activeServices: 'الخدمات النشطة',
        activeServicesDescription: 'الخدمات المتاحة للحجز حاليًا.',
        noServices: 'لم يتم إنشاء خدمات بعد.',
        viewAll: 'عرض الكل',
        bookingMeta: 'المساحة: {{cabinetId}} · الخدمة: {{serviceId}}',
        serviceMeta: '{{duration}} دقيقة · {{price}}',
        analyticsTitle: 'أداء الحجوزات',
        analyticsDescription: 'عرض واضح للعمل المجدول خلال الثلاثين يومًا القادمة.',
        projectedRevenue: 'الإيرادات المجدولة',
        bookedHours: 'الساعات المحجوزة',
        bookingLoad: 'حجم الحجوزات',
        popularServices: 'الخدمات الشائعة',
        noBookingData: 'ستظهر بيانات الحجوزات بعد أن يحجز العملاء مواعيدهم.',
        mobileRevenue: 'الإيرادات',
        mobileOccupancy: 'الإشغال',
        mobileToday: 'اليوم',
        mobileAwaitingResponse: 'بانتظار ردك',
        mobileBookingExpires: 'ستنتهي صلاحية هذا الحجز قريبًا',
        mobileConfirm: 'تأكيد',
        mobileDecline: 'رفض',
        mobileUpcomingToday: 'القادم اليوم',
        mobileViewCalendar: 'عرض التقويم',
        mobileOfflineDraft: 'سيتم حفظ تغييرات المسودة عند عودة الاتصال.',
        mobileReviewDraft: 'مراجعة المسودة',
        mobileAddSpace: 'إضافة مساحة',
        mobileMySpaces: 'مساحاتي',
        clientListTitle: 'العملاء',
        clientListDescription: 'العملاء الذين حجزوا إحدى خدماتك، مرتبين حسب أحدث موعد.',
        noClients: 'لم يحجز أي عميل معك بعد.',
        visits: '{{count}} زيارات',
        lastBooking: 'آخر حجز: {{date}}',
        noOwnerNote: 'لا توجد ملاحظة داخلية بعد.',
        actionCenter: {
            eyebrow: 'مركز الإجراءات',
            title: 'مهام تحتاج إلى انتباهك',
            description: 'راجع المهام المعلقة وافتح مساحة العمل المناسبة لحلها مباشرة.',
            allClear: 'كل شيء محدث. لا توجد مهام معلقة.',
            pendingBookings: 'حجوزات معلقة',
            pendingBookingsDescription: 'حجوزات تنتظر تأكيدك.',
            rescheduleRequests: 'طلبات إعادة الجدولة',
            rescheduleRequestsDescription: 'عملاء ينتظرون قرارًا بشأن وقت جديد.',
            draftCabinets: 'مساحات مسودة',
            draftCabinetsDescription: 'مساحات لم تصبح جاهزة للحجز العام بعد.',
            blockedCabinets: 'مساحات محظورة',
            blockedCabinetsDescription: 'مساحات تحتاج إلى مراجعة أو إعداد.',
            readiness: 'الجاهزية للإطلاق',
            readinessDescription: 'أكمل الإعدادات المتبقية قبل قبول الحجوزات.',
            olderThan24Hours: '{{count}} أقدم من 24 ساعة',
            open: 'فتح مساحة العمل',
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

const adminDashboard = { ar: {
        title: 'لوحة الإدارة',
        description: 'راقب المستخدمين والمساحات ونشاط المنصة وحالة المراجعة.',
        loading: 'جار تحميل لوحة الإدارة...',
        failedToLoad: 'تعذر تحميل لوحة الإدارة',
        users: 'المستخدمون',
        userRoleCounts: '{{clients}} عملاء · {{owners}} مالكون · {{admins}} إداريون',
        userStatusCounts: '{{active}} نشط · {{blocked}} محظور',
        activeCount: '{{count}} نشط',
        moderation: 'المراجعة',
        moderationBreakdown: '{{draftCabinets}} مساحات مسودة · {{blockedCabinets}} محظورة · {{blockedUsers}} مستخدمون محظورون',
        averageCabinetPrice: 'متوسط سعر المساحة',
        perHour: 'بالساعة',
        recentUsers: 'المستخدمون الجدد',
        recentUsersDescription: 'أحدث مستخدمي المنصة حسب بيانات العرض.',
        recentCabinets: 'المساحات الجديدة',
        recentCabinetsDescription: 'أحدث المساحات مع حالات المراجعة.',
        noUsers: 'لم يتم العثور على مستخدمين.',
        noCabinets: 'لم يتم العثور على مساحات.',
        viewAll: 'عرض الكل',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.ar,
    } } as const

const adminOwners = { ar: { description: 'أدر مالكي المنصة والوصول إلى حساباتهم.', emptyTitle: 'لم يتم العثور على مالكين', emptyDescription: 'سيظهر المالكون هنا بعد إنشاء حساب.' } } as const

const adminCabinets = { ar: {
        title: 'المساحات', description: 'راجع إعلانات المساحات وأدرها.', loading: 'جارٍ تحميل المساحات...', failedToLoad: 'تعذر تحميل المساحات', emptyTitle: 'لم يتم العثور على مساحات', emptyDescription: 'ستظهر مساحات المنصة هنا.', statusUpdatedSuccessfully: 'تم تحديث حالة المساحة.', statusUpdateFailed: 'تعذر تحديث حالة المساحة.', blockedSuccessfully: 'تم حظر المساحة.', blockFailed: 'تعذر حظر المساحة.', confirmBlockEyebrow: 'تأكيد حظر المساحة', confirmBlockTitle: 'هل تريد حظر هذه المساحة؟', confirmBlockDescription: 'ستُخفى المساحة من القوائم العامة ولن يتمكن العملاء من حجزها.', keepAvailable: 'الإبقاء عليها متاحة', confirmBlocking: 'تأكيد الحظر', blockingAction: 'جارٍ الحظر...',
    } } as const

const adminReviews = { ar: { title: 'التقييمات', description: 'راجع تقييمات العملاء قبل نشرها.', loading: 'جارٍ تحميل التقييمات...', emptyTitle: 'لا توجد تقييمات بعد', emptyDescription: 'ستظهر تقييمات العملاء هنا بعد إرسالها.', statusUpdatedSuccessfully: 'تم تحديث حالة التقييم.', statusUpdateFailed: 'تعذر تحديث حالة التقييم.', pendingAction: 'إعادة إلى المراجعة', approvedAction: 'موافقة', rejectedAction: 'رفض', deleteAction: 'حذف', deleting: 'جارٍ الحذف...', deletedSuccessfully: 'تم حذف التقييم.', deleteFailed: 'تعذر حذف التقييم.', confirmDeleteEyebrow: 'حذف التقييم', confirmDeleteTitle: 'هل تريد حذف هذا التقييم؟', confirmDeleteDescription: 'سيؤدي هذا الإجراء إلى حذف التقييم نهائيًا من المشروع.' } } as const

const securityCenter = { ar: { title: 'مركز الأمان', description: 'راجع فشل المصادقة وإشارات إساءة الاستخدام وعناوين IP المصدر والمسارات وحالة التحقيق في مساحة المشرف العام.', permissionTitle: 'يلزم وصول المشرف العام', permissionDescription: 'تعرض هذه المساحة بيانات أمان حساسة ومتاحة للمشرف العام فقط.', loadError: 'تعذر تحميل بيانات الأمان.', exportReport: 'تصدير التقرير', timeline: 'الخط الزمني للتحقيق', assignee: 'المسؤول', unassigned: 'غير مُعيّن', assignToMe: 'تعييني', mitigationsTitle: 'إجراءات مؤقتة', activeMitigations: 'عمليات الحظر النشطة', topIps: 'عناوين IP المصدر الأكثر نشاطًا', topRoutes: 'المسارات الأكثر استهدافًا', typeFilter: 'نوع الحدث', allTypes: 'كل الأنواع', severityFilter: 'الخطورة', allSeverities: 'كل مستويات الخطورة', statusFilter: 'حالة التحقيق', allStatuses: 'كل الحالات', eventsTitle: 'نشاط الأمان', empty: 'لا تتطابق أي أحداث أمان مع هذه الفلاتر.', loadMore: 'تحميل المزيد', loadingMore: 'جارٍ تحميل المزيد...', types: { login_failed: 'فشل تسجيل الدخول', account_locked: 'الحساب مقفل', refresh_token_reuse: 'إعادة استخدام رمز التحديث', rate_limit_exceeded: 'تجاوز حد الطلبات', invalid_token: 'رمز غير صالح', csrf_violation: 'انتهاك CSRF', route_scan: 'طلب لمسار غير معروف', malformed_request: 'طلب مشوه', oversized_request: 'طلب كبير جدًا', privilege_denied: 'تم رفض الصلاحية', webhook_abuse: 'إساءة استخدام webhook', mutation_burst: 'دفعة تغييرات' }, severities: { info: 'معلومات', warning: 'تحذير', high: 'مرتفع', critical: 'حرج' }, statuses: { open: 'مفتوح', acknowledged: 'تم التأكيد', investigating: 'قيد التحقيق', resolved: 'تم الحل', suppressed: 'مُخفى' }, actorRoles: { client: 'عميل', owner: 'مالك', admin: 'مشرف', super_admin: 'مشرف عام' }, authOutcomes: { unknown: 'غير معروف', anonymous: 'مجهول', authenticated: 'تمت المصادقة', failed: 'فشل' }, rateLimitResults: { not_checked: 'لم يتم التحقق', allowed: 'مسموح', blocked: 'محظور' }, proxyProvenances: { unknown: 'غير معروف', direct: 'اتصال مباشر', trusted_proxy: 'وكيل موثوق', forwarded_header_untrusted: 'رأس إعادة توجيه غير موثوق' } } } as const

const systemIncidents = { ar: { tab: 'حوادث النظام', title: 'حوادث النظام', description: 'تُفصل الأحداث التشغيلية عن نشاط المستخدم ويمكن تأكيدها أو حلها هنا.', incident: 'حادث', severity: 'الخطورة', occurrences: 'مرات الحدوث', firstSeen: 'أول ظهور', lastSeen: 'آخر ظهور', requestId: 'معرّف الطلب', acknowledge: 'تأكيد', resolve: 'حل', statusOpen: 'مفتوح', statusAcknowledged: 'تم التأكيد', statusResolved: 'تم الحل', severityWarning: 'تحذير', severityCritical: 'حرج', metadata: 'البيانات الوصفية', showMetadata: 'عرض البيانات الوصفية', copyRequestId: 'نسخ معرّف الطلب', copied: 'تم نسخ معرّف الطلب', copyFailed: 'تعذر نسخ معرّف الطلب.', emptyTitle: 'لا توجد حوادث نشطة', emptyDescription: 'ستظهر حوادث الخادم والتشغيل هنا عند اكتشافها.', searchPlaceholder: 'البحث في الحوادث...', statusFilter: 'الحالة', allStatuses: 'الكل', acknowledgedAt: 'تم التأكيد', resolvedAt: 'تم الحل', loadedCount: 'تم تحميل {count} حادثًا', loadMore: 'تحميل المزيد', loadingMore: 'جارٍ التحميل...' } } as const

const adminAuditLogs = { ar: {
        title: 'سجلات التدقيق', description: 'تتبع جميع الإجراءات الإدارية والأمنية على المنصة.', timestamp: 'الوقت', actor: 'المنفذ', action: 'الإجراء', target: 'الهدف', metadata: 'البيانات الوصفية', noLogs: 'لم يتم العثور على سجلات تدقيق.', emptyDescription: 'ستظهر أحداث التدقيق هنا عند تنفيذ الإجراءات.', searchPlaceholder: 'البحث في السجلات...', export: 'تصدير CSV', auditTab: 'تدقيق النشاط', showMetadata: 'عرض البيانات الوصفية', saveFilter: 'حفظ الفلتر', clearFilter: 'مسح الفلتر المحفوظ', savedFilter: 'الفلتر المحفوظ: {query}', filterSaved: 'تم حفظ فلتر التدقيق لهذه الجلسة.', filterCleared: 'تم مسح فلتر التدقيق المحفوظ.', loadedCount: 'تم تحميل {count} حدثًا', loadMore: 'تحميل المزيد', loadingMore: 'جارٍ تحميل المزيد...',
        actions: { user_status_updated: 'تم تحديث حالة المستخدم', user_role_updated: 'تم تحديث دور المستخدم', admin_created: 'تم إنشاء المشرف', cabinet_status_updated: 'تم تحديث حالة المساحة', review_moderated: 'تمت مراجعة التقييم', review_deleted: 'تم حذف التقييم', subscription_created: 'تم إنشاء الاشتراك', promo_subscription_issued: 'تم إصدار اشتراك ترويجي', login_failed: 'فشلت محاولة تسجيل الدخول', account_locked: 'تم قفل الحساب', refresh_token_reuse: 'تم اكتشاف إعادة استخدام رمز التحديث', outbox_retried: 'تمت إعادة محاولة حدث الصندوق الصادر', outbox_dead_lettered: 'تم نقل حدث الصندوق الصادر إلى قائمة الفشل', oauth_identity_linked: 'تم ربط هوية OAuth', oauth_identity_unlinked: 'تم إلغاء ربط هوية OAuth', account_deletion_requested: 'طُلب حذف الحساب', account_deletion_cancelled: 'أُلغي حذف الحساب', account_deletion_completed: 'اكتمل حذف الحساب', security_events_viewed: 'تم عرض أحداث الأمان', security_center_viewed: 'تم عرض مركز الأمان', security_center_event_status_updated: 'تم تحديث حالة حدث الأمان', security_center_report_exported: 'تم تصدير تقرير التحقيق الأمني', security_user_sessions_revoked: 'تم إلغاء جلسات المستخدم من مركز الأمان' },
    } } as const

const adminUsers = { ar: {
        title: 'المستخدمون',
        description: 'أدر حالات المستخدمين والوصول إلى الحسابات.',
        loading: 'جار تحميل المستخدمين...',
        failedToLoad: 'تعذر تحميل المستخدمين',
        emptyTitle: 'لم يتم العثور على مستخدمين',
        emptyDescription: 'سيظهر مستخدمو المنصة هنا.',
        userColumn: 'المستخدم',
        statusUpdatedSuccessfully: 'تم تحديث حالة المستخدم.',
        statusUpdateFailed: 'تعذر تحديث حالة المستخدم.',
        blockedSuccessfully: 'تم حظر المستخدم.',
        blockFailed: 'تعذر حظر المستخدم.',
        confirmBlockEyebrow: 'تأكيد حظر المستخدم',
        confirmBlockTitle: 'هل تريد حظر هذا المستخدم؟',
        confirmBlockDescription: 'لن يتمكن المستخدم من تسجيل الدخول أو استخدام الصفحات المحمية.',
        adminStatusRestricted: 'يمكن للمشرف العام فقط إدارة حسابات المشرفين.',
        keepActive: 'الإبقاء نشطًا',
        confirmBlocking: 'تأكيد الحظر',
        blockingAction: 'جار الحظر...',
        createAdminTitle: 'إنشاء مشرف',
        createAdminDescription: 'ادعُ مشرفًا جديدًا. سيحتاج إلى إعداد كلمة مرور باستخدام الرابط أدناه.',
        adminCreatedSuccessfully: 'تم إنشاء المشرف بنجاح.',
        adminCreateFailed: 'تعذر إنشاء المشرف.',
        setupUrlLabel: 'رابط الإعداد',
        setupUrlDescription: 'شارك هذا الرابط مع المشرف الجديد ليقوم بإعداد كلمة المرور.',
        roleUpdatedSuccessfully: 'تم تحديث دور المستخدم.',
        roleUpdateFailed: 'تعذر تحديث دور المستخدم.',
        roleClient: 'عميل',
        roleOwner: 'مالك',
        roleAdmin: 'مشرف',
        roleSuperAdmin: 'مشرف عام',
    } } as const

const mockDashboard = { ar: { dashboardWelcome: 'مرحبًا آنا!', dashboardSubtitle: 'كل شيء تحت السيطرة.', dashboardBookings: 'الحجوزات', dashboardRequests: 'الطلبات الجديدة', dashboardCabinets: 'المساحات', dashboardReviews: 'التقييمات', latestBookings: 'أحدث الحجوزات', viewAllBookings: 'عرض كل الحجوزات', calendarMonth: 'مايو 2025', weekdayMonShort: 'اثن', weekdayTueShort: 'ثلا', weekdayWedShort: 'أرب', weekdayThuShort: 'خمي', weekdayFriShort: 'جمع', weekdaySatShort: 'سبت', weekdaySunShort: 'أحد', loadTitle: 'إشغال المساحات', bookingConfirmed: 'مؤكد', bookingPending: 'قيد الانتظار', bookingName1: 'إيرينا S.', bookingName2: 'أليكس O.', bookingName3: 'إيكاترينا P.', bookingCabinet1: 'المساحة 1', bookingCabinet2: 'المساحة 2', bookingCabinet3: 'المساحة 3', bookingToday1100: 'اليوم، 11:00', bookingToday1230: 'اليوم، 12:30', bookingTomorrow1000: 'غدًا، 10:00' } } as const

const errors = { ar: { VALIDATION_ERROR: 'فشل التحقق. يرجى مراجعة النموذج.', NOT_FOUND: 'لم يتم العثور على المورد المطلوب.', INTERNAL_SERVER_ERROR: 'حدث خطأ. يرجى المحاولة لاحقًا.', BAD_REQUEST: 'الطلب غير صالح.', UNAUTHORIZED: 'سجّل الدخول للمتابعة.', FORBIDDEN: 'ليس لديك صلاحية لتنفيذ هذا الإجراء.', CONFLICT: 'حدث تعارض. قد يكون السجل موجودًا بالفعل.', TOO_MANY_REQUESTS: 'طلبات كثيرة جدًا. يرجى المحاولة ببطء.', CSRF_ORIGIN_MISMATCH: 'فشل التحقق الأمني.', CSRF_TOKEN_MISMATCH: 'انتهت الجلسة أو أصبحت غير صالحة.', EMAIL_VERIFICATION_REQUIRED: 'يرجى تأكيد بريدك لتنفيذ هذا الإجراء.', BREACHED_PASSWORD: 'اختر كلمة مرور لم تظهر في تسريب بيانات معروف.' } } as const

const cabinet = { ar: {
        title: 'مساحة',
        publicList: {
            eyebrow: 'الفهرس العام',
            title: 'المساحات المتاحة',
            description: 'تصفح المساحات النشطة للجمال والطب والاستشارات والمواعيد الخاصة.',
            loading: 'جار تحميل المساحات...',
            failedToLoad: 'تعذر تحميل المساحات',
            emptyTitle: 'لم يتم العثور على مساحات',
            emptyDescription: 'لا توجد مساحات نشطة متاحة الآن.',
            photoFallback: 'صورة المساحة',
            from: 'ابتداءً من',
            perHourShort: '/ الساعة',
            searchPlaceholder: 'ابحث بالاسم أو المدينة...',
            sortBy: 'ترتيب حسب',
            sortNewest: 'الأحدث أولًا',
            sortPopular: 'الأكثر شيوعًا',
            sortPriceAsc: 'السعر: من الأقل إلى الأعلى',
            sortPriceDesc: 'السعر: من الأعلى إلى الأقل',
            advancedFilters: 'الفلاتر',
            cityLabel: 'المدينة',
            cityPlaceholder: 'أي مدينة',
            categoryLabel: 'الفئة',
            allCategories: 'كل الفئات',
            categoryBeauty: 'الجمال',
            categoryMedical: 'الطب',
            categoryConsultation: 'الاستشارات',
            categoryWellness: 'العافية',
            categoryOffice: 'المكتب',
            priceRangeLabel: 'السعر بالساعة',
            minPrice: 'من',
            maxPrice: 'إلى',
            ratingLabel: 'التقييم',
            anyRating: 'أي تقييم',
            stars: 'نجوم',
            serviceLabel: 'الخدمة',
            servicePlaceholder: 'مثل: تدليك',
            availableToday: 'متاح اليوم',
            clearFilters: 'مسح الفلاتر',
            resultsEyebrow: 'اكتشاف يعتمد على التوافر',
            resultsTitle: 'مساحات بالقرب منك',
            resultsCount: '{{count}} مساحة متاحة',
            viewMode: 'طريقة عرض الفهرس',
            splitView: 'القائمة + الخريطة',
            listView: 'قائمة',
            mapView: 'خريطة',
            backToSplitView: 'العودة إلى القائمة والخريطة',
            view: 'عرض التفاصيل',
            imageAlt: '{{title}} من الداخل',
            todayAvailability: 'اليوم',
            freeSlots: '{{count}} مواعيد متبقية',
            mapTitle: 'خريطة المنطقة',
            mapApproximate: 'عرض تقريبي للمنطقة. يظهر العنوان الدقيق في صفحة المساحة.',
            mapZoomIn: 'تكبير الخريطة',
            mapZoomOut: 'تصغير الخريطة',
            mapCurrentLocation: 'استخدام موقعي الحالي',
            mapLocationLoading: 'جار العثور على موقعك...',
            mapLocationFound: 'تم توسيط الخريطة على موقعك.',
            mapLocationError: 'الموقع غير متاح. الخريطة تقريبية.',
            mapTileError: 'خرائط المنطقة غير متاحة مؤقتًا. استخدم القائمة أو افتح الخريطة خارجيًا.',
            openMap: 'فتح الخريطة',
            selectedCabinet: 'المساحة المحددة',
        },
    } } as const

const profile = { ar: {
        title: 'ملفي الشخصي',
        description: 'اطّلع على تفاصيل حسابك ومعلومات مساحة الحجوزات.',
        tabs: {
            general: 'عام',
            security: 'الأمان',
            sessions: 'الجلسات',
        },
        viewMyBookings: 'عرض حجوزاتي',
        viewMyReviews: 'عرض تقييماتي',
        accountDetails: 'تفاصيل الحساب',
        name: 'الاسم',
        email: 'البريد الإلكتروني',
        phone: 'الهاتف',
        authProvider: 'طريقة تسجيل الدخول',
        role: 'الدور',
        status: 'الحالة',
        createdAt: 'تاريخ الإنشاء',
        preferences: {
            title: 'الإشعارات',
            description: 'تحكم في طريقة تواصلنا معك بشأن حجوزاتك.',
            emailNotifications: 'إشعارات البريد الإلكتروني',
            emailNotificationsDesc: 'استلم رسائل عند إنشاء حجوزاتك أو تأكيدها أو إلغائها.',
            bookingEmailNotifications: 'تحديثات حجوزات البريد الإلكتروني',
            bookingEmailNotificationsDesc: 'استلم رسائل دورة الحجز مع استمرار الإشعارات العامة.',
            preferredCity: 'المدينة المفضلة',
            preferredCategories: 'الفئات المفضلة',
            updateSuccess: 'تم تحديث التفضيلات بنجاح',
            updateError: 'تعذر تحديث التفضيلات',
        },
    } } as const

const profilePrivacy = { ar: {
        title: 'البيانات والخصوصية',
        description: 'أدر نسخة من بيانات AutoCare Hub وطلب حذف الحساب.',
        exportTitle: 'تصدير بياناتي',
        exportDescription: 'نزّل نسخة JSON محدودة من حسابك وحجوزاتك وإشعاراتك ومفضلاتك ومساحاتك.',
        exportAction: 'تنزيل البيانات',
        exporting: 'جارٍ تجهيز التصدير...',
        exportSuccess: 'أصبحت نسخة بياناتك جاهزة.',
        exportError: 'تعذر تصدير بياناتك.',
        deletionTitle: 'حذف حسابي',
        deletionDescription: 'اطلب حذف حسابك للمراجعة. تخضع السجلات المالية وسجلات الحجوزات لسياسة الاحتفاظ.',
        requestAction: 'طلب الحذف',
        reasonLabel: 'السبب (اختياري)',
        reasonPlaceholder: 'أخبرنا بسبب مغادرتك',
        confirmRequest: 'إرسال الطلب',
        requestPending: 'طلب حذف الحساب قيد المراجعة.',
        requestedAt: 'تم الطلب في {{date}}',
        cancelRequest: 'إلغاء الطلب',
        cancelConfirm: 'هل تريد إلغاء طلب حذف الحساب المعلّق؟',
        requestSuccess: 'تم إرسال طلب حذف الحساب.',
        requestError: 'تعذر إرسال طلب حذف الحساب.',
        cancelSuccess: 'تم إلغاء طلب حذف الحساب.',
        cancelError: 'تعذر إلغاء طلب حذف الحساب.',
    } } as const

const booking = { ar: {
        title: 'الحجوزات', myBookings: 'حجوزاتي', noBookingsYet: 'لا توجد حجوزات بعد', loadingBookings: 'جار تحميل الحجوزات...', failedToLoadBookings: 'تعذر تحميل الحجوزات.', upcoming: 'القادمة', cancelled: 'ملغاة', completed: 'مكتملة', cancelBooking: 'إلغاء الحجز', confirmCancellation: 'تأكيد الإلغاء', cancelThisBooking: 'هل تريد إلغاء هذا الحجز؟', keepBooking: 'الاحتفاظ بالحجز', cancelling: 'جار الإلغاء...', bookingCancelledSuccessfully: 'تم إلغاء الحجز بنجاح.', failedToCancelBooking: 'تعذر إلغاء الحجز.', bookThisCabinet: 'احجز هذه المساحة', chooseServiceAndTime: 'اختر خدمة ووقتًا مناسبًا.', selectService: 'اختر الخدمة', selectDate: '2. اختر التاريخ', selectTime: '3. اختر الوقت', noAvailableTimes: 'لا توجد أوقات متاحة لهذا التاريخ.', createBooking: 'إنشاء حجز', creatingBooking: 'جار إنشاء الحجز...', bookingCreatedSuccessfully: 'تم إنشاء الحجز بنجاح.', successTitle: 'تم حجز موعدك', viewMyBookings: 'عرض حجوزاتي', openDirections: 'فتح الاتجاهات', pendingStatusLabel: 'قيد الانتظار', confirmedStatusLabel: 'مؤكد', cancelledStatusLabel: 'ملغى', completedStatusLabel: 'مكتمل',
    } } as const

export const arTranslations = createPopularLocale('ar', { common: common.ar, navigation: navigation.ar, auth: auth.ar, workspace: workspace.ar, ownerDashboard: ownerDashboard.ar, adminDashboard: adminDashboard.ar, adminUsers: adminUsers.ar, adminOwners: adminOwners.ar, adminCabinets: adminCabinets.ar, adminReviews: adminReviews.ar, adminAuditLogs: adminAuditLogs.ar, systemIncidents: systemIncidents.ar, securityCenter: securityCenter.ar, errors: errors.ar, booking: booking.ar, cabinet: cabinet.ar, profile: { ...profile.ar, privacy: profilePrivacy.ar }, landing: { ...landingExtraPopular.ar, ...landingPopular.ar, ...mockDashboard.ar, eyebrow: 'نظام إدارة حجوزات لتأجير المساحات', title: 'أدر المساحات والخدمات والحجوزات من مكان واحد.', description: 'يساعد AutoCare Hub العملاء على الحجز والمالكين على إدارة المساحات والخدمات.' } })
