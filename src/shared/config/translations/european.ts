import { esTranslations } from './popular'

type EuropeanLocaleOverrides = {
    common: Partial<typeof esTranslations.common>
    navigation: Partial<typeof esTranslations.navigation>
    autocare: Partial<typeof esTranslations.autocare>
}

function createEuropeanLocale(overrides: EuropeanLocaleOverrides): typeof esTranslations {
    return {
        ...esTranslations,
        common: { ...esTranslations.common, ...overrides.common },
        navigation: { ...esTranslations.navigation, ...overrides.navigation },
        autocare: { ...esTranslations.autocare, ...overrides.autocare },
    }
}

export const itTranslations = createEuropeanLocale({
    common: { language: 'Lingua', loading: 'Caricamento...', save: 'Salva', cancel: 'Annulla', close: 'Chiudi' },
    navigation: { home: 'Home', services: 'Trova servizi', myBookings: 'Le mie richieste', favorites: 'Preferiti', owners: 'Per le officine', about: 'Chi siamo' },
    autocare: { heroTitle: 'Trova la migliore officina vicino a te', heroDescription: 'Confronta prezzi, recensioni e disponibilità in pochi clic', byService: 'Per servizio', byProvider: 'Per officina', searchNearby: 'Cerca vicino a me', searchAction: 'Trova servizi', verifiedTrust: 'Officine verificate', realReviewsTrust: 'Recensioni reali dei clienti', fastBookingTrust: 'Prenotazione online rapida', compareHomeTitle: 'Confronta le officine e scegli l’opzione migliore', startSearch: 'Avvia ricerca', clearAllFilters: 'Cancella tutto', resultsEyebrow: 'Risultati della ricerca', resultsTitle: 'Confronta i servizi auto', filtersTitle: 'Tutti i filtri', bookAction: 'Scegli e prenota', detailsAction: 'Dettagli', partnerTitle: 'Sei proprietario di un’officina?', partnerAction: 'Diventa partner', howItWorks: 'Come funziona', mobileAppTitle: 'App mobile', footerClients: 'Per i clienti', footerCompany: 'Azienda', footerLegal: 'Informazioni legali', chatSend: 'Invia' },
})

export const plTranslations = createEuropeanLocale({
    common: { language: 'Język', loading: 'Ładowanie...', save: 'Zapisz', cancel: 'Anuluj', close: 'Zamknij' },
    navigation: { home: 'Strona główna', services: 'Znajdź usługi', myBookings: 'Moje zgłoszenia', favorites: 'Ulubione', owners: 'Dla serwisów', about: 'O nas' },
    autocare: { heroTitle: 'Znajdź najlepszy serwis samochodowy w pobliżu', heroDescription: 'Porównaj ceny, opinie i terminy w kilku kliknięciach', byService: 'Według usługi', byProvider: 'Według serwisu', searchNearby: 'Szukaj w pobliżu', searchAction: 'Znajdź serwisy', verifiedTrust: 'Zweryfikowane serwisy', realReviewsTrust: 'Prawdziwe opinie klientów', fastBookingTrust: 'Szybka rezerwacja online', compareHomeTitle: 'Porównaj serwisy i wybierz najlepszą opcję', startSearch: 'Rozpocznij wyszukiwanie', clearAllFilters: 'Wyczyść wszystko', resultsEyebrow: 'Wyniki wyszukiwania', resultsTitle: 'Porównaj usługi motoryzacyjne', filtersTitle: 'Wszystkie filtry', bookAction: 'Wybierz i zarezerwuj', detailsAction: 'Szczegóły', partnerTitle: 'Prowadzisz serwis samochodowy?', partnerAction: 'Zostań partnerem', howItWorks: 'Jak to działa', mobileAppTitle: 'Aplikacja mobilna', footerClients: 'Dla klientów', footerCompany: 'O firmie', footerLegal: 'Informacje prawne', chatSend: 'Wyślij' },
})

export const nlTranslations = createEuropeanLocale({
    common: { language: 'Taal', loading: 'Laden...', save: 'Opslaan', cancel: 'Annuleren', close: 'Sluiten' },
    navigation: { home: 'Home', services: 'Diensten zoeken', myBookings: 'Mijn aanvragen', favorites: 'Favorieten', owners: 'Voor garages', about: 'Over ons' },
    autocare: { heroTitle: 'Vind de beste garage bij jou in de buurt', heroDescription: 'Vergelijk prijzen, beoordelingen en beschikbare tijden met een paar klikken', byService: 'Op dienst', byProvider: 'Op garage', searchNearby: 'Zoek in de buurt', searchAction: 'Vind garages', verifiedTrust: 'Geverifieerde garages', realReviewsTrust: 'Echte klantbeoordelingen', fastBookingTrust: 'Snel online boeken', compareHomeTitle: 'Vergelijk garages en kies de beste optie', startSearch: 'Zoeken starten', clearAllFilters: 'Alles wissen', resultsEyebrow: 'Zoekresultaten', resultsTitle: 'Vergelijk autodiensten', filtersTitle: 'Alle filters', bookAction: 'Kiezen en boeken', detailsAction: 'Details', partnerTitle: 'Bent u eigenaar van een garage?', partnerAction: 'Word partner', howItWorks: 'Hoe het werkt', mobileAppTitle: 'Mobiele app', footerClients: 'Voor klanten', footerCompany: 'Over het bedrijf', footerLegal: 'Juridische informatie', chatSend: 'Verzenden' },
})

export const ukTranslations = createEuropeanLocale({
    common: { language: 'Мова', loading: 'Завантаження...', save: 'Зберегти', cancel: 'Скасувати', close: 'Закрити' },
    navigation: { home: 'Головна', services: 'Знайти послуги', myBookings: 'Мої заявки', favorites: 'Обране', owners: 'Для сервісів', about: 'Про нас' },
    autocare: { heroTitle: 'Знайдіть найкращий автосервіс поруч', heroDescription: 'Порівнюйте ціни, відгуки та час запису за кілька кліків', byService: 'За послугою', byProvider: 'За автосервісом', searchNearby: 'Знайти поруч', searchAction: 'Знайти сервіси', verifiedTrust: 'Перевірені автосервіси', realReviewsTrust: 'Справжні відгуки клієнтів', fastBookingTrust: 'Швидкий онлайн-запис', compareHomeTitle: 'Порівняйте автосервіси та оберіть найкращий варіант', startSearch: 'Почати пошук', clearAllFilters: 'Очистити все', resultsEyebrow: 'Результати пошуку', resultsTitle: 'Порівняйте автопослуги', filtersTitle: 'Усі фільтри', bookAction: 'Обрати й записатися', detailsAction: 'Докладніше', partnerTitle: 'Ви власник автосервісу?', partnerAction: 'Стати партнером', howItWorks: 'Як це працює', mobileAppTitle: 'Мобільний застосунок', footerClients: 'Для клієнтів', footerCompany: 'Про компанію', footerLegal: 'Правова інформація', chatSend: 'Надіслати' },
})

export const csTranslations = createEuropeanLocale({
    common: { language: 'Jazyk', loading: 'Načítání...', save: 'Uložit', cancel: 'Zrušit', close: 'Zavřít' },
    navigation: { home: 'Domů', services: 'Najít služby', myBookings: 'Moje žádosti', favorites: 'Oblíbené', owners: 'Pro servisy', about: 'O nás' },
    autocare: { heroTitle: 'Najděte nejlepší autoservis ve svém okolí', heroDescription: 'Porovnejte ceny, hodnocení a termíny několika kliknutími', byService: 'Podle služby', byProvider: 'Podle autoservisu', searchNearby: 'Hledat v okolí', searchAction: 'Najít servisy', verifiedTrust: 'Ověřené autoservisy', realReviewsTrust: 'Skutečné recenze zákazníků', fastBookingTrust: 'Rychlá online rezervace', compareHomeTitle: 'Porovnejte autoservisy a vyberte nejlepší možnost', startSearch: 'Začít hledat', clearAllFilters: 'Vymazat vše', resultsEyebrow: 'Výsledky vyhledávání', resultsTitle: 'Porovnejte autoslužby', filtersTitle: 'Všechny filtry', bookAction: 'Vybrat a rezervovat', detailsAction: 'Podrobnosti', partnerTitle: 'Vlastníte autoservis?', partnerAction: 'Stát se partnerem', howItWorks: 'Jak to funguje', mobileAppTitle: 'Mobilní aplikace', footerClients: 'Pro zákazníky', footerCompany: 'O společnosti', footerLegal: 'Právní informace', chatSend: 'Odeslat' },
})

export const elTranslations = createEuropeanLocale({
    common: { language: 'Γλώσσα', loading: 'Φόρτωση...', save: 'Αποθήκευση', cancel: 'Ακύρωση', close: 'Κλείσιμο' },
    navigation: { home: 'Αρχική', services: 'Εύρεση υπηρεσιών', myBookings: 'Τα αιτήματά μου', favorites: 'Αγαπημένα', owners: 'Για συνεργεία', about: 'Σχετικά με εμάς' },
    autocare: { heroTitle: 'Βρείτε το καλύτερο συνεργείο κοντά σας', heroDescription: 'Συγκρίνετε τιμές, αξιολογήσεις και διαθέσιμα ραντεβού με λίγα κλικ', byService: 'Ανά υπηρεσία', byProvider: 'Ανά συνεργείο', searchNearby: 'Αναζήτηση κοντά', searchAction: 'Βρείτε συνεργεία', verifiedTrust: 'Επαληθευμένα συνεργεία', realReviewsTrust: 'Αληθινές αξιολογήσεις πελατών', fastBookingTrust: 'Γρήγορο online ραντεβού', compareHomeTitle: 'Συγκρίνετε συνεργεία και επιλέξτε την καλύτερη επιλογή', startSearch: 'Έναρξη αναζήτησης', clearAllFilters: 'Εκκαθάριση όλων', resultsEyebrow: 'Αποτελέσματα αναζήτησης', resultsTitle: 'Σύγκριση υπηρεσιών αυτοκινήτου', filtersTitle: 'Όλα τα φίλτρα', bookAction: 'Επιλογή και κράτηση', detailsAction: 'Λεπτομέρειες', partnerTitle: 'Είστε ιδιοκτήτης συνεργείου;', partnerAction: 'Γίνετε συνεργάτης', howItWorks: 'Πώς λειτουργεί', mobileAppTitle: 'Εφαρμογή για κινητά', footerClients: 'Για πελάτες', footerCompany: 'Σχετικά με την εταιρεία', footerLegal: 'Νομικές πληροφορίες', chatSend: 'Αποστολή' },
})

export const svTranslations = createEuropeanLocale({
    common: { language: 'Språk', loading: 'Laddar...', save: 'Spara', cancel: 'Avbryt', close: 'Stäng' },
    navigation: { home: 'Hem', services: 'Hitta tjänster', myBookings: 'Mina förfrågningar', favorites: 'Favoriter', owners: 'För verkstäder', about: 'Om oss' },
    autocare: { heroTitle: 'Hitta den bästa bilverkstaden nära dig', heroDescription: 'Jämför priser, omdömen och lediga tider med några klick', byService: 'Efter tjänst', byProvider: 'Efter verkstad', searchNearby: 'Sök i närheten', searchAction: 'Hitta verkstäder', verifiedTrust: 'Verifierade verkstäder', realReviewsTrust: 'Riktiga kundomdömen', fastBookingTrust: 'Snabb bokning online', compareHomeTitle: 'Jämför verkstäder och välj det bästa alternativet', startSearch: 'Starta sökning', clearAllFilters: 'Rensa alla', resultsEyebrow: 'Sökresultat', resultsTitle: 'Jämför biltjänster', filtersTitle: 'Alla filter', bookAction: 'Välj och boka', detailsAction: 'Detaljer', partnerTitle: 'Äger du en bilverkstad?', partnerAction: 'Bli partner', howItWorks: 'Så fungerar det', mobileAppTitle: 'Mobilapp', footerClients: 'För kunder', footerCompany: 'Om företaget', footerLegal: 'Juridisk information', chatSend: 'Skicka' },
})
