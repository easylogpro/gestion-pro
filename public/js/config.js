// ============================================
// CONFIG.JS - Variables globales partagées
// GESTION PRO - EasyLog Pro
// ============================================

/**
 * Calcule les noms des colonnes basés sur l'année en cours
 * Ex: V1-26, V2-26, VERIF DSF 2026, etc.
 */
function getYearColumns() {
    const annee = new Date().getFullYear();
    const anneeCourte = String(annee - 2000);
    return {
        annee: annee,
        anneeCourte: anneeCourte,
        V1: 'V1-' + anneeCourte,
        V2: 'V2-' + anneeCourte,
        VERIF_DSF_V1: 'VERIF DSF ' + annee,
        VERIF_DSF_V2: 'VERIF DSF ' + annee + '-2'
    };
}

/**
 * Configuration des colonnes dynamiques selon l'année
 */
const YEAR_COLS = getYearColumns();
console.log('📅 Colonnes recherchées:', YEAR_COLS.V1, YEAR_COLS.V2);

/**
 * Objet principal de l'application
 * Contient toutes les données chargées depuis Excel/Access
 */
const APP = {
    data: {
        travaux: [],
        devis: [],
        ssi: [],
        dsf: [],
        dsfCloture: [],
        dsfPlanif: [],
        dsfResp: [],
        tech: [],
        stt: [],
        mails: [],
        produits: [],
        techRaw: [],
        sttRaw: [],
        ssiHeaders: [],
        // Pour le module SAV (futur)
        sav: [],
        savHeaders: [],
        contrats: [],
        contratsHeaders: []
    },
    tables: {
        tech: new Map(),
        stt: new Map()
    },
    contacts: {
        techniciens: {},
        sousTraitants: {}
    },
    loaded: false,
    currentPage: 'dashboard',
    currentWeek: null
};

/**
 * Constantes pour les clés localStorage
 */
const SSI_HISTORY_KEY = 'gestionpro_ssi_history';
const MAIL_HISTORY_KEY = 'mailHistory_gestionpro';
const MAIL_HISTORY_PLANIFIER_KEY = 'mailHistoryPlanifier_gestionpro';

/**
 * Noms des mois en français
 */
const MONTH_NAMES = [
    'Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin',
    'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'
];

console.log('✅ config.js chargé');
