import { esTranslations } from './popular.js'

type EuropeanOverrides = {
    common: Partial<typeof esTranslations.common>
    navigation: Partial<typeof esTranslations.navigation>
    errors: Partial<typeof esTranslations.errors>
    securityTitle: string
    emails: {
        resetTitle: string
        verifyTitle: string
        bookingConfirmed: string
        bookingTime: string
    }
}

function createEuropeanLocale(overrides: EuropeanOverrides): typeof esTranslations {
    return {
        ...esTranslations,
        common: { ...esTranslations.common, ...overrides.common },
        navigation: { ...esTranslations.navigation, ...overrides.navigation },
        errors: { ...esTranslations.errors, ...overrides.errors },
        notifications: {
            ...esTranslations.notifications,
            security: {
                ...esTranslations.notifications.security,
                refreshTokenReuse: { ...esTranslations.notifications.security.refreshTokenReuse, title: overrides.securityTitle },
            },
        },
        emails: {
            ...esTranslations.emails,
            booking: {
                ...esTranslations.emails.booking,
                title: { ...esTranslations.emails.booking.title, confirmed: overrides.emails.bookingConfirmed },
                details: { ...esTranslations.emails.booking.details, time: overrides.emails.bookingTime },
            },
            passwordReset: { ...esTranslations.emails.passwordReset, title: overrides.emails.resetTitle },
            emailVerification: { ...esTranslations.emails.emailVerification, title: overrides.emails.verifyTitle },
        },
    }
}

export const itTranslations = createEuropeanLocale({
    common: { loading: 'Caricamento...', language: 'Lingua', save: 'Salva', cancel: 'Annulla' },
    navigation: { home: 'Home', cabinets: 'Servizi', profile: 'Profilo', myBookings: 'Le mie prenotazioni' },
    errors: { UNAUTHORIZED: 'Accedi per continuare.', FORBIDDEN: 'Non hai l’autorizzazione per questa azione.' },
    securityTitle: 'Avviso di sicurezza', emails: { resetTitle: 'Reimposta la password', verifyTitle: 'Verifica la tua e-mail', bookingConfirmed: 'Prenotazione confermata', bookingTime: 'Ora:' },
})

export const plTranslations = createEuropeanLocale({
    common: { loading: 'Ładowanie...', language: 'Język', save: 'Zapisz', cancel: 'Anuluj' },
    navigation: { home: 'Strona główna', cabinets: 'Usługi', profile: 'Profil', myBookings: 'Moje rezerwacje' },
    errors: { UNAUTHORIZED: 'Zaloguj się, aby kontynuować.', FORBIDDEN: 'Nie masz uprawnień do wykonania tej czynności.' },
    securityTitle: 'Alert bezpieczeństwa', emails: { resetTitle: 'Zresetuj hasło', verifyTitle: 'Zweryfikuj adres e-mail', bookingConfirmed: 'Rezerwacja potwierdzona', bookingTime: 'Godzina:' },
})

export const nlTranslations = createEuropeanLocale({
    common: { loading: 'Laden...', language: 'Taal', save: 'Opslaan', cancel: 'Annuleren' },
    navigation: { home: 'Home', cabinets: 'Diensten', profile: 'Profiel', myBookings: 'Mijn boekingen' },
    errors: { UNAUTHORIZED: 'Log in om door te gaan.', FORBIDDEN: 'U heeft geen toestemming voor deze actie.' },
    securityTitle: 'Beveiligingsmelding', emails: { resetTitle: 'Wachtwoord opnieuw instellen', verifyTitle: 'E-mailadres verifiëren', bookingConfirmed: 'Boeking bevestigd', bookingTime: 'Tijd:' },
})

export const ukTranslations = createEuropeanLocale({
    common: { loading: 'Завантаження...', language: 'Мова', save: 'Зберегти', cancel: 'Скасувати' },
    navigation: { home: 'Головна', cabinets: 'Послуги', profile: 'Профіль', myBookings: 'Мої бронювання' },
    errors: { UNAUTHORIZED: 'Увійдіть, щоб продовжити.', FORBIDDEN: 'У вас немає дозволу на цю дію.' },
    securityTitle: 'Попередження безпеки', emails: { resetTitle: 'Скинути пароль', verifyTitle: 'Підтвердьте електронну пошту', bookingConfirmed: 'Бронювання підтверджено', bookingTime: 'Час:' },
})

export const csTranslations = createEuropeanLocale({
    common: { loading: 'Načítání...', language: 'Jazyk', save: 'Uložit', cancel: 'Zrušit' },
    navigation: { home: 'Domů', cabinets: 'Služby', profile: 'Profil', myBookings: 'Moje rezervace' },
    errors: { UNAUTHORIZED: 'Přihlaste se pro pokračování.', FORBIDDEN: 'K této akci nemáte oprávnění.' },
    securityTitle: 'Bezpečnostní upozornění', emails: { resetTitle: 'Obnovit heslo', verifyTitle: 'Ověřte svůj e-mail', bookingConfirmed: 'Rezervace potvrzena', bookingTime: 'Čas:' },
})

export const elTranslations = createEuropeanLocale({
    common: { loading: 'Φόρτωση...', language: 'Γλώσσα', save: 'Αποθήκευση', cancel: 'Ακύρωση' },
    navigation: { home: 'Αρχική', cabinets: 'Υπηρεσίες', profile: 'Προφίλ', myBookings: 'Οι κρατήσεις μου' },
    errors: { UNAUTHORIZED: 'Συνδεθείτε για να συνεχίσετε.', FORBIDDEN: 'Δεν έχετε άδεια για αυτή την ενέργεια.' },
    securityTitle: 'Ειδοποίηση ασφαλείας', emails: { resetTitle: 'Επαναφορά κωδικού', verifyTitle: 'Επιβεβαιώστε το email σας', bookingConfirmed: 'Η κράτηση επιβεβαιώθηκε', bookingTime: 'Ώρα:' },
})

export const svTranslations = createEuropeanLocale({
    common: { loading: 'Laddar...', language: 'Språk', save: 'Spara', cancel: 'Avbryt' },
    navigation: { home: 'Hem', cabinets: 'Tjänster', profile: 'Profil', myBookings: 'Mina bokningar' },
    errors: { UNAUTHORIZED: 'Logga in för att fortsätta.', FORBIDDEN: 'Du har inte behörighet att utföra den här åtgärden.' },
    securityTitle: 'Säkerhetsvarning', emails: { resetTitle: 'Återställ lösenord', verifyTitle: 'Verifiera din e-post', bookingConfirmed: 'Bokning bekräftad', bookingTime: 'Tid:' },
})
