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

const common = { zh: {
        loading: '正在加载...', loadingPage: '正在加载页面...', error: '错误',
        failedToLoad: '加载失败。', create: '创建', edit: '编辑', delete: '删除', cancel: '取消',
        confirm: '确认', save: '保存', back: '返回', status: '状态', actions: '操作', name: '姓名',
        email: '电子邮箱', saving: '正在保存...', close: '关闭', dismiss: '忽略', language: '语言',
        theme: '主题', menu: '菜单', more: '更多', switchToDarkTheme: '切换到深色主题',
        switchToLightTheme: '切换到浅色主题', notProvided: '未提供', tryAgainLater: '请稍后重试。', retry: '重试',
    } } as const

const navigation = { zh: { home: '首页', features: '功能', cabinets: '房间', services: '汽车服务', owners: '面向房主', pricing: '价格', about: '关于我们', profile: '个人资料', myBookings: '我的预订', favorites: '收藏', notifications: '通知', ownerDashboard: '房主工作台', ownerCabinets: '我的房间', ownerBookings: '预订', ownerServices: '服务', adminDashboard: '管理后台', adminUsers: '用户', adminOwners: '房主', adminCabinets: '房间', adminReviews: '评价', adminAuditLogs: '审计日志', ownerDashboardShort: '工作台', ownerCalendar: '日历' } } as const

const auth = { zh: { signIn: '登录', logOut: '退出登录', createAccount: '创建账户', welcomeBack: '欢迎回来', signInTitle: '登录 AutoCare Hub', signInToContinue: '请登录后继续。', email: '电子邮箱', password: '密码', signingIn: '正在登录...', failedToSignIn: '登录失败。', alreadyHaveAccount: '已有账户？', forgotPasswordLink: '忘记密码？' } } as const

const workspace = { zh: { client: '客户工作区', owner: '房主工作区', admin: '管理工作区', overview: '概览', manage: '管理', configure: '配置', monitor: '监控', support: '支持', collapseSidebar: '收起侧边栏', expandSidebar: '展开侧边栏', systemStatus: '所有系统运行正常' } } as const

const ownerDashboard = { zh: {
        title: '工作台',
        description: '管理空间、服务、预订和运营活动。',
        loading: '正在加载工作台...',
        failedToLoad: '工作台加载失败',
        activeCount: '{{count}} 个活跃',
        bookingStatusCounts: '{{pending}} 个待处理 · {{confirmed}} 个已确认',
        averageCabinetPrice: '空间平均价格',
        perHour: '每小时',
        upcomingBookings: '即将到来的预订',
        upcomingBookingsDescription: '你空间的待处理和已确认预订。',
        noUpcomingBookings: '目前没有即将到来的预订。',
        activeServices: '活跃服务',
        activeServicesDescription: '当前可预订的服务。',
        noServices: '还没有创建服务。',
        viewAll: '查看全部',
        bookingMeta: '空间：{{cabinetId}} · 服务：{{serviceId}}',
        serviceMeta: '{{duration}} 分钟 · {{price}}',
        analyticsTitle: '预订表现',
        analyticsDescription: '查看未来 30 天的计划工作。',
        projectedRevenue: '计划收入',
        bookedHours: '已预订小时数',
        bookingLoad: '预订负载',
        popularServices: '热门服务',
        noBookingData: '客户开始预约后，这里会显示预订数据。',
        mobileRevenue: '收入',
        mobileOccupancy: '使用率',
        mobileToday: '今天',
        mobileAwaitingResponse: '等待你的回复',
        mobileBookingExpires: '此预订即将过期',
        mobileConfirm: '确认',
        mobileDecline: '拒绝',
        mobileUpcomingToday: '今天即将到来',
        mobileViewCalendar: '查看日历',
        mobileOfflineDraft: '恢复连接后会保存草稿更改。',
        mobileReviewDraft: '查看草稿',
        mobileAddSpace: '添加空间',
        mobileMySpaces: '我的空间',
        clientListTitle: '客户',
        clientListDescription: '预订过你服务的客户，按最近预约排序。',
        noClients: '还没有客户预订。',
        visits: '{{count}} 次到访',
        lastBooking: '最近预订：{{date}}',
        noOwnerNote: '还没有内部备注。',
        actionCenter: {
            eyebrow: '行动中心',
            title: '需要你关注的任务',
            description: '查看待处理事项，并直接打开解决问题的工作区。',
            allClear: '一切正常，没有待处理任务。',
            pendingBookings: '待处理预订',
            pendingBookingsDescription: '等待你确认的预订。',
            rescheduleRequests: '改期请求',
            rescheduleRequestsDescription: '客户正在等待新的时间安排决定。',
            draftCabinets: '空间草稿',
            draftCabinetsDescription: '尚未准备好公开预订的空间。',
            blockedCabinets: '已阻止空间',
            blockedCabinetsDescription: '需要审核或完成设置的空间。',
            readiness: '上线准备度',
            readinessDescription: '完成剩余设置后再接受预订。',
            olderThan24Hours: '{{count}} 已超过 24 小时',
            open: '打开工作区',
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

const adminDashboard = { zh: {
        title: '管理工作台',
        description: '监控用户、空间、平台活动和审核状态。',
        loading: '正在加载管理工作台...',
        failedToLoad: '管理工作台加载失败',
        users: '用户',
        userRoleCounts: '{{clients}} 位客户 · {{owners}} 位房主 · {{admins}} 位管理员',
        userStatusCounts: '{{active}} 个活跃 · {{blocked}} 个已阻止',
        activeCount: '{{count}} 个活跃',
        moderation: '审核',
        moderationBreakdown: '{{draftCabinets}} 个空间草稿 · {{blockedCabinets}} 个已阻止 · {{blockedUsers}} 位用户已阻止',
        averageCabinetPrice: '空间平均价格',
        perHour: '每小时',
        recentUsers: '最近用户',
        recentUsersDescription: '按演示数据顺序显示最新平台用户。',
        recentCabinets: '最近空间',
        recentCabinetsDescription: '带有审核状态的最新空间。',
        noUsers: '未找到用户。',
        noCabinets: '未找到空间。',
        viewAll: '查看全部',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.zh,
    } } as const

const adminOwners = { zh: { description: '管理平台房主及其账户访问权限。', emptyTitle: '未找到房主', emptyDescription: '房主创建账户后会显示在这里。' } } as const

const adminCabinets = { zh: {
        title: '房间', description: '审核和管理房间列表。', loading: '正在加载房间...', failedToLoad: '无法加载房间', emptyTitle: '未找到房间', emptyDescription: '平台房间会显示在这里。', statusUpdatedSuccessfully: '房间状态已更新。', statusUpdateFailed: '无法更新房间状态。', blockedSuccessfully: '房间已封禁。', blockFailed: '无法封禁房间。', confirmBlockEyebrow: '确认封禁房间', confirmBlockTitle: '封禁这个房间？', confirmBlockDescription: '该房间会从公开列表隐藏，客户将无法预订。', keepAvailable: '保持可用', confirmBlocking: '确认封禁', blockingAction: '正在封禁...',
    } } as const

const adminReviews = { zh: { title: '评价', description: '在发布客户评价前进行审核。', loading: '正在加载评价...', emptyTitle: '暂无评价', emptyDescription: '客户提交评价后会显示在这里。', statusUpdatedSuccessfully: '评价状态已更新。', statusUpdateFailed: '无法更新评价状态。', pendingAction: '退回审核', approvedAction: '通过', rejectedAction: '拒绝', deleteAction: '删除', deleting: '正在删除...', deletedSuccessfully: '评价已删除。', deleteFailed: '无法删除评价。', confirmDeleteEyebrow: '删除评价', confirmDeleteTitle: '删除这条评价？', confirmDeleteDescription: '此操作会永久从项目中删除该评价。' } } as const

const securityCenter = { zh: { title: '安全中心', description: '在超级管理员工作台中查看身份验证失败、滥用信号、来源 IP、路由和调查状态。', permissionTitle: '需要超级管理员权限', permissionDescription: '此工作台包含敏感安全遥测信息，仅超级管理员可用。', loadError: '无法加载安全遥测信息。', exportReport: '导出报告', timeline: '调查时间线', assignee: '负责人', unassigned: '未分配', assignToMe: '分配给我', mitigationsTitle: '临时缓解措施', activeMitigations: '活跃封禁', topIps: '最活跃来源 IP', topRoutes: '最常被攻击的路由', typeFilter: '事件类型', allTypes: '所有类型', severityFilter: '严重程度', allSeverities: '所有严重程度', statusFilter: '调查状态', allStatuses: '所有状态', eventsTitle: '安全活动', empty: '没有安全事件符合这些筛选条件。', loadMore: '加载更多', loadingMore: '正在加载更多...', types: { login_failed: '登录失败', account_locked: '账户已锁定', refresh_token_reuse: '刷新令牌重复使用', rate_limit_exceeded: '超过速率限制', invalid_token: '令牌无效', csrf_violation: 'CSRF 违规', route_scan: '未知路由请求', malformed_request: '请求格式错误', oversized_request: '请求过大', privilege_denied: '权限被拒绝', webhook_abuse: 'Webhook 滥用', mutation_burst: '突发变更' }, severities: { info: '信息', warning: '警告', high: '高', critical: '严重' }, statuses: { open: '开放', acknowledged: '已确认', investigating: '调查中', resolved: '已解决', suppressed: '已抑制' }, actorRoles: { client: '客户', owner: '房主', admin: '管理员', super_admin: '超级管理员' }, authOutcomes: { unknown: '未知', anonymous: '匿名', authenticated: '已认证', failed: '失败' }, rateLimitResults: { not_checked: '未检查', allowed: '允许', blocked: '已阻止' }, proxyProvenances: { unknown: '未知', direct: '直接连接', trusted_proxy: '受信代理', forwarded_header_untrusted: '不受信转发标头' } } } as const

const systemIncidents = { zh: { tab: '系统事件', title: '系统事件', description: '运营事件与用户活动分开管理，可在这里确认或解决。', incident: '事件', severity: '严重程度', occurrences: '发生次数', firstSeen: '首次发现', lastSeen: '最近发现', requestId: '请求 ID', acknowledge: '确认', resolve: '解决', statusOpen: '开放', statusAcknowledged: '已确认', statusResolved: '已解决', severityWarning: '警告', severityCritical: '严重', metadata: '元数据', showMetadata: '查看元数据', copyRequestId: '复制请求 ID', copied: '请求 ID 已复制', copyFailed: '无法复制请求 ID。', emptyTitle: '没有活跃事件', emptyDescription: '检测到服务器或运营事件后会显示在这里。', searchPlaceholder: '搜索事件...', statusFilter: '状态', allStatuses: '全部', acknowledgedAt: '已确认', resolvedAt: '已解决', loadedCount: '已加载 {count} 个事件', loadMore: '加载更多', loadingMore: '正在加载更多...' } } as const

const adminAuditLogs = { zh: {
        title: '审计日志', description: '跟踪平台上的所有管理和安全操作。', timestamp: '时间', actor: '操作者', action: '操作', target: '目标', metadata: '元数据', noLogs: '未找到审计日志。', emptyDescription: '执行操作后，审计事件会显示在这里。', searchPlaceholder: '搜索日志...', export: '导出 CSV', auditTab: '活动审计', showMetadata: '查看元数据', saveFilter: '保存筛选', clearFilter: '清除已保存筛选', savedFilter: '已保存筛选：{query}', filterSaved: '审计筛选已保存到本次会话。', filterCleared: '已清除保存的审计筛选。', loadedCount: '已加载 {count} 个事件', loadMore: '加载更多', loadingMore: '正在加载更多...',
        actions: { user_status_updated: '用户状态已更新', user_role_updated: '用户角色已更新', admin_created: '管理员已创建', cabinet_status_updated: '房间状态已更新', review_moderated: '评价已审核', review_deleted: '评价已删除', subscription_created: '订阅已创建', promo_subscription_issued: '已发放促销订阅', login_failed: '登录尝试失败', account_locked: '账户已锁定', refresh_token_reuse: '检测到刷新令牌重复使用', outbox_retried: 'Outbox 事件已重试', outbox_dead_lettered: 'Outbox 事件已移入死信', oauth_identity_linked: 'OAuth 身份已关联', oauth_identity_unlinked: 'OAuth 身份已解除关联', account_deletion_requested: '已请求删除账户', account_deletion_cancelled: '账户删除已取消', account_deletion_completed: '账户删除已完成', security_events_viewed: '已查看安全事件', security_center_viewed: '已查看安全中心', security_center_event_status_updated: '安全事件状态已更新', security_center_report_exported: '安全调查报告已导出', security_user_sessions_revoked: '已从安全中心撤销用户会话' },
    } } as const

const adminUsers = { zh: {
        title: '用户',
        description: '管理用户状态和账户访问权限。',
        loading: '正在加载用户...',
        failedToLoad: '用户加载失败',
        emptyTitle: '未找到用户',
        emptyDescription: '平台用户会显示在这里。',
        userColumn: '用户',
        statusUpdatedSuccessfully: '用户状态已更新。',
        statusUpdateFailed: '用户状态更新失败。',
        blockedSuccessfully: '用户已阻止。',
        blockFailed: '用户阻止失败。',
        confirmBlockEyebrow: '确认阻止用户',
        confirmBlockTitle: '要阻止此用户吗？',
        confirmBlockDescription: '该用户将无法登录或使用受保护页面。',
        adminStatusRestricted: '只有超级管理员可以管理管理员账户。',
        keepActive: '保持活跃',
        confirmBlocking: '确认阻止',
        blockingAction: '正在阻止...',
        createAdminTitle: '创建管理员',
        createAdminDescription: '邀请一位管理员。对方需要通过下面的链接设置密码。',
        adminCreatedSuccessfully: '管理员创建成功。',
        adminCreateFailed: '管理员创建失败。',
        setupUrlLabel: '设置链接',
        setupUrlDescription: '分享此链接，让新管理员设置密码。',
        roleUpdatedSuccessfully: '用户角色已更新。',
        roleUpdateFailed: '用户角色更新失败。',
        roleClient: '客户',
        roleOwner: '房主',
        roleAdmin: '管理员',
        roleSuperAdmin: '超级管理员',
    } } as const

const mockDashboard = { zh: { dashboardWelcome: '欢迎，Anna！', dashboardSubtitle: '一切尽在掌控。', dashboardBookings: '预订', dashboardRequests: '新请求', dashboardCabinets: '房间', dashboardReviews: '评价', latestBookings: '最新预订', viewAllBookings: '查看全部预订', calendarMonth: '2025年5月', weekdayMonShort: '一', weekdayTueShort: '二', weekdayWedShort: '三', weekdayThuShort: '四', weekdayFriShort: '五', weekdaySatShort: '六', weekdaySunShort: '日', loadTitle: '空间使用率', bookingConfirmed: '已确认', bookingPending: '待处理', bookingName1: 'Irene S.', bookingName2: 'Alex O.', bookingName3: 'Ekaterina P.', bookingCabinet1: '房间 1', bookingCabinet2: '房间 2', bookingCabinet3: '房间 3', bookingToday1100: '今天 11:00', bookingToday1230: '今天 12:30', bookingTomorrow1000: '明天 10:00' } } as const

const errors = { zh: { VALIDATION_ERROR: '验证失败，请检查表单。', NOT_FOUND: '未找到请求的资源。', INTERNAL_SERVER_ERROR: '服务器出现问题，请稍后重试。', BAD_REQUEST: '请求无效。', UNAUTHORIZED: '请登录后继续。', FORBIDDEN: '你没有执行此操作的权限。', CONFLICT: '发生冲突，该记录可能已经存在。', TOO_MANY_REQUESTS: '请求过于频繁，请稍后再试。', CSRF_ORIGIN_MISMATCH: '安全检查失败。', CSRF_TOKEN_MISMATCH: '会话已过期或无效。', EMAIL_VERIFICATION_REQUIRED: '请验证邮箱后再执行此操作。', BREACHED_PASSWORD: '请选择未出现在已知数据泄露中的密码。' } } as const

const cabinetCatalog = { zh: {
        title: '空间',
        publicList: {
            eyebrow: '公共目录', title: '可用空间', description: '浏览适合美容、医疗、咨询和专业服务预约的活跃空间。', loading: '正在加载空间...', failedToLoad: '无法加载空间', emptyTitle: '未找到空间', emptyDescription: '目前没有可用的活跃空间。', photoFallback: '空间照片', from: '起价', perHourShort: '/ 小时', searchPlaceholder: '按名称或城市搜索...', sortBy: '排序方式', sortNewest: '最新优先', sortPopular: '最受欢迎', sortPriceAsc: '价格：从低到高', sortPriceDesc: '价格：从高到低', advancedFilters: '筛选', cityLabel: '城市', cityPlaceholder: '任意城市', categoryLabel: '类别', allCategories: '所有类别', categoryBeauty: '美容', categoryMedical: '医疗', categoryConsultation: '咨询', categoryWellness: '健康', categoryOffice: '办公室', priceRangeLabel: '每小时价格', minPrice: '最低', maxPrice: '最高', ratingLabel: '评分', anyRating: '任意评分', stars: '星', serviceLabel: '服务', servicePlaceholder: '例如：按摩', availableToday: '今天可用', clearFilters: '清除筛选', resultsEyebrow: '按可用时间查找', resultsTitle: '你附近的空间', resultsCount: '找到 {{count}} 个空间', viewMode: '目录视图', splitView: '列表 + 地图', listView: '列表', mapView: '地图', backToSplitView: '返回列表和地图', view: '查看详情', imageAlt: '{{title}} 室内', todayAvailability: '今天', freeSlots: '剩余 {{count}} 个时段', mapTitle: '区域地图', mapApproximate: '区域概览地图。详细地址显示在空间页面。', mapZoomIn: '放大', mapZoomOut: '缩小', mapCurrentLocation: '使用当前位置', mapLocationLoading: '正在查找你的位置...', mapLocationFound: '地图已居中到你的位置。', mapLocationError: '无法获取位置。地图仍为概略视图。', mapTileError: '地图数据暂时不可用。请使用列表或在外部打开地图。', openMap: '打开地图', selectedCabinet: '已选空间',
        },
    } } as const

const profilePrivacy = { zh: {
        title: '数据与隐私',
        description: '管理你的 AutoCare Hub 数据副本和账户删除请求。',
        exportTitle: '导出我的数据',
        exportDescription: '下载账户、预订、通知、收藏和房间的有限 JSON 副本。',
        exportAction: '下载数据',
        exporting: '正在准备导出...',
        exportSuccess: '你的数据导出已准备好。',
        exportError: '无法导出你的数据。',
        deletionTitle: '删除我的账户',
        deletionDescription: '提交账户删除请求以供审核。财务和预订记录将按照保留政策处理。',
        requestAction: '请求删除',
        reasonLabel: '原因（可选）',
        reasonPlaceholder: '告诉我们你离开的原因',
        confirmRequest: '提交请求',
        requestPending: '账户删除请求正在等待审核。',
        requestedAt: '请求时间：{{date}}',
        cancelRequest: '取消请求',
        cancelConfirm: '取消待处理的账户删除请求？',
        requestSuccess: '账户删除请求已提交。',
        requestError: '无法提交账户删除请求。',
        cancelSuccess: '账户删除请求已取消。',
        cancelError: '无法取消账户删除请求。',
    } } as const

const booking = { zh: {
        title: '预订', myBookings: '我的预订', noBookingsYet: '暂无预订', loadingBookings: '正在加载预订...', failedToLoadBookings: '无法加载预订。', upcoming: '即将到来', cancelled: '已取消', completed: '已完成', cancelBooking: '取消预订', confirmCancellation: '确认取消', cancelThisBooking: '要取消此预订吗？', keepBooking: '保留预订', cancelling: '正在取消...', bookingCancelledSuccessfully: '预订已成功取消。', failedToCancelBooking: '无法取消预订。', bookThisCabinet: '预订此空间', chooseServiceAndTime: '选择服务和合适的时间。', selectService: '选择服务', selectDate: '2. 选择日期', selectTime: '3. 选择时间', noAvailableTimes: '该日期没有可用时段。', createBooking: '创建预订', creatingBooking: '正在创建预订...', bookingCreatedSuccessfully: '预订已创建。', successTitle: '你的时段已预留', viewMyBookings: '查看我的预订', openDirections: '打开路线', pendingStatusLabel: '待确认', confirmedStatusLabel: '已确认', cancelledStatusLabel: '已取消', completedStatusLabel: '已完成',
    } } as const

export const zhTranslations = createPopularLocale('zh', { common: common.zh, navigation: navigation.zh, auth: auth.zh, workspace: workspace.zh, ownerDashboard: ownerDashboard.zh, adminDashboard: adminDashboard.zh, adminUsers: adminUsers.zh, adminOwners: adminOwners.zh, adminCabinets: adminCabinets.zh, adminReviews: adminReviews.zh, adminAuditLogs: adminAuditLogs.zh, systemIncidents: systemIncidents.zh, securityCenter: securityCenter.zh, errors: errors.zh, booking: booking.zh, cabinet: cabinetCatalog.zh, profile: { privacy: profilePrivacy.zh }, landing: { ...landingExtraPopular.zh, ...landingPopular.zh, ...mockDashboard.zh, eyebrow: '空间租赁预订 CRM', title: '在一个工作台管理空间、服务和预订。', description: 'AutoCare Hub 帮助客户预订空间，也帮助房主管理房源、服务和预订状态。' } })
