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

const common = { ko: {
        loading: '로드 중...', loadingPage: '페이지를 불러오는 중...', error: '오류',
        failedToLoad: '불러오지 못했습니다.', create: '생성', edit: '수정', delete: '삭제', cancel: '취소',
        confirm: '확인', save: '저장', back: '뒤로', status: '상태', actions: '작업', name: '이름',
        email: '이메일', saving: '저장 중...', close: '닫기', dismiss: '닫기', language: '언어', theme: '테마',
        menu: '메뉴', more: '더 보기', switchToDarkTheme: '어두운 테마로 전환', switchToLightTheme: '밝은 테마로 전환',
        notProvided: '입력되지 않음', tryAgainLater: '나중에 다시 시도해 주세요.', retry: '다시 시도',
    } } as const

const navigation = { ko: { home: '홈', features: '기능', cabinets: '공간', services: '자동차 서비스', owners: '소유자용', pricing: '요금', about: '소개', profile: '프로필', myBookings: '내 예약', favorites: '즐겨찾기', notifications: '알림', ownerDashboard: '소유자 대시보드', ownerCabinets: '내 공간', ownerBookings: '예약', ownerServices: '서비스', adminDashboard: '관리자 대시보드', adminUsers: '사용자', adminOwners: '소유자', adminCabinets: '공간', adminReviews: '리뷰', adminAuditLogs: '감사 로그', ownerDashboardShort: '대시보드', ownerCalendar: '캘린더' } } as const

const auth = { ko: { signIn: '로그인', logOut: '로그아웃', createAccount: '계정 만들기', welcomeBack: '다시 오신 것을 환영합니다', signInTitle: 'AutoCare Hub 로그인', signInToContinue: '계속하려면 로그인하세요.', email: '이메일', password: '비밀번호', signingIn: '로그인 중...', failedToSignIn: '로그인하지 못했습니다.', alreadyHaveAccount: '이미 계정이 있나요?', forgotPasswordLink: '비밀번호를 잊으셨나요?' } } as const

const workspace = { ko: { client: '고객 작업 공간', owner: '소유자 작업 공간', admin: '관리자 작업 공간', overview: '개요', manage: '관리', configure: '설정', monitor: '모니터링', support: '지원', collapseSidebar: '사이드바 접기', expandSidebar: '사이드바 펼치기', systemStatus: '모든 시스템이 정상 작동 중입니다' } } as const

const ownerDashboard = { ko: {
        title: '대시보드',
        description: '공간, 서비스, 예약 및 운영 활동을 확인하세요.',
        loading: '대시보드를 불러오는 중...',
        failedToLoad: '대시보드를 불러오지 못했습니다',
        activeCount: '{{count}}개 활성',
        bookingStatusCounts: '{{pending}}개 대기 · {{confirmed}}개 확정',
        averageCabinetPrice: '평균 공간 요금',
        perHour: '시간당',
        upcomingBookings: '예정된 예약',
        upcomingBookingsDescription: '공간의 대기 및 확정 예약입니다.',
        noUpcomingBookings: '현재 예정된 예약이 없습니다.',
        activeServices: '활성 서비스',
        activeServicesDescription: '현재 예약할 수 있는 서비스입니다.',
        noServices: '아직 생성된 서비스가 없습니다.',
        viewAll: '모두 보기',
        bookingMeta: '공간: {{cabinetId}} · 서비스: {{serviceId}}',
        serviceMeta: '{{duration}}분 · {{price}}',
        analyticsTitle: '예약 성과',
        analyticsDescription: '앞으로 30일 동안의 예정된 업무를 한눈에 확인하세요.',
        projectedRevenue: '예정 수익',
        bookedHours: '예약 시간',
        bookingLoad: '예약 부하',
        popularServices: '인기 서비스',
        noBookingData: '고객이 예약을 만들면 예약 데이터가 여기에 표시됩니다.',
        mobileRevenue: '수익',
        mobileOccupancy: '이용률',
        mobileToday: '오늘',
        mobileAwaitingResponse: '응답을 기다리는 중',
        mobileBookingExpires: '이 예약은 곧 만료됩니다',
        mobileConfirm: '확정',
        mobileDecline: '거절',
        mobileUpcomingToday: '오늘 예정',
        mobileViewCalendar: '캘린더 보기',
        mobileOfflineDraft: '연결되면 초안 변경 사항이 저장됩니다.',
        mobileReviewDraft: '초안 검토',
        mobileAddSpace: '공간 추가',
        mobileMySpaces: '내 공간',
        clientListTitle: '고객',
        clientListDescription: '서비스를 예약한 고객을 최근 예약 순으로 표시합니다.',
        noClients: '아직 예약한 고객이 없습니다.',
        visits: '{{count}}회 방문',
        lastBooking: '최근 예약: {{date}}',
        noOwnerNote: '아직 내부 메모가 없습니다.',
        actionCenter: {
            eyebrow: '작업 센터',
            title: '확인이 필요한 작업',
            description: '대기 중인 작업을 확인하고 해결할 작업 공간을 바로 여세요.',
            allClear: '모든 항목이 최신 상태입니다. 대기 중인 작업이 없습니다.',
            pendingBookings: '대기 중인 예약',
            pendingBookingsDescription: '확인을 기다리는 예약입니다.',
            rescheduleRequests: '일정 변경 요청',
            rescheduleRequestsDescription: '새 시간을 결정해 주기를 기다리는 고객입니다.',
            draftCabinets: '임시 공간',
            draftCabinetsDescription: '아직 공개 예약을 시작할 준비가 되지 않은 공간입니다.',
            blockedCabinets: '차단된 공간',
            blockedCabinetsDescription: '검토 또는 설정 확인이 필요한 공간입니다.',
            readiness: '게시 준비 상태',
            readinessDescription: '예약을 받기 전에 남은 설정을 완료하세요.',
            olderThan24Hours: '{{count}}개가 24시간 이상 경과',
            open: '작업 공간 열기',
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

const adminDashboard = { ko: {
        title: '관리자 대시보드',
        description: '사용자, 공간, 플랫폼 활동 및 검토 상태를 모니터링하세요.',
        loading: '관리자 대시보드를 불러오는 중...',
        failedToLoad: '관리자 대시보드를 불러오지 못했습니다',
        users: '사용자',
        userRoleCounts: '고객 {{clients}}명 · 소유자 {{owners}}명 · 관리자 {{admins}}명',
        userStatusCounts: '{{active}}개 활성 · {{blocked}}개 차단',
        activeCount: '{{count}}개 활성',
        moderation: '검토',
        moderationBreakdown: '임시 공간 {{draftCabinets}}개 · 차단된 공간 {{blockedCabinets}}개 · 차단된 사용자 {{blockedUsers}}명',
        averageCabinetPrice: '평균 공간 요금',
        perHour: '시간당',
        recentUsers: '최근 사용자',
        recentUsersDescription: '데모 데이터 순서에 따른 최신 플랫폼 사용자입니다.',
        recentCabinets: '최근 공간',
        recentCabinetsDescription: '검토 상태가 포함된 최신 공간입니다.',
        noUsers: '사용자를 찾을 수 없습니다.',
        noCabinets: '공간을 찾을 수 없습니다.',
        viewAll: '모두 보기',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.ko,
    } } as const

const adminOwners = { ko: { description: '플랫폼 소유자와 계정 접근 권한을 관리합니다.', emptyTitle: '소유자가 없습니다', emptyDescription: '소유자가 계정을 만들면 여기에 표시됩니다.' } } as const

const adminCabinets = { ko: {
        title: '공간', description: '공간 등록을 검토하고 관리합니다.', loading: '공간을 불러오는 중...', failedToLoad: '공간을 불러오지 못했습니다', emptyTitle: '공간이 없습니다', emptyDescription: '플랫폼 공간이 여기에 표시됩니다.', statusUpdatedSuccessfully: '공간 상태가 업데이트되었습니다.', statusUpdateFailed: '공간 상태를 업데이트하지 못했습니다.', blockedSuccessfully: '공간이 차단되었습니다.', blockFailed: '공간을 차단하지 못했습니다.', confirmBlockEyebrow: '공간 차단 확인', confirmBlockTitle: '이 공간을 차단할까요?', confirmBlockDescription: '공개 목록에서 숨겨지고 고객이 예약할 수 없게 됩니다.', keepAvailable: '사용 가능으로 유지', confirmBlocking: '차단 확인', blockingAction: '차단 중...',
    } } as const

const adminReviews = { ko: { title: '리뷰', description: '공개 전에 고객 리뷰를 검토합니다.', loading: '리뷰를 불러오는 중...', emptyTitle: '아직 리뷰가 없습니다', emptyDescription: '고객이 리뷰를 제출하면 여기에 표시됩니다.', statusUpdatedSuccessfully: '리뷰 상태가 업데이트되었습니다.', statusUpdateFailed: '리뷰 상태를 업데이트하지 못했습니다.', pendingAction: '검토로 되돌리기', approvedAction: '승인', rejectedAction: '거부', deleteAction: '삭제', deleting: '삭제 중...', deletedSuccessfully: '리뷰가 삭제되었습니다.', deleteFailed: '리뷰를 삭제하지 못했습니다.', confirmDeleteEyebrow: '리뷰 삭제', confirmDeleteTitle: '이 리뷰를 삭제할까요?', confirmDeleteDescription: '이 작업은 프로젝트에서 리뷰를 영구적으로 삭제합니다.' } } as const

const securityCenter = { ko: { title: '보안 센터', description: '최고 관리자 작업 공간에서 인증 실패, 악용 신호, 출처 IP, 경로 및 조사 상태를 확인합니다.', permissionTitle: '최고 관리자 권한이 필요합니다', permissionDescription: '이 공간은 민감한 보안 텔레메트리를 제공하며 최고 관리자만 사용할 수 있습니다.', loadError: '보안 텔레메트리를 불러오지 못했습니다.', exportReport: '보고서 내보내기', timeline: '조사 타임라인', assignee: '담당자', unassigned: '미할당', assignToMe: '나에게 할당', mitigationsTitle: '임시 완화 조치', activeMitigations: '활성 차단', topIps: '가장 활발한 출처 IP', topRoutes: '가장 많이 공격된 경로', typeFilter: '이벤트 유형', allTypes: '모든 유형', severityFilter: '심각도', allSeverities: '모든 심각도', statusFilter: '조사 상태', allStatuses: '모든 상태', eventsTitle: '보안 활동', empty: '필터와 일치하는 보안 이벤트가 없습니다.', loadMore: '더 불러오기', loadingMore: '더 불러오는 중...', types: { login_failed: '로그인 실패', account_locked: '계정 잠금', refresh_token_reuse: '리프레시 토큰 재사용', rate_limit_exceeded: '요청 제한 초과', invalid_token: '잘못된 토큰', csrf_violation: 'CSRF 위반', route_scan: '알 수 없는 경로 요청', malformed_request: '잘못된 요청 형식', oversized_request: '크기 초과 요청', privilege_denied: '권한 거부', webhook_abuse: 'Webhook 악용', mutation_burst: '변경 요청 폭주' }, severities: { info: '정보', warning: '경고', high: '높음', critical: '심각' }, statuses: { open: '열림', acknowledged: '확인됨', investigating: '조사 중', resolved: '해결됨', suppressed: '억제됨' }, actorRoles: { client: '클라이언트', owner: '소유자', admin: '관리자', super_admin: '최고 관리자' }, authOutcomes: { unknown: '알 수 없음', anonymous: '익명', authenticated: '인증됨', failed: '실패' }, rateLimitResults: { not_checked: '확인 안 됨', allowed: '허용됨', blocked: '차단됨' }, proxyProvenances: { unknown: '알 수 없음', direct: '직접 연결', trusted_proxy: '신뢰된 프록시', forwarded_header_untrusted: '신뢰할 수 없는 전달 헤더' } } } as const

const systemIncidents = { ko: { tab: '시스템 인시던트', title: '시스템 인시던트', description: '운영 이벤트는 사용자 활동과 분리되며 여기서 확인하거나 해결할 수 있습니다.', incident: '인시던트', severity: '심각도', occurrences: '발생 횟수', firstSeen: '최초 감지', lastSeen: '최근 감지', requestId: '요청 ID', acknowledge: '확인', resolve: '해결', statusOpen: '열림', statusAcknowledged: '확인됨', statusResolved: '해결됨', severityWarning: '경고', severityCritical: '심각', metadata: '메타데이터', showMetadata: '메타데이터 보기', copyRequestId: '요청 ID 복사', copied: '요청 ID가 복사되었습니다', copyFailed: '요청 ID를 복사하지 못했습니다.', emptyTitle: '활성 인시던트가 없습니다', emptyDescription: '서버 및 운영 인시던트가 감지되면 여기에 표시됩니다.', searchPlaceholder: '인시던트 검색...', statusFilter: '상태', allStatuses: '전체', acknowledgedAt: '확인됨', resolvedAt: '해결됨', loadedCount: '{count}개 인시던트 로드됨', loadMore: '더 불러오기', loadingMore: '더 불러오는 중...' } } as const

const adminAuditLogs = { ko: {
        title: '감사 로그', description: '플랫폼의 모든 관리자 및 보안 작업을 추적합니다.', timestamp: '시간', actor: '수행자', action: '작업', target: '대상', metadata: '메타데이터', noLogs: '감사 로그가 없습니다.', emptyDescription: '작업이 수행되면 감사 이벤트가 여기에 표시됩니다.', searchPlaceholder: '로그 검색...', export: 'CSV 내보내기', auditTab: '활동 감사', showMetadata: '메타데이터 보기', saveFilter: '필터 저장', clearFilter: '저장된 필터 지우기', savedFilter: '저장된 필터: {query}', filterSaved: '이번 세션에 감사 필터를 저장했습니다.', filterCleared: '저장된 감사 필터를 지웠습니다.', loadedCount: '{count}개 이벤트 로드됨', loadMore: '더 불러오기', loadingMore: '더 불러오는 중...',
        actions: { user_status_updated: '사용자 상태 업데이트', user_role_updated: '사용자 역할 업데이트', admin_created: '관리자 생성', cabinet_status_updated: '공간 상태 업데이트', review_moderated: '리뷰 검토', review_deleted: '리뷰 삭제', subscription_created: '구독 생성', promo_subscription_issued: '프로모션 구독 발급', login_failed: '로그인 시도 실패', account_locked: '계정 잠금', refresh_token_reuse: '리프레시 토큰 재사용 감지', outbox_retried: 'Outbox 이벤트 재시도', outbox_dead_lettered: 'Outbox 이벤트를 실패 큐로 이동', oauth_identity_linked: 'OAuth ID 연결', oauth_identity_unlinked: 'OAuth ID 연결 해제', account_deletion_requested: '계정 삭제 요청', account_deletion_cancelled: '계정 삭제 취소', account_deletion_completed: '계정 삭제 완료', security_events_viewed: '보안 이벤트 조회', security_center_viewed: '보안 센터 조회', security_center_event_status_updated: '보안 이벤트 상태 업데이트', security_center_report_exported: '보안 조사 보고서 내보내기', security_user_sessions_revoked: '보안 센터에서 사용자 세션 해지' },
    } } as const

const adminUsers = { ko: {
        title: '사용자',
        description: '사용자 상태와 계정 액세스를 관리하세요.',
        loading: '사용자를 불러오는 중...',
        failedToLoad: '사용자를 불러오지 못했습니다',
        emptyTitle: '사용자를 찾을 수 없습니다',
        emptyDescription: '플랫폼 사용자가 여기에 표시됩니다.',
        userColumn: '사용자',
        statusUpdatedSuccessfully: '사용자 상태가 업데이트되었습니다.',
        statusUpdateFailed: '사용자 상태를 업데이트하지 못했습니다.',
        blockedSuccessfully: '사용자가 차단되었습니다.',
        blockFailed: '사용자를 차단하지 못했습니다.',
        confirmBlockEyebrow: '사용자 차단 확인',
        confirmBlockTitle: '이 사용자를 차단할까요?',
        confirmBlockDescription: '사용자는 로그인하거나 보호된 페이지를 사용할 수 없습니다.',
        adminStatusRestricted: '최고 관리자만 관리자 계정을 관리할 수 있습니다.',
        keepActive: '활성 유지',
        confirmBlocking: '차단 확인',
        blockingAction: '차단 중...',
        createAdminTitle: '관리자 생성',
        createAdminDescription: '관리자를 초대합니다. 아래 링크를 통해 비밀번호를 설정해야 합니다.',
        adminCreatedSuccessfully: '관리자가 생성되었습니다.',
        adminCreateFailed: '관리자를 생성하지 못했습니다.',
        setupUrlLabel: '설정 링크',
        setupUrlDescription: '새 관리자가 비밀번호를 설정할 수 있도록 이 링크를 공유하세요.',
        roleUpdatedSuccessfully: '사용자 역할이 업데이트되었습니다.',
        roleUpdateFailed: '사용자 역할을 업데이트하지 못했습니다.',
        roleClient: '고객',
        roleOwner: '소유자',
        roleAdmin: '관리자',
        roleSuperAdmin: '최고 관리자',
    } } as const

const mockDashboard = { ko: { dashboardWelcome: 'Anna님, 환영합니다!', dashboardSubtitle: '모든 것이 잘 관리되고 있습니다.', dashboardBookings: '예약', dashboardRequests: '새 요청', dashboardCabinets: '공간', dashboardReviews: '리뷰', latestBookings: '최근 예약', viewAllBookings: '모든 예약 보기', calendarMonth: '2025년 5월', weekdayMonShort: '월', weekdayTueShort: '화', weekdayWedShort: '수', weekdayThuShort: '목', weekdayFriShort: '금', weekdaySatShort: '토', weekdaySunShort: '일', loadTitle: '공간 이용률', bookingConfirmed: '확정됨', bookingPending: '대기 중', bookingName1: 'Irene S.', bookingName2: 'Alex O.', bookingName3: 'Ekaterina P.', bookingCabinet1: '공간 1', bookingCabinet2: '공간 2', bookingCabinet3: '공간 3', bookingToday1100: '오늘 11:00', bookingToday1230: '오늘 12:30', bookingTomorrow1000: '내일 10:00' } } as const

const errors = { ko: { VALIDATION_ERROR: '유효성 검사에 실패했습니다. 양식을 확인하세요.', NOT_FOUND: '요청한 리소스를 찾을 수 없습니다.', INTERNAL_SERVER_ERROR: '문제가 발생했습니다. 나중에 다시 시도하세요.', BAD_REQUEST: '잘못된 요청입니다.', UNAUTHORIZED: '계속하려면 로그인하세요.', FORBIDDEN: '이 작업을 수행할 권한이 없습니다.', CONFLICT: '충돌이 발생했습니다. 이미 존재하는 항목일 수 있습니다.', TOO_MANY_REQUESTS: '요청이 너무 많습니다. 잠시 후 다시 시도하세요.', CSRF_ORIGIN_MISMATCH: '보안 확인에 실패했습니다.', CSRF_TOKEN_MISMATCH: '세션이 만료되었거나 유효하지 않습니다.', EMAIL_VERIFICATION_REQUIRED: '이 작업을 수행하려면 이메일을 인증하세요.', BREACHED_PASSWORD: '알려진 데이터 유출에 포함되지 않은 비밀번호를 선택하세요.' } } as const

const cabinetCatalog = { ko: {
        title: '공간',
        publicList: {
            eyebrow: '공개 카탈로그', title: '이용 가능한 공간', description: '뷰티, 의료, 상담 및 전문 서비스 예약에 맞는 활성 공간을 찾아보세요.', loading: '공간을 불러오는 중...', failedToLoad: '공간을 불러오지 못했습니다', emptyTitle: '공간을 찾을 수 없습니다', emptyDescription: '현재 이용 가능한 활성 공간이 없습니다.', photoFallback: '공간 사진', from: '최저', perHourShort: '/ 시간', searchPlaceholder: '이름 또는 도시로 검색...', sortBy: '정렬 기준', sortNewest: '최신순', sortPopular: '인기순', sortPriceAsc: '가격: 낮은 순', sortPriceDesc: '가격: 높은 순', advancedFilters: '필터', cityLabel: '도시', cityPlaceholder: '모든 도시', categoryLabel: '카테고리', allCategories: '모든 카테고리', categoryBeauty: '뷰티', categoryMedical: '의료', categoryConsultation: '상담', categoryWellness: '웰니스', categoryOffice: '오피스', priceRangeLabel: '시간당 가격', minPrice: '최저', maxPrice: '최고', ratingLabel: '평점', anyRating: '모든 평점', stars: '별', serviceLabel: '서비스', servicePlaceholder: '예: 마사지', availableToday: '오늘 이용 가능', clearFilters: '필터 지우기', resultsEyebrow: '이용 가능 시간 우선 검색', resultsTitle: '내 주변 공간', resultsCount: '{{count}}개의 공간을 찾았습니다', viewMode: '카탈로그 보기', splitView: '목록 + 지도', listView: '목록', mapView: '지도', backToSplitView: '목록과 지도로 돌아가기', view: '상세 보기', imageAlt: '{{title}} 내부', todayAvailability: '오늘', freeSlots: '{{count}}개 시간 남음', mapTitle: '지역 지도', mapApproximate: '지역을 대략적으로 보여줍니다. 정확한 주소는 공간 페이지에서 확인할 수 있습니다.', mapZoomIn: '확대', mapZoomOut: '축소', mapCurrentLocation: '현재 위치 사용', mapLocationLoading: '위치를 찾는 중...', mapLocationFound: '현재 위치를 중심으로 지도를 표시했습니다.', mapLocationError: '위치를 사용할 수 없습니다. 지도는 대략적으로 표시됩니다.', mapTileError: '지도 데이터를 일시적으로 사용할 수 없습니다. 목록을 사용하거나 외부에서 지도를 여세요.', openMap: '지도 열기', selectedCabinet: '선택한 공간',
        },
    } } as const

const profilePrivacy = { ko: {
        title: '데이터 및 개인정보',
        description: 'AutoCare Hub 데이터 사본과 계정 삭제 요청을 관리하세요.',
        exportTitle: '내 데이터 내보내기',
        exportDescription: '계정, 예약, 알림, 즐겨찾기 및 공간의 제한된 JSON 사본을 다운로드합니다.',
        exportAction: '데이터 다운로드',
        exporting: '내보내기 준비 중...',
        exportSuccess: '데이터 내보내기가 준비되었습니다.',
        exportError: '데이터를 내보내지 못했습니다.',
        deletionTitle: '내 계정 삭제',
        deletionDescription: '검토를 위해 계정 삭제를 요청합니다. 금융 및 예약 기록은 보존 정책을 따릅니다.',
        requestAction: '삭제 요청',
        reasonLabel: '사유(선택 사항)',
        reasonPlaceholder: '떠나는 이유를 알려주세요',
        confirmRequest: '요청 제출',
        requestPending: '계정 삭제 요청이 검토를 기다리고 있습니다.',
        requestedAt: '요청일: {{date}}',
        cancelRequest: '요청 취소',
        cancelConfirm: '대기 중인 계정 삭제 요청을 취소할까요?',
        requestSuccess: '계정 삭제 요청을 제출했습니다.',
        requestError: '계정 삭제 요청을 제출하지 못했습니다.',
        cancelSuccess: '계정 삭제 요청을 취소했습니다.',
        cancelError: '계정 삭제 요청을 취소하지 못했습니다.',
    } } as const

const booking = { ko: {
        title: '예약', myBookings: '내 예약', noBookingsYet: '아직 예약이 없습니다', loadingBookings: '예약을 불러오는 중...', failedToLoadBookings: '예약을 불러오지 못했습니다.', upcoming: '예정', cancelled: '취소됨', completed: '완료됨', cancelBooking: '예약 취소', confirmCancellation: '취소 확인', cancelThisBooking: '이 예약을 취소할까요?', keepBooking: '예약 유지', cancelling: '취소 중...', bookingCancelledSuccessfully: '예약이 취소되었습니다.', failedToCancelBooking: '예약을 취소하지 못했습니다.', bookThisCabinet: '이 공간 예약', chooseServiceAndTime: '서비스와 원하는 시간을 선택하세요.', selectService: '서비스 선택', selectDate: '2. 날짜 선택', selectTime: '3. 시간 선택', noAvailableTimes: '이 날짜에는 이용 가능한 시간이 없습니다.', createBooking: '예약 만들기', creatingBooking: '예약을 만드는 중...', bookingCreatedSuccessfully: '예약이 생성되었습니다.', successTitle: '시간이 예약되었습니다', viewMyBookings: '내 예약 보기', openDirections: '길찾기 열기', pendingStatusLabel: '대기 중', confirmedStatusLabel: '확정됨', cancelledStatusLabel: '취소됨', completedStatusLabel: '완료됨',
    } } as const

export const koTranslations = createPopularLocale('ko', { common: common.ko, navigation: navigation.ko, auth: auth.ko, workspace: workspace.ko, ownerDashboard: ownerDashboard.ko, adminDashboard: adminDashboard.ko, adminUsers: adminUsers.ko, adminOwners: adminOwners.ko, adminCabinets: adminCabinets.ko, adminReviews: adminReviews.ko, adminAuditLogs: adminAuditLogs.ko, systemIncidents: systemIncidents.ko, securityCenter: securityCenter.ko, errors: errors.ko, booking: booking.ko, cabinet: cabinetCatalog.ko, profile: { privacy: profilePrivacy.ko }, landing: { ...landingExtraPopular.ko, ...landingPopular.ko, ...mockDashboard.ko, eyebrow: '공간 대여 예약 CRM', title: '한 곳에서 공간, 서비스, 예약을 관리하세요.', description: 'AutoCare Hub는 고객의 공간 예약과 소유자의 등록 및 예약 관리를 돕습니다.' } })
