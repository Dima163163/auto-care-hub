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

const common = { hi: {
        loading: 'लोड हो रहा है...', loadingPage: 'पेज लोड हो रहा है...', error: 'त्रुटि',
        failedToLoad: 'लोड नहीं हो सका।', create: 'बनाएं', edit: 'संपादित करें', delete: 'हटाएं', cancel: 'रद्द करें',
        confirm: 'पुष्टि करें', save: 'सहेजें', back: 'वापस', status: 'स्थिति', actions: 'कार्रवाई', name: 'नाम',
        email: 'ईमेल', saving: 'सहेजा जा रहा है...', close: 'बंद करें', dismiss: 'हटाएं', language: 'भाषा', theme: 'थीम',
        menu: 'मेनू', more: 'अधिक', switchToDarkTheme: 'डार्क थीम पर जाएं', switchToLightTheme: 'लाइट थीम पर जाएं',
        notProvided: 'उपलब्ध नहीं', tryAgainLater: 'कृपया बाद में फिर प्रयास करें।', retry: 'फिर प्रयास करें',
    } } as const

const navigation = { hi: { home: 'होम', features: 'सुविधाएं', cabinets: 'कैबिनेट', services: 'ऑटो सेवाएं', owners: 'मालिकों के लिए', pricing: 'कीमतें', about: 'हमारे बारे में', profile: 'प्रोफ़ाइल', myBookings: 'मेरी बुकिंग', favorites: 'पसंदीदा', notifications: 'सूचनाएं', ownerDashboard: 'मालिक डैशबोर्ड', ownerCabinets: 'मेरे कैबिनेट', ownerBookings: 'बुकिंग', ownerServices: 'सेवाएं', adminDashboard: 'एडमिन डैशबोर्ड', adminUsers: 'उपयोगकर्ता', adminOwners: 'मालिक', adminCabinets: 'कैबिनेट', adminReviews: 'समीक्षाएं', adminAuditLogs: 'ऑडिट लॉग', ownerDashboardShort: 'डैशबोर्ड', ownerCalendar: 'कैलेंडर' } } as const

const auth = { hi: { signIn: 'साइन इन', logOut: 'लॉग आउट', createAccount: 'खाता बनाएं', welcomeBack: 'वापसी पर स्वागत है', signInTitle: 'AutoCare Hub में साइन इन करें', signInToContinue: 'जारी रखने के लिए साइन इन करें।', email: 'ईमेल', password: 'पासवर्ड', signingIn: 'साइन इन हो रहा है...', failedToSignIn: 'साइन इन नहीं हो सका।', alreadyHaveAccount: 'पहले से खाता है?', forgotPasswordLink: 'पासवर्ड भूल गए?' } } as const

const workspace = { hi: { client: 'क्लाइंट वर्कस्पेस', owner: 'मालिक वर्कस्पेस', admin: 'एडमिन वर्कस्पेस', overview: 'अवलोकन', manage: 'प्रबंधित करें', configure: 'कॉन्फ़िगर करें', monitor: 'निगरानी', support: 'सहायता', collapseSidebar: 'साइडबार संक्षिप्त करें', expandSidebar: 'साइडबार विस्तृत करें', systemStatus: 'सभी सिस्टम चालू हैं' } } as const

const ownerDashboard = { hi: {
        title: 'डैशबोर्ड',
        description: 'कैबिनेट, सेवाओं, बुकिंग और संचालन गतिविधियों पर नज़र रखें।',
        loading: 'डैशबोर्ड लोड हो रहा है...',
        failedToLoad: 'डैशबोर्ड लोड नहीं हो सका',
        activeCount: '{{count}} सक्रिय',
        bookingStatusCounts: '{{pending}} लंबित · {{confirmed}} पुष्ट',
        averageCabinetPrice: 'औसत कैबिनेट कीमत',
        perHour: 'प्रति घंटा',
        upcomingBookings: 'आने वाली बुकिंग',
        upcomingBookingsDescription: 'आपके कैबिनेट की लंबित और पुष्ट बुकिंग।',
        noUpcomingBookings: 'अभी कोई आने वाली बुकिंग नहीं है।',
        activeServices: 'सक्रिय सेवाएं',
        activeServicesDescription: 'वर्तमान में बुकिंग के लिए उपलब्ध सेवाएं।',
        noServices: 'अभी तक कोई सेवा नहीं बनाई गई।',
        viewAll: 'सभी देखें',
        bookingMeta: 'कैबिनेट: {{cabinetId}} · सेवा: {{serviceId}}',
        serviceMeta: '{{duration}} मिनट · {{price}}',
        analyticsTitle: 'बुकिंग प्रदर्शन',
        analyticsDescription: 'अगले 30 दिनों के निर्धारित काम का स्पष्ट दृश्य।',
        projectedRevenue: 'निर्धारित आय',
        bookedHours: 'बुक किए गए घंटे',
        bookingLoad: 'बुकिंग भार',
        popularServices: 'लोकप्रिय सेवाएं',
        noBookingData: 'क्लाइंट के अपॉइंटमेंट बनाने पर बुकिंग डेटा यहां दिखाई देगा।',
        mobileRevenue: 'आय',
        mobileOccupancy: 'उपयोग',
        mobileToday: 'आज',
        mobileAwaitingResponse: 'आपके उत्तर की प्रतीक्षा',
        mobileBookingExpires: 'यह बुकिंग जल्द समाप्त हो जाएगी',
        mobileConfirm: 'पुष्टि करें',
        mobileDecline: 'अस्वीकार करें',
        mobileUpcomingToday: 'आज की आगामी बुकिंग',
        mobileViewCalendar: 'कैलेंडर देखें',
        mobileOfflineDraft: 'कनेक्शन वापस आने पर ड्राफ्ट बदलाव सहेजे जाएंगे।',
        mobileReviewDraft: 'ड्राफ्ट देखें',
        mobileAddSpace: 'कैबिनेट जोड़ें',
        mobileMySpaces: 'मेरे कैबिनेट',
        clientListTitle: 'क्लाइंट',
        clientListDescription: 'आपकी सेवा बुक करने वाले क्लाइंट, सबसे हाल की अपॉइंटमेंट के क्रम में।',
        noClients: 'अभी तक किसी क्लाइंट ने बुकिंग नहीं की।',
        visits: '{{count}} विज़िट',
        lastBooking: 'अंतिम बुकिंग: {{date}}',
        noOwnerNote: 'अभी कोई आंतरिक नोट नहीं है।',
        actionCenter: {
            eyebrow: 'कार्य केंद्र',
            title: 'आपके ध्यान की आवश्यकता वाले कार्य',
            description: 'लंबित कार्यों की समीक्षा करें और उन्हें हल करने के लिए सही कार्यक्षेत्र खोलें।',
            allClear: 'सब कुछ अद्यतन है। कोई लंबित कार्य नहीं है।',
            pendingBookings: 'लंबित बुकिंग',
            pendingBookingsDescription: 'आपकी पुष्टि की प्रतीक्षा कर रही बुकिंग।',
            rescheduleRequests: 'समय बदलने के अनुरोध',
            rescheduleRequestsDescription: 'नए समय पर आपके निर्णय की प्रतीक्षा कर रहे ग्राहक।',
            draftCabinets: 'ड्राफ्ट कैबिनेट',
            draftCabinetsDescription: 'सार्वजनिक बुकिंग के लिए अभी तैयार नहीं स्थान।',
            blockedCabinets: 'ब्लॉक किए गए कैबिनेट',
            blockedCabinetsDescription: 'समीक्षा या सेटअप की आवश्यकता वाले स्थान।',
            readiness: 'लॉन्च की तैयारी',
            readinessDescription: 'बुकिंग स्वीकार करने से पहले बाकी सेटअप पूरा करें।',
            olderThan24Hours: '{{count}} 24 घंटे से पुराने',
            open: 'वर्कस्पेस खोलें',
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

const adminDashboard = { hi: {
        title: 'एडमिन डैशबोर्ड',
        description: 'उपयोगकर्ताओं, कैबिनेट, प्लेटफ़ॉर्म गतिविधि और समीक्षा स्थिति पर नज़र रखें।',
        loading: 'एडमिन डैशबोर्ड लोड हो रहा है...',
        failedToLoad: 'एडमिन डैशबोर्ड लोड नहीं हो सका',
        users: 'उपयोगकर्ता',
        userRoleCounts: '{{clients}} क्लाइंट · {{owners}} मालिक · {{admins}} एडमिन',
        userStatusCounts: '{{active}} सक्रिय · {{blocked}} ब्लॉक',
        activeCount: '{{count}} सक्रिय',
        moderation: 'समीक्षा',
        moderationBreakdown: '{{draftCabinets}} ड्राफ्ट कैबिनेट · {{blockedCabinets}} ब्लॉक कैबिनेट · {{blockedUsers}} ब्लॉक उपयोगकर्ता',
        averageCabinetPrice: 'औसत कैबिनेट कीमत',
        perHour: 'प्रति घंटा',
        recentUsers: 'हाल के उपयोगकर्ता',
        recentUsersDescription: 'डेमो डेटा क्रम के अनुसार प्लेटफ़ॉर्म के हाल के उपयोगकर्ता।',
        recentCabinets: 'हाल के कैबिनेट',
        recentCabinetsDescription: 'समीक्षा स्थिति वाले हाल के कैबिनेट।',
        noUsers: 'कोई उपयोगकर्ता नहीं मिला।',
        noCabinets: 'कोई कैबिनेट नहीं मिला।',
        viewAll: 'सभी देखें',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.hi,
    } } as const

const adminOwners = { hi: { description: 'प्लेटफ़ॉर्म मालिकों और खाते की पहुंच प्रबंधित करें।', emptyTitle: 'कोई मालिक नहीं मिला', emptyDescription: 'मालिक खाता बनाने के बाद यहां दिखाई देंगे।' } } as const

const adminCabinets = { hi: {
        title: 'कैबिनेट', description: 'कैबिनेट लिस्टिंग की समीक्षा और मॉडरेशन करें।', loading: 'कैबिनेट लोड हो रहे हैं...', failedToLoad: 'कैबिनेट लोड नहीं हो सके', emptyTitle: 'कोई कैबिनेट नहीं मिला', emptyDescription: 'प्लेटफ़ॉर्म के कैबिनेट यहां दिखाई देंगे।', statusUpdatedSuccessfully: 'कैबिनेट की स्थिति अपडेट हो गई।', statusUpdateFailed: 'कैबिनेट की स्थिति अपडेट नहीं हो सकी।', blockedSuccessfully: 'कैबिनेट ब्लॉक कर दिया गया।', blockFailed: 'कैबिनेट ब्लॉक नहीं हो सका।', confirmBlockEyebrow: 'कैबिनेट ब्लॉक करने की पुष्टि', confirmBlockTitle: 'क्या यह कैबिनेट ब्लॉक करें?', confirmBlockDescription: 'यह सार्वजनिक सूची से छिप जाएगा और ग्राहक इसे बुक नहीं कर पाएंगे।', keepAvailable: 'उपलब्ध रखें', confirmBlocking: 'ब्लॉक करने की पुष्टि', blockingAction: 'ब्लॉक हो रहा है...',
    } } as const

const adminReviews = { hi: { title: 'समीक्षाएं', description: 'प्रकाशित करने से पहले ग्राहक समीक्षाओं की मॉडरेशन करें।', loading: 'समीक्षाएं लोड हो रही हैं...', emptyTitle: 'अभी कोई समीक्षा नहीं', emptyDescription: 'ग्राहक द्वारा भेजी गई समीक्षाएं यहां दिखाई देंगी।', statusUpdatedSuccessfully: 'समीक्षा की स्थिति अपडेट हो गई।', statusUpdateFailed: 'समीक्षा की स्थिति अपडेट नहीं हो सकी।', pendingAction: 'मॉडरेशन में वापस भेजें', approvedAction: 'स्वीकृत करें', rejectedAction: 'अस्वीकार करें', deleteAction: 'हटाएं', deleting: 'हटाया जा रहा है...', deletedSuccessfully: 'समीक्षा हटा दी गई।', deleteFailed: 'समीक्षा हटाई नहीं जा सकी।', confirmDeleteEyebrow: 'समीक्षा हटाएं', confirmDeleteTitle: 'क्या यह समीक्षा हटाएं?', confirmDeleteDescription: 'यह कार्रवाई समीक्षा को प्रोजेक्ट से स्थायी रूप से हटा देगी।' } } as const

const securityCenter = { hi: { title: 'सुरक्षा केंद्र', description: 'सुपर एडमिन वर्कस्पेस में प्रमाणीकरण विफलताओं, दुरुपयोग संकेतों, स्रोत IP, रूट और जांच की स्थिति की समीक्षा करें।', permissionTitle: 'सुपर एडमिन एक्सेस आवश्यक है', permissionDescription: 'यह वर्कस्पेस संवेदनशील सुरक्षा टेलीमेट्री दिखाता है और केवल सुपर एडमिन के लिए उपलब्ध है।', loadError: 'सुरक्षा टेलीमेट्री लोड नहीं हो सकी।', exportReport: 'रिपोर्ट निर्यात करें', timeline: 'जांच टाइमलाइन', assignee: 'जिम्मेदार', unassigned: 'असाइन नहीं किया गया', assignToMe: 'मुझे असाइन करें', mitigationsTitle: 'अस्थायी उपाय', activeMitigations: 'सक्रिय ब्लॉक', topIps: 'सबसे सक्रिय स्रोत IP', topRoutes: 'सबसे अधिक लक्षित रूट', typeFilter: 'इवेंट प्रकार', allTypes: 'सभी प्रकार', severityFilter: 'गंभीरता', allSeverities: 'सभी गंभीरताएं', statusFilter: 'जांच स्थिति', allStatuses: 'सभी स्थितियां', eventsTitle: 'सुरक्षा गतिविधि', empty: 'इन फ़िल्टर से कोई सुरक्षा इवेंट मेल नहीं खाता।', loadMore: 'और लोड करें', loadingMore: 'और लोड हो रहे हैं...', types: { login_failed: 'लॉगिन विफल', account_locked: 'खाता लॉक', refresh_token_reuse: 'रिफ्रेश टोकन का पुन: उपयोग', rate_limit_exceeded: 'अनुरोध सीमा पार', invalid_token: 'अमान्य टोकन', csrf_violation: 'CSRF उल्लंघन', route_scan: 'अज्ञात रूट अनुरोध', malformed_request: 'गलत प्रारूप अनुरोध', oversized_request: 'बहुत बड़ा अनुरोध', privilege_denied: 'अनुमति अस्वीकृत', webhook_abuse: 'Webhook दुरुपयोग', mutation_burst: 'म्यूटेशन उछाल' }, severities: { info: 'जानकारी', warning: 'चेतावनी', high: 'उच्च', critical: 'गंभीर' }, statuses: { open: 'खुला', acknowledged: 'स्वीकृत', investigating: 'जांच में', resolved: 'हल किया गया', suppressed: 'दबाया गया' }, actorRoles: { client: 'क्लाइंट', owner: 'मालिक', admin: 'एडमिन', super_admin: 'सुपर एडमिन' }, authOutcomes: { unknown: 'अज्ञात', anonymous: 'अनाम', authenticated: 'प्रमाणित', failed: 'विफल' }, rateLimitResults: { not_checked: 'जांच नहीं हुई', allowed: 'अनुमत', blocked: 'ब्लॉक किया गया' }, proxyProvenances: { unknown: 'अज्ञात', direct: 'सीधा कनेक्शन', trusted_proxy: 'विश्वसनीय प्रॉक्सी', forwarded_header_untrusted: 'अविश्वसनीय अग्रेषित हेडर' } } } as const

const systemIncidents = { hi: { tab: 'सिस्टम घटनाएं', title: 'सिस्टम घटनाएं', description: 'ऑपरेशनल इवेंट उपयोगकर्ता गतिविधि से अलग रखे जाते हैं और यहां स्वीकार या हल किए जा सकते हैं।', incident: 'घटना', severity: 'गंभीरता', occurrences: 'घटनाएं', firstSeen: 'पहली बार देखी गई', lastSeen: 'अंतिम बार देखी गई', requestId: 'अनुरोध ID', acknowledge: 'स्वीकार करें', resolve: 'हल करें', statusOpen: 'खुला', statusAcknowledged: 'स्वीकृत', statusResolved: 'हल किया गया', severityWarning: 'चेतावनी', severityCritical: 'गंभीर', metadata: 'मेटाडेटा', showMetadata: 'मेटाडेटा देखें', copyRequestId: 'अनुरोध ID कॉपी करें', copied: 'अनुरोध ID कॉपी हो गई', copyFailed: 'अनुरोध ID कॉपी नहीं हो सकी।', emptyTitle: 'कोई सक्रिय घटना नहीं', emptyDescription: 'सर्वर और ऑपरेशनल घटनाएं मिलने पर यहां दिखाई देंगी।', searchPlaceholder: 'घटनाएं खोजें...', statusFilter: 'स्थिति', allStatuses: 'सभी', acknowledgedAt: 'स्वीकृत', resolvedAt: 'हल किया गया', loadedCount: '{count} घटनाएं लोड हुईं', loadMore: 'और लोड करें', loadingMore: 'और लोड हो रही हैं...' } } as const

const adminAuditLogs = { hi: {
        title: 'ऑडिट लॉग', description: 'प्लेटफ़ॉर्म की सभी प्रशासनिक और सुरक्षा कार्रवाइयों को ट्रैक करें।', timestamp: 'समय', actor: 'कर्ता', action: 'कार्रवाई', target: 'लक्ष्य', metadata: 'मेटाडेटा', noLogs: 'कोई ऑडिट लॉग नहीं मिला।', emptyDescription: 'कार्रवाई होने पर ऑडिट इवेंट यहां दिखाई देंगे।', searchPlaceholder: 'लॉग खोजें...', export: 'CSV निर्यात करें', auditTab: 'गतिविधि ऑडिट', showMetadata: 'मेटाडेटा देखें', saveFilter: 'फ़िल्टर सहेजें', clearFilter: 'सहेजा गया फ़िल्टर हटाएं', savedFilter: 'सहेजा गया फ़िल्टर: {query}', filterSaved: 'इस सत्र के लिए ऑडिट फ़िल्टर सहेज दिया गया।', filterCleared: 'सहेजा गया ऑडिट फ़िल्टर हटा दिया गया।', loadedCount: '{count} इवेंट लोड हुए', loadMore: 'और लोड करें', loadingMore: 'और लोड हो रहे हैं...',
        actions: { user_status_updated: 'उपयोगकर्ता की स्थिति अपडेट हुई', user_role_updated: 'उपयोगकर्ता की भूमिका अपडेट हुई', admin_created: 'एडमिन बनाया गया', cabinet_status_updated: 'कैबिनेट की स्थिति अपडेट हुई', review_moderated: 'समीक्षा मॉडरेट की गई', review_deleted: 'समीक्षा हटा दी गई', subscription_created: 'सदस्यता बनाई गई', promo_subscription_issued: 'प्रमोशनल सदस्यता जारी', login_failed: 'लॉगिन प्रयास विफल', account_locked: 'खाता लॉक किया गया', refresh_token_reuse: 'रिफ्रेश टोकन का पुन: उपयोग मिला', outbox_retried: 'Outbox इवेंट का पुनः प्रयास', outbox_dead_lettered: 'Outbox इवेंट को विफल कतार में भेजा गया', oauth_identity_linked: 'OAuth पहचान लिंक की गई', oauth_identity_unlinked: 'OAuth पहचान अनलिंक की गई', account_deletion_requested: 'खाता हटाने का अनुरोध', account_deletion_cancelled: 'खाता हटाना रद्द', account_deletion_completed: 'खाता हटाना पूरा', security_events_viewed: 'सुरक्षा इवेंट देखे गए', security_center_viewed: 'सुरक्षा केंद्र देखा गया', security_center_event_status_updated: 'सुरक्षा इवेंट की स्थिति अपडेट हुई', security_center_report_exported: 'सुरक्षा जांच रिपोर्ट निर्यात हुई', security_user_sessions_revoked: 'सुरक्षा केंद्र से उपयोगकर्ता सत्र रद्द किए गए' },
    } } as const

const adminUsers = { hi: {
        title: 'उपयोगकर्ता',
        description: 'उपयोगकर्ता स्थिति और अकाउंट एक्सेस प्रबंधित करें।',
        loading: 'उपयोगकर्ता लोड हो रहे हैं...',
        failedToLoad: 'उपयोगकर्ता लोड नहीं हो सके',
        emptyTitle: 'कोई उपयोगकर्ता नहीं मिला',
        emptyDescription: 'प्लेटफ़ॉर्म उपयोगकर्ता यहां दिखाई देंगे।',
        userColumn: 'उपयोगकर्ता',
        statusUpdatedSuccessfully: 'उपयोगकर्ता स्थिति अपडेट हो गई।',
        statusUpdateFailed: 'उपयोगकर्ता स्थिति अपडेट नहीं हो सकी।',
        blockedSuccessfully: 'उपयोगकर्ता ब्लॉक कर दिया गया।',
        blockFailed: 'उपयोगकर्ता ब्लॉक नहीं हो सका।',
        confirmBlockEyebrow: 'उपयोगकर्ता ब्लॉक करने की पुष्टि',
        confirmBlockTitle: 'क्या इस उपयोगकर्ता को ब्लॉक करें?',
        confirmBlockDescription: 'उपयोगकर्ता साइन इन या सुरक्षित पेज का उपयोग नहीं कर पाएगा।',
        adminStatusRestricted: 'केवल सुपर एडमिन एडमिन अकाउंट प्रबंधित कर सकता है।',
        keepActive: 'सक्रिय रखें',
        confirmBlocking: 'ब्लॉक करने की पुष्टि',
        blockingAction: 'ब्लॉक हो रहा है...',
        createAdminTitle: 'एडमिन बनाएं',
        createAdminDescription: 'नए एडमिन को आमंत्रित करें। उन्हें नीचे दिए लिंक से पासवर्ड सेट करना होगा।',
        adminCreatedSuccessfully: 'एडमिन सफलतापूर्वक बनाया गया।',
        adminCreateFailed: 'एडमिन नहीं बनाया जा सका।',
        setupUrlLabel: 'सेटअप लिंक',
        setupUrlDescription: 'नए एडमिन को पासवर्ड सेट करने के लिए यह लिंक साझा करें।',
        roleUpdatedSuccessfully: 'उपयोगकर्ता भूमिका अपडेट हो गई।',
        roleUpdateFailed: 'उपयोगकर्ता भूमिका अपडेट नहीं हो सकी।',
        roleClient: 'क्लाइंट',
        roleOwner: 'मालिक',
        roleAdmin: 'एडमिन',
        roleSuperAdmin: 'सुपर एडमिन',
    } } as const

const mockDashboard = { hi: { dashboardWelcome: 'स्वागत है, Anna!', dashboardSubtitle: 'सब कुछ नियंत्रण में है।', dashboardBookings: 'बुकिंग', dashboardRequests: 'नए अनुरोध', dashboardCabinets: 'कैबिनेट', dashboardReviews: 'समीक्षाएं', latestBookings: 'हाल की बुकिंग', viewAllBookings: 'सभी बुकिंग देखें', calendarMonth: 'मई 2025', weekdayMonShort: 'सोम', weekdayTueShort: 'मंगल', weekdayWedShort: 'बुध', weekdayThuShort: 'गुरु', weekdayFriShort: 'शुक्र', weekdaySatShort: 'शनि', weekdaySunShort: 'रवि', loadTitle: 'कैबिनेट उपयोग', bookingConfirmed: 'पुष्टि की गई', bookingPending: 'लंबित', bookingName1: 'Irene S.', bookingName2: 'Alex O.', bookingName3: 'Ekaterina P.', bookingCabinet1: 'कैबिनेट 1', bookingCabinet2: 'कैबिनेट 2', bookingCabinet3: 'कैबिनेट 3', bookingToday1100: 'आज, 11:00', bookingToday1230: 'आज, 12:30', bookingTomorrow1000: 'कल, 10:00' } } as const

const errors = { hi: { VALIDATION_ERROR: 'सत्यापन विफल हुआ। फ़ॉर्म जांचें।', NOT_FOUND: 'अनुरोधित संसाधन नहीं मिला।', INTERNAL_SERVER_ERROR: 'कुछ गलत हुआ। कृपया बाद में प्रयास करें।', BAD_REQUEST: 'अमान्य अनुरोध।', UNAUTHORIZED: 'जारी रखने के लिए साइन इन करें।', FORBIDDEN: 'आपको यह कार्रवाई करने की अनुमति नहीं है।', CONFLICT: 'संघर्ष हुआ। यह रिकॉर्ड पहले से मौजूद हो सकता है।', TOO_MANY_REQUESTS: 'बहुत अधिक अनुरोध। कृपया थोड़ी देर बाद प्रयास करें।', CSRF_ORIGIN_MISMATCH: 'सुरक्षा जांच विफल हुई।', CSRF_TOKEN_MISMATCH: 'सत्र समाप्त हो गया है या अमान्य है।', EMAIL_VERIFICATION_REQUIRED: 'यह कार्रवाई करने के लिए ईमेल सत्यापित करें।', BREACHED_PASSWORD: 'ऐसा पासवर्ड चुनें जो किसी ज्ञात डेटा उल्लंघन में सामने न आया हो।' } } as const

const cabinetCatalog = { hi: {
        title: 'स्थान',
        publicList: {
            eyebrow: 'सार्वजनिक कैटलॉग', title: 'उपलब्ध स्थान', description: 'ब्यूटी, मेडिकल, परामर्श और विशेषज्ञ अपॉइंटमेंट के लिए सक्रिय स्थान खोजें।', loading: 'स्थान लोड हो रहे हैं...', failedToLoad: 'स्थान लोड नहीं हो सके', emptyTitle: 'कोई स्थान नहीं मिला', emptyDescription: 'अभी कोई सक्रिय स्थान उपलब्ध नहीं है।', photoFallback: 'स्थान की तस्वीर', from: 'से', perHourShort: '/ घंटा', searchPlaceholder: 'नाम या शहर से खोजें...', sortBy: 'क्रमबद्ध करें', sortNewest: 'नवीनतम पहले', sortPopular: 'लोकप्रिय पहले', sortPriceAsc: 'कीमत: कम से अधिक', sortPriceDesc: 'कीमत: अधिक से कम', advancedFilters: 'फ़िल्टर', cityLabel: 'शहर', cityPlaceholder: 'कोई भी शहर', categoryLabel: 'श्रेणी', allCategories: 'सभी श्रेणियां', categoryBeauty: 'ब्यूटी', categoryMedical: 'मेडिकल', categoryConsultation: 'परामर्श', categoryWellness: 'वेलनेस', categoryOffice: 'ऑफिस', priceRangeLabel: 'प्रति घंटे की कीमत', minPrice: 'से', maxPrice: 'तक', ratingLabel: 'रेटिंग', anyRating: 'कोई भी रेटिंग', stars: 'स्टार', serviceLabel: 'सेवा', servicePlaceholder: 'जैसे, मसाज', availableToday: 'आज उपलब्ध', clearFilters: 'फ़िल्टर साफ़ करें', resultsEyebrow: 'उपलब्धता के आधार पर खोज', resultsTitle: 'आपके आस-पास के स्थान', resultsCount: '{{count}} स्थान मिले', viewMode: 'कैटलॉग दृश्य', splitView: 'सूची + मानचित्र', listView: 'सूची', mapView: 'मानचित्र', backToSplitView: 'सूची और मानचित्र पर लौटें', view: 'विवरण देखें', imageAlt: '{{title}} का अंदरूनी भाग', todayAvailability: 'आज', freeSlots: '{{count}} स्लॉट बाकी', mapTitle: 'क्षेत्र का मानचित्र', mapApproximate: 'क्षेत्र का अनुमानित दृश्य। सटीक पता स्थान के पेज पर दिखाया जाता है।', mapZoomIn: 'ज़ूम इन', mapZoomOut: 'ज़ूम आउट', mapCurrentLocation: 'मेरी लोकेशन इस्तेमाल करें', mapLocationLoading: 'आपकी लोकेशन ढूंढी जा रही है...', mapLocationFound: 'मानचित्र आपकी लोकेशन पर केंद्रित है।', mapLocationError: 'लोकेशन उपलब्ध नहीं है। मानचित्र अनुमानित रहेगा।', mapTileError: 'मानचित्र डेटा अस्थायी रूप से उपलब्ध नहीं है। सूची इस्तेमाल करें या मानचित्र बाहर खोलें।', openMap: 'मानचित्र खोलें', selectedCabinet: 'चयनित स्थान',
        },
    } } as const

const profilePrivacy = { hi: {
        title: 'डेटा और गोपनीयता',
        description: 'अपने AutoCare Hub डेटा की प्रति और खाता हटाने के अनुरोध को प्रबंधित करें।',
        exportTitle: 'मेरा डेटा निर्यात करें',
        exportDescription: 'अपने खाते, बुकिंग, सूचनाओं, पसंदीदा और स्थानों की सीमित JSON प्रति डाउनलोड करें।',
        exportAction: 'डेटा डाउनलोड करें',
        exporting: 'निर्यात तैयार हो रहा है...',
        exportSuccess: 'आपका डेटा निर्यात तैयार है।',
        exportError: 'आपका डेटा निर्यात नहीं हो सका।',
        deletionTitle: 'मेरा खाता हटाएं',
        deletionDescription: 'समीक्षा के लिए खाता हटाने का अनुरोध करें। वित्तीय और बुकिंग रिकॉर्ड retention नीति के अनुसार रखे जाएंगे।',
        requestAction: 'हटाने का अनुरोध करें',
        reasonLabel: 'कारण (वैकल्पिक)',
        reasonPlaceholder: 'बताएं कि आप क्यों जा रहे हैं',
        confirmRequest: 'अनुरोध भेजें',
        requestPending: 'खाता हटाने का अनुरोध समीक्षा की प्रतीक्षा में है।',
        requestedAt: 'अनुरोध किया गया: {{date}}',
        cancelRequest: 'अनुरोध रद्द करें',
        cancelConfirm: 'लंबित खाता हटाने का अनुरोध रद्द करें?',
        requestSuccess: 'खाता हटाने का अनुरोध भेज दिया गया।',
        requestError: 'खाता हटाने का अनुरोध नहीं भेजा जा सका।',
        cancelSuccess: 'खाता हटाने का अनुरोध रद्द कर दिया गया।',
        cancelError: 'खाता हटाने का अनुरोध रद्द नहीं किया जा सका।',
    } } as const

const booking = { hi: {
        title: 'बुकिंग', myBookings: 'मेरी बुकिंग', noBookingsYet: 'अभी कोई बुकिंग नहीं है', loadingBookings: 'बुकिंग लोड हो रही हैं...', failedToLoadBookings: 'बुकिंग लोड नहीं हो सकीं।', upcoming: 'आगामी', cancelled: 'रद्द', completed: 'पूर्ण', cancelBooking: 'बुकिंग रद्द करें', confirmCancellation: 'रद्द करने की पुष्टि करें', cancelThisBooking: 'क्या यह बुकिंग रद्द करनी है?', keepBooking: 'बुकिंग रखें', cancelling: 'रद्द किया जा रहा है...', bookingCancelledSuccessfully: 'बुकिंग सफलतापूर्वक रद्द हो गई।', failedToCancelBooking: 'बुकिंग रद्द नहीं हो सकी।', bookThisCabinet: 'इस स्थान को बुक करें', chooseServiceAndTime: 'सेवा और पसंदीदा समय चुनें।', selectService: 'सेवा चुनें', selectDate: '2. तारीख चुनें', selectTime: '3. समय चुनें', noAvailableTimes: 'इस तारीख के लिए कोई समय उपलब्ध नहीं है।', createBooking: 'बुकिंग बनाएं', creatingBooking: 'बुकिंग बनाई जा रही है...', bookingCreatedSuccessfully: 'बुकिंग सफलतापूर्वक बन गई।', successTitle: 'आपका समय आरक्षित है', viewMyBookings: 'मेरी बुकिंग देखें', openDirections: 'दिशाएं खोलें', pendingStatusLabel: 'लंबित', confirmedStatusLabel: 'पुष्ट', cancelledStatusLabel: 'रद्द', completedStatusLabel: 'पूर्ण',
    } } as const

export const hiTranslations = createPopularLocale('hi', { common: common.hi, navigation: navigation.hi, auth: auth.hi, workspace: workspace.hi, ownerDashboard: ownerDashboard.hi, adminDashboard: adminDashboard.hi, adminUsers: adminUsers.hi, adminOwners: adminOwners.hi, adminCabinets: adminCabinets.hi, adminReviews: adminReviews.hi, adminAuditLogs: adminAuditLogs.hi, systemIncidents: systemIncidents.hi, securityCenter: securityCenter.hi, errors: errors.hi, booking: booking.hi, cabinet: cabinetCatalog.hi, profile: { privacy: profilePrivacy.hi }, landing: { ...landingExtraPopular.hi, ...landingPopular.hi, ...mockDashboard.hi, eyebrow: 'कैबिनेट किराये के लिए बुकिंग CRM', title: 'कैबिनेट, सेवाओं और बुकिंग को एक ही जगह प्रबंधित करें।', description: 'AutoCare Hub ग्राहकों को बुकिंग और मालिकों को लिस्टिंग व सेवाएं प्रबंधित करने में मदद करता है।' } })
