// ============================================
// APP.JS - Point d'entrée principal
// GESTION PRO - EasyLog Pro
// ============================================
// Ce fichier doit être chargé EN DERNIER après tous les autres modules
// Dépend de: config.js, utils.js, parser.js, dashboard.js, et tous les modules
// ============================================

/**
 * Point d'entrée - Lancé au chargement du DOM
 */
document.addEventListener('DOMContentLoaded', function() {
    initApp();
});

/**
 * Initialise l'application
 */
async function initApp() {
    // Charger contacts.json en premier
    await loadContacts();
    
    // Calculer semaine courante
    APP.currentWeek = getCurrentWeek();
    const headerWeek = document.getElementById('headerWeek');
    if (headerWeek) {
        headerWeek.textContent = `Semaine ${APP.currentWeek.num} - ${APP.currentWeek.year}`;
    }
    
    // Event listeners
    setupEventListeners();
    
    // Charger données sauvegardées si disponibles
    loadSavedData();
    
    console.log('🚀 GESTION PRO initialisé');
}

/**
 * Charge contacts.json (techniciens + sous-traitants)
 * Ne charge pas si déjà chargé (ex: via Bridge)
 */
async function loadContacts() {
    // Si déjà chargé (par Bridge par exemple), ne pas recharger
    if (APP.contacts && Object.keys(APP.contacts.techniciens || {}).length > 0) {
        console.log('👷 Contacts déjà chargés, skip');
        return;
    }
    
    try {
        const response = await fetch('data/contacts.json');
        if (response.ok) {
            const data = await response.json();
            APP.contacts = {
                techniciens: data.techniciens || {},
                // La clé peut être "sousTraitants" ou "sous_traitants"
                sousTraitants: data.sousTraitants || data.sous_traitants || {}
            };
            
            // Corriger les emails mal formatés (virgules -> points)
            Object.values(APP.contacts.sousTraitants).forEach(stt => {
                if (stt.mail) stt.mail = stt.mail.replace(/,/g, '.');
            });
            
            console.log('👷 Contacts chargés - Tech:', Object.keys(APP.contacts.techniciens).length, '| STT:', Object.keys(APP.contacts.sousTraitants).length);
        }
    } catch (e) {
        // Si fichier non trouvé et pas de données Bridge, initialiser vide
        if (!APP.contacts || !APP.contacts.techniciens) {
            APP.contacts = { techniciens: {}, sousTraitants: {} };
        }
        console.warn('⚠️ contacts.json non trouvé, utilisation données Bridge ou vide');
    }
}

/**
 * Récupère les infos d'un technicien (code, nom, mail, tel)
 */
function getTechContact(code) {
    if (code === null || code === undefined || !APP.contacts) return null;
    // Normaliser: enlever espaces, convertir en string
    const key = String(code).trim();
    if (!key || key === '0') return null;
    return APP.contacts.techniciens[key] || null;
}

/**
 * Récupère les infos d'un sous-traitant (nom, mail)
 */
function getSttContact(code) {
    if (code === null || code === undefined || !APP.contacts) return null;
    // Normaliser: enlever espaces, convertir en string
    const key = String(code).trim();
    if (!key || key === '0') return null;
    return APP.contacts.sousTraitants[key] || null;
}

/**
 * Récupère l'email d'un STT depuis contacts.json
 */
function getSttEmail(code) {
    const contact = getSttContact(code);
    return contact ? contact.mail : '';
}

/**
 * Récupère le nom d'un STT depuis contacts.json
 */
function getSttNom(code) {
    const contact = getSttContact(code);
    return contact ? contact.nom : '';
}

/**
 * Récupère le trigramme d'un tech
 */
function getTechCode(code) {
    const contact = getTechContact(code);
    return contact ? contact.code : (typeof convertTech === 'function' ? convertTech(code) : code);
}

/**
 * Récupère l'email d'un tech
 */
function getTechEmail(code) {
    const contact = getTechContact(code);
    return contact ? contact.mail : '';
}

/**
 * Récupère le téléphone d'un tech (formaté)
 */
function getTechTel(code) {
    const contact = getTechContact(code);
    if (!contact || !contact.tel) return '';
    // Formater le téléphone : 0607646829
    let tel = String(contact.tel);
    if (tel.length === 9) tel = '0' + tel;
    return tel;
}

/**
 * Récupère le nom complet d'un tech
 */
function getTechNom(code) {
    const contact = getTechContact(code);
    return contact ? contact.nom : '';
}

/**
 * Configure tous les event listeners
 */
function setupEventListeners() {
    // Import file
    const fileInput = document.getElementById('fileInput');
    const importCard = document.getElementById('importCard');

    if (fileInput) {
        fileInput.addEventListener('change', handleFileUpload);
    }

    if (importCard) {
        // Drag & Drop
        importCard.addEventListener('dragover', (e) => {
            e.preventDefault();
            importCard.classList.add('dragover');
        });

        importCard.addEventListener('dragleave', () => {
            importCard.classList.remove('dragover');
        });

        importCard.addEventListener('drop', (e) => {
            e.preventDefault();
            importCard.classList.remove('dragover');
            const file = e.dataTransfer.files[0];
            if (file) processFile(file);
        });

        importCard.addEventListener('click', () => {
            fileInput.click();
        });
    }

    // Recherche globale
    const searchInput = document.getElementById('globalSearch');
    if (searchInput) {
        searchInput.addEventListener('input', handleGlobalSearch);
    }

    // Raccourci clavier Cmd+K / Ctrl+K
    document.addEventListener('keydown', (e) => {
        if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
            e.preventDefault();
            if (searchInput) searchInput.focus();
        }
    });
}

// ============================================
// NAVIGATION
// ============================================

/**
 * Navigue vers une page
 * @param {string} page - Nom de la page
 */
function navigateTo(page) {
    // Mettre à jour nav active
    document.querySelectorAll('.nav-item').forEach(item => {
        item.classList.remove('active');
        if (item.dataset.page === page) {
            item.classList.add('active');
        }
    });

    // Mettre à jour page active
    document.querySelectorAll('.page').forEach(p => {
        p.classList.remove('active');
    });
    
    const pageEl = document.getElementById(`page-${page}`);
    if (pageEl) {
        pageEl.classList.add('active');
    }

    // Mettre à jour titre
    const titles = {
        dashboard: '📊 Dashboard',
        visites: '📅 Suivi Visites',
        dsf: '📈 DSF Tracker',
        devis: '📄 Dashboard Devis',
        travaux: '📋 Analyseur Travaux',
        searchssi: '🔍 Recherche Client',
        produits: '📦 Recherche Produits',
        relances: '📧 Centre de Relances',
        archives: '🗄️ Archives',
        sav: '🔧 SAV - Interventions'
    };
    
    const pageTitle = document.getElementById('pageTitle');
    if (pageTitle) {
        pageTitle.textContent = titles[page] || page;
    }

    // Initialiser le module correspondant
    if (page === 'sav' && typeof SAV !== 'undefined' && APP.loaded) {
        SAV.init();
    }

    APP.currentPage = page;
}

// ============================================
// IMPORT EXCEL
// ============================================

/**
 * Gère l'upload de fichier
 */
function handleFileUpload(e) {
    const file = e.target.files[0];
    if (file) {
        processFile(file);
    }
}

/**
 * Traite un fichier Excel
 * @param {File} file - Fichier à traiter
 */
function processFile(file) {
    const reader = new FileReader();
    
    reader.onload = function(e) {
        try {
            console.log('📁 Lecture du fichier:', file.name);
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true, raw: false });
            
            console.log('📂 Feuilles trouvées:', workbook.SheetNames);
            
            // Parser chaque feuille
            parseWorkbook(workbook);
            
            // Afficher le dashboard
            showDashboard();
            
        } catch (error) {
            console.error('❌ Erreur lecture fichier:', error);
            console.error('Stack:', error.stack);
            alert('❌ Erreur lors de la lecture du fichier Excel:\n' + error.message);
        }
    };
    
    reader.onerror = function(e) {
        console.error('❌ Erreur FileReader:', e);
        alert('❌ Erreur lors de la lecture du fichier');
    };
    
    reader.readAsArrayBuffer(file);
}

// ============================================
// PERSISTANCE (localStorage)
// ============================================

/**
 * Sauvegarde les données dans localStorage
 */
function saveData() {
    try {
        localStorage.setItem('gestionpro_data', JSON.stringify(APP.data));
        localStorage.setItem('gestionpro_timestamp', new Date().toISOString());
        console.log('💾 Données sauvegardées');
    } catch (e) {
        console.warn('Erreur sauvegarde localStorage:', e);
    }
}

/**
 * Charge les données sauvegardées
 */
function loadSavedData() {
    try {
        const saved = localStorage.getItem('gestionpro_data');
        const timestamp = localStorage.getItem('gestionpro_timestamp');
        
        if (saved && timestamp) {
            const data = JSON.parse(saved);
            const age = (new Date() - new Date(timestamp)) / 1000 / 60; // en minutes
            
            if (age < 60) { // Moins d'1h
                APP.data = data;
                APP.loaded = true;
                
                // Reconstruire les tables de référence
                if (data.techRaw && data.techRaw.length > 0) {
                    buildTechTable(data.techRaw);
                }
                if (data.sttRaw && data.sttRaw.length > 0) {
                    buildSttTable(data.sttRaw);
                }
                
                showDashboard();
                updateStatus(true);
                console.log('📂 Données restaurées (sauvegarde de', Math.round(age), 'min)');
            }
        }
    } catch (e) {
        console.warn('Erreur chargement localStorage:', e);
    }
}

// Sauvegarder automatiquement avant fermeture
window.addEventListener('beforeunload', () => {
    if (APP.loaded) saveData();
});

console.log('✅ app.js chargé');
