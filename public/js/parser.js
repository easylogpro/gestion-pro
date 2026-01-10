// ============================================
// PARSER.JS - Chargement et parsing des données
// GESTION PRO - EasyLog Pro
// ============================================

// Variables locales au parser (pour les conversions)
let _techMapping = {};
let _techFullInfo = {};
let _sttMapping = {};
let _sttEmailMap = {};

/**
 * Reconstruit la table TECH depuis les données sauvegardées
 * (Fonction manquante dans l'original - corrigé ici)
 * @param {Array} techData - Données TECH brutes
 */
function buildTechTable(techData) {
    _techMapping = {};
    _techFullInfo = {};
    APP.tables.tech.clear();
    
    if (!techData || !Array.isArray(techData)) return;
    
    techData.forEach(row => {
        if (!row || !Array.isArray(row)) return;
        const cle = String(row[0] || '').trim();
        const valeur = String(row[1] || '').trim();
        const nom = String(row[2] || '').trim() || valeur;
        const email = String(row[3] || '').trim();
        const tel = String(row[4] || '').trim();
        
        if (cle && valeur) {
            _techMapping[cle] = valeur;
            _techFullInfo[cle] = { value: valeur, nom, email, tel };
            APP.tables.tech.set(cle, { value: valeur, nom, email, tel });
        }
    });
    
    console.log('🔧 TECH Table reconstruite:', APP.tables.tech.size, 'entrées');
}

/**
 * Reconstruit la table STT depuis les données sauvegardées
 * (Fonction manquante dans l'original - corrigé ici)
 * @param {Array} sttData - Données STT brutes
 */
function buildSttTable(sttData) {
    _sttMapping = {};
    _sttEmailMap = {};
    APP.tables.stt.clear();
    
    if (!sttData || !Array.isArray(sttData)) return;
    
    sttData.forEach(row => {
        if (!row || !Array.isArray(row)) return;
        const cle = String(row[0] || '').trim();
        const valeur = String(row[1] || '').trim();
        const email = String(row[2] || '').trim();
        
        if (cle && valeur) {
            _sttMapping[cle] = valeur;
            if (email) _sttEmailMap[cle] = email;
            APP.tables.stt.set(cle, { value: valeur, email });
        }
    });
    
    console.log('🔧 STT Table reconstruite:', APP.tables.stt.size, 'entrées');
}

/**
 * Convertit un code technicien en valeur
 * @param {string} code - Code technicien
 * @returns {string} Valeur convertie
 */
function convertTech(code) {
    const key = String(code || '').trim();
    return _techMapping[key] || key;
}

/**
 * Convertit un code STT en valeur
 * @param {string} code - Code STT
 * @returns {string} Valeur convertie
 */
function convertStt(code) {
    const key = String(code || '').trim();
    return _sttMapping[key] || key;
}

/**
 * Récupère l'email d'un STT depuis la table Excel (fallback)
 * @param {string} code - Code STT
 * @returns {string} Email
 */
function getSttEmailFromTable(code) {
    const key = String(code || '').trim();
    return _sttEmailMap[key] || '';
}

/**
 * Détermine le secteur depuis la valeur convertie du technicien
 * @param {string} convertedValue - Valeur convertie (ex: "ABC-S1")
 * @returns {string} Secteur (S1, S2, S3, AUTRES)
 */
function getSector(convertedValue) {
    const val = String(convertedValue || '').trim();
    const lastTwo = val.slice(-2).toUpperCase();
    if (lastTwo === 'S1') return 'S1';
    if (lastTwo === 'S2') return 'S2';
    if (lastTwo === 'S3') return 'S3';
    return 'AUTRES';
}

/**
 * Parse un workbook Excel et remplit APP.data
 * @param {Object} workbook - Workbook XLSX
 */
function parseWorkbook(workbook) {
    const sheetsLoaded = [];
    
    try {
        console.log('🔄 Début du parsing...');
        
        // ============================================
        // ÉTAPE 1 : CHARGER LES MAPPINGS TECH ET STT EN PREMIER
        // ============================================
        
        // TECH : colonne A = clé, colonne B = valeur
        _techMapping = {};
        _techFullInfo = {};
        
        if (workbook.SheetNames.includes('TECH')) {
            console.log('📋 Chargement TECH...');
            const sheet = workbook.Sheets['TECH'];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            
            // Stocker les données brutes pour le module DEVIS
            APP.data.techRaw = data.slice(1).filter(row => row && row.some(val => val !== null && val !== undefined && val !== ''));
            
            // DEBUG: Afficher les en-têtes TECH
            console.log('📋 TECH Headers:', data[0]);
            console.log('📋 TECH Exemple lignes 2-6:', data.slice(1, 6));
            
            data.slice(1).forEach(row => {
                if (!row || !Array.isArray(row)) return;
                const cle = String(row[0] || '').trim();
                const valeur = String(row[1] || '').trim();
                const nom = String(row[2] || '').trim() || valeur;
                const email = String(row[3] || '').trim();
                const tel = String(row[4] || '').trim();
                
                if (cle && valeur) {
                    _techMapping[cle] = valeur;
                    _techFullInfo[cle] = { value: valeur, nom, email, tel };
                    APP.tables.tech.set(cle, { value: valeur, nom, email, tel });
                }
            });
            
            // DEBUG: Afficher quelques mappings et leurs secteurs
            const sampleMappings = Object.entries(_techMapping).slice(0, 10);
            console.log('📋 TECH Mappings (10 premiers):');
            sampleMappings.forEach(([k, v]) => {
                const lastTwo = String(v).slice(-2).toUpperCase();
                const secteur = lastTwo === 'S1' ? 'S1' : lastTwo === 'S2' ? 'S2' : lastTwo === 'S3' ? 'S3' : 'AUTRES';
                console.log(`   "${k}" → "${v}" → secteur: ${secteur}`);
            });
            
            sheetsLoaded.push({ name: 'TECH', count: Object.keys(_techMapping).length });
            console.log('✅ TECH Mapping chargé:', Object.keys(_techMapping).length, 'entrées');
        } else {
            console.warn('⚠️ Feuille TECH non trouvée');
        }
        
        // STT : colonne A = clé, colonne B = valeur, colonne C = email
        _sttMapping = {};
        _sttEmailMap = {};
        
        if (workbook.SheetNames.includes('STT')) {
            console.log('🏢 Chargement STT...');
            const sheet = workbook.Sheets['STT'];
            const data = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
            
            // Stocker les données brutes pour le module DEVIS
            APP.data.sttRaw = data.slice(1).filter(row => row && row.some(val => val !== null && val !== undefined && val !== ''));
            
            data.slice(1).forEach(row => {
                if (!row || !Array.isArray(row)) return;
                const cle = String(row[0] || '').trim();
                const valeur = String(row[1] || '').trim();
                const email = String(row[2] || '').trim();
                
                if (cle && valeur) {
                    _sttMapping[cle] = valeur;
                    if (email) _sttEmailMap[cle] = email;
                    APP.tables.stt.set(cle, { value: valeur, email });
                }
            });
            sheetsLoaded.push({ name: 'STT', count: Object.keys(_sttMapping).length });
            console.log('✅ STT Mapping chargé:', Object.keys(_sttMapping).length, 'entrées');
        } else {
            console.warn('⚠️ Feuille STT non trouvée');
        }
        
        // ============================================
        // ÉTAPE 2 : TRAITER SSI
        // ============================================
        if (workbook.SheetNames.includes('SSI')) {
            console.log('📊 Chargement SSI...');
            try {
                const sheet = workbook.Sheets['SSI'];
                const jsonData = XLSX.utils.sheet_to_json(sheet, {header:1});
                
                console.log('📊 SSI colonnes:', jsonData[0]?.length);
                
                if (jsonData.length > 1) {
                    // Stocker les headers pour le module SEARCHSSI
                    APP.data.ssiHeaders = jsonData[0];
                    
                    // Colonnes dynamiques selon l'année
                    const ssiHeaders = jsonData[0];
                    const colE = 4;
                    const colBT = findColumnByHeader(ssiHeaders, 'PL 1');
                    const colBP = findColumnByHeader(ssiHeaders, YEAR_COLS.V1);
                    const colBQ = findColumnByHeader(ssiHeaders, YEAR_COLS.V2);
                    const colBV = findColumnByHeader(ssiHeaders, 'PL 2');
                    
                    // Vérifier si les colonnes de l'année en cours existent
                    const ssiAnneeOK = colBP !== -1 && colBQ !== -1;
                    if (!ssiAnneeOK) {
                        alert('⚠️ BASE ACCESS À METTRE À JOUR !\n\nColonnes ' + YEAR_COLS.V1 + ' et/ou ' + YEAR_COLS.V2 + ' introuvables.\n\nLe calcul SSI ne sera pas effectué.');
                        console.warn('❌ SSI: Colonnes année ' + YEAR_COLS.annee + ' non trouvées');
                    }
                    
                    // Calculer semaine courante pour V2
                    const now = new Date();
                    const startYear = new Date(now.getFullYear(), 0, 1);
                    const currentWeek = Math.ceil((now - startYear) / (7 * 24 * 60 * 60 * 1000));
                    const analyserV2 = currentWeek >= 27;
                    
                    console.log('🔍 SSI Colonnes:', {V1: YEAR_COLS.V1 + '→idx' + colBP, V2: YEAR_COLS.V2 + '→idx' + colBQ, semaine: currentWeek, analyserV2: analyserV2});
                    
                    APP.data.ssi = ssiAnneeOK ? jsonData.slice(1).map((row, idx) => {
                        if (!row || !Array.isArray(row)) return null;
                        const techCode = row[colE];
                        const techConverted = convertTech(techCode);
                        const secteur = getSector(techConverted);
                        
                        // DEBUG: Afficher les 5 premières conversions
                        if (idx < 5) {
                            console.log(`🔍 SSI[${idx}] Secteur: code="${techCode}" → converted="${techConverted}" → secteur="${secteur}"`);
                        }
                        
                        const bt = String(row[colBT] || '').trim();
                        const bp = String(row[colBP] || '').trim();
                        const bq = String(row[colBQ] || '').trim();
                        const bv = String(row[colBV] || '').trim();
                        
                        return {
                            _raw: row,
                            techCode, techConverted, secteur,
                            bt, bp, bq, bv,
                            v1Restante: !bt && !bp,
                            v2Restante: analyserV2 ? (!bq && !bv) : false,
                            numClient: row[0] || '',
                            nomSite: row[4] || ''
                        };
                    }).filter(r => r !== null) : [];
                    
                    // DEBUG: Comptage par secteur
                    const secteurCounts = { S1: 0, S2: 0, S3: 0, AUTRES: 0 };
                    APP.data.ssi.forEach(r => secteurCounts[r.secteur]++);
                    console.log('📊 SSI par secteur:', secteurCounts);
                    
                    sheetsLoaded.push({ name: 'SSI', count: APP.data.ssi.length });
                    console.log('✅ SSI chargé:', APP.data.ssi.length, 'lignes');
                }
            } catch (err) {
                console.error('❌ Erreur SSI:', err);
            }
        }
        
        // ============================================
        // ÉTAPE 3 : TRAITER DSF
        // ============================================
        const dsfSheetName = workbook.SheetNames.find(name => {
            const n = name.toUpperCase();
            return n === 'DSF' || (n.includes('DSF') && !n.includes('CLOTURE') && !n.includes('PLANIF') && !n.includes('RESP'));
        });
        
        if (dsfSheetName) {
            console.log('🔥 Chargement DSF...');
            try {
                const sheet = workbook.Sheets[dsfSheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                
                if (jsonData.length > 1) {
                    // Colonnes stables
                    const colA = 0, colE = 4, colG = 6, colL = 11;
                    const colAC = 28, colAH = 33, colAI = 34, colAJ = 35, colBW = 74;
                    
                    // Colonnes dynamiques selon l'année
                    const dsfHeaders = jsonData[0];
                    const colY = findColumnByHeader(dsfHeaders, YEAR_COLS.VERIF_DSF_V1);
                    const colZ = findColumnByHeader(dsfHeaders, YEAR_COLS.VERIF_DSF_V2);
                    const colBU = 72;
                    const colBV = 73;
                    
                    // Vérifier si les colonnes de l'année en cours existent
                    const dsfAnneeOK = colY !== -1 && colZ !== -1;
                    if (!dsfAnneeOK) {
                        alert('⚠️ BASE ACCESS À METTRE À JOUR !\n\nColonnes ' + YEAR_COLS.VERIF_DSF_V1 + ' et/ou ' + YEAR_COLS.VERIF_DSF_V2 + ' introuvables.\n\nLe calcul DSF ne sera pas effectué.');
                        console.warn('❌ DSF: Colonnes année ' + YEAR_COLS.annee + ' non trouvées');
                    }
                    
                    console.log('🔍 DSF Colonnes:', {Y: YEAR_COLS.VERIF_DSF_V1 + '→idx' + colY, Z: YEAR_COLS.VERIF_DSF_V2 + '→idx' + colZ, anneeOK: dsfAnneeOK});
                    
                    APP.data.dsf = dsfAnneeOK ? jsonData.slice(1).map((row, idx) => {
                        if (!row || !Array.isArray(row)) return null;
                        
                        const secteurCode = row[colAJ];
                        const secteurConverted = convertTech(secteurCode);
                        const secteur = getSector(secteurConverted);
                        
                        // DEBUG: Afficher les 5 premières conversions
                        if (idx < 5) {
                            console.log(`🔍 DSF[${idx}] Secteur: code="${secteurCode}" → converted="${secteurConverted}" → secteur="${secteur}"`);
                        }
                        
                        const sttCode = row[colAH];
                        const sttConverted = convertStt(sttCode);
                        const sttEmail = getSttEmailFromTable(sttCode);
                        
                        const aiCode = row[colAI];
                        const aiConverted = convertStt(aiCode);
                        
                        const y = String(row[colY] || '').trim();
                        const bu = String(row[colBU] || '').trim();
                        const z = String(row[colZ] || '').trim();
                        const bv = String(row[colBV] || '').trim();
                        const mois = String(row[colAC] || '').trim();
                        
                        let visitesRestantes = 0, visitesTotales = 0;
                        if (!y && !bu) { visitesRestantes++; visitesTotales++; }
                        else if (y || bu) { visitesTotales++; }
                        if (aiConverted && !z && !bv) { visitesRestantes++; visitesTotales++; }
                        else if (aiConverted && (z || bv)) { visitesTotales++; }
                        
                        return {
                            _raw: row,
                            secteurCode, secteurConverted, secteur,
                            sttCode, sttConverted, sttEmail,
                            aiCode, aiConverted,
                            y, bu, z, bv, mois,
                            visitesRestantes, visitesTotales,
                            numClient: row[colA] || '',
                            nomSite: row[colE] || '',
                            ville: row[colG] || '',
                            contact: row[colL] || '',
                            heureDSF: row[colBW] || ''
                        };
                    }).filter(r => r !== null) : [];
                    sheetsLoaded.push({ name: 'DSF', count: APP.data.dsf.length });
                    console.log('✅ DSF chargé:', APP.data.dsf.length, 'lignes');
                }
            } catch (err) {
                console.error('❌ Erreur DSF:', err);
            }
        }
        
        // ============================================
        // ÉTAPE 3b : CHARGER CONTRATS POUR JOINTURE (avant TRAVAUX)
        // ============================================
        const _contratsParClient = {};
        const contratsSheetNameEarly = workbook.SheetNames.find(name => {
            const n = name.toUpperCase();
            return n.includes('CONTRAT') || 
                   n.includes('LISTE DES CONTRATS') ||
                   name === 'Liste des contrats en cours';
        });
        
        if (contratsSheetNameEarly) {
            console.log('📋 Pré-chargement CONTRATS pour jointure...');
            try {
                const sheet = workbook.Sheets[contratsSheetNameEarly];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                
                if (jsonData.length > 1) {
                    // Créer dictionnaire par N° Client (colonne 1 = index 0)
                    jsonData.slice(1).forEach(row => {
                        if (!row || !Array.isArray(row)) return;
                        const numClient = String(row[0] || '').trim();
                        if (numClient) {
                            _contratsParClient[numClient] = {
                                nomSite: row[9] || '', // Colonne 10 (index 9) = Nom du site
                                _raw: row
                            };
                        }
                    });
                    console.log('✅ Dictionnaire CONTRATS créé:', Object.keys(_contratsParClient).length, 'clients');
                }
            } catch (err) {
                console.error('❌ Erreur pré-chargement CONTRATS:', err);
            }
        }
        
        // ============================================
        // ÉTAPE 4 : TRAITER TRAVAUX
        // ============================================
        const travauxSheetName = workbook.SheetNames.find(name => 
            name.toUpperCase().includes('TRAVAUX') && !name.toUpperCase().includes('DSF')
        );
        
        if (travauxSheetName) {
            console.log('📋 Chargement TRAVAUX...');
            try {
                const sheet = workbook.Sheets[travauxSheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, raw: false, defval: '' });
                
                if (jsonData.length > 1) {
                    APP.data.travauxHeaders = jsonData[0];
                    
                    // Chercher colonne PL TECH par en-tête
                    const colPlTech = findColumnByHeader(jsonData[0], 'PL TECH');
                    
                    APP.data.travaux = jsonData.slice(1).map(row => {
                        if (!row || !Array.isArray(row)) return null;
                        
                        const processed = { _raw: row };
                        row.forEach((val, idx) => { processed[idx] = val !== undefined ? val : ''; });
                        
                        // JOINTURE : Récupérer nom_site depuis CONTRATS via N° Client (col 1 = index 0)
                        const numClient = String(row[0] || '').trim();
                        const contratData = _contratsParClient[numClient] || {};
                        processed.nom_site = contratData.nomSite || '';
                        
                        // Debug jointure
                        if (!contratData.nomSite && numClient) {
                            console.log('⚠️ Pas de jointure CONTRATS pour client:', numClient);
                        }
                        
                        // Col 69 (index 68) = Technicien
                        const techCode = row[68];
                        const techConverted = convertTech(techCode);
                        processed.tech_code = techCode; // Code brut pour contacts.json
                        processed.tech_converted = techConverted;
                        processed.col69_converted = techConverted;
                        processed.secteur = getSector(techConverted);
                        
                        const techInfo = _techFullInfo[String(techCode || '').trim()] || {};
                        processed.technicien_nom = techInfo.nom || '';
                        processed.technicien_email = techInfo.email || '';
                        processed.technicien_telephone = techInfo.tel || '';
                        
                        // Col 12 (index 11) = Rédacteur
                        const redacteurCode = row[11];
                        const redacteurConverted = convertTech(redacteurCode);
                        processed.redacteur_converted = redacteurConverted;
                        processed.col12_converted = redacteurConverted;
                        const redInfo = _techFullInfo[String(redacteurCode || '').trim()] || {};
                        processed.redacteur_email = redInfo.email || '';
                        
                        // Col 28 (index 27) = STT
                        const sttCode = String(row[27] || '').trim();
                        processed.stt_code = sttCode; // Code brut pour contacts.json
                        if (sttCode && sttCode !== '0') {
                            const sttConv = convertStt(sttCode);
                            processed.stt_converted = sttConv;
                            processed.col28_converted = sttConv;
                            processed.stt_email = getSttEmailFromTable(sttCode);
                            processed.has_stt = true;
                        } else {
                            processed.stt_converted = '';
                            processed.col28_converted = '';
                            processed.stt_email = '';
                            processed.has_stt = false;
                        }
                        
                        // PL STT, Budget, CA
                        processed.pl_stt = String(row[50] || '').trim();
                        processed.is_planified = processed.pl_stt !== '';
                        
                        // PL TECH (par en-tête)
                        const plTechVal = colPlTech !== -1 ? String(row[colPlTech] || '').trim() : '';
                        processed.pl_tech = plTechVal;
                        processed.pl_tech_vide = plTechVal === '';
                        
                        const budgetRaw = String(row[52] || '').replace(/[^\d.,-]/g, '').replace(',', '.');
                        processed.budget_stt = parseFloat(budgetRaw) || 0;
                        
                        const montantRaw = String(row[23] || '').replace(/[^\d.,-]/g, '').replace(',', '.');
                        processed.ca = parseFloat(montantRaw) || 0;
                        
                        // Année
                        const dateRetour = String(row[25] || '');
                        const yearMatch = dateRetour.match(/\/(\d{2,4})(?:\s|$)/);
                        if (yearMatch) {
                            let y = yearMatch[1];
                            if (y.length === 2) y = '20' + y;
                            processed.annee = y;
                        } else {
                            processed.annee = '';
                        }
                        
                        processed.uniqueKey = `${String(row[0] || '')}_${String(row[2] || '')}`;
                        
                        return processed;
                    }).filter(row => {
                        if (!row) return false;
                        return Object.keys(row).some(key => {
                            if (key.startsWith('_') || key.includes('converted') || key.includes('numeric')) return false;
                            return row[key] !== '' && row[key] !== null && row[key] !== undefined;
                        });
                    });
                    
                    sheetsLoaded.push({ name: 'TRAVAUX', count: APP.data.travaux.length });
                    console.log('✅ TRAVAUX chargé:', APP.data.travaux.length, 'lignes');
                }
            } catch (err) {
                console.error('❌ Erreur TRAVAUX:', err);
            }
        }
        
        // ============================================
        // ÉTAPE 5 : TRAITER DEVIS / DASHBOARD
        // ============================================
        const devisSheetName = workbook.SheetNames.find(name => {
            const n = name.toUpperCase();
            return n === 'DEVIS' || n === 'DASHBOARD';
        });
        
        if (devisSheetName) {
            console.log('📄 Chargement DEVIS...');
            try {
                const sheet = workbook.Sheets[devisSheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, {header: 1, defval: null});
                
                console.log('📄 DEVIS jsonData[0] length:', jsonData[0]?.length);
                
                if (jsonData.length > 1) {
                    APP.data.devisHeaders = jsonData[0];
                    
                    // Stocker juste _raw - le module DEVIS fera le traitement
                    APP.data.devis = jsonData.slice(1).map(row => {
                        if (!row || !Array.isArray(row)) return null;
                        return { _raw: row };
                    }).filter(r => r !== null && r._raw.some(val => val !== null && val !== undefined && val !== ''));
                    
                    sheetsLoaded.push({ name: 'DEVIS', count: APP.data.devis.length });
                    console.log('✅ DEVIS chargé:', APP.data.devis.length, 'lignes, colonnes:', APP.data.devisHeaders.length);
                }
            } catch (err) {
                console.error('❌ Erreur DEVIS:', err);
            }
        }
        
        // ============================================
        // ÉTAPE 6 : DSF TRACKER (CLOTURE, PLANIF, RESP)
        // ============================================
        ['CLOTURE', 'PLANIF', 'RESP'].forEach(suffix => {
            const sheetName = workbook.SheetNames.find(name => 
                name.toUpperCase().includes('DSF') && name.toUpperCase().includes(suffix)
            );
            
            if (sheetName) {
                console.log(`📈 Chargement DSF ${suffix}...`);
                try {
                    const sheet = workbook.Sheets[sheetName];
                    const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                    
                    if (jsonData.length > 1) {
                        const dataKey = suffix === 'CLOTURE' ? 'dsfCloture' :
                                       suffix === 'PLANIF' ? 'dsfPlanif' : 'dsfResp';
                        
                        // Chercher colonnes par en-tête
                        const headers = jsonData[0];
                        const colNum = findColumnByHeader(headers, 'Num');
                        const colNomSite = findColumnByHeader(headers, 'Nom du site');
                        const colVille = findColumnByHeader(headers, 'Ville');
                        const colSTT = findColumnByHeader(headers, 'sous traitant');
                        const colSTT2 = findColumnByHeader(headers, 'STT 2');
                        const colTech = findColumnByHeader(headers, 'technicien 2008');
                        const colMoisSTT = findColumnByHeader(headers, 'mois STT');
                        
                        APP.data[dataKey] = jsonData.slice(1).map(row => {
                            if (!row || !Array.isArray(row)) return null;
                            
                            const techCode = colTech !== -1 ? String(row[colTech] || '').trim() : '';
                            const techConverted = convertTech(techCode);
                            const secteur = getSector(techConverted);
                            
                            let sttCode = colSTT !== -1 ? String(row[colSTT] || '').trim() : '';
                            if (!sttCode && colSTT2 !== -1) sttCode = String(row[colSTT2] || '').trim();
                            const sttConverted = convertStt(sttCode);
                            
                            const moisSTT = colMoisSTT !== -1 ? String(row[colMoisSTT] || '').trim() : '';
                            
                            const numClient = colNum !== -1 ? String(row[colNum] || '').trim() : String(row[0] || '').trim();
                            
                            // JOINTURE : Nom du site depuis CONTRATS
                            const contratData = _contratsParClient[numClient] || {};
                            const nomSiteJoint = contratData.nomSite || '';
                            
                            return {
                                _raw: row,
                                secteur: secteur,
                                stt: sttConverted,
                                sttCode: sttCode,
                                moisSTT: moisSTT,
                                numClient: numClient,
                                nomSite: nomSiteJoint || (colNomSite !== -1 ? (row[colNomSite] || '') : (row[4] || '')),
                                ville: colVille !== -1 ? (row[colVille] || '') : (row[6] || '')
                            };
                        }).filter(r => r !== null);
                        
                        sheetsLoaded.push({ name: `DSF ${suffix}`, count: APP.data[dataKey].length });
                        console.log(`✅ DSF ${suffix} chargé:`, APP.data[dataKey].length, 'lignes');
                    }
                } catch (err) {
                    console.error(`❌ Erreur DSF ${suffix}:`, err);
                }
            }
        });
        
        // ============================================
        // ÉTAPE 7 : PRODUITS (feuille séparée)
        // ============================================
        const produitsSheetName = workbook.SheetNames.find(name => 
            name.toUpperCase().includes('PRODUIT')
        );
        
        if (produitsSheetName) {
            console.log('🔎 Chargement PRODUITS...');
            try {
                const sheet = workbook.Sheets[produitsSheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                
                if (jsonData.length > 1) {
                    APP.data.produitsHeaders = jsonData[0];
                    
                    APP.data.produits = jsonData.slice(1).map((row, idx) => {
                        if (!row || !Array.isArray(row)) return null;
                        
                        const processed = { _raw: row, _index: idx };
                        processed.code = row[0] || '';
                        processed.designation = row[1] || '';
                        processed.description = row[2] || '';
                        processed.marque = row[3] || '';
                        processed.categorie = row[4] || '';
                        
                        processed.tarifs = {};
                        jsonData[0].forEach((header, i) => {
                            const h = String(header || '').toUpperCase();
                            if (h.includes('TARIF') && h.includes('INSTAL')) {
                                const yearMatch = h.match(/20\d{2}/);
                                if (yearMatch) {
                                    const val = String(row[i] || '').replace(/[^\d.,-]/g, '').replace(',', '.');
                                    processed.tarifs[yearMatch[0]] = parseFloat(val) || 0;
                                }
                            }
                        });
                        
                        return processed;
                    }).filter(r => r !== null);
                    
                    sheetsLoaded.push({ name: 'PRODUITS', count: APP.data.produits.length });
                    console.log('✅ PRODUITS chargé:', APP.data.produits.length, 'lignes');
                }
            } catch (err) {
                console.error('❌ Erreur PRODUITS:', err);
            }
        }
        
        // ============================================
        // ÉTAPE 8 : MAILS
        // ============================================
        if (workbook.SheetNames.includes('MAILS')) {
            console.log('📧 Chargement MAILS...');
            try {
                const sheet = workbook.Sheets['MAILS'];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                APP.data.mails = jsonData.slice(1);
                sheetsLoaded.push({ name: 'MAILS', count: APP.data.mails.length });
                console.log('✅ MAILS chargé:', APP.data.mails.length, 'lignes');
            } catch (err) {
                console.error('❌ Erreur MAILS:', err);
            }
        }

        // ============================================
        // ÉTAPE 9 : SAV (Inter techniques 2009)
        // ============================================
        // Debug: afficher toutes les feuilles disponibles
        console.log('📋 Feuilles disponibles:', workbook.SheetNames);
        
        const savSheetName = workbook.SheetNames.find(name => {
            const n = name.toUpperCase();
            // Cherche "Inter techniques" ou variations
            return n.includes('INTER TECH') || 
                   n.includes('INTER_TECH') ||
                   (n.includes('INTER') && n.includes('TECHNIQUE')) ||
                   n === 'INTER TECHNIQUES 2009' ||
                   name === 'Inter techniques 2009';  // Exact match
        });
        
        console.log('🔍 Feuille SAV trouvée:', savSheetName || 'NON TROUVÉE');
        
        if (savSheetName) {
            console.log('🔧 Chargement SAV (Inter techniques)...');
            try {
                const sheet = workbook.Sheets[savSheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                
                if (jsonData.length > 1) {
                    APP.data.savHeaders = jsonData[0];
                    console.log('📋 Headers SAV:', APP.data.savHeaders.slice(0, 10));
                    
                    APP.data.sav = jsonData.slice(1).map((row, idx) => {
                        if (!row || !Array.isArray(row)) return null;
                        return { _raw: row, _index: idx };
                    }).filter(r => r !== null && r._raw.some(val => val !== null && val !== undefined && val !== ''));
                    
                    sheetsLoaded.push({ name: 'SAV', count: APP.data.sav.length });
                    console.log('✅ SAV chargé:', APP.data.sav.length, 'interventions');
                }
            } catch (err) {
                console.error('❌ Erreur SAV:', err);
            }
        } else {
            console.warn('⚠️ Feuille SAV non trouvée. Cherche: "Inter techniques 2009"');
        }

        // ============================================
        // ÉTAPE 10 : CONTRATS (Liste des contrats en cours)
        // ============================================
        const contratsSheetName = workbook.SheetNames.find(name => {
            const n = name.toUpperCase();
            // Cherche "Liste des contrats" ou variations
            return n.includes('CONTRAT') || 
                   n.includes('LISTE DES CONTRATS') ||
                   name === 'Liste des contrats en cours';  // Exact match
        });
        
        console.log('🔍 Feuille CONTRATS trouvée:', contratsSheetName || 'NON TROUVÉE');
        
        if (contratsSheetName) {
            console.log('📋 Chargement CONTRATS...');
            try {
                const sheet = workbook.Sheets[contratsSheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet, { header: 1, defval: '' });
                
                if (jsonData.length > 1) {
                    APP.data.contratsHeaders = jsonData[0];
                    console.log('📋 Headers CONTRATS:', APP.data.contratsHeaders.slice(0, 10));
                    
                    APP.data.contrats = jsonData.slice(1).map((row, idx) => {
                        if (!row || !Array.isArray(row)) return null;
                        return { _raw: row, _index: idx };
                    }).filter(r => r !== null && r._raw.some(val => val !== null && val !== undefined && val !== ''));
                    
                    sheetsLoaded.push({ name: 'CONTRATS', count: APP.data.contrats.length });
                    console.log('✅ CONTRATS chargé:', APP.data.contrats.length, 'contrats');
                }
            } catch (err) {
                console.error('❌ Erreur CONTRATS:', err);
            }
        } else {
            console.warn('⚠️ Feuille CONTRATS non trouvée. Cherche: "Liste des contrats en cours"');
        }

        // Afficher les feuilles chargées
        displayLoadedSheets(sheetsLoaded);
        
        APP.loaded = true;
        updateStatus(true);
        
        console.log('🎉 Import terminé avec succès !');
        console.log('📊 Résumé:', APP.data);
        
    } catch (error) {
        console.error('❌ Erreur parseWorkbook:', error);
        console.error('Stack:', error.stack);
        throw error;
    }
}

/**
 * Affiche les badges des feuilles chargées
 * @param {Array} sheets - Liste des feuilles {name, count}
 */
function displayLoadedSheets(sheets) {
    const container = document.getElementById('sheetsLoaded');
    if (!container) return;
    
    container.innerHTML = sheets.map(s => `
        <div class="sheet-badge loaded">
            <span>✅</span>
            <span>${s.name}</span>
            <span class="count">${s.count}</span>
        </div>
    `).join('');
    
    const importStatus = document.getElementById('importStatus');
    if (importStatus) importStatus.classList.add('visible');
}

/**
 * Met à jour l'indicateur de statut de connexion
 * @param {boolean} connected - État de connexion
 */
function updateStatus(connected) {
    const dot = document.getElementById('statusDot');
    const text = document.getElementById('statusText');
    
    if (!dot || !text) return;
    
    if (connected) {
        dot.classList.add('connected');
        const totalRecords = Object.values(APP.data).reduce((sum, arr) => {
            return sum + (Array.isArray(arr) ? arr.length : 0);
        }, 0);
        text.textContent = `${totalRecords} enregistrements`;
    } else {
        dot.classList.remove('connected');
        text.textContent = 'Aucune donnée';
    }
}

console.log('✅ parser.js chargé');
