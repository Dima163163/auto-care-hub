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

const common = { de: {
        loading: 'Wird geladen...', loadingPage: 'Seite wird geladen...', error: 'Fehler',
        failedToLoad: 'Laden fehlgeschlagen.', create: 'Erstellen', edit: 'Bearbeiten', delete: 'Löschen',
        cancel: 'Abbrechen', confirm: 'Bestätigen', save: 'Speichern', back: 'Zurück', status: 'Status',
        actions: 'Aktionen', name: 'Name', email: 'E-Mail', saving: 'Wird gespeichert...',
        close: 'Schließen', dismiss: 'Ausblenden', language: 'Sprache', theme: 'Darstellung', menu: 'Menü', more: 'Mehr',
        switchToDarkTheme: 'Dunkles Design aktivieren', switchToLightTheme: 'Helles Design aktivieren',
        notProvided: 'Nicht angegeben', tryAgainLater: 'Bitte später erneut versuchen.', retry: 'Erneut versuchen',
    } } as const

const navigation = { de: { home: 'Startseite', features: 'Funktionen', cabinets: 'Räume', owners: 'Für Eigentümer', pricing: 'Preise', about: 'Über uns', profile: 'Profil', myBookings: 'Meine Buchungen', favorites: 'Favoriten', notifications: 'Benachrichtigungen', ownerDashboard: 'Eigentümer-Dashboard', ownerCabinets: 'Meine Räume', ownerBookings: 'Buchungen', ownerServices: 'Leistungen', adminDashboard: 'Admin-Dashboard', adminUsers: 'Benutzer', adminOwners: 'Eigentümer', adminCabinets: 'Räume', adminReviews: 'Bewertungen', adminAuditLogs: 'Audit-Protokolle', ownerDashboardShort: 'Dashboard', ownerCalendar: 'Kalender' } } as const

const auth = { de: { signIn: 'Anmelden', logOut: 'Abmelden', createAccount: 'Konto erstellen', welcomeBack: 'Willkommen zurück', signInTitle: 'Bei AutoCare Hub anmelden', signInToContinue: 'Bitte anmelden, um fortzufahren.', email: 'E-Mail', password: 'Passwort', signingIn: 'Anmeldung...', failedToSignIn: 'Anmeldung fehlgeschlagen.', alreadyHaveAccount: 'Bereits ein Konto?', forgotPasswordLink: 'Passwort vergessen?' } } as const

const workspace = { de: { client: 'Kundenbereich', owner: 'Eigentümerbereich', admin: 'Adminbereich', overview: 'Übersicht', manage: 'Verwalten', configure: 'Konfigurieren', monitor: 'Überwachen', support: 'Support', collapseSidebar: 'Seitenleiste einklappen', expandSidebar: 'Seitenleiste ausklappen', systemStatus: 'Alle Systeme sind betriebsbereit' } } as const

const ownerDashboard = { de: {
        title: 'Dashboard',
        description: 'Verwalte Räume, Services, Buchungen und operative Aktivitäten.',
        loading: 'Dashboard wird geladen...',
        failedToLoad: 'Dashboard konnte nicht geladen werden',
        activeCount: '{{count}} aktiv',
        bookingStatusCounts: '{{pending}} ausstehend · {{confirmed}} bestätigt',
        averageCabinetPrice: 'Durchschnittlicher Raumpreis',
        perHour: 'Pro Stunde',
        upcomingBookings: 'Bevorstehende Buchungen',
        upcomingBookingsDescription: 'Ausstehende und bestätigte Buchungen für deine Räume.',
        noUpcomingBookings: 'Derzeit keine bevorstehenden Buchungen.',
        activeServices: 'Aktive Services',
        activeServicesDescription: 'Services, die aktuell buchbar sind.',
        noServices: 'Noch keine Services erstellt.',
        viewAll: 'Alle ansehen',
        bookingMeta: 'Raum: {{cabinetId}} · Service: {{serviceId}}',
        serviceMeta: '{{duration}} Min. · {{price}}',
        analyticsTitle: 'Buchungsleistung',
        analyticsDescription: 'Übersicht der geplanten Arbeit in den nächsten 30 Tagen.',
        projectedRevenue: 'Geplanter Umsatz',
        bookedHours: 'Gebuchte Stunden',
        bookingLoad: 'Buchungsauslastung',
        popularServices: 'Beliebte Services',
        noBookingData: 'Buchungsdaten erscheinen, sobald Kunden Termine buchen.',
        mobileRevenue: 'Umsatz',
        mobileOccupancy: 'Auslastung',
        mobileToday: 'Heute',
        mobileAwaitingResponse: 'Wartet auf deine Antwort',
        mobileBookingExpires: 'Diese Buchung läuft bald ab',
        mobileConfirm: 'Bestätigen',
        mobileDecline: 'Ablehnen',
        mobileUpcomingToday: 'Heute bevorstehend',
        mobileViewCalendar: 'Kalender öffnen',
        mobileOfflineDraft: 'Entwürfe werden nach der Verbindung gespeichert.',
        mobileReviewDraft: 'Entwurf prüfen',
        mobileAddSpace: 'Raum hinzufügen',
        mobileMySpaces: 'Meine Räume',
        clientListTitle: 'Kunden',
        clientListDescription: 'Kunden, die einen deiner Services gebucht haben, nach dem letzten Termin sortiert.',
        noClients: 'Noch keine Kundenbuchungen.',
        visits: '{{count}} Besuche',
        lastBooking: 'Letzte Buchung: {{date}}',
        noOwnerNote: 'Noch keine interne Notiz.',
        actionCenter: {
            eyebrow: 'Aktionszentrum',
            title: 'Aufgaben, die deine Aufmerksamkeit brauchen',
            description: 'Prüfe offene Aufgaben und öffne direkt den Bereich zur Bearbeitung.',
            allClear: 'Alles ist aktuell. Es gibt keine offenen Aufgaben.',
            pendingBookings: 'Ausstehende Buchungen',
            pendingBookingsDescription: 'Buchungen warten auf deine Bestätigung.',
            rescheduleRequests: 'Umbuchungsanfragen',
            rescheduleRequestsDescription: 'Kunden warten auf eine Entscheidung zu einer neuen Zeit.',
            draftCabinets: 'Entwürfe',
            draftCabinetsDescription: 'Räume sind noch nicht für öffentliche Buchungen bereit.',
            blockedCabinets: 'Gesperrte Räume',
            blockedCabinetsDescription: 'Räume brauchen eine Moderations- oder Einrichtungsprüfung.',
            readiness: 'Startbereitschaft',
            readinessDescription: 'Schließe die Einrichtung ab, bevor du Buchungen annimmst.',
            olderThan24Hours: '{{count}} älter als 24 Stunden',
            open: 'Arbeitsbereich öffnen',
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

const adminDashboard = { de: {
        title: 'Admin-Dashboard',
        description: 'Überwache Benutzer, Räume, Plattformaktivität und Moderation.',
        loading: 'Admin-Dashboard wird geladen...',
        failedToLoad: 'Admin-Dashboard konnte nicht geladen werden',
        users: 'Benutzer',
        userRoleCounts: '{{clients}} Kunden · {{owners}} Eigentümer · {{admins}} Administratoren',
        userStatusCounts: '{{active}} aktiv · {{blocked}} gesperrt',
        activeCount: '{{count}} aktiv',
        moderation: 'Prüfung',
        moderationBreakdown: '{{draftCabinets}} Raum-Entwürfe · {{blockedCabinets}} gesperrt · {{blockedUsers}} gesperrte Benutzer',
        averageCabinetPrice: 'Durchschnittlicher Raumpreis',
        perHour: 'Pro Stunde',
        recentUsers: 'Neue Benutzer',
        recentUsersDescription: 'Neueste Plattformbenutzer aus den Demodaten.',
        recentCabinets: 'Neue Räume',
        recentCabinetsDescription: 'Neueste Räume mit Moderationsstatus.',
        noUsers: 'Keine Benutzer gefunden.',
        noCabinets: 'Keine Räume gefunden.',
        viewAll: 'Alle ansehen',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.de,
    } } as const

const adminOwners = { de: { description: 'Verwalte Plattform-Eigentümer und den Kontozugriff.', emptyTitle: 'Keine Eigentümer gefunden', emptyDescription: 'Eigentümer erscheinen hier, sobald sie ein Konto erstellen.' } } as const

const adminCabinets = { de: {
        title: 'Räume', description: 'Prüfe und moderiere Raumangebote.', loading: 'Räume werden geladen...', failedToLoad: 'Räume konnten nicht geladen werden', emptyTitle: 'Keine Räume gefunden', emptyDescription: 'Plattformräume erscheinen hier.', statusUpdatedSuccessfully: 'Raumstatus aktualisiert.', statusUpdateFailed: 'Raumstatus konnte nicht aktualisiert werden.', blockedSuccessfully: 'Raum gesperrt.', blockFailed: 'Raum konnte nicht gesperrt werden.', confirmBlockEyebrow: 'Raumsperre bestätigen', confirmBlockTitle: 'Diesen Raum sperren?', confirmBlockDescription: 'Der Raum wird aus öffentlichen Listen entfernt und kann nicht mehr gebucht werden.', keepAvailable: 'Verfügbar lassen', confirmBlocking: 'Sperre bestätigen', blockingAction: 'Wird gesperrt...',
    } } as const

const adminReviews = { de: { title: 'Bewertungen', description: 'Moderieren Sie Kundenbewertungen vor der Veröffentlichung.', loading: 'Bewertungen werden geladen...', emptyTitle: 'Noch keine Bewertungen', emptyDescription: 'Kundenbewertungen erscheinen hier nach dem Absenden.', statusUpdatedSuccessfully: 'Bewertungsstatus aktualisiert.', statusUpdateFailed: 'Bewertungsstatus konnte nicht aktualisiert werden.', pendingAction: 'Zur Moderation zurückgeben', approvedAction: 'Freigeben', rejectedAction: 'Ablehnen', deleteAction: 'Löschen', deleting: 'Wird gelöscht...', deletedSuccessfully: 'Bewertung gelöscht.', deleteFailed: 'Bewertung konnte nicht gelöscht werden.', confirmDeleteEyebrow: 'Bewertung löschen', confirmDeleteTitle: 'Diese Bewertung löschen?', confirmDeleteDescription: 'Die Bewertung wird dauerhaft aus dem Projekt entfernt.' } } as const

const securityCenter = { de: { title: 'Security Center', description: 'Prüfe Authentifizierungsfehler, Missbrauchssignale, Quell-IP-Adressen, Routen und Untersuchungsstatus im Super-Admin-Bereich.', permissionTitle: 'Super-Admin-Zugriff erforderlich', permissionDescription: 'Dieser Bereich zeigt sensible Sicherheitstelemetrie und ist nur für Super-Admins verfügbar.', loadError: 'Sicherheitstelemetrie konnte nicht geladen werden.', exportReport: 'Bericht exportieren', timeline: 'Untersuchungszeitachse', assignee: 'Zuständig', unassigned: 'Nicht zugewiesen', assignToMe: 'Mir zuweisen', mitigationsTitle: 'Temporäre Maßnahmen', activeMitigations: 'Aktive Sperren', topIps: 'Aktivste Quell-IP-Adressen', topRoutes: 'Am häufigsten angegriffene Routen', typeFilter: 'Ereignistyp', allTypes: 'Alle Typen', severityFilter: 'Schweregrad', allSeverities: 'Alle Schweregrade', statusFilter: 'Untersuchungsstatus', allStatuses: 'Alle Status', eventsTitle: 'Sicherheitsaktivität', empty: 'Keine Sicherheitsevents passen zu diesen Filtern.', loadMore: 'Mehr laden', loadingMore: 'Weitere werden geladen...', types: { login_failed: 'Fehlgeschlagene Anmeldung', account_locked: 'Konto gesperrt', refresh_token_reuse: 'Refresh-Token-Wiederverwendung', rate_limit_exceeded: 'Ratenlimit überschritten', invalid_token: 'Ungültiges Token', csrf_violation: 'CSRF-Verstoß', route_scan: 'Unbekannte Routenanfrage', malformed_request: 'Fehlerhafte Anfrage', oversized_request: 'Zu große Anfrage', privilege_denied: 'Zugriff verweigert', webhook_abuse: 'Webhook-Missbrauch', mutation_burst: 'Mutationsspitze' }, severities: { info: 'Info', warning: 'Warnung', high: 'Hoch', critical: 'Kritisch' }, statuses: { open: 'Offen', acknowledged: 'Bestätigt', investigating: 'In Untersuchung', resolved: 'Gelöst', suppressed: 'Unterdrückt' }, actorRoles: { client: 'Kunde', owner: 'Eigentümer', admin: 'Admin', super_admin: 'Super-Admin' }, authOutcomes: { unknown: 'Unbekannt', anonymous: 'Anonym', authenticated: 'Authentifiziert', failed: 'Fehlgeschlagen' }, rateLimitResults: { not_checked: 'Nicht geprüft', allowed: 'Erlaubt', blocked: 'Blockiert' }, proxyProvenances: { unknown: 'Unbekannt', direct: 'Direkte Verbindung', trusted_proxy: 'Vertrauenswürdiger Proxy', forwarded_header_untrusted: 'Nicht vertrauenswürdige Weiterleitung' } } } as const

const systemIncidents = { de: { tab: 'Systemvorfälle', title: 'Systemvorfälle', description: 'Betriebliche Ereignisse werden getrennt von Benutzeraktivitäten erfasst und können hier bestätigt oder gelöst werden.', incident: 'Vorfall', severity: 'Schweregrad', occurrences: 'Vorkommnisse', firstSeen: 'Erstmals erkannt', lastSeen: 'Zuletzt erkannt', requestId: 'Anfrage-ID', acknowledge: 'Bestätigen', resolve: 'Lösen', statusOpen: 'Offen', statusAcknowledged: 'Bestätigt', statusResolved: 'Gelöst', severityWarning: 'Warnung', severityCritical: 'Kritisch', metadata: 'Metadaten', showMetadata: 'Metadaten anzeigen', copyRequestId: 'Anfrage-ID kopieren', copied: 'Anfrage-ID kopiert', copyFailed: 'Anfrage-ID konnte nicht kopiert werden.', emptyTitle: 'Keine aktiven Vorfälle', emptyDescription: 'Server- und Betriebsvorfälle erscheinen hier, sobald sie erkannt werden.', searchPlaceholder: 'Vorfälle durchsuchen...', statusFilter: 'Status', allStatuses: 'Alle', acknowledgedAt: 'Bestätigt', resolvedAt: 'Gelöst', loadedCount: '{count} Vorfälle geladen', loadMore: 'Mehr laden', loadingMore: 'Weitere werden geladen...' } } as const

const adminAuditLogs = { de: {
        title: 'Audit-Protokolle', description: 'Verfolge alle administrativen und sicherheitsrelevanten Aktionen der Plattform.', timestamp: 'Zeit', actor: 'Akteur', action: 'Aktion', target: 'Ziel', metadata: 'Metadaten', noLogs: 'Keine Audit-Protokolle gefunden.', emptyDescription: 'Audit-Ereignisse erscheinen hier, sobald Aktionen ausgeführt werden.', searchPlaceholder: 'Protokolle durchsuchen...', export: 'CSV exportieren', auditTab: 'Aktivitätsaudit', showMetadata: 'Metadaten anzeigen', saveFilter: 'Filter speichern', clearFilter: 'Gespeicherten Filter löschen', savedFilter: 'Gespeicherter Filter: {query}', filterSaved: 'Audit-Filter für diese Sitzung gespeichert.', filterCleared: 'Gespeicherter Audit-Filter gelöscht.', loadedCount: '{count} Ereignisse geladen', loadMore: 'Mehr laden', loadingMore: 'Weitere werden geladen...',
        actions: { user_status_updated: 'Benutzerstatus aktualisiert', user_role_updated: 'Benutzerrolle aktualisiert', admin_created: 'Administrator erstellt', cabinet_status_updated: 'Raumstatus aktualisiert', review_moderated: 'Bewertung moderiert', review_deleted: 'Bewertung gelöscht', subscription_created: 'Abonnement erstellt', promo_subscription_issued: 'Promo-Abonnement ausgegeben', login_failed: 'Fehlgeschlagener Anmeldeversuch', account_locked: 'Konto gesperrt', refresh_token_reuse: 'Wiederverwendung des Refresh-Tokens erkannt', outbox_retried: 'Outbox-Ereignis erneut versucht', outbox_dead_lettered: 'Outbox-Ereignis in Dead Letter verschoben', oauth_identity_linked: 'OAuth-Identität verknüpft', oauth_identity_unlinked: 'OAuth-Identität getrennt', account_deletion_requested: 'Kontolöschung angefordert', account_deletion_cancelled: 'Kontolöschung abgebrochen', account_deletion_completed: 'Kontolöschung abgeschlossen', security_events_viewed: 'Sicherheitsereignisse angezeigt', security_center_viewed: 'Security Center angezeigt', security_center_event_status_updated: 'Status des Sicherheitsereignisses aktualisiert', security_center_report_exported: 'Sicherheitsbericht exportiert', security_user_sessions_revoked: 'Benutzersitzungen aus dem Security Center widerrufen' },
    } } as const

const adminUsers = { de: {
        title: 'Benutzer',
        description: 'Verwalte Benutzerstatus und Kontozugriff.',
        loading: 'Benutzer werden geladen...',
        failedToLoad: 'Benutzer konnten nicht geladen werden',
        emptyTitle: 'Keine Benutzer gefunden',
        emptyDescription: 'Plattformbenutzer erscheinen hier.',
        userColumn: 'Benutzer',
        statusUpdatedSuccessfully: 'Benutzerstatus aktualisiert.',
        statusUpdateFailed: 'Benutzerstatus konnte nicht aktualisiert werden.',
        blockedSuccessfully: 'Benutzer gesperrt.',
        blockFailed: 'Benutzer konnte nicht gesperrt werden.',
        confirmBlockEyebrow: 'Benutzersperre bestätigen',
        confirmBlockTitle: 'Diesen Benutzer sperren?',
        confirmBlockDescription: 'Der Benutzer kann sich nicht anmelden oder geschützte Seiten nutzen.',
        adminStatusRestricted: 'Nur der Superadministrator darf Administratorkonten verwalten.',
        keepActive: 'Aktiv lassen',
        confirmBlocking: 'Sperre bestätigen',
        blockingAction: 'Wird gesperrt...',
        createAdminTitle: 'Administrator erstellen',
        createAdminDescription: 'Lade einen Administrator ein. Er muss über den folgenden Link ein Passwort festlegen.',
        adminCreatedSuccessfully: 'Administrator erfolgreich erstellt.',
        adminCreateFailed: 'Administrator konnte nicht erstellt werden.',
        setupUrlLabel: 'Einrichtungslink',
        setupUrlDescription: 'Teile diesen Link, damit der neue Administrator sein Passwort festlegen kann.',
        roleUpdatedSuccessfully: 'Benutzerrolle aktualisiert.',
        roleUpdateFailed: 'Benutzerrolle konnte nicht aktualisiert werden.',
        roleClient: 'Kunde',
        roleOwner: 'Eigentümer',
        roleAdmin: 'Administrator',
        roleSuperAdmin: 'Superadministrator',
    } } as const

const mockDashboard = { de: { dashboardWelcome: 'Willkommen, Anna!', dashboardSubtitle: 'Alles unter Kontrolle.', dashboardBookings: 'Buchungen', dashboardRequests: 'Neue Anfragen', dashboardCabinets: 'Räume', dashboardReviews: 'Bewertungen', latestBookings: 'Letzte Buchungen', viewAllBookings: 'Alle Buchungen anzeigen', calendarMonth: 'Mai 2025', weekdayMonShort: 'Mo', weekdayTueShort: 'Di', weekdayWedShort: 'Mi', weekdayThuShort: 'Do', weekdayFriShort: 'Fr', weekdaySatShort: 'Sa', weekdaySunShort: 'So', loadTitle: 'Raumauslastung', bookingConfirmed: 'Bestätigt', bookingPending: 'Ausstehend', bookingName1: 'Irene S.', bookingName2: 'Alex O.', bookingName3: 'Katharina P.', bookingCabinet1: 'Raum 1', bookingCabinet2: 'Raum 2', bookingCabinet3: 'Raum 3', bookingToday1100: 'Heute, 11:00', bookingToday1230: 'Heute, 12:30', bookingTomorrow1000: 'Morgen, 10:00' } } as const

const errors = { de: { VALIDATION_ERROR: 'Validierung fehlgeschlagen. Bitte prüfe das Formular.', NOT_FOUND: 'Die angeforderte Ressource wurde nicht gefunden.', INTERNAL_SERVER_ERROR: 'Es ist ein Fehler aufgetreten. Bitte später erneut versuchen.', BAD_REQUEST: 'Ungültige Anfrage.', UNAUTHORIZED: 'Bitte anmelden, um fortzufahren.', FORBIDDEN: 'Du hast keine Berechtigung für diese Aktion.', CONFLICT: 'Ein Konflikt ist aufgetreten. Der Eintrag existiert möglicherweise bereits.', TOO_MANY_REQUESTS: 'Zu viele Anfragen. Bitte langsamer versuchen.', CSRF_ORIGIN_MISMATCH: 'Sicherheitsprüfung fehlgeschlagen.', CSRF_TOKEN_MISMATCH: 'Sitzung abgelaufen oder ungültig.', EMAIL_VERIFICATION_REQUIRED: 'Bitte E-Mail bestätigen, um diese Aktion auszuführen.', BREACHED_PASSWORD: 'Wähle ein Passwort, das nicht in einem bekannten Datenleck vorkam.' } } as const

const cabinetCatalog = { de: {
        title: 'Raum',
        publicList: {
            eyebrow: 'Öffentlicher Katalog', title: 'Verfügbare Räume', description: 'Entdecke aktive Räume für Beauty, Medizin, Beratung und Termine mit Spezialisten.', loading: 'Räume werden geladen...', failedToLoad: 'Räume konnten nicht geladen werden', emptyTitle: 'Keine Räume gefunden', emptyDescription: 'Derzeit sind keine aktiven Räume verfügbar.', photoFallback: 'Raumfoto', from: 'Ab', perHourShort: '/ Stunde', searchPlaceholder: 'Nach Name oder Stadt suchen...', sortBy: 'Sortieren nach', sortNewest: 'Neueste zuerst', sortPopular: 'Beliebteste zuerst', sortPriceAsc: 'Preis: aufsteigend', sortPriceDesc: 'Preis: absteigend', advancedFilters: 'Filter', cityLabel: 'Stadt', cityPlaceholder: 'Jede Stadt', categoryLabel: 'Kategorie', allCategories: 'Alle Kategorien', categoryBeauty: 'Beauty', categoryMedical: 'Medizin', categoryConsultation: 'Beratung', categoryWellness: 'Wellness', categoryOffice: 'Büro', priceRangeLabel: 'Stundenpreis', minPrice: 'Von', maxPrice: 'Bis', ratingLabel: 'Bewertung', anyRating: 'Jede Bewertung', stars: 'Sterne', serviceLabel: 'Dienstleistung', servicePlaceholder: 'z. B. Massage', availableToday: 'Heute verfügbar', clearFilters: 'Filter löschen', resultsEyebrow: 'Verfügbarkeit zuerst', resultsTitle: 'Räume in deiner Nähe', resultsCount: '{{count}} Räume gefunden', viewMode: 'Katalogansicht', splitView: 'Liste + Karte', listView: 'Liste', mapView: 'Karte', backToSplitView: 'Zurück zu Liste und Karte', view: 'Details ansehen', imageAlt: 'Innenraum von {{title}}', todayAvailability: 'Heute', freeSlots: '{{count}} Termine frei', mapTitle: 'Gebietskarte', mapApproximate: 'Ungefähre Gebietsansicht. Die genaue Adresse steht auf der Raumseite.', mapZoomIn: 'Vergrößern', mapZoomOut: 'Verkleinern', mapCurrentLocation: 'Meinen Standort verwenden', mapLocationLoading: 'Standort wird gesucht...', mapLocationFound: 'Karte auf deinen Standort zentriert.', mapLocationError: 'Standort nicht verfügbar. Die Karte bleibt ungefähr.', mapTileError: 'Kartendaten sind vorübergehend nicht verfügbar. Nutze die Liste oder öffne die Karte extern.', openMap: 'Karte öffnen', selectedCabinet: 'Ausgewählter Raum',
        },
    } } as const

const profilePrivacy = { de: {
        title: 'Daten und Datenschutz',
        description: 'Verwalte eine Kopie deiner AutoCare Hub-Daten und eine Anfrage zur Kontolöschung.',
        exportTitle: 'Meine Daten exportieren',
        exportDescription: 'Lade eine begrenzte JSON-Kopie deines Kontos, deiner Buchungen, Benachrichtigungen, Favoriten und Räume herunter.',
        exportAction: 'Daten herunterladen',
        exporting: 'Export wird vorbereitet...',
        exportSuccess: 'Dein Datenexport ist bereit.',
        exportError: 'Deine Daten konnten nicht exportiert werden.',
        deletionTitle: 'Mein Konto löschen',
        deletionDescription: 'Sende eine Anfrage zur Kontolöschung zur Prüfung. Finanz- und Buchungsdaten unterliegen der Aufbewahrungsrichtlinie.',
        requestAction: 'Löschung anfordern',
        reasonLabel: 'Grund (optional)',
        reasonPlaceholder: 'Warum möchtest du gehen?',
        confirmRequest: 'Anfrage senden',
        requestPending: 'Die Anfrage zur Kontolöschung wird geprüft.',
        requestedAt: 'Angefordert am {{date}}',
        cancelRequest: 'Anfrage stornieren',
        cancelConfirm: 'Ausstehende Anfrage zur Kontolöschung stornieren?',
        requestSuccess: 'Anfrage zur Kontolöschung gesendet.',
        requestError: 'Die Anfrage zur Kontolöschung konnte nicht gesendet werden.',
        cancelSuccess: 'Anfrage zur Kontolöschung storniert.',
        cancelError: 'Die Anfrage zur Kontolöschung konnte nicht storniert werden.',
    } } as const

const booking = { de: {
        title: 'Buchungen', myBookings: 'Meine Buchungen', noBookingsYet: 'Noch keine Buchungen', loadingBookings: 'Buchungen werden geladen...', failedToLoadBookings: 'Buchungen konnten nicht geladen werden.', upcoming: 'Bevorstehend', cancelled: 'Storniert', completed: 'Abgeschlossen', cancelBooking: 'Buchung stornieren', confirmCancellation: 'Stornierung bestätigen', cancelThisBooking: 'Diese Buchung stornieren?', keepBooking: 'Buchung behalten', cancelling: 'Wird storniert...', bookingCancelledSuccessfully: 'Buchung erfolgreich storniert.', failedToCancelBooking: 'Buchung konnte nicht storniert werden.', bookThisCabinet: 'Diesen Raum buchen', chooseServiceAndTime: 'Service und passende Zeit auswählen.', selectService: 'Service auswählen', selectDate: '2. Datum auswählen', selectTime: '3. Zeit auswählen', noAvailableTimes: 'Für dieses Datum sind keine Zeiten verfügbar.', createBooking: 'Buchung erstellen', creatingBooking: 'Buchung wird erstellt...', bookingCreatedSuccessfully: 'Buchung erfolgreich erstellt.', successTitle: 'Deine Zeit ist reserviert', viewMyBookings: 'Meine Buchungen öffnen', openDirections: 'Wegbeschreibung öffnen', pendingStatusLabel: 'Ausstehend', confirmedStatusLabel: 'Bestätigt', cancelledStatusLabel: 'Storniert', completedStatusLabel: 'Abgeschlossen',
    } } as const

export const deTranslations = createPopularLocale('de', { common: common.de, navigation: navigation.de, auth: auth.de, workspace: workspace.de, ownerDashboard: ownerDashboard.de, adminDashboard: adminDashboard.de, adminUsers: adminUsers.de, adminOwners: adminOwners.de, adminCabinets: adminCabinets.de, adminReviews: adminReviews.de, adminAuditLogs: adminAuditLogs.de, systemIncidents: systemIncidents.de, securityCenter: securityCenter.de, errors: errors.de, booking: booking.de, cabinet: cabinetCatalog.de, profile: { privacy: profilePrivacy.de }, landing: { ...landingExtraPopular.de, ...landingPopular.de, ...mockDashboard.de, eyebrow: 'Buchungs-CRM für Raumvermietung', title: 'Räume, Leistungen und Buchungen an einem Ort verwalten.', description: 'AutoCare Hub hilft Kunden bei der Buchung und Eigentümern bei der Verwaltung ihrer Angebote.' } })
