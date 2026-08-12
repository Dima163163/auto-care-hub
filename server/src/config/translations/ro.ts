import { enTranslations } from './en.js'

export const roTranslations = {
    ...enTranslations,
    notifications: {
        ...enTranslations.notifications,
        security: {
            accountLocked: {
                title: 'Cont blocat temporar',
                message: 'Au fost detectate mai multe încercări eșuate de autentificare. Încercați din nou mai târziu sau resetați parola.',
            },
            refreshTokenReuse: {
                title: 'Alertă de securitate',
                message: 'A fost folosită o sesiune de reîmprospătare revocată. Toate sesiunile active au fost închise.',
            },
            accountDeletionRequested: {
                title: 'Cererea de ștergere a contului a fost primită',
                message: 'Cererea de ștergere a contului așteaptă verificarea.',
            },
        },
        booking: {
            createdOwner: {
                title: 'Cerere nouă de rezervare',
                message: '{{clientName}} a solicitat {{serviceTitle}} în {{cabinetTitle}} pentru {{date}} la {{startTime}}.',
            },
            createdClient: {
                title: 'Cererea de rezervare a fost trimisă',
                message: 'Rezervarea pentru {{serviceTitle}} în {{cabinetTitle}} așteaptă confirmarea.',
            },
            confirmedClient: {
                title: 'Rezervare confirmată',
                message: '{{cabinetTitle}} a fost rezervat pentru dumneavoastră la {{date}}, ora {{startTime}}.',
            },
            cancelledOwner: {
                title: 'Rezervare anulată',
                message: '{{clientName}} a anulat {{serviceTitle}} în {{cabinetTitle}} pentru {{date}}.',
            },
            cancelledClient: {
                title: 'Rezervare anulată',
                message: 'Rezervarea din {{cabinetTitle}} pentru {{date}} a fost anulată.',
            },
            status: {
                title: 'Statusul rezervării a fost actualizat',
                pending: 'Rezervarea din {{cabinetTitle}} așteaptă din nou confirmarea.',
                confirmed: 'Rezervarea din {{cabinetTitle}} a fost confirmată pentru {{date}}, ora {{startTime}}.',
                cancelled: 'Rezervarea din {{cabinetTitle}} a fost anulată.',
                completed: 'Rezervarea din {{cabinetTitle}} a fost finalizată.',
            },
            rescheduleRequestedOwner: {
                title: 'A fost solicitată reprogramarea',
                message: '{{clientName}} a solicitat {{date}} la {{startTime}} pentru {{cabinetTitle}}.',
            },
            rescheduleRequestedClient: {
                title: 'Cererea de reprogramare a fost trimisă',
                message: 'Cererea pentru {{date}} la {{startTime}} așteaptă confirmarea proprietarului.',
            },
            rescheduleAcceptedClient: {
                title: 'Reprogramare acceptată',
                message: 'Rezervarea dumneavoastră a fost mutată la {{proposedSlot}}.',
            },
            rescheduleRejectedClient: {
                title: 'Reprogramare respinsă',
                message: 'Rezervarea dumneavoastră rămâne la {{previousSlot}}.',
            },
            rescheduleAcceptedOwner: {
                title: 'Rezervare reprogramată',
                message: 'Rezervarea a fost mutată la {{proposedSlot}}.',
            },
            rescheduleRejectedOwner: {
                title: 'Reprogramare respinsă',
                message: 'Rezervarea rămâne la {{previousSlot}}.',
            },
            reminder: {
                title: 'Memento pentru rezervare',
                message: '{{cabinetTitle}} este rezervat pentru {{date}} la {{startTime}}.',
            },
        },
        payment: {
            completed: {
                title: 'Plată finalizată',
                message: 'Plata rezervării a fost finalizată cu succes.',
            },
            failed: {
                title: 'Plata a eșuat',
                message: 'Plata rezervării nu a putut fi finalizată. Încercați din nou din secțiunea rezervărilor.',
            },
            partiallyRefunded: {
                title: 'Plată rambursată parțial',
                message: 'O parte din plata rezervării a fost rambursată. Soldul rămas este păstrat în contul dumneavoastră.',
            },
            refunded: {
                title: 'Plată rambursată',
                message: 'Plata rezervării a fost rambursată.',
            },
        },
        moderation: {
            reviewUpdated: {
                title: 'Moderarea recenziei a fost actualizată',
                message: 'Statusul recenziei pentru „{{cabinetTitle}}” este acum {{status}}.',
            },
        },
    },
    emails: {
        ...enTranslations.emails,
        common: {
            ...enTranslations.emails.common,
            hello: 'Bună ziua, {{name}},',
            viewDetails: 'Vezi detaliile în contul tău',
            footer: 'Dacă nu te așteptai la acest e-mail, îl poți ignora în siguranță.',
        },
        booking: {
            ...enTranslations.emails.booking,
            subject: {
                created: 'Cererea de rezervare a fost trimisă - AutoCare Hub',
                createdOwner: 'Cerere nouă de rezervare - AutoCare Hub',
                confirmed: 'Rezervare confirmată - AutoCare Hub',
                cancelled: 'Rezervare anulată - AutoCare Hub',
            },
            title: {
                created: 'Cererea de rezervare a fost trimisă',
                createdOwner: 'Cerere nouă de rezervare',
                confirmed: 'Rezervare confirmată',
                cancelled: 'Rezervare anulată',
            },
            description: {
                created: 'Cererea ta a fost trimisă proprietarului și așteaptă confirmarea.',
                createdOwner: 'Ai primit o cerere nouă de rezervare pentru cabinetul tău.',
                confirmed: 'Proprietarul ți-a confirmat rezervarea.',
                cancelled: 'O rezervare a fost anulată.',
            },
            details: {
                header: 'Detalii rezervare:',
                cabinet: 'Cabinet:',
                service: 'Serviciu:',
                date: 'Data:',
                time: 'Ora:',
            },
        },
        passwordSetup: {
            ...enTranslations.emails.passwordSetup,
            subject: 'Setează-ți parola - AutoCare Hub',
            title: 'Setează-ți parola',
            description: 'Un cont nou de administrator a fost creat pentru tine în AutoCare Hub. Folosește linkul de mai jos pentru a seta parola și a activa contul.',
            button: 'Setează parola',
            expiry: 'Acest link va expira la {{expiry}}.',
        },
        passwordReset: {
            ...enTranslations.emails.passwordReset,
            subject: 'Resetează-ți parola - AutoCare Hub',
            title: 'Resetează-ți parola',
            description: 'Am primit o cerere de resetare a parolei. Folosește linkul de mai jos pentru a alege o parolă nouă.',
            button: 'Resetează parola',
            expiry: 'Acest link va expira la {{expiry}}.',
        },
        emailVerification: {
            ...enTranslations.emails.emailVerification,
            subject: 'Verifică-ți e-mailul - AutoCare Hub',
            title: 'Verifică-ți e-mailul',
            description: 'Folosește linkul de mai jos pentru a verifica adresa ta de e-mail.',
            button: 'Verifică e-mailul',
            expiry: 'Acest link va expira la {{expiry}}.',
        },
    },
} as const
