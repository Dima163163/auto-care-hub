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

const common = { ja: {
        loading: '読み込み中...', loadingPage: 'ページを読み込み中...', error: 'エラー',
        failedToLoad: '読み込めませんでした。', create: '作成', edit: '編集', delete: '削除', cancel: 'キャンセル',
        confirm: '確認', save: '保存', back: '戻る', status: 'ステータス', actions: '操作', name: '名前',
        email: 'メールアドレス', saving: '保存中...', close: '閉じる', dismiss: '閉じる', language: '言語',
        theme: 'テーマ', menu: 'メニュー', more: 'その他', switchToDarkTheme: 'ダークテーマに切り替え',
        switchToLightTheme: 'ライトテーマに切り替え', notProvided: '未入力', tryAgainLater: '後でもう一度お試しください。', retry: '再試行',
    } } as const

const navigation = { ja: { home: 'ホーム', features: '機能', cabinets: 'キャビネット', services: '自動車サービス', owners: 'オーナー向け', pricing: '料金', about: '概要', profile: 'プロフィール', myBookings: '予約一覧', favorites: 'お気に入り', notifications: '通知', ownerDashboard: 'オーナーダッシュボード', ownerCabinets: 'マイキャビネット', ownerBookings: '予約', ownerServices: 'サービス', adminDashboard: '管理ダッシュボード', adminUsers: 'ユーザー', adminOwners: 'オーナー', adminCabinets: 'キャビネット', adminReviews: 'レビュー', adminAuditLogs: '監査ログ', ownerDashboardShort: 'ダッシュボード', ownerCalendar: 'カレンダー' } } as const

const auth = { ja: { signIn: 'ログイン', logOut: 'ログアウト', createAccount: 'アカウントを作成', welcomeBack: 'おかえりなさい', signInTitle: 'AutoCare Hubにログイン', signInToContinue: '続行するにはログインしてください。', email: 'メールアドレス', password: 'パスワード', signingIn: 'ログイン中...', failedToSignIn: 'ログインできませんでした。', alreadyHaveAccount: 'アカウントをお持ちですか？', forgotPasswordLink: 'パスワードをお忘れですか？' } } as const

const workspace = { ja: { client: 'クライアントワークスペース', owner: 'オーナーワークスペース', admin: '管理ワークスペース', overview: '概要', manage: '管理', configure: '設定', monitor: '監視', support: 'サポート', collapseSidebar: 'サイドバーを折りたたむ', expandSidebar: 'サイドバーを展開', systemStatus: 'すべてのシステムは正常です' } } as const

const ownerDashboard = { ja: {
        title: 'ダッシュボード',
        description: 'キャビネット、サービス、予約、運用状況を確認します。',
        loading: 'ダッシュボードを読み込み中...',
        failedToLoad: 'ダッシュボードを読み込めませんでした',
        activeCount: '{{count}} 件が有効',
        bookingStatusCounts: '{{pending}} 件保留中 · {{confirmed}} 件確定済み',
        averageCabinetPrice: 'キャビネットの平均料金',
        perHour: '1時間あたり',
        upcomingBookings: '今後の予約',
        upcomingBookingsDescription: 'キャビネットの保留中および確定済みの予約です。',
        noUpcomingBookings: '今後の予約はありません。',
        activeServices: '有効なサービス',
        activeServicesDescription: '現在予約できるサービスです。',
        noServices: 'サービスはまだ作成されていません。',
        viewAll: 'すべて見る',
        bookingMeta: 'キャビネット: {{cabinetId}} · サービス: {{serviceId}}',
        serviceMeta: '{{duration}}分 · {{price}}',
        analyticsTitle: '予約パフォーマンス',
        analyticsDescription: '今後30日間の予定をわかりやすく確認できます。',
        projectedRevenue: '予定収益',
        bookedHours: '予約済み時間',
        bookingLoad: '予約負荷',
        popularServices: '人気のサービス',
        noBookingData: 'お客様が予約すると、ここに予約データが表示されます。',
        mobileRevenue: '収益',
        mobileOccupancy: '稼働率',
        mobileToday: '今日',
        mobileAwaitingResponse: '返信を待っています',
        mobileBookingExpires: 'この予約はまもなく期限切れになります',
        mobileConfirm: '確定',
        mobileDecline: '辞退',
        mobileUpcomingToday: '今日の予定',
        mobileViewCalendar: 'カレンダーを見る',
        mobileOfflineDraft: '接続が戻ると下書きの変更が保存されます。',
        mobileReviewDraft: '下書きを確認',
        mobileAddSpace: 'スペースを追加',
        mobileMySpaces: 'マイスペース',
        clientListTitle: 'クライアント',
        clientListDescription: 'サービスを予約したクライアントを、最近の予約順に表示します。',
        noClients: '予約したクライアントはまだいません。',
        visits: '{{count}} 回の利用',
        lastBooking: '最新の予約: {{date}}',
        noOwnerNote: '内部メモはまだありません。',
        actionCenter: {
            eyebrow: 'アクションセンター',
            title: '対応が必要なタスク',
            description: '保留中のタスクを確認し、解決するワークスペースを直接開きます。',
            allClear: 'すべて最新です。対応が必要なタスクはありません。',
            pendingBookings: '保留中の予約',
            pendingBookingsDescription: '確認を待っている予約です。',
            rescheduleRequests: '変更リクエスト',
            rescheduleRequestsDescription: '新しい時間の判断を待っているお客様です。',
            draftCabinets: '下書きのキャビネット',
            draftCabinetsDescription: '公開予約の準備がまだ整っていないスペースです。',
            blockedCabinets: 'ブロックされたキャビネット',
            blockedCabinetsDescription: '審査または設定の確認が必要なスペースです。',
            readiness: '公開準備',
            readinessDescription: '予約受付前に残りの設定を完了してください。',
            olderThan24Hours: '{{count}}件が24時間以上経過',
            open: 'ワークスペースを開く',
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

const adminDashboard = { ja: {
        title: '管理ダッシュボード',
        description: 'ユーザー、キャビネット、プラットフォームの活動と審査状況を確認します。',
        loading: '管理ダッシュボードを読み込み中...',
        failedToLoad: '管理ダッシュボードを読み込めませんでした',
        users: 'ユーザー',
        userRoleCounts: '{{clients}} 人のクライアント · {{owners}} 人のオーナー · {{admins}} 人の管理者',
        userStatusCounts: '{{active}} 件が有効 · {{blocked}} 件がブロック済み',
        activeCount: '{{count}} 件が有効',
        moderation: '審査',
        moderationBreakdown: '下書き {{draftCabinets}} 件 · ブロック済み {{blockedCabinets}} 件 · ブロック済みユーザー {{blockedUsers}} 人',
        averageCabinetPrice: 'キャビネットの平均料金',
        perHour: '1時間あたり',
        recentUsers: '最近のユーザー',
        recentUsersDescription: 'デモデータ順に並んだ最新のユーザーです。',
        recentCabinets: '最近のキャビネット',
        recentCabinetsDescription: '審査状況付きの最新キャビネットです。',
        noUsers: 'ユーザーが見つかりません。',
        noCabinets: 'キャビネットが見つかりません。',
        viewAll: 'すべて見る',
        cabinetMeta: '{{city}} · {{price}}',
        operatorCenter: operatorCenter.ja,
    } } as const

const adminOwners = { ja: { description: 'プラットフォームのオーナーとアカウントアクセスを管理します。', emptyTitle: 'オーナーが見つかりません', emptyDescription: 'オーナーがアカウントを作成するとここに表示されます。' } } as const

const adminCabinets = { ja: {
        title: 'キャビネット', description: 'キャビネット掲載を確認・審査します。', loading: 'キャビネットを読み込み中...', failedToLoad: 'キャビネットを読み込めませんでした', emptyTitle: 'キャビネットがありません', emptyDescription: 'プラットフォームのキャビネットがここに表示されます。', statusUpdatedSuccessfully: 'キャビネットの状態を更新しました。', statusUpdateFailed: 'キャビネットの状態を更新できませんでした。', blockedSuccessfully: 'キャビネットをブロックしました。', blockFailed: 'キャビネットをブロックできませんでした。', confirmBlockEyebrow: 'キャビネットのブロックを確認', confirmBlockTitle: 'このキャビネットをブロックしますか？', confirmBlockDescription: '公開一覧から非表示になり、クライアントは予約できなくなります。', keepAvailable: '利用可能のままにする', confirmBlocking: 'ブロックを確認', blockingAction: 'ブロック中...',
    } } as const

const adminReviews = { ja: { title: 'レビュー', description: '公開前にクライアントレビューを審査します。', loading: 'レビューを読み込み中...', emptyTitle: 'レビューはまだありません', emptyDescription: 'クライアントが送信したレビューがここに表示されます。', statusUpdatedSuccessfully: 'レビューの状態を更新しました。', statusUpdateFailed: 'レビューの状態を更新できませんでした。', pendingAction: '審査に戻す', approvedAction: '承認', rejectedAction: '却下', deleteAction: '削除', deleting: '削除中...', deletedSuccessfully: 'レビューを削除しました。', deleteFailed: 'レビューを削除できませんでした。', confirmDeleteEyebrow: 'レビューを削除', confirmDeleteTitle: 'このレビューを削除しますか？', confirmDeleteDescription: 'この操作によりレビューは完全に削除されます。' } } as const

const securityCenter = { ja: { title: 'セキュリティセンター', description: 'スーパー管理者ワークスペースで認証失敗、不正利用の兆候、送信元IP、ルート、調査状況を確認します。', permissionTitle: 'スーパー管理者のアクセスが必要です', permissionDescription: 'このワークスペースは機密性の高いセキュリティテレメトリを扱うため、スーパー管理者のみ利用できます。', loadError: 'セキュリティテレメトリを読み込めませんでした。', exportReport: 'レポートを出力', timeline: '調査タイムライン', assignee: '担当者', unassigned: '未割り当て', assignToMe: '自分に割り当て', mitigationsTitle: '一時的な緩和策', activeMitigations: '有効なブロック', topIps: '最もアクティブな送信元IP', topRoutes: '標的になったルート', typeFilter: 'イベント種別', allTypes: 'すべての種別', severityFilter: '重大度', allSeverities: 'すべての重大度', statusFilter: '調査ステータス', allStatuses: 'すべてのステータス', eventsTitle: 'セキュリティアクティビティ', empty: '条件に一致するセキュリティイベントはありません。', loadMore: 'さらに読み込む', loadingMore: '読み込み中...', types: { login_failed: 'ログイン失敗', account_locked: 'アカウントロック', refresh_token_reuse: 'リフレッシュトークン再利用', rate_limit_exceeded: 'レート制限超過', invalid_token: '無効なトークン', csrf_violation: 'CSRF違反', route_scan: '不明なルートへのリクエスト', malformed_request: '不正な形式のリクエスト', oversized_request: 'サイズ超過リクエスト', privilege_denied: '権限拒否', webhook_abuse: 'Webhook悪用', mutation_burst: '変更リクエスト急増' }, severities: { info: '情報', warning: '警告', high: '高', critical: '重大' }, statuses: { open: 'オープン', acknowledged: '確認済み', investigating: '調査中', resolved: '解決済み', suppressed: '抑制済み' }, actorRoles: { client: 'クライアント', owner: 'オーナー', admin: '管理者', super_admin: 'スーパー管理者' }, authOutcomes: { unknown: '不明', anonymous: '匿名', authenticated: '認証済み', failed: '失敗' }, rateLimitResults: { not_checked: '未確認', allowed: '許可', blocked: 'ブロック', }, proxyProvenances: { unknown: '不明', direct: '直接接続', trusted_proxy: '信頼済みプロキシ', forwarded_header_untrusted: '信頼できない転送ヘッダー' } } } as const

const systemIncidents = { ja: { tab: 'システムインシデント', title: 'システムインシデント', description: '運用イベントはユーザー活動と分けて管理し、ここで確認または解決できます。', incident: 'インシデント', severity: '重大度', occurrences: '発生回数', firstSeen: '初回検知', lastSeen: '最終検知', requestId: 'リクエストID', acknowledge: '確認', resolve: '解決', statusOpen: 'オープン', statusAcknowledged: '確認済み', statusResolved: '解決済み', severityWarning: '警告', severityCritical: '重大', metadata: 'メタデータ', showMetadata: 'メタデータを表示', copyRequestId: 'リクエストIDをコピー', copied: 'リクエストIDをコピーしました', copyFailed: 'リクエストIDをコピーできませんでした。', emptyTitle: 'アクティブなインシデントはありません', emptyDescription: 'サーバーや運用上のインシデントが検知されるとここに表示されます。', searchPlaceholder: 'インシデントを検索...', statusFilter: 'ステータス', allStatuses: 'すべて', acknowledgedAt: '確認済み', resolvedAt: '解決済み', loadedCount: '{count}件のインシデントを読み込みました', loadMore: 'さらに読み込む', loadingMore: '読み込み中...' } } as const

const adminAuditLogs = { ja: {
        title: '監査ログ', description: 'プラットフォーム上の管理・セキュリティ操作を追跡します。', timestamp: '時刻', actor: '実行者', action: '操作', target: '対象', metadata: 'メタデータ', noLogs: '監査ログがありません', emptyDescription: '操作が行われると監査イベントがここに表示されます。', searchPlaceholder: 'ログを検索...', export: 'CSVをエクスポート', auditTab: 'アクティビティ監査', showMetadata: 'メタデータを表示', saveFilter: 'フィルターを保存', clearFilter: '保存したフィルターを消去', savedFilter: '保存済みフィルター: {query}', filterSaved: '監査フィルターをこのセッションに保存しました。', filterCleared: '保存した監査フィルターを消去しました。', loadedCount: '{count}件のイベントを読み込みました', loadMore: 'さらに読み込む', loadingMore: '読み込み中...',
        actions: { user_status_updated: 'ユーザー状態を更新', user_role_updated: 'ユーザーロールを更新', admin_created: '管理者を作成', cabinet_status_updated: 'キャビネット状態を更新', review_moderated: 'レビューを審査', review_deleted: 'レビューを削除', subscription_created: 'サブスクリプションを作成', promo_subscription_issued: 'プロモーション購読を発行', login_failed: 'ログイン試行に失敗', account_locked: 'アカウントをロック', refresh_token_reuse: 'リフレッシュトークンの再利用を検知', outbox_retried: 'Outboxイベントを再試行', outbox_dead_lettered: 'Outboxイベントをデッドレターへ移動', oauth_identity_linked: 'OAuth IDを連携', oauth_identity_unlinked: 'OAuth IDの連携を解除', account_deletion_requested: 'アカウント削除を申請', account_deletion_cancelled: 'アカウント削除を取消', account_deletion_completed: 'アカウント削除を完了', security_events_viewed: 'セキュリティイベントを表示', security_center_viewed: 'セキュリティセンターを表示', security_center_event_status_updated: 'セキュリティイベント状態を更新', security_center_report_exported: 'セキュリティ調査レポートを出力', security_user_sessions_revoked: 'セキュリティセンターからユーザーセッションを無効化' },
    } } as const

const adminUsers = { ja: {
        title: 'ユーザー',
        description: 'ユーザーのステータスとアカウントアクセスを管理します。',
        loading: 'ユーザーを読み込み中...',
        failedToLoad: 'ユーザーを読み込めませんでした',
        emptyTitle: 'ユーザーが見つかりません',
        emptyDescription: 'プラットフォームのユーザーがここに表示されます。',
        userColumn: 'ユーザー',
        statusUpdatedSuccessfully: 'ユーザーのステータスを更新しました。',
        statusUpdateFailed: 'ユーザーのステータスを更新できませんでした。',
        blockedSuccessfully: 'ユーザーをブロックしました。',
        blockFailed: 'ユーザーをブロックできませんでした。',
        confirmBlockEyebrow: 'ユーザーのブロックを確認',
        confirmBlockTitle: 'このユーザーをブロックしますか？',
        confirmBlockDescription: 'ログインや保護されたページの利用ができなくなります。',
        adminStatusRestricted: '管理者アカウントを管理できるのはスーパー管理者だけです。',
        keepActive: '有効のままにする',
        confirmBlocking: 'ブロックを確認',
        blockingAction: 'ブロック中...',
        createAdminTitle: '管理者を作成',
        createAdminDescription: '管理者を招待します。以下のリンクからパスワードを設定します。',
        adminCreatedSuccessfully: '管理者を作成しました。',
        adminCreateFailed: '管理者を作成できませんでした。',
        setupUrlLabel: '設定リンク',
        setupUrlDescription: '新しい管理者がパスワードを設定できるよう、このリンクを共有してください。',
        roleUpdatedSuccessfully: 'ユーザーの役割を更新しました。',
        roleUpdateFailed: 'ユーザーの役割を更新できませんでした。',
        roleClient: 'クライアント',
        roleOwner: 'オーナー',
        roleAdmin: '管理者',
        roleSuperAdmin: 'スーパー管理者',
    } } as const

const mockDashboard = { ja: { dashboardWelcome: 'Annaさん、ようこそ！', dashboardSubtitle: 'すべて順調です。', dashboardBookings: '予約', dashboardRequests: '新しいリクエスト', dashboardCabinets: 'キャビネット', dashboardReviews: 'レビュー', latestBookings: '最新の予約', viewAllBookings: 'すべての予約を見る', calendarMonth: '2025年5月', weekdayMonShort: '月', weekdayTueShort: '火', weekdayWedShort: '水', weekdayThuShort: '木', weekdayFriShort: '金', weekdaySatShort: '土', weekdaySunShort: '日', loadTitle: 'キャビネット稼働率', bookingConfirmed: '確定済み', bookingPending: '保留中', bookingName1: 'イリーナ S.', bookingName2: 'アレックス O.', bookingName3: 'エカテリーナ P.', bookingCabinet1: 'キャビネット 1', bookingCabinet2: 'キャビネット 2', bookingCabinet3: 'キャビネット 3', bookingToday1100: '今日 11:00', bookingToday1230: '今日 12:30', bookingTomorrow1000: '明日 10:00' } } as const

const errors = { ja: { VALIDATION_ERROR: '入力内容を確認してください。', NOT_FOUND: '指定されたリソースが見つかりません。', INTERNAL_SERVER_ERROR: '問題が発生しました。しばらくしてからお試しください。', BAD_REQUEST: 'リクエストが無効です。', UNAUTHORIZED: '続行するにはログインしてください。', FORBIDDEN: 'この操作を行う権限がありません。', CONFLICT: '競合が発生しました。すでに存在する可能性があります。', TOO_MANY_REQUESTS: 'リクエストが多すぎます。少し待ってください。', CSRF_ORIGIN_MISMATCH: 'セキュリティチェックに失敗しました。', CSRF_TOKEN_MISMATCH: 'セッションの有効期限が切れているか無効です。', EMAIL_VERIFICATION_REQUIRED: 'この操作にはメール確認が必要です。', BREACHED_PASSWORD: '既知の情報漏えいに含まれないパスワードを選択してください。' } } as const

const cabinetCatalog = { ja: {
        title: 'スペース',
        publicList: {
            eyebrow: '公開カタログ', title: '利用できるスペース', description: '美容、医療、相談、専門サービスの予約に使えるスペースを探せます。', loading: 'スペースを読み込み中...', failedToLoad: 'スペースを読み込めませんでした', emptyTitle: 'スペースが見つかりません', emptyDescription: '現在利用できる公開スペースはありません。', photoFallback: 'スペースの写真', from: '最低', perHourShort: '/ 時間', searchPlaceholder: '名前または都市で検索...', sortBy: '並べ替え', sortNewest: '新しい順', sortPopular: '人気順', sortPriceAsc: '料金の安い順', sortPriceDesc: '料金の高い順', advancedFilters: '絞り込み', cityLabel: '都市', cityPlaceholder: 'すべての都市', categoryLabel: 'カテゴリー', allCategories: 'すべてのカテゴリー', categoryBeauty: '美容', categoryMedical: '医療', categoryConsultation: '相談', categoryWellness: 'ウェルネス', categoryOffice: 'オフィス', priceRangeLabel: '1時間料金', minPrice: '下限', maxPrice: '上限', ratingLabel: '評価', anyRating: 'すべての評価', stars: '星', serviceLabel: 'サービス', servicePlaceholder: '例：マッサージ', availableToday: '本日利用可能', clearFilters: '絞り込みを解除', resultsEyebrow: '空き状況から探す', resultsTitle: '近くのスペース', resultsCount: '{{count}}件のスペースが見つかりました', viewMode: 'カタログ表示', splitView: 'リスト + 地図', listView: 'リスト', mapView: '地図', backToSplitView: 'リストと地図に戻る', view: '詳細を見る', imageAlt: '{{title}}の内観', todayAvailability: '今日', freeSlots: '残り{{count}}枠', mapTitle: 'エリアマップ', mapApproximate: 'エリアのおおよその表示です。正確な住所はスペースのページに表示されます。', mapZoomIn: '拡大', mapZoomOut: '縮小', mapCurrentLocation: '現在地を使う', mapLocationLoading: '現在地を検索中...', mapLocationFound: '現在地を中心に表示しました。', mapLocationError: '現在地を取得できません。概略地図を表示しています。', mapTileError: '地図データは一時的に利用できません。リストを使うか外部で地図を開いてください。', openMap: '地図を開く', selectedCabinet: '選択したスペース',
        },
    } } as const

const profilePrivacy = { ja: {
        title: 'データとプライバシー',
        description: 'AutoCare Hub のデータコピーとアカウント削除リクエストを管理します。',
        exportTitle: 'データをエクスポート',
        exportDescription: 'アカウント、予約、通知、お気に入り、スペースの限定 JSON コピーをダウンロードします。',
        exportAction: 'データをダウンロード',
        exporting: 'エクスポートを準備中...',
        exportSuccess: 'データのエクスポートを準備しました。',
        exportError: 'データをエクスポートできませんでした。',
        deletionTitle: 'アカウントを削除',
        deletionDescription: '確認のためアカウント削除を申請します。財務・予約記録は保持ポリシーに従って扱われます。',
        requestAction: '削除を申請',
        reasonLabel: '理由（任意）',
        reasonPlaceholder: '退会理由を入力してください',
        confirmRequest: '申請を送信',
        requestPending: 'アカウント削除申請は確認待ちです。',
        requestedAt: '申請日：{{date}}',
        cancelRequest: '申請をキャンセル',
        cancelConfirm: '保留中のアカウント削除申請をキャンセルしますか？',
        requestSuccess: 'アカウント削除申請を送信しました。',
        requestError: 'アカウント削除申請を送信できませんでした。',
        cancelSuccess: 'アカウント削除申請をキャンセルしました。',
        cancelError: 'アカウント削除申請をキャンセルできませんでした。',
    } } as const

const booking = { ja: {
        title: '予約', myBookings: '予約一覧', noBookingsYet: '予約はまだありません', loadingBookings: '予約を読み込み中...', failedToLoadBookings: '予約を読み込めませんでした。', upcoming: '今後の予約', cancelled: 'キャンセル済み', completed: '完了', cancelBooking: '予約をキャンセル', confirmCancellation: 'キャンセルを確認', cancelThisBooking: 'この予約をキャンセルしますか？', keepBooking: '予約を保持', cancelling: 'キャンセル中...', bookingCancelledSuccessfully: '予約をキャンセルしました。', failedToCancelBooking: '予約をキャンセルできませんでした。', bookThisCabinet: 'このスペースを予約', chooseServiceAndTime: 'サービスと希望時間を選択してください。', selectService: 'サービスを選択', selectDate: '2. 日付を選択', selectTime: '3. 時間を選択', noAvailableTimes: 'この日に利用できる時間はありません。', createBooking: '予約を作成', creatingBooking: '予約を作成中...', bookingCreatedSuccessfully: '予約を作成しました。', successTitle: '時間を確保しました', viewMyBookings: '予約を表示', openDirections: '道順を開く', pendingStatusLabel: '保留中', confirmedStatusLabel: '確認済み', cancelledStatusLabel: 'キャンセル済み', completedStatusLabel: '完了',
    } } as const

export const jaTranslations = createPopularLocale('ja', { common: common.ja, navigation: navigation.ja, auth: auth.ja, workspace: workspace.ja, ownerDashboard: ownerDashboard.ja, adminDashboard: adminDashboard.ja, adminUsers: adminUsers.ja, adminOwners: adminOwners.ja, adminCabinets: adminCabinets.ja, adminReviews: adminReviews.ja, adminAuditLogs: adminAuditLogs.ja, systemIncidents: systemIncidents.ja, securityCenter: securityCenter.ja, errors: errors.ja, booking: booking.ja, cabinet: cabinetCatalog.ja, profile: { privacy: profilePrivacy.ja }, landing: { ...landingExtraPopular.ja, ...landingPopular.ja, ...mockDashboard.ja, eyebrow: 'キャビネットレンタル予約CRM', title: 'スペース、サービス、予約をひとつの画面で管理。', description: 'AutoCare Hubはお客様の予約とオーナーの掲載・サービス管理をサポートします。' } })
