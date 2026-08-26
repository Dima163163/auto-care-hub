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

const common = { pt: {
        loading: 'Carregando...', loadingPage: 'Carregando página...', error: 'Erro',
        failedToLoad: 'Não foi possível carregar.', create: 'Criar', edit: 'Editar', delete: 'Excluir',
        cancel: 'Cancelar', confirm: 'Confirmar', save: 'Salvar', back: 'Voltar', status: 'Status',
        actions: 'Ações', name: 'Nome', email: 'E-mail', saving: 'Salvando...',
        close: 'Fechar', dismiss: 'Dispensar', language: 'Idioma', theme: 'Tema', menu: 'Menu', more: 'Mais',
        switchToDarkTheme: 'Mudar para o tema escuro', switchToLightTheme: 'Mudar para o tema claro',
        notProvided: 'Não informado', tryAgainLater: 'Tente novamente mais tarde.', retry: 'Tentar novamente',
    } } as const

const navigation = { pt: { home: 'Início', features: 'Recursos', cabinets: 'Salas', services: 'Serviços automotivos', owners: 'Para proprietários', pricing: 'Preços', about: 'Sobre', profile: 'Perfil', myBookings: 'Minhas reservas', favorites: 'Favoritos', notifications: 'Notificações', ownerDashboard: 'Painel do proprietário', ownerCabinets: 'Minhas salas', ownerBookings: 'Reservas', ownerServices: 'Serviços', adminDashboard: 'Painel administrativo', adminUsers: 'Usuários', adminOwners: 'Proprietários', adminCabinets: 'Salas', adminReviews: 'Avaliações', adminAuditLogs: 'Logs de auditoria', ownerDashboardShort: 'Painel', ownerCalendar: 'Calendário' } } as const

const auth = { pt: { signIn: 'Entrar', logOut: 'Sair', createAccount: 'Criar conta', welcomeBack: 'Bem-vindo de volta', signInTitle: 'Entrar no AutoCare Hub', signInToContinue: 'Entre para continuar.', email: 'E-mail', password: 'Senha', signingIn: 'Entrando...', failedToSignIn: 'Não foi possível entrar.', alreadyHaveAccount: 'Já tem uma conta?', forgotPasswordLink: 'Esqueceu a senha?' } } as const

const workspace = { pt: { client: 'Área do cliente', owner: 'Área do proprietário', admin: 'Área administrativa', overview: 'Visão geral', manage: 'Gerenciar', configure: 'Configurar', monitor: 'Monitorar', support: 'Suporte', collapseSidebar: 'Recolher barra lateral', expandSidebar: 'Expandir barra lateral', systemStatus: 'Todos os sistemas operacionais' } } as const

const ownerDashboard = { pt: {
        title: 'Painel',
        description: 'Acompanhe salas, serviços, reservas e atividades operacionais.',
        loading: 'Carregando o painel...',
        failedToLoad: 'Não foi possível carregar o painel',
        activeCount: '{{count}} ativos',
        bookingStatusCounts: '{{pending}} pendentes · {{confirmed}} confirmadas',
        averageCabinetPrice: 'Preço médio da sala',
        perHour: 'Por hora',
        upcomingBookings: 'Próximas reservas',
        upcomingBookingsDescription: 'Reservas pendentes e confirmadas das suas salas.',
        noUpcomingBookings: 'Não há próximas reservas agora.',
        activeServices: 'Serviços ativos',
        activeServicesDescription: 'Serviços disponíveis para reserva.',
        noServices: 'Nenhum serviço criado ainda.',
        viewAll: 'Ver tudo',
        bookingMeta: 'Sala: {{cabinetId}} · Serviço: {{serviceId}}',
        serviceMeta: '{{duration}} min · {{price}}',
        analyticsTitle: 'Desempenho das reservas',
        analyticsDescription: 'Uma visão clara do trabalho agendado para os próximos 30 dias.',
        projectedRevenue: 'Receita agendada',
        bookedHours: 'Horas reservadas',
        bookingLoad: 'Carga de reservas',
        popularServices: 'Serviços populares',
        noBookingData: 'Os dados aparecerão quando os clientes fizerem reservas.',
        mobileRevenue: 'Receita',
        mobileOccupancy: 'Ocupação',
        mobileToday: 'Hoje',
        mobileAwaitingResponse: 'Aguardando sua resposta',
        mobileBookingExpires: 'Esta reserva expirará em breve',
        mobileConfirm: 'Confirmar',
        mobileDecline: 'Recusar',
        mobileUpcomingToday: 'Próximas hoje',
        mobileViewCalendar: 'Ver calendário',
        mobileOfflineDraft: 'Os rascunhos serão salvos quando a conexão voltar.',
        mobileReviewDraft: 'Revisar rascunho',
        mobileAddSpace: 'Adicionar sala',
        mobileMySpaces: 'Minhas salas',
        clientListTitle: 'Clientes',
        clientListDescription: 'Clientes que reservaram um dos seus serviços, ordenados pelo atendimento mais recente.',
        noClients: 'Nenhum cliente fez uma reserva ainda.',
        visits: '{{count}} visitas',
        lastBooking: 'Última reserva: {{date}}',
        noOwnerNote: 'Ainda não há uma nota interna.',
        actionCenter: {
            eyebrow: 'Central de ações',
            title: 'Tarefas que precisam da sua atenção',
            description: 'Revise as tarefas pendentes e abra o espaço exato para resolvê-las.',
            allClear: 'Tudo está em dia. Não há tarefas pendentes.',
            pendingBookings: 'Reservas pendentes',
            pendingBookingsDescription: 'Reservas aguardando sua confirmação.',
            rescheduleRequests: 'Pedidos de alteração',
            rescheduleRequestsDescription: 'Clientes aguardando uma decisão sobre outro horário.',
            draftCabinets: 'Salas em rascunho',
            draftCabinetsDescription: 'Espaços que ainda não estão prontos para reservas públicas.',
            blockedCabinets: 'Salas bloqueadas',
            blockedCabinetsDescription: 'Espaços que precisam de revisão ou configuração.',
            readiness: 'Pronto para publicar',
            readinessDescription: 'Conclua a configuração antes de aceitar reservas.',
            olderThan24Hours: '{{count}} há mais de 24 horas',
            open: 'Abrir espaço de trabalho',
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

const adminDashboard = { pt: {
        title: 'Painel administrativo',
        description: 'Monitore usuários, salas, atividade da plataforma e moderação.',
        loading: 'Carregando o painel administrativo...',
        failedToLoad: 'Não foi possível carregar o painel administrativo',
        users: 'Usuários',
        userRoleCounts: '{{clients}} clientes · {{owners}} proprietários · {{admins}} administradores',
        userStatusCounts: '{{active}} ativos · {{blocked}} bloqueados',
        activeCount: '{{count}} ativos',
        moderation: 'Moderação',
        moderationBreakdown: '{{draftCabinets}} salas em rascunho · {{blockedCabinets}} bloqueadas · {{blockedUsers}} usuários bloqueados',
        averageCabinetPrice: 'Preço médio da sala',
        perHour: 'Por hora',
        recentUsers: 'Usuários recentes',
        recentUsersDescription: 'Usuários mais recentes da plataforma conforme os dados de demonstração.',
        recentCabinets: 'Salas recentes',
        recentCabinetsDescription: 'Salas mais recentes com status de moderação.',
        noUsers: 'Nenhum usuário encontrado.',
        noCabinets: 'Nenhuma sala encontrada.',
        viewAll: 'Ver tudo',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.pt,
    } } as const

const adminOwners = { pt: { description: 'Gerencie os proprietários da plataforma e o acesso às contas.', emptyTitle: 'Nenhum proprietário encontrado', emptyDescription: 'Os proprietários aparecerão aqui depois de criarem uma conta.' } } as const

const adminCabinets = { pt: {
        title: 'Salas', description: 'Revise e modere os anúncios de salas.', loading: 'Carregando salas...', failedToLoad: 'Não foi possível carregar as salas', emptyTitle: 'Nenhuma sala encontrada', emptyDescription: 'As salas da plataforma aparecerão aqui.', statusUpdatedSuccessfully: 'Status da sala atualizado.', statusUpdateFailed: 'Não foi possível atualizar o status da sala.', blockedSuccessfully: 'Sala bloqueada.', blockFailed: 'Não foi possível bloquear a sala.', confirmBlockEyebrow: 'Confirmar bloqueio da sala', confirmBlockTitle: 'Bloquear esta sala?', confirmBlockDescription: 'A sala ficará oculta nos anúncios públicos e os clientes não poderão reservá-la.', keepAvailable: 'Manter disponível', confirmBlocking: 'Confirmar bloqueio', blockingAction: 'Bloqueando...',
    } } as const

const adminReviews = { pt: { title: 'Avaliações', description: 'Modere as avaliações dos clientes antes da publicação.', loading: 'Carregando avaliações...', emptyTitle: 'Ainda não há avaliações', emptyDescription: 'As avaliações dos clientes aparecerão aqui após o envio.', statusUpdatedSuccessfully: 'Status da avaliação atualizado.', statusUpdateFailed: 'Não foi possível atualizar o status da avaliação.', pendingAction: 'Enviar novamente para moderação', approvedAction: 'Aprovar', rejectedAction: 'Rejeitar', deleteAction: 'Excluir', deleting: 'Excluindo...', deletedSuccessfully: 'Avaliação excluída.', deleteFailed: 'Não foi possível excluir a avaliação.', confirmDeleteEyebrow: 'Excluir avaliação', confirmDeleteTitle: 'Excluir esta avaliação?', confirmDeleteDescription: 'Esta ação remove permanentemente a avaliação do projeto.' } } as const

const securityCenter = { pt: { title: 'Central de segurança', description: 'Revise falhas de autenticação, sinais de abuso, IPs de origem, rotas e status de investigação no espaço do superadministrador.', permissionTitle: 'Acesso de superadministrador necessário', permissionDescription: 'Este espaço expõe telemetria sensível e está disponível apenas para superadministradores.', loadError: 'Não foi possível carregar a telemetria de segurança.', exportReport: 'Exportar relatório', timeline: 'Linha do tempo da investigação', assignee: 'Responsável', unassigned: 'Não atribuído', assignToMe: 'Atribuir a mim', mitigationsTitle: 'Mitigações temporárias', activeMitigations: 'Bloqueios ativos', topIps: 'IPs de origem mais ativos', topRoutes: 'Rotas mais visadas', typeFilter: 'Tipo de evento', allTypes: 'Todos os tipos', severityFilter: 'Gravidade', allSeverities: 'Todas as gravidades', statusFilter: 'Status da investigação', allStatuses: 'Todos os status', eventsTitle: 'Atividade de segurança', empty: 'Nenhum evento de segurança corresponde a estes filtros.', loadMore: 'Carregar mais', loadingMore: 'Carregando mais...', types: { login_failed: 'Falha no login', account_locked: 'Conta bloqueada', refresh_token_reuse: 'Reutilização de token', rate_limit_exceeded: 'Limite de requisições excedido', invalid_token: 'Token inválido', csrf_violation: 'Violação de CSRF', route_scan: 'Solicitação de rota desconhecida', malformed_request: 'Solicitação malformada', oversized_request: 'Solicitação muito grande', privilege_denied: 'Privilégio negado', webhook_abuse: 'Abuso de webhook', mutation_burst: 'Pico de mutações' }, severities: { info: 'Info', warning: 'Aviso', high: 'Alta', critical: 'Crítica' }, statuses: { open: 'Aberto', acknowledged: 'Reconhecido', investigating: 'Em investigação', resolved: 'Resolvido', suppressed: 'Suprimido' }, actorRoles: { client: 'Cliente', owner: 'Proprietário', admin: 'Admin', super_admin: 'Superadministrador' }, authOutcomes: { unknown: 'Desconhecido', anonymous: 'Anônimo', authenticated: 'Autenticado', failed: 'Falhou' }, rateLimitResults: { not_checked: 'Não verificado', allowed: 'Permitido', blocked: 'Bloqueado' }, proxyProvenances: { unknown: 'Desconhecida', direct: 'Conexão direta', trusted_proxy: 'Proxy confiável', forwarded_header_untrusted: 'Cabeçalho encaminhado não confiável' } } } as const

const systemIncidents = { pt: { tab: 'Incidentes do sistema', title: 'Incidentes do sistema', description: 'Os eventos operacionais são separados da atividade dos usuários e podem ser reconhecidos ou resolvidos aqui.', incident: 'Incidente', severity: 'Gravidade', occurrences: 'Ocorrências', firstSeen: 'Visto pela primeira vez', lastSeen: 'Visto pela última vez', requestId: 'ID da solicitação', acknowledge: 'Reconhecer', resolve: 'Resolver', statusOpen: 'Aberto', statusAcknowledged: 'Reconhecido', statusResolved: 'Resolvido', severityWarning: 'Aviso', severityCritical: 'Crítico', metadata: 'Metadados', showMetadata: 'Ver metadados', copyRequestId: 'Copiar ID da solicitação', copied: 'ID da solicitação copiado', copyFailed: 'Não foi possível copiar o ID da solicitação.', emptyTitle: 'Nenhum incidente ativo', emptyDescription: 'Incidentes do servidor e operacionais aparecerão aqui quando forem detectados.', searchPlaceholder: 'Pesquisar incidentes...', statusFilter: 'Status', allStatuses: 'Todos', acknowledgedAt: 'Reconhecido', resolvedAt: 'Resolvido', loadedCount: '{count} incidentes carregados', loadMore: 'Carregar mais', loadingMore: 'Carregando mais...' } } as const

const adminAuditLogs = { pt: {
        title: 'Logs de auditoria', description: 'Acompanhe todas as ações administrativas e de segurança da plataforma.', timestamp: 'Hora', actor: 'Autor', action: 'Ação', target: 'Alvo', metadata: 'Metadados', noLogs: 'Nenhum log de auditoria encontrado.', emptyDescription: 'Os eventos de auditoria aparecerão aqui quando ações forem realizadas.', searchPlaceholder: 'Pesquisar logs...', export: 'Exportar CSV', auditTab: 'Auditoria de atividade', showMetadata: 'Ver metadados', saveFilter: 'Salvar filtro', clearFilter: 'Limpar filtro salvo', savedFilter: 'Filtro salvo: {query}', filterSaved: 'Filtro de auditoria salvo para esta sessão.', filterCleared: 'Filtro de auditoria salvo removido.', loadedCount: '{count} eventos carregados', loadMore: 'Carregar mais', loadingMore: 'Carregando mais...',
        actions: { user_status_updated: 'Status do usuário atualizado', user_role_updated: 'Função do usuário atualizada', admin_created: 'Administrador criado', cabinet_status_updated: 'Status da sala atualizado', review_moderated: 'Avaliação moderada', review_deleted: 'Avaliação excluída', subscription_created: 'Assinatura criada', promo_subscription_issued: 'Assinatura promocional emitida', login_failed: 'Tentativa de login falhou', account_locked: 'Conta bloqueada', refresh_token_reuse: 'Reutilização do token detectada', outbox_retried: 'Evento outbox reenviado', outbox_dead_lettered: 'Evento outbox movido para falha definitiva', oauth_identity_linked: 'Identidade OAuth vinculada', oauth_identity_unlinked: 'Identidade OAuth desvinculada', account_deletion_requested: 'Exclusão de conta solicitada', account_deletion_cancelled: 'Exclusão de conta cancelada', account_deletion_completed: 'Exclusão de conta concluída', security_events_viewed: 'Eventos de segurança consultados', security_center_viewed: 'Central de segurança consultada', security_center_event_status_updated: 'Status do evento de segurança atualizado', security_center_report_exported: 'Relatório de segurança exportado', security_user_sessions_revoked: 'Sessões do usuário revogadas pela Central de segurança' },
    } } as const

const adminUsers = { pt: {
        title: 'Usuários',
        description: 'Gerencie os status dos usuários e o acesso às contas.',
        loading: 'Carregando usuários...',
        failedToLoad: 'Não foi possível carregar os usuários',
        emptyTitle: 'Nenhum usuário encontrado',
        emptyDescription: 'Os usuários da plataforma aparecerão aqui.',
        userColumn: 'Usuário',
        statusUpdatedSuccessfully: 'Status do usuário atualizado.',
        statusUpdateFailed: 'Não foi possível atualizar o status do usuário.',
        blockedSuccessfully: 'Usuário bloqueado.',
        blockFailed: 'Não foi possível bloquear o usuário.',
        confirmBlockEyebrow: 'Confirmar bloqueio do usuário',
        confirmBlockTitle: 'Bloquear este usuário?',
        confirmBlockDescription: 'O usuário não poderá entrar nem usar páginas protegidas.',
        adminStatusRestricted: 'Somente o superadministrador pode gerenciar contas de administradores.',
        keepActive: 'Manter ativo',
        confirmBlocking: 'Confirmar bloqueio',
        blockingAction: 'Bloqueando...',
        createAdminTitle: 'Criar administrador',
        createAdminDescription: 'Convide um administrador. Ele deverá criar uma senha pelo link abaixo.',
        adminCreatedSuccessfully: 'Administrador criado com sucesso.',
        adminCreateFailed: 'Não foi possível criar o administrador.',
        setupUrlLabel: 'Link de configuração',
        setupUrlDescription: 'Compartilhe este link para que o novo administrador defina a senha.',
        roleUpdatedSuccessfully: 'Função do usuário atualizada.',
        roleUpdateFailed: 'Não foi possível atualizar a função do usuário.',
        roleClient: 'Cliente',
        roleOwner: 'Proprietário',
        roleAdmin: 'Administrador',
        roleSuperAdmin: 'Superadministrador',
    } } as const

const mockDashboard = { pt: { dashboardWelcome: 'Bem-vinda, Ana!', dashboardSubtitle: 'Está tudo sob controle.', dashboardBookings: 'Reservas', dashboardRequests: 'Novas solicitações', dashboardCabinets: 'Salas', dashboardReviews: 'Avaliações', latestBookings: 'Últimas reservas', viewAllBookings: 'Ver todas as reservas', calendarMonth: 'Maio de 2025', weekdayMonShort: 'Seg', weekdayTueShort: 'Ter', weekdayWedShort: 'Qua', weekdayThuShort: 'Qui', weekdayFriShort: 'Sex', weekdaySatShort: 'Sáb', weekdaySunShort: 'Dom', loadTitle: 'Ocupação das salas', bookingConfirmed: 'Confirmada', bookingPending: 'Pendente', bookingName1: 'Irene S.', bookingName2: 'Alex O.', bookingName3: 'Catarina P.', bookingCabinet1: 'Sala 1', bookingCabinet2: 'Sala 2', bookingCabinet3: 'Sala 3', bookingToday1100: 'Hoje, 11:00', bookingToday1230: 'Hoje, 12:30', bookingTomorrow1000: 'Amanhã, 10:00' } } as const

const errors = { pt: { VALIDATION_ERROR: 'A validação falhou. Verifique o formulário.', NOT_FOUND: 'O recurso solicitado não foi encontrado.', INTERNAL_SERVER_ERROR: 'Algo deu errado. Tente novamente mais tarde.', BAD_REQUEST: 'Solicitação inválida.', UNAUTHORIZED: 'Entre para continuar.', FORBIDDEN: 'Você não tem permissão para realizar esta ação.', CONFLICT: 'Ocorreu um conflito. Este registro pode já existir.', TOO_MANY_REQUESTS: 'Muitas solicitações. Tente mais devagar.', CSRF_ORIGIN_MISMATCH: 'A verificação de segurança falhou.', CSRF_TOKEN_MISMATCH: 'A sessão expirou ou é inválida.', EMAIL_VERIFICATION_REQUIRED: 'Verifique seu e-mail para realizar esta ação.', BREACHED_PASSWORD: 'Escolha uma senha que não tenha aparecido em um vazamento conhecido.' } } as const

const cabinetCatalog = { pt: {
        title: 'Sala',
        publicList: {
            eyebrow: 'Catálogo público', title: 'Salas disponíveis', description: 'Encontre espaços ativos para beleza, medicina, consultas e atendimentos especializados.', loading: 'Carregando salas...', failedToLoad: 'Não foi possível carregar as salas', emptyTitle: 'Nenhuma sala encontrada', emptyDescription: 'Não há salas ativas disponíveis no momento.', photoFallback: 'Foto da sala', from: 'A partir de', perHourShort: '/ hora', searchPlaceholder: 'Pesquise por nome ou cidade...', sortBy: 'Ordenar por', sortNewest: 'Mais recentes', sortPopular: 'Mais populares', sortPriceAsc: 'Preço: menor para maior', sortPriceDesc: 'Preço: maior para menor', advancedFilters: 'Filtros', cityLabel: 'Cidade', cityPlaceholder: 'Qualquer cidade', categoryLabel: 'Categoria', allCategories: 'Todas as categorias', categoryBeauty: 'Beleza', categoryMedical: 'Medicina', categoryConsultation: 'Consulta', categoryWellness: 'Bem-estar', categoryOffice: 'Escritório', priceRangeLabel: 'Preço por hora', minPrice: 'De', maxPrice: 'Até', ratingLabel: 'Avaliação', anyRating: 'Qualquer avaliação', stars: 'estrelas', serviceLabel: 'Serviço', servicePlaceholder: 'ex.: massagem', availableToday: 'Disponível hoje', clearFilters: 'Limpar filtros', resultsEyebrow: 'Busca por disponibilidade', resultsTitle: 'Salas perto de você', resultsCount: '{{count}} salas encontradas', viewMode: 'Visualização do catálogo', splitView: 'Lista + mapa', listView: 'Lista', mapView: 'Mapa', backToSplitView: 'Voltar para lista e mapa', view: 'Ver detalhes', imageAlt: 'Interior de {{title}}', todayAvailability: 'Hoje', freeSlots: '{{count}} horários restantes', mapTitle: 'Mapa da região', mapApproximate: 'Visão aproximada da região. O endereço exato aparece na página da sala.', mapZoomIn: 'Aumentar zoom', mapZoomOut: 'Diminuir zoom', mapCurrentLocation: 'Usar minha localização', mapLocationLoading: 'Encontrando sua localização...', mapLocationFound: 'Mapa centralizado na sua localização.', mapLocationError: 'Localização indisponível. O mapa permanece aproximado.', mapTileError: 'Os mapas estão temporariamente indisponíveis. Use a lista ou abra o mapa externamente.', openMap: 'Abrir mapa', selectedCabinet: 'Sala selecionada',
        },
    } } as const

const profilePrivacy = { pt: {
        title: 'Dados e privacidade',
        description: 'Gerencie uma cópia dos seus dados do AutoCare Hub e uma solicitação de exclusão da conta.',
        exportTitle: 'Exportar meus dados',
        exportDescription: 'Baixe uma cópia JSON limitada da sua conta, reservas, notificações, favoritos e salas.',
        exportAction: 'Baixar dados',
        exporting: 'Preparando a exportação...',
        exportSuccess: 'A exportação dos seus dados está pronta.',
        exportError: 'Não foi possível exportar seus dados.',
        deletionTitle: 'Excluir minha conta',
        deletionDescription: 'Solicite a exclusão da conta para análise. Registros financeiros e de reservas seguem a política de retenção.',
        requestAction: 'Solicitar exclusão',
        reasonLabel: 'Motivo (opcional)',
        reasonPlaceholder: 'Conte por que você está saindo',
        confirmRequest: 'Enviar solicitação',
        requestPending: 'A solicitação de exclusão está aguardando análise.',
        requestedAt: 'Solicitada em {{date}}',
        cancelRequest: 'Cancelar solicitação',
        cancelConfirm: 'Cancelar a solicitação pendente de exclusão da conta?',
        requestSuccess: 'Solicitação de exclusão enviada.',
        requestError: 'Não foi possível enviar a solicitação de exclusão.',
        cancelSuccess: 'Solicitação de exclusão cancelada.',
        cancelError: 'Não foi possível cancelar a solicitação de exclusão.',
    } } as const

const booking = { pt: {
        title: 'Reservas', myBookings: 'Minhas reservas', noBookingsYet: 'Ainda não há reservas', loadingBookings: 'Carregando reservas...', failedToLoadBookings: 'Não foi possível carregar as reservas.', upcoming: 'Próximas', cancelled: 'Canceladas', completed: 'Concluídas', cancelBooking: 'Cancelar reserva', confirmCancellation: 'Confirmar cancelamento', cancelThisBooking: 'Cancelar esta reserva?', keepBooking: 'Manter reserva', cancelling: 'Cancelando...', bookingCancelledSuccessfully: 'Reserva cancelada com sucesso.', failedToCancelBooking: 'Não foi possível cancelar a reserva.', bookThisCabinet: 'Reservar este espaço', chooseServiceAndTime: 'Escolha um serviço e um horário.', selectService: 'Selecionar serviço', selectDate: '2. Selecionar data', selectTime: '3. Selecionar horário', noAvailableTimes: 'Não há horários disponíveis para esta data.', createBooking: 'Criar reserva', creatingBooking: 'Criando reserva...', bookingCreatedSuccessfully: 'Reserva criada com sucesso.', successTitle: 'Seu horário está reservado', viewMyBookings: 'Ver minhas reservas', openDirections: 'Abrir rota', pendingStatusLabel: 'Pendente', confirmedStatusLabel: 'Confirmada', cancelledStatusLabel: 'Cancelada', completedStatusLabel: 'Concluída',
    } } as const

export const ptTranslations = createPopularLocale('pt', { common: common.pt, navigation: navigation.pt, auth: auth.pt, workspace: workspace.pt, ownerDashboard: ownerDashboard.pt, adminDashboard: adminDashboard.pt, adminUsers: adminUsers.pt, adminOwners: adminOwners.pt, adminCabinets: adminCabinets.pt, adminReviews: adminReviews.pt, adminAuditLogs: adminAuditLogs.pt, systemIncidents: systemIncidents.pt, securityCenter: securityCenter.pt, errors: errors.pt, booking: booking.pt, cabinet: cabinetCatalog.pt, profile: { privacy: profilePrivacy.pt }, landing: { ...landingExtraPopular.pt, ...landingPopular.pt, ...mockDashboard.pt, eyebrow: 'CRM de reservas para salas', title: 'Gerencie salas, serviços e reservas em um só lugar.', description: 'O AutoCare Hub ajuda clientes a reservar salas e proprietários a gerenciar seus anúncios.' } })
