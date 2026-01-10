// ============================================
// UTILS.JS - Fonctions utilitaires
// GESTION PRO - EasyLog Pro
// ============================================

/**
 * Trouve l'index d'une colonne par son en-tête
 * @param {Array} headers - Tableau des en-têtes
 * @param {string} searchText - Texte à rechercher
 * @returns {number} Index de la colonne ou -1
 */
function findColumnByHeader(headers, searchText) {
    const index = headers.findIndex(h => 
        h && h.toString().toUpperCase().trim().includes(searchText.toUpperCase())
    );
    if (index === -1) {
        console.warn("⚠️ Colonne introuvable : " + searchText);
    }
    return index;
}

/**
 * Formate une date en DD/MM/YYYY
 * Gère les dates Excel (serial) et les chaînes
 * @param {*} val - Valeur de date
 * @returns {string} Date formatée
 */
function formatDateDDMMYYYY(val) {
    if (!val) return '';
    const str = String(val).trim();
    if (str === '' || str.toUpperCase() === 'UNDEFINED' || str.toUpperCase() === 'NAN') return '';
    
    // Si c'est un nombre Excel (serial date)
    const num = parseFloat(str);
    if (!isNaN(num) && num > 25569 && num < 60000) {
        const d = new Date((num - 25569) * 86400 * 1000);
        const day = String(d.getUTCDate()).padStart(2, '0');
        const month = String(d.getUTCMonth() + 1).padStart(2, '0');
        const year = d.getUTCFullYear();
        return day + '/' + month + '/' + year;
    }
    
    // Si c'est une chaîne de date
    const d = new Date(str);
    if (!isNaN(d.getTime())) {
        const day = String(d.getDate()).padStart(2, '0');
        const month = String(d.getMonth() + 1).padStart(2, '0');
        const year = d.getFullYear();
        return day + '/' + month + '/' + year;
    }
    
    return str;
}

/**
 * Formate un montant en devise EUR
 * @param {number} amount - Montant
 * @returns {string} Montant formaté
 */
function formatCurrency(amount) {
    return new Intl.NumberFormat('fr-FR', {
        style: 'currency',
        currency: 'EUR',
        minimumFractionDigits: 0,
        maximumFractionDigits: 0
    }).format(amount);
}

/**
 * Formate un nombre avec séparateurs de milliers
 * @param {number} num - Nombre
 * @returns {string} Nombre formaté
 */
function formatNumber(num) {
    return new Intl.NumberFormat('fr-FR').format(num);
}

/**
 * Retourne la classe CSS selon le pourcentage
 * @param {number} percent - Pourcentage
 * @returns {string} Classe CSS (good/warning/danger)
 */
function getPercentClass(percent) {
    if (percent >= 75) return 'good';
    if (percent >= 50) return 'warning';
    return 'danger';
}

/**
 * Calcule le numéro de semaine actuel
 * @returns {Object} {num, year, label}
 */
function getCurrentWeek() {
    const now = new Date();
    const startOfYear = new Date(now.getFullYear(), 0, 1);
    const days = Math.floor((now - startOfYear) / (24 * 60 * 60 * 1000));
    const weekNum = Math.ceil((days + startOfYear.getDay() + 1) / 7);
    return { 
        num: weekNum, 
        year: now.getFullYear(), 
        label: `S${weekNum}-${now.getFullYear()}` 
    };
}

/**
 * Obtient les dates de début et fin d'une semaine
 * @param {number} weekNum - Numéro de semaine
 * @returns {Object} {start, end}
 */
function getWeekDates(weekNum) {
    const now = new Date();
    const year = now.getFullYear();
    const firstDayOfYear = new Date(year, 0, 1);
    const daysOffset = (weekNum - 1) * 7;
    
    const startDate = new Date(firstDayOfYear);
    startDate.setDate(firstDayOfYear.getDate() + daysOffset - firstDayOfYear.getDay() + 1);
    
    const endDate = new Date(startDate);
    endDate.setDate(startDate.getDate() + 6);
    
    return { start: startDate, end: endDate };
}

/**
 * Vérifie si une valeur est vide
 * @param {*} val - Valeur à tester
 * @returns {boolean}
 */
function isEmpty(val) {
    if (val === null || val === undefined) return true;
    if (typeof val === 'string') return val.trim() === '';
    return false;
}

/**
 * Convertit une date Excel en objet Date JavaScript
 * @param {number} excelDate - Date Excel (serial)
 * @returns {Date|null}
 */
function excelDateToJSDate(excelDate) {
    if (!excelDate || isNaN(excelDate)) return null;
    const num = parseFloat(excelDate);
    if (num < 25569 || num > 60000) return null;
    return new Date((num - 25569) * 86400 * 1000);
}

console.log('✅ utils.js chargé');
