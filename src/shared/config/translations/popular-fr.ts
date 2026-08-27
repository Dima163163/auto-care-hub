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

const common = { fr: {
        loading: 'Chargement...', loadingPage: 'Chargement de la page...', error: 'Erreur',
        failedToLoad: 'Impossible de charger.', create: 'Créer', edit: 'Modifier', delete: 'Supprimer',
        cancel: 'Annuler', confirm: 'Confirmer', save: 'Enregistrer', back: 'Retour', status: 'Statut',
        actions: 'Actions', name: 'Nom', email: 'E-mail', saving: 'Enregistrement...',
        close: 'Fermer', dismiss: 'Ignorer', language: 'Langue', theme: 'Thème', menu: 'Menu', more: 'Plus',
        switchToDarkTheme: 'Activer le thème sombre', switchToLightTheme: 'Activer le thème clair',
        notProvided: 'Non renseigné', tryAgainLater: 'Veuillez réessayer plus tard.', retry: 'Réessayer',
    } } as const

const navigation = { fr: { home: 'Accueil', features: 'Fonctionnalités', cabinets: 'Cabinets', services: 'Services auto', owners: 'Pour les propriétaires', pricing: 'Tarifs', about: 'À propos', profile: 'Profil', myBookings: 'Mes réservations', favorites: 'Favoris', notifications: 'Notifications', ownerDashboard: 'Tableau de bord propriétaire', ownerCabinets: 'Mes cabinets', ownerBookings: 'Réservations', ownerServices: 'Services', adminDashboard: 'Tableau de bord admin', adminUsers: 'Utilisateurs', adminOwners: 'Propriétaires', adminCabinets: 'Cabinets', adminReviews: 'Avis', adminAuditLogs: 'Journaux d’audit', ownerDashboardShort: 'Tableau de bord', ownerCalendar: 'Calendrier' } } as const

const auth = { fr: { signIn: 'Se connecter', logOut: 'Se déconnecter', createAccount: 'Créer un compte', welcomeBack: 'Bon retour', signInTitle: 'Se connecter à AutoCare Hub', signInToContinue: 'Connectez-vous pour continuer.', email: 'E-mail', password: 'Mot de passe', signingIn: 'Connexion...', failedToSignIn: 'Échec de la connexion.', alreadyHaveAccount: 'Vous avez déjà un compte ?', forgotPasswordLink: 'Mot de passe oublié ?' } } as const

const workspace = { fr: { client: 'Espace client', owner: 'Espace propriétaire', admin: 'Espace administrateur', overview: 'Vue d’ensemble', manage: 'Gérer', configure: 'Configurer', monitor: 'Surveiller', support: 'Assistance', collapseSidebar: 'Réduire la barre latérale', expandSidebar: 'Développer la barre latérale', systemStatus: 'Tous les systèmes fonctionnent' } } as const

const ownerDashboard = { fr: {
        title: 'Tableau de bord',
        description: 'Suivez vos cabinets, services, réservations et activités opérationnelles.',
        loading: 'Chargement du tableau de bord...',
        failedToLoad: 'Impossible de charger le tableau de bord',
        activeCount: '{{count}} actifs',
        bookingStatusCounts: '{{pending}} en attente · {{confirmed}} confirmées',
        averageCabinetPrice: 'Prix moyen du cabinet',
        perHour: 'Par heure',
        upcomingBookings: 'Réservations à venir',
        upcomingBookingsDescription: 'Réservations en attente et confirmées pour vos cabinets.',
        noUpcomingBookings: 'Aucune réservation à venir pour le moment.',
        activeServices: 'Services actifs',
        activeServicesDescription: 'Services actuellement disponibles à la réservation.',
        noServices: 'Aucun service créé pour le moment.',
        viewAll: 'Tout voir',
        bookingMeta: 'Cabinet : {{cabinetId}} · Service : {{serviceId}}',
        serviceMeta: '{{duration}} min · {{price}}',
        analyticsTitle: 'Performance des réservations',
        analyticsDescription: 'Vue claire du travail planifié pour les 30 prochains jours.',
        projectedRevenue: 'Revenus planifiés',
        bookedHours: 'Heures réservées',
        bookingLoad: 'Charge de réservation',
        popularServices: 'Services populaires',
        noBookingData: 'Les données apparaîtront lorsque les clients prendront rendez-vous.',
        mobileRevenue: 'Revenus',
        mobileOccupancy: 'Occupation',
        mobileToday: "Aujourd'hui",
        mobileAwaitingResponse: 'En attente de votre réponse',
        mobileBookingExpires: 'Cette réservation va bientôt expirer',
        mobileConfirm: 'Confirmer',
        mobileDecline: 'Refuser',
        mobileUpcomingToday: "À venir aujourd'hui",
        mobileViewCalendar: 'Voir le calendrier',
        mobileOfflineDraft: 'Les brouillons seront enregistrés à la reconnexion.',
        mobileReviewDraft: 'Vérifier le brouillon',
        mobileAddSpace: 'Ajouter un espace',
        mobileMySpaces: 'Mes espaces',
        clientListTitle: 'Votre clientèle',
        clientListDescription: 'Clients ayant réservé un de vos services, classés selon leur rendez-vous le plus récent.',
        noClients: "Aucun client n'a encore réservé.",
        visits: '{{count}} visites',
        lastBooking: 'Dernière réservation : {{date}}',
        noOwnerNote: 'Aucune note interne pour le moment.',
        actionCenter: {
            eyebrow: 'Centre d’actions',
            title: 'Tâches nécessitant votre attention',
            description: 'Consultez les tâches en attente et ouvrez directement l’espace pour les résoudre.',
            allClear: 'Tout est à jour. Aucune tâche ne nécessite votre attention.',
            pendingBookings: 'Réservations en attente',
            pendingBookingsDescription: 'Réservations qui attendent votre confirmation.',
            rescheduleRequests: 'Demandes de report',
            rescheduleRequestsDescription: 'Clients en attente d’une décision sur un nouvel horaire.',
            draftCabinets: 'Cabinets en brouillon',
            draftCabinetsDescription: 'Espaces pas encore prêts pour la réservation publique.',
            blockedCabinets: 'Cabinets bloqués',
            blockedCabinetsDescription: 'Espaces nécessitant une vérification ou une configuration.',
            readiness: 'Prêt pour le lancement',
            readinessDescription: 'Terminez la configuration avant d’accepter des réservations.',
            olderThan24Hours: '{{count}} depuis plus de 24 heures',
            open: 'Ouvrir l’espace',
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

const adminDashboard = { fr: {
        title: 'Tableau de bord admin',
        description: 'Surveillez les utilisateurs, cabinets, activités et statuts de modération.',
        loading: 'Chargement du tableau de bord admin...',
        failedToLoad: 'Impossible de charger le tableau de bord admin',
        users: 'Utilisateurs',
        userRoleCounts: '{{clients}} clients · {{owners}} propriétaires · {{admins}} administrateurs',
        userStatusCounts: '{{active}} actifs · {{blocked}} bloqués',
        activeCount: '{{count}} actifs',
        moderation: 'Modération',
        moderationBreakdown: '{{draftCabinets}} cabinets en brouillon · {{blockedCabinets}} bloqués · {{blockedUsers}} utilisateurs bloqués',
        averageCabinetPrice: 'Prix moyen du cabinet',
        perHour: 'Par heure',
        recentUsers: 'Utilisateurs récents',
        recentUsersDescription: 'Derniers utilisateurs de la plateforme selon les données de démonstration.',
        recentCabinets: 'Cabinets récents',
        recentCabinetsDescription: 'Derniers cabinets avec leur statut de modération.',
        noUsers: 'Aucun utilisateur trouvé.',
        noCabinets: 'Aucun cabinet trouvé.',
        viewAll: 'Tout voir',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.fr,
    } } as const

const adminOwners = { fr: { description: 'Gérez les propriétaires de la plateforme et l’accès à leurs comptes.', emptyTitle: 'Aucun propriétaire trouvé', emptyDescription: 'Les propriétaires apparaîtront ici après la création de leur compte.' } } as const

const adminCabinets = { fr: {
        title: 'Espaces professionnels', description: 'Vérifiez et modérez les annonces de cabinets.', loading: 'Chargement des cabinets...', failedToLoad: 'Impossible de charger les cabinets', emptyTitle: 'Aucun cabinet trouvé', emptyDescription: 'Les cabinets de la plateforme apparaîtront ici.', statusUpdatedSuccessfully: 'Statut du cabinet mis à jour.', statusUpdateFailed: 'Impossible de mettre à jour le statut du cabinet.', blockedSuccessfully: 'Cabinet bloqué.', blockFailed: 'Impossible de bloquer le cabinet.', confirmBlockEyebrow: 'Confirmer le blocage du cabinet', confirmBlockTitle: 'Bloquer ce cabinet ?', confirmBlockDescription: 'Le cabinet sera masqué des annonces publiques et les clients ne pourront plus le réserver.', keepAvailable: 'Garder disponible', confirmBlocking: 'Confirmer le blocage', blockingAction: 'Blocage...',
    } } as const

const adminReviews = { fr: { title: 'Avis', description: 'Modérez les avis clients avant leur publication.', loading: 'Chargement des avis...', emptyTitle: 'Aucun avis pour le moment', emptyDescription: 'Les avis clients apparaîtront ici après leur envoi.', statusUpdatedSuccessfully: 'Statut de l’avis mis à jour.', statusUpdateFailed: 'Impossible de mettre à jour le statut de l’avis.', pendingAction: 'Renvoyer en modération', approvedAction: 'Approuver', rejectedAction: 'Refuser', deleteAction: 'Supprimer', deleting: 'Suppression...', deletedSuccessfully: 'Avis supprimé.', deleteFailed: 'Impossible de supprimer l’avis.', confirmDeleteEyebrow: 'Supprimer l’avis', confirmDeleteTitle: 'Supprimer cet avis ?', confirmDeleteDescription: 'Cette action supprime définitivement l’avis du projet.' } } as const

const securityCenter = { fr: { title: 'Centre de sécurité', description: 'Examinez les échecs d’authentification, signaux d’abus, IP sources, routes et statut des enquêtes dans l’espace super-administrateur.', permissionTitle: 'Accès super-administrateur requis', permissionDescription: 'Cet espace expose une télémétrie sensible et est réservé au rôle super-administrateur.', loadError: 'Impossible de charger la télémétrie de sécurité.', exportReport: 'Exporter le rapport', timeline: 'Chronologie de l’enquête', assignee: 'Responsable', unassigned: 'Non attribué', assignToMe: 'M’attribuer', mitigationsTitle: 'Mesures temporaires', activeMitigations: 'Blocages actifs', topIps: 'IP sources les plus actives', topRoutes: 'Routes les plus ciblées', typeFilter: 'Type d’événement', allTypes: 'Tous les types', severityFilter: 'Gravité', allSeverities: 'Toutes les gravités', statusFilter: 'Statut de l’enquête', allStatuses: 'Tous les statuts', eventsTitle: 'Activité de sécurité', empty: 'Aucun événement de sécurité ne correspond à ces filtres.', loadMore: 'Charger plus', loadingMore: 'Chargement...', types: { login_failed: 'Échec de connexion', account_locked: 'Compte verrouillé', refresh_token_reuse: 'Réutilisation du jeton', rate_limit_exceeded: 'Limite de requêtes dépassée', invalid_token: 'Jeton invalide', csrf_violation: 'Violation CSRF', route_scan: 'Requête vers une route inconnue', malformed_request: 'Requête mal formée', oversized_request: 'Requête trop volumineuse', privilege_denied: 'Privilège refusé', webhook_abuse: 'Abus de webhook', mutation_burst: 'Pic de mutations' }, severities: { info: 'Info', warning: 'Avertissement', high: 'Élevée', critical: 'Critique' }, statuses: { open: 'Ouvert', acknowledged: 'Reconnu', investigating: 'En enquête', resolved: 'Résolu', suppressed: 'Supprimé' }, actorRoles: { client: 'Client', owner: 'Propriétaire', admin: 'Administrateur', super_admin: 'Super-administrateur' }, authOutcomes: { unknown: 'Inconnu', anonymous: 'Anonyme', authenticated: 'Authentifié', failed: 'Échec' }, rateLimitResults: { not_checked: 'Non vérifié', allowed: 'Autorisé', blocked: 'Bloqué' }, proxyProvenances: { unknown: 'Inconnue', direct: 'Connexion directe', trusted_proxy: 'Proxy de confiance', forwarded_header_untrusted: 'En-tête transféré non fiable' } } } as const

const systemIncidents = { fr: { tab: 'Incidents système', title: 'Incidents système', description: 'Les événements opérationnels sont séparés de l’activité utilisateur et peuvent être reconnus ou résolus ici.', incident: 'Incident', severity: 'Gravité', occurrences: 'Occurrences', firstSeen: 'Première détection', lastSeen: 'Dernière détection', requestId: 'ID de requête', acknowledge: 'Reconnaître', resolve: 'Résoudre', statusOpen: 'Ouvert', statusAcknowledged: 'Reconnu', statusResolved: 'Résolu', severityWarning: 'Avertissement', severityCritical: 'Critique', metadata: 'Métadonnées', showMetadata: 'Voir les métadonnées', copyRequestId: 'Copier l’ID de requête', copied: 'ID de requête copié', copyFailed: 'Impossible de copier l’ID de requête.', emptyTitle: 'Aucun incident actif', emptyDescription: 'Les incidents serveur et opérationnels apparaîtront ici lorsqu’ils seront détectés.', searchPlaceholder: 'Rechercher des incidents...', statusFilter: 'Statut', allStatuses: 'Tous', acknowledgedAt: 'Reconnu', resolvedAt: 'Résolu', loadedCount: '{count} incidents chargés', loadMore: 'Charger plus', loadingMore: 'Chargement...' } } as const

const adminAuditLogs = { fr: {
        title: 'Journaux d’audit', description: 'Suivez toutes les actions administratives et de sécurité de la plateforme.', timestamp: 'Heure', actor: 'Auteur', action: 'Action', target: 'Cible', metadata: 'Métadonnées', noLogs: 'Aucun journal trouvé.', emptyDescription: 'Les événements d’audit apparaîtront ici lorsque des actions seront effectuées.', searchPlaceholder: 'Rechercher dans les journaux...', export: 'Exporter en CSV', auditTab: 'Audit d’activité', showMetadata: 'Voir les métadonnées', saveFilter: 'Enregistrer le filtre', clearFilter: 'Effacer le filtre enregistré', savedFilter: 'Filtre enregistré : {query}', filterSaved: 'Filtre d’audit enregistré pour cette session.', filterCleared: 'Filtre d’audit enregistré effacé.', loadedCount: '{count} événements chargés', loadMore: 'Charger plus', loadingMore: 'Chargement...',
        actions: { user_status_updated: 'Statut utilisateur mis à jour', user_role_updated: 'Rôle utilisateur mis à jour', admin_created: 'Administrateur créé', cabinet_status_updated: 'Statut du cabinet mis à jour', review_moderated: 'Avis modéré', review_deleted: 'Avis supprimé', subscription_created: 'Abonnement créé', promo_subscription_issued: 'Abonnement promotionnel attribué', login_failed: 'Tentative de connexion échouée', account_locked: 'Compte verrouillé', refresh_token_reuse: 'Réutilisation du jeton détectée', outbox_retried: 'Événement outbox réessayé', outbox_dead_lettered: 'Événement outbox placé en échec définitif', oauth_identity_linked: 'Identité OAuth liée', oauth_identity_unlinked: 'Identité OAuth dissociée', account_deletion_requested: 'Suppression du compte demandée', account_deletion_cancelled: 'Suppression du compte annulée', account_deletion_completed: 'Suppression du compte terminée', security_events_viewed: 'Événements de sécurité consultés', security_center_viewed: 'Centre de sécurité consulté', security_center_event_status_updated: 'Statut de l’événement de sécurité mis à jour', security_center_report_exported: 'Rapport de sécurité exporté', security_user_sessions_revoked: 'Sessions utilisateur révoquées depuis le Centre de sécurité' },
    } } as const

const adminUsers = { fr: {
        title: 'Utilisateurs',
        description: 'Gérez les statuts des utilisateurs et l’accès aux comptes.',
        loading: 'Chargement des utilisateurs...',
        failedToLoad: 'Impossible de charger les utilisateurs',
        emptyTitle: 'Aucun utilisateur trouvé',
        emptyDescription: 'Les utilisateurs de la plateforme apparaîtront ici.',
        userColumn: 'Utilisateur',
        statusUpdatedSuccessfully: 'Statut de l’utilisateur mis à jour.',
        statusUpdateFailed: 'Impossible de mettre à jour le statut.',
        blockedSuccessfully: 'Utilisateur bloqué.',
        blockFailed: 'Impossible de bloquer l’utilisateur.',
        confirmBlockEyebrow: 'Confirmer le blocage',
        confirmBlockTitle: 'Bloquer cet utilisateur ?',
        confirmBlockDescription: 'Il ne pourra plus se connecter ni utiliser les pages protégées.',
        adminStatusRestricted: 'Seul le super administrateur peut gérer les comptes administrateurs.',
        keepActive: 'Garder actif',
        confirmBlocking: 'Confirmer le blocage',
        blockingAction: 'Blocage...',
        createAdminTitle: 'Créer un administrateur',
        createAdminDescription: 'Invitez un administrateur. Il devra définir un mot de passe avec le lien ci-dessous.',
        adminCreatedSuccessfully: 'Administrateur créé avec succès.',
        adminCreateFailed: 'Impossible de créer l’administrateur.',
        setupUrlLabel: 'Lien de configuration',
        setupUrlDescription: 'Partagez ce lien pour que le nouvel administrateur définisse son mot de passe.',
        roleUpdatedSuccessfully: 'Rôle de l’utilisateur mis à jour.',
        roleUpdateFailed: 'Impossible de mettre à jour le rôle.',
        roleClient: 'Client',
        roleOwner: 'Propriétaire',
        roleAdmin: 'Administrateur',
        roleSuperAdmin: 'Super administrateur',
    } } as const

const mockDashboard = { fr: { dashboardWelcome: 'Bienvenue, Anna !', dashboardSubtitle: 'Tout est sous contrôle.', dashboardBookings: 'Réservations', dashboardRequests: 'Nouvelles demandes', dashboardCabinets: 'Cabinets', dashboardReviews: 'Avis', latestBookings: 'Dernières réservations', viewAllBookings: 'Voir toutes les réservations', calendarMonth: 'Mai 2025', weekdayMonShort: 'Lun', weekdayTueShort: 'Mar', weekdayWedShort: 'Mer', weekdayThuShort: 'Jeu', weekdayFriShort: 'Ven', weekdaySatShort: 'Sam', weekdaySunShort: 'Dim', loadTitle: 'Occupation des cabinets', bookingConfirmed: 'Confirmée', bookingPending: 'En attente', bookingName1: 'Irène S.', bookingName2: 'Alex O.', bookingName3: 'Catherine P.', bookingCabinet1: 'Cabinet 1', bookingCabinet2: 'Cabinet 2', bookingCabinet3: 'Cabinet 3', bookingToday1100: 'Aujourd’hui, 11:00', bookingToday1230: 'Aujourd’hui, 12:30', bookingTomorrow1000: 'Demain, 10:00' } } as const

const errors = { fr: { VALIDATION_ERROR: 'La validation a échoué. Vérifiez le formulaire.', NOT_FOUND: 'La ressource demandée est introuvable.', INTERNAL_SERVER_ERROR: 'Une erreur est survenue. Réessayez plus tard.', BAD_REQUEST: 'Requête invalide.', UNAUTHORIZED: 'Connectez-vous pour continuer.', FORBIDDEN: 'Vous n’avez pas l’autorisation d’effectuer cette action.', CONFLICT: 'Un conflit est survenu. Cet élément existe peut-être déjà.', TOO_MANY_REQUESTS: 'Trop de requêtes. Veuillez ralentir.', CSRF_ORIGIN_MISMATCH: 'La vérification de sécurité a échoué.', CSRF_TOKEN_MISMATCH: 'La session a expiré ou est invalide.', EMAIL_VERIFICATION_REQUIRED: 'Vérifiez votre e-mail pour effectuer cette action.', BREACHED_PASSWORD: 'Choisissez un mot de passe absent des fuites de données connues.' } } as const

const cabinetCatalog = { fr: {
        title: 'Espace',
        publicList: {
            eyebrow: 'Catalogue public', title: 'Cabinets disponibles', description: 'Parcourez les espaces actifs pour la beauté, la médecine, les consultations et les rendez-vous spécialisés.', loading: 'Chargement des cabinets...', failedToLoad: 'Impossible de charger les cabinets', emptyTitle: 'Aucun cabinet trouvé', emptyDescription: 'Aucun cabinet actif n’est disponible pour le moment.', photoFallback: 'Photo du cabinet', from: 'À partir de', perHourShort: '/ heure', searchPlaceholder: 'Rechercher par nom ou ville...', sortBy: 'Trier par', sortNewest: 'Plus récents', sortPopular: 'Plus populaires', sortPriceAsc: 'Prix croissant', sortPriceDesc: 'Prix décroissant', advancedFilters: 'Filtres', cityLabel: 'Ville', cityPlaceholder: 'Toutes les villes', categoryLabel: 'Catégorie', allCategories: 'Toutes les catégories', categoryBeauty: 'Beauté', categoryMedical: 'Médecine', categoryConsultation: 'Consultation', categoryWellness: 'Bien-être', categoryOffice: 'Bureau', priceRangeLabel: 'Prix horaire', minPrice: 'De', maxPrice: 'À', ratingLabel: 'Note', anyRating: 'Toutes les notes', stars: 'étoiles', serviceLabel: 'Prestation', servicePlaceholder: 'ex. massage', availableToday: 'Disponible aujourd’hui', clearFilters: 'Effacer les filtres', resultsEyebrow: 'Recherche par disponibilité', resultsTitle: 'Cabinets près de vous', resultsCount: '{{count}} cabinets trouvés', viewMode: 'Vue du catalogue', splitView: 'Liste + carte', listView: 'Liste', mapView: 'Carte', backToSplitView: 'Retour à la liste et à la carte', view: 'Voir les détails', imageAlt: 'Intérieur de {{title}}', todayAvailability: 'Aujourd’hui', freeSlots: '{{count}} créneaux restants', mapTitle: 'Carte du secteur', mapApproximate: 'Vue approximative du secteur. L’adresse exacte est affichée sur la page du cabinet.', mapZoomIn: 'Zoom avant', mapZoomOut: 'Zoom arrière', mapCurrentLocation: 'Utiliser ma position', mapLocationLoading: 'Recherche de votre position...', mapLocationFound: 'Carte centrée sur votre position.', mapLocationError: 'Position indisponible. La carte reste approximative.', mapTileError: 'Les données cartographiques sont temporairement indisponibles. Utilisez la liste ou ouvrez la carte ailleurs.', openMap: 'Ouvrir la carte', selectedCabinet: 'Cabinet sélectionné',
        },
    } } as const

const profilePrivacy = { fr: {
        title: 'Données et confidentialité',
        description: 'Gérez une copie de vos données AutoCare Hub et une demande de suppression du compte.',
        exportTitle: 'Exporter mes données',
        exportDescription: 'Téléchargez une copie JSON limitée de votre compte, réservations, notifications, favoris et espaces.',
        exportAction: 'Télécharger les données',
        exporting: 'Préparation de l’export...',
        exportSuccess: 'L’export de vos données est prêt.',
        exportError: 'Impossible d’exporter vos données.',
        deletionTitle: 'Supprimer mon compte',
        deletionDescription: 'Demandez la suppression de votre compte pour examen. Les données financières et de réservation suivent la politique de conservation.',
        requestAction: 'Demander la suppression',
        reasonLabel: 'Motif (facultatif)',
        reasonPlaceholder: 'Dites-nous pourquoi vous partez',
        confirmRequest: 'Envoyer la demande',
        requestPending: 'La demande de suppression est en attente d’examen.',
        requestedAt: 'Demandée le {{date}}',
        cancelRequest: 'Annuler la demande',
        cancelConfirm: 'Annuler la demande de suppression de compte en attente ?',
        requestSuccess: 'Demande de suppression envoyée.',
        requestError: 'Impossible d’envoyer la demande de suppression.',
        cancelSuccess: 'Demande de suppression annulée.',
        cancelError: 'Impossible d’annuler la demande de suppression.',
    } } as const

const booking = { fr: {
        title: 'Réservations', myBookings: 'Mes réservations', noBookingsYet: 'Aucune réservation', loadingBookings: 'Chargement des réservations...', failedToLoadBookings: 'Impossible de charger les réservations.', upcoming: 'À venir', cancelled: 'Annulées', completed: 'Terminées', cancelBooking: 'Annuler la réservation', confirmCancellation: 'Confirmer l’annulation', cancelThisBooking: 'Annuler cette réservation ?', keepBooking: 'Conserver la réservation', cancelling: 'Annulation...', bookingCancelledSuccessfully: 'Réservation annulée.', failedToCancelBooking: 'Impossible d’annuler la réservation.', bookThisCabinet: 'Réserver cet espace', chooseServiceAndTime: 'Choisissez un service et un horaire.', selectService: 'Choisir un service', selectDate: '2. Choisir une date', selectTime: '3. Choisir une heure', noAvailableTimes: 'Aucun créneau disponible pour cette date.', createBooking: 'Créer une réservation', creatingBooking: 'Création de la réservation...', bookingCreatedSuccessfully: 'Réservation créée.', successTitle: 'Votre créneau est réservé', viewMyBookings: 'Voir mes réservations', openDirections: 'Ouvrir l’itinéraire', pendingStatusLabel: 'En attente', confirmedStatusLabel: 'Confirmée', cancelledStatusLabel: 'Annulée', completedStatusLabel: 'Terminée',
    } } as const

export const frTranslations = createPopularLocale('fr', { common: common.fr, navigation: navigation.fr, auth: auth.fr, workspace: workspace.fr, ownerDashboard: ownerDashboard.fr, adminDashboard: adminDashboard.fr, adminUsers: adminUsers.fr, adminOwners: adminOwners.fr, adminCabinets: adminCabinets.fr, adminReviews: adminReviews.fr, adminAuditLogs: adminAuditLogs.fr, systemIncidents: systemIncidents.fr, securityCenter: securityCenter.fr, errors: errors.fr, booking: booking.fr, cabinet: cabinetCatalog.fr, profile: { privacy: profilePrivacy.fr }, landing: { ...landingExtraPopular.fr, ...landingPopular.fr, ...mockDashboard.fr, eyebrow: 'CRM de réservation de cabinets', title: 'Gérez espaces, services et réservations au même endroit.', description: 'AutoCare Hub aide les clients à réserver et les propriétaires à gérer leurs annonces.' } })
