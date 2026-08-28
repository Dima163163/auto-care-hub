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

const common = { es: {
        loading: 'Cargando...', loadingPage: 'Cargando página...', error: 'Error',
        failedToLoad: 'No se pudo cargar.', create: 'Crear', edit: 'Editar', delete: 'Eliminar',
        cancel: 'Cancelar', confirm: 'Confirmar', save: 'Guardar', back: 'Atrás', status: 'Estado',
        actions: 'Acciones', name: 'Nombre', email: 'Correo electrónico', saving: 'Guardando...',
        close: 'Cerrar', dismiss: 'Descartar', language: 'Idioma', theme: 'Tema', menu: 'Menú', more: 'Más',
        switchToDarkTheme: 'Cambiar al tema oscuro', switchToLightTheme: 'Cambiar al tema claro',
        notProvided: 'No indicado', tryAgainLater: 'Inténtalo de nuevo más tarde.', retry: 'Reintentar',
    } } as const

const navigation = { es: { home: 'Inicio', features: 'Funciones', cabinets: 'Cabinetes', services: 'Servicios de auto', owners: 'Para propietarios', pricing: 'Precios', about: 'Acerca de', profile: 'Perfil', myBookings: 'Mis reservas', favorites: 'Favoritos', notifications: 'Notificaciones', ownerDashboard: 'Panel del propietario', ownerCabinets: 'Mis cabinetes', ownerBookings: 'Reservas', ownerServices: 'Servicios', adminDashboard: 'Panel de administración', adminUsers: 'Usuarios', adminOwners: 'Propietarios', adminCabinets: 'Cabinetes', adminReviews: 'Reseñas', adminAuditLogs: 'Registros de auditoría', ownerDashboardShort: 'Panel', ownerCalendar: 'Calendario' } } as const

const auth = { es: { signIn: 'Iniciar sesión', logOut: 'Cerrar sesión', createAccount: 'Crear cuenta', welcomeBack: 'Bienvenido de nuevo', signInTitle: 'Inicia sesión en AutoCare Hub', signInToContinue: 'Inicia sesión para continuar.', email: 'Correo electrónico', password: 'Contraseña', signingIn: 'Iniciando sesión...', failedToSignIn: 'No se pudo iniciar sesión.', alreadyHaveAccount: '¿Ya tienes una cuenta?', forgotPasswordLink: '¿Olvidaste tu contraseña?' } } as const

const workspace = { es: { client: 'Espacio del cliente', owner: 'Espacio del propietario', admin: 'Espacio de administración', overview: 'Resumen', manage: 'Gestionar', configure: 'Configurar', monitor: 'Supervisar', support: 'Soporte', collapseSidebar: 'Contraer barra lateral', expandSidebar: 'Expandir barra lateral', systemStatus: 'Todos los sistemas funcionan' } } as const

const ownerDashboard = { es: {
        title: 'Panel',
        description: 'Controla tus espacios, servicios, reservas y actividad operativa.',
        loading: 'Cargando el panel...',
        failedToLoad: 'No se pudo cargar el panel',
        activeCount: '{{count}} activos',
        bookingStatusCounts: '{{pending}} pendientes · {{confirmed}} confirmadas',
        averageCabinetPrice: 'Precio medio del espacio',
        perHour: 'Por hora',
        upcomingBookings: 'Próximas reservas',
        upcomingBookingsDescription: 'Reservas pendientes y confirmadas de tus espacios.',
        noUpcomingBookings: 'No hay próximas reservas.',
        activeServices: 'Servicios activos',
        activeServicesDescription: 'Servicios disponibles para reservar.',
        noServices: 'Todavía no has creado servicios.',
        viewAll: 'Ver todo',
        bookingMeta: 'Espacio: {{cabinetId}} · Servicio: {{serviceId}}',
        serviceMeta: '{{duration}} min · {{price}}',
        analyticsTitle: 'Rendimiento de las reservas',
        analyticsDescription: 'Resumen de la actividad programada para los próximos 30 días.',
        projectedRevenue: 'Ingresos programados',
        bookedHours: 'Horas reservadas',
        bookingLoad: 'Carga de reservas',
        popularServices: 'Servicios populares',
        noBookingData: 'Los datos aparecerán cuando los clientes hagan reservas.',
        mobileRevenue: 'Ingresos',
        mobileOccupancy: 'Ocupación',
        mobileToday: 'Hoy',
        mobileAwaitingResponse: 'Esperando tu respuesta',
        mobileBookingExpires: 'Esta reserva caducará pronto',
        mobileConfirm: 'Confirmar',
        mobileDecline: 'Rechazar',
        mobileUpcomingToday: 'Próximas hoy',
        mobileViewCalendar: 'Ver calendario',
        mobileOfflineDraft: 'Los cambios se guardarán al recuperar la conexión.',
        mobileReviewDraft: 'Revisar borrador',
        mobileAddSpace: 'Añadir espacio',
        mobileMySpaces: 'Mis espacios',
        clientListTitle: 'Clientes',
        clientListDescription: 'Clientes que han reservado uno de tus servicios, ordenados por su cita más reciente.',
        noClients: 'Todavía no hay clientes con reservas.',
        visits: '{{count}} visitas',
        lastBooking: 'Última reserva: {{date}}',
        noOwnerNote: 'Todavía no hay una nota interna.',
        actionCenter: {
            eyebrow: 'Centro de acciones',
            title: 'Tareas que requieren tu atención',
            description: 'Revisa las tareas pendientes y abre el espacio exacto para resolverlas.',
            allClear: 'Todo está al día. No hay tareas pendientes.',
            pendingBookings: 'Reservas pendientes',
            pendingBookingsDescription: 'Reservas que esperan tu confirmación.',
            rescheduleRequests: 'Solicitudes de cambio',
            rescheduleRequestsDescription: 'Clientes que esperan una decisión sobre otro horario.',
            draftCabinets: 'Espacios en borrador',
            draftCabinetsDescription: 'Espacios que aún no están listos para reservar.',
            blockedCabinets: 'Espacios bloqueados',
            blockedCabinetsDescription: 'Espacios que requieren revisión o configuración.',
            readiness: 'Preparación para publicar',
            readinessDescription: 'Completa la configuración restante antes de aceptar reservas.',
            olderThan24Hours: '{{count}} con más de 24 horas',
            open: 'Abrir espacio de trabajo',
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

const adminDashboard = { es: {
        title: 'Panel de administración',
        description: 'Supervisa usuarios, espacios, actividad de la plataforma y moderación.',
        loading: 'Cargando el panel de administración...',
        failedToLoad: 'No se pudo cargar el panel de administración',
        users: 'Usuarios',
        userRoleCounts: '{{clients}} clientes · {{owners}} propietarios · {{admins}} administradores',
        userStatusCounts: '{{active}} activos · {{blocked}} bloqueados',
        activeCount: '{{count}} activos',
        moderation: 'Moderación',
        moderationBreakdown: '{{draftCabinets}} espacios en borrador · {{blockedCabinets}} bloqueados · {{blockedUsers}} usuarios bloqueados',
        averageCabinetPrice: 'Precio medio del espacio',
        perHour: 'Por hora',
        recentUsers: 'Usuarios recientes',
        recentUsersDescription: 'Últimos usuarios de la plataforma según los datos de demostración.',
        recentCabinets: 'Espacios recientes',
        recentCabinetsDescription: 'Últimos espacios con sus estados de moderación.',
        noUsers: 'No se encontraron usuarios.',
        noCabinets: 'No se encontraron espacios.',
        viewAll: 'Ver todo',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.es,
    } } as const

const adminOwners = { es: { description: 'Gestiona los propietarios de la plataforma y el acceso a sus cuentas.', emptyTitle: 'No se encontraron propietarios', emptyDescription: 'Los propietarios aparecerán aquí después de crear una cuenta.' } } as const

const adminCabinets = { es: {
        title: 'Cabinetes', description: 'Revisa y modera los anuncios de cabinetes.', loading: 'Cargando cabinetes...', failedToLoad: 'No se pudieron cargar los cabinetes', emptyTitle: 'No se encontraron cabinetes', emptyDescription: 'Los cabinetes de la plataforma aparecerán aquí.', statusUpdatedSuccessfully: 'Estado del cabinete actualizado.', statusUpdateFailed: 'No se pudo actualizar el estado del cabinete.', blockedSuccessfully: 'Cabinete bloqueado.', blockFailed: 'No se pudo bloquear el cabinete.', confirmBlockEyebrow: 'Confirmar bloqueo del cabinete', confirmBlockTitle: '¿Bloquear este cabinete?', confirmBlockDescription: 'El cabinete se ocultará de los listados públicos y los clientes no podrán reservarlo.', keepAvailable: 'Mantener disponible', confirmBlocking: 'Confirmar bloqueo', blockingAction: 'Bloqueando...',
    } } as const

const adminReviews = { es: { title: 'Reseñas', description: 'Modera las reseñas de clientes antes de publicarlas.', loading: 'Cargando reseñas...', emptyTitle: 'Aún no hay reseñas', emptyDescription: 'Las reseñas de clientes aparecerán aquí después de enviarse.', statusUpdatedSuccessfully: 'Estado de la reseña actualizado.', statusUpdateFailed: 'No se pudo actualizar el estado de la reseña.', pendingAction: 'Devolver a moderación', approvedAction: 'Aprobar', rejectedAction: 'Rechazar', deleteAction: 'Eliminar', deleting: 'Eliminando...', deletedSuccessfully: 'Reseña eliminada.', deleteFailed: 'No se pudo eliminar la reseña.', confirmDeleteEyebrow: 'Eliminar reseña', confirmDeleteTitle: '¿Eliminar esta reseña?', confirmDeleteDescription: 'Esta acción elimina la reseña del proyecto de forma permanente.' } } as const

const securityCenter = { es: { title: 'Centro de seguridad', description: 'Revisa fallos de autenticación, señales de abuso, IP de origen, rutas y estado de investigación en un espacio superadministrador.', permissionTitle: 'Se requiere acceso de superadministrador', permissionDescription: 'Este espacio muestra telemetría sensible y solo está disponible para superadministradores.', loadError: 'No se pudo cargar la telemetría de seguridad.', exportReport: 'Exportar informe', timeline: 'Línea de tiempo de investigación', assignee: 'Responsable', unassigned: 'Sin asignar', assignToMe: 'Asignármelo', mitigationsTitle: 'Mitigaciones temporales', activeMitigations: 'Bloqueos activos', topIps: 'IP de origen más activas', topRoutes: 'Rutas más atacadas', typeFilter: 'Tipo de evento', allTypes: 'Todos los tipos', severityFilter: 'Gravedad', allSeverities: 'Todas las gravedades', statusFilter: 'Estado de investigación', allStatuses: 'Todos los estados', eventsTitle: 'Actividad de seguridad', empty: 'Ningún evento de seguridad coincide con estos filtros.', loadMore: 'Cargar más', loadingMore: 'Cargando más...', types: { login_failed: 'Inicio de sesión fallido', account_locked: 'Cuenta bloqueada', refresh_token_reuse: 'Reutilización de token', rate_limit_exceeded: 'Límite de solicitudes excedido', invalid_token: 'Token no válido', csrf_violation: 'Incumplimiento CSRF', route_scan: 'Solicitud a ruta desconocida', malformed_request: 'Solicitud mal formada', oversized_request: 'Solicitud demasiado grande', privilege_denied: 'Privilegio denegado', webhook_abuse: 'Abuso de webhook', mutation_burst: 'Pico de mutaciones' }, severities: { info: 'Información', warning: 'Advertencia', high: 'Alta', critical: 'Crítica' }, statuses: { open: 'Abierto', acknowledged: 'Reconocido', investigating: 'En investigación', resolved: 'Resuelto', suppressed: 'Suprimido' }, actorRoles: { client: 'Cliente', owner: 'Propietario', admin: 'Administrador', super_admin: 'Superadministrador' }, authOutcomes: { unknown: 'Desconocido', anonymous: 'Anónimo', authenticated: 'Autenticado', failed: 'Fallido' }, rateLimitResults: { not_checked: 'No comprobado', allowed: 'Permitido', blocked: 'Bloqueado' }, proxyProvenances: { unknown: 'Desconocida', direct: 'Conexión directa', trusted_proxy: 'Proxy de confianza', forwarded_header_untrusted: 'Cabecera reenviada no confiable' } } } as const

const systemIncidents = { es: { tab: 'Incidentes del sistema', title: 'Incidentes del sistema', description: 'Los eventos operativos son independientes de la actividad de usuarios y se pueden reconocer o resolver aquí.', incident: 'Incidente', severity: 'Gravedad', occurrences: 'Ocurrencias', firstSeen: 'Detectado por primera vez', lastSeen: 'Detectado por última vez', requestId: 'ID de solicitud', acknowledge: 'Reconocer', resolve: 'Resolver', statusOpen: 'Abierto', statusAcknowledged: 'Reconocido', statusResolved: 'Resuelto', severityWarning: 'Advertencia', severityCritical: 'Crítico', metadata: 'Metadatos', showMetadata: 'Ver metadatos', copyRequestId: 'Copiar ID de solicitud', copied: 'ID de solicitud copiado', copyFailed: 'No se pudo copiar el ID de solicitud.', emptyTitle: 'No hay incidentes activos', emptyDescription: 'Los incidentes del servidor y operativos aparecerán cuando se detecten.', searchPlaceholder: 'Buscar incidentes...', statusFilter: 'Estado', allStatuses: 'Todos', acknowledgedAt: 'Reconocido', resolvedAt: 'Resuelto', loadedCount: '{count} incidentes cargados', loadMore: 'Cargar más', loadingMore: 'Cargando más...' } } as const

const adminAuditLogs = { es: {
        title: 'Registros de auditoría', description: 'Rastrea todas las acciones administrativas y de seguridad de la plataforma.', timestamp: 'Hora', actor: 'Autor', action: 'Acción', target: 'Objetivo', metadata: 'Metadatos', noLogs: 'No se encontraron registros.', emptyDescription: 'Los eventos de auditoría aparecerán aquí cuando se realicen acciones.', searchPlaceholder: 'Buscar registros...', export: 'Exportar CSV', auditTab: 'Auditoría de actividad', showMetadata: 'Ver metadatos', saveFilter: 'Guardar filtro', clearFilter: 'Borrar filtro guardado', savedFilter: 'Filtro guardado: {query}', filterSaved: 'Filtro guardado para esta sesión.', filterCleared: 'Filtro guardado eliminado.', loadedCount: '{count} eventos cargados', loadMore: 'Cargar más', loadingMore: 'Cargando más...',
        actions: { user_status_updated: 'Estado del usuario actualizado', user_role_updated: 'Rol del usuario actualizado', admin_created: 'Administrador creado', cabinet_status_updated: 'Estado del cabinete actualizado', review_moderated: 'Reseña moderada', review_deleted: 'Reseña eliminada', login_failed: 'Intento de inicio de sesión fallido', account_locked: 'Cuenta bloqueada', refresh_token_reuse: 'Reutilización de token detectada', outbox_retried: 'Evento de salida reintentado', outbox_dead_lettered: 'Evento de salida enviado a fallos permanentes', oauth_identity_linked: 'Identidad OAuth vinculada', oauth_identity_unlinked: 'Identidad OAuth desvinculada', account_deletion_requested: 'Eliminación de cuenta solicitada', account_deletion_cancelled: 'Eliminación de cuenta cancelada', account_deletion_completed: 'Eliminación de cuenta completada', security_events_viewed: 'Eventos de seguridad consultados', security_center_viewed: 'Centro de seguridad consultado', security_center_event_status_updated: 'Estado del evento de seguridad actualizado', security_center_report_exported: 'Informe de seguridad exportado', security_user_sessions_revoked: 'Sesiones del usuario revocadas desde el Centro de seguridad' },
    } } as const

const adminUsers = { es: {
        title: 'Usuarios',
        description: 'Gestiona los estados de usuario y el acceso a las cuentas.',
        loading: 'Cargando usuarios...',
        failedToLoad: 'No se pudieron cargar los usuarios',
        emptyTitle: 'No se encontraron usuarios',
        emptyDescription: 'Los usuarios de la plataforma aparecerán aquí.',
        userColumn: 'Usuario',
        statusUpdatedSuccessfully: 'Estado del usuario actualizado.',
        statusUpdateFailed: 'No se pudo actualizar el estado del usuario.',
        blockedSuccessfully: 'Usuario bloqueado.',
        blockFailed: 'No se pudo bloquear al usuario.',
        confirmBlockEyebrow: 'Confirmar bloqueo de usuario',
        confirmBlockTitle: '¿Bloquear este usuario?',
        confirmBlockDescription: 'El usuario no podrá iniciar sesión ni usar páginas protegidas.',
        adminStatusRestricted: 'Solo el superadministrador puede gestionar cuentas de administradores.',
        keepActive: 'Mantener activo',
        confirmBlocking: 'Confirmar bloqueo',
        blockingAction: 'Bloqueando...',
        createAdminTitle: 'Crear administrador',
        createAdminDescription: 'Invita a un administrador. Deberá establecer una contraseña con el enlace de abajo.',
        adminCreatedSuccessfully: 'Administrador creado correctamente.',
        adminCreateFailed: 'No se pudo crear el administrador.',
        setupUrlLabel: 'Enlace de configuración',
        setupUrlDescription: 'Comparte este enlace para que el nuevo administrador establezca su contraseña.',
        roleUpdatedSuccessfully: 'Rol de usuario actualizado.',
        roleUpdateFailed: 'No se pudo actualizar el rol del usuario.',
        roleClient: 'Cliente',
        roleOwner: 'Propietario',
        roleAdmin: 'Administrador',
        roleSuperAdmin: 'Superadministrador',
    } } as const

const mockDashboard = { es: { dashboardWelcome: '¡Bienvenido, Ana!', dashboardSubtitle: 'Todo está bajo control.', dashboardBookings: 'Reservas', dashboardRequests: 'Nuevas solicitudes', dashboardCabinets: 'Cabinetes', dashboardReviews: 'Reseñas', latestBookings: 'Últimas reservas', viewAllBookings: 'Ver todas las reservas', calendarMonth: 'Mayo de 2025', weekdayMonShort: 'Lun', weekdayTueShort: 'Mar', weekdayWedShort: 'Mié', weekdayThuShort: 'Jue', weekdayFriShort: 'Vie', weekdaySatShort: 'Sáb', weekdaySunShort: 'Dom', loadTitle: 'Ocupación de espacios', bookingConfirmed: 'Confirmada', bookingPending: 'Pendiente', bookingName1: 'Irene S.', bookingName2: 'Alex O.', bookingName3: 'Catalina P.', bookingCabinet1: 'Cabinete 1', bookingCabinet2: 'Cabinete 2', bookingCabinet3: 'Cabinete 3', bookingToday1100: 'Hoy, 11:00', bookingToday1230: 'Hoy, 12:30', bookingTomorrow1000: 'Mañana, 10:00' } } as const

const errors = { es: { VALIDATION_ERROR: 'La validación falló. Revisa el formulario.', NOT_FOUND: 'No se encontró el recurso solicitado.', INTERNAL_SERVER_ERROR: 'Algo salió mal. Inténtalo más tarde.', BAD_REQUEST: 'Solicitud no válida.', UNAUTHORIZED: 'Inicia sesión para continuar.', FORBIDDEN: 'No tienes permiso para realizar esta acción.', CONFLICT: 'Se produjo un conflicto. El registro podría existir.', TOO_MANY_REQUESTS: 'Demasiadas solicitudes. Inténtalo más despacio.', CSRF_ORIGIN_MISMATCH: 'Falló la comprobación de seguridad.', CSRF_TOKEN_MISMATCH: 'La sesión caducó o no es válida.', EMAIL_VERIFICATION_REQUIRED: 'Verifica tu correo para realizar esta acción.', BREACHED_PASSWORD: 'Elige una contraseña que no aparezca en una filtración conocida.' } } as const

const cabinetCatalog = { es: {
        title: 'Espacio',
        publicList: {
            eyebrow: 'Catálogo público', title: 'Espacios disponibles', description: 'Explora espacios activos para belleza, medicina, consultas y citas con especialistas.', loading: 'Cargando espacios...', failedToLoad: 'No se pudieron cargar los espacios', emptyTitle: 'No se encontraron espacios', emptyDescription: 'No hay espacios activos disponibles ahora.', photoFallback: 'Foto del espacio', from: 'Desde', perHourShort: '/ hora', searchPlaceholder: 'Buscar por nombre o ciudad...', sortBy: 'Ordenar por', sortNewest: 'Más recientes', sortPopular: 'Más populares', sortPriceAsc: 'Precio: de menor a mayor', sortPriceDesc: 'Precio: de mayor a menor', advancedFilters: 'Filtros', cityLabel: 'Ciudad', cityPlaceholder: 'Cualquier ciudad', categoryLabel: 'Categoría', allCategories: 'Todas las categorías', categoryBeauty: 'Belleza', categoryMedical: 'Medicina', categoryConsultation: 'Consulta', categoryWellness: 'Bienestar', categoryOffice: 'Oficina', priceRangeLabel: 'Precio por hora', minPrice: 'Desde', maxPrice: 'Hasta', ratingLabel: 'Valoración', anyRating: 'Cualquier valoración', stars: 'estrellas', serviceLabel: 'Servicio', servicePlaceholder: 'p. ej., masaje', availableToday: 'Disponible hoy', clearFilters: 'Borrar filtros', resultsEyebrow: 'Búsqueda según disponibilidad', resultsTitle: 'Espacios cerca de ti', resultsCount: 'Se encontraron {{count}} espacios', viewMode: 'Vista del catálogo', splitView: 'Lista + mapa', listView: 'Lista', mapView: 'Mapa', backToSplitView: 'Volver a lista y mapa', view: 'Ver detalles', imageAlt: 'Interior de {{title}}', todayAvailability: 'Hoy', freeSlots: 'Quedan {{count}} turnos', mapTitle: 'Mapa de la zona', mapApproximate: 'Vista aproximada de la zona. La dirección exacta aparece en la página del espacio.', mapZoomIn: 'Acercar', mapZoomOut: 'Alejar', mapCurrentLocation: 'Usar mi ubicación', mapLocationLoading: 'Buscando tu ubicación...', mapLocationFound: 'Mapa centrado en tu ubicación.', mapLocationError: 'Ubicación no disponible. El mapa sigue siendo aproximado.', mapTileError: 'Los mapas no están disponibles temporalmente. Usa la lista o abre el mapa externamente.', openMap: 'Abrir mapa', selectedCabinet: 'Espacio seleccionado',
        },
    } } as const

const profilePrivacy = { es: {
        title: 'Datos y privacidad',
        description: 'Gestiona una copia de tus datos de AutoCare Hub y una solicitud de eliminación de cuenta.',
        exportTitle: 'Exportar mis datos',
        exportDescription: 'Descarga una copia JSON limitada de tu cuenta, reservas, notificaciones, favoritos y espacios.',
        exportAction: 'Descargar datos',
        exporting: 'Preparando la exportación...',
        exportSuccess: 'La exportación de tus datos está lista.',
        exportError: 'No se pudieron exportar tus datos.',
        deletionTitle: 'Eliminar mi cuenta',
        deletionDescription: 'Solicita la eliminación de tu cuenta para revisión. Los registros financieros y de reservas siguen la política de conservación.',
        requestAction: 'Solicitar eliminación',
        reasonLabel: 'Motivo (opcional)',
        reasonPlaceholder: 'Cuéntanos por qué te vas',
        confirmRequest: 'Enviar solicitud',
        requestPending: 'La solicitud de eliminación está pendiente de revisión.',
        requestedAt: 'Solicitado el {{date}}',
        cancelRequest: 'Cancelar solicitud',
        cancelConfirm: '¿Cancelar la solicitud pendiente de eliminación de cuenta?',
        requestSuccess: 'Solicitud de eliminación enviada.',
        requestError: 'No se pudo enviar la solicitud de eliminación.',
        cancelSuccess: 'Solicitud de eliminación cancelada.',
        cancelError: 'No se pudo cancelar la solicitud de eliminación.',
    } } as const

const booking = { es: {
        title: 'Reservas', myBookings: 'Mis reservas', noBookingsYet: 'Aún no hay reservas', loadingBookings: 'Cargando reservas...', failedToLoadBookings: 'No se pudieron cargar las reservas.', upcoming: 'Próximas', cancelled: 'Canceladas', completed: 'Completadas', cancelBooking: 'Cancelar reserva', confirmCancellation: 'Confirmar cancelación', cancelThisBooking: '¿Cancelar esta reserva?', keepBooking: 'Mantener reserva', cancelling: 'Cancelando...', bookingCancelledSuccessfully: 'Reserva cancelada correctamente.', failedToCancelBooking: 'No se pudo cancelar la reserva.', bookThisCabinet: 'Reservar este gabinete', chooseServiceAndTime: 'Elige un servicio y un horario.', selectService: 'Seleccionar servicio', selectDate: '2. Selecciona la fecha', selectTime: '3. Selecciona la hora', noAvailableTimes: 'No hay horarios disponibles para esta fecha.', createBooking: 'Crear reserva', creatingBooking: 'Creando reserva...', bookingCreatedSuccessfully: 'Reserva creada correctamente.', successTitle: 'Tu horario está reservado', viewMyBookings: 'Ver mis reservas', openDirections: 'Abrir indicaciones', pendingStatusLabel: 'Pendiente', confirmedStatusLabel: 'Confirmada', cancelledStatusLabel: 'Cancelada', completedStatusLabel: 'Completada',
    } } as const

export const esTranslations = createPopularLocale('es', { common: common.es, navigation: navigation.es, auth: auth.es, workspace: workspace.es, ownerDashboard: ownerDashboard.es, adminDashboard: adminDashboard.es, adminUsers: adminUsers.es, adminOwners: adminOwners.es, adminCabinets: adminCabinets.es, adminReviews: adminReviews.es, adminAuditLogs: adminAuditLogs.es, systemIncidents: systemIncidents.es, securityCenter: securityCenter.es, errors: errors.es, booking: booking.es, cabinet: cabinetCatalog.es, profile: { privacy: profilePrivacy.es }, landing: { ...landingExtraPopular.es, ...landingPopular.es, ...mockDashboard.es, eyebrow: 'CRM de reservas para alquiler de espacios', title: 'Gestiona espacios, servicios y reservas en un solo lugar.', description: 'AutoCare Hub ayuda a los clientes a reservar espacios y a los propietarios a gestionar sus anuncios.' } })
