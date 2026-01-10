// ============================================
// VISITES.JS - Module Visites SSI & DSF
// GESTION PRO - EasyLog Pro
// ============================================
// Dépend de: config.js (APP, YEAR_COLS, SSI_HISTORY_KEY, MONTH_NAMES)
//            utils.js (getPercentClass, getWeekDates)
//            parser.js (pour les données APP.data.ssi, APP.data.dsf)
// ============================================

const VISITES = {
    ssi: {
        counts: { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 },
        v1Restantes: { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 },
        v2Restantes: { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 },
        history: { s1: [], s2: [], s3: [], autres: [] }
    },
    dsf: {
        counts: { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 },
        restantes: { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 },
        totales: { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 },
        rawData: [],
        monthlyData: {}
    }
};

// SSI_HISTORY_KEY défini dans config.js

// Onglets Visites
function switchVisitesTab(tab) {
    document.querySelectorAll('.visites-tab').forEach(t => t.classList.remove('active'));
    document.querySelector(`.visites-tab[data-tab="${tab}"]`).classList.add('active');
    
    document.querySelectorAll('.visites-content').forEach(c => c.classList.remove('active'));
    document.getElementById(`visites-${tab}`).classList.add('active');
}

// Initialiser le module Visites
function initVisitesModule() {
    console.log('🔄 Initialisation module Visites...');
    console.log('📅 SSI data:', APP.data.ssi.length, 'entrées');
    console.log('📈 DSF data:', APP.data.dsf.length, 'entrées');
    
    // Mettre à jour les infos semaine
    const weekNum = APP.currentWeek.num;
    const visitType = weekNum <= 26 ? 'V1' : 'V2';
    const visitPeriod = weekNum <= 26 ? 'Semaines 1-26' : 'Semaines 27-52';
    
    const weekTitle = document.getElementById('visitesWeekTitle');
    if (weekTitle) weekTitle.textContent = `📅 Semaine ${weekNum}`;
    
    const weekPeriod = document.getElementById('visitesWeekPeriod');
    if (weekPeriod) weekPeriod.textContent = getWeekDates(weekNum);
    
    const visitBadge = document.getElementById('visitTypeBadge');
    if (visitBadge) visitBadge.innerHTML = `<span>${visitType}</span><small>${visitPeriod}</small>`;
    
    const ssiWeek = document.getElementById('ssiWeekNum');
    if (ssiWeek) ssiWeek.textContent = weekNum;
    
    const dsfWeek = document.getElementById('dsfWeekNum');
    if (dsfWeek) dsfWeek.textContent = weekNum;
    
    // Charger l'historique
    loadSSIHistory();
    
    // Traiter les données SSI si disponibles
    if (APP.data.ssi.length > 0) {
        console.log('📊 Traitement SSI...');
        processSSIData();
        displaySSIStats();
        displaySSIHistory();
    } else {
        console.warn('⚠️ Aucune donnée SSI');
    }
    
    // Traiter les données DSF si disponibles
    if (APP.data.dsf.length > 0) {
        console.log('🔥 Traitement DSF...');
        processDSFData();
        displayDSFStats();
        generateDSFPlanning();
    } else {
        console.warn('⚠️ Aucune donnée DSF');
    }
    
    // Mettre à jour les compteurs des onglets
    const tabSSI = document.getElementById('tabCountSSI');
    if (tabSSI) tabSSI.textContent = VISITES.ssi.counts.total || 0;
    
    const tabDSF = document.getElementById('tabCountDSF');
    if (tabDSF) tabDSF.textContent = VISITES.dsf.counts.total || 0;
    
    // Mettre à jour le KPI Visites sur le dashboard
    updateVisitesKPI();
    
    // Initialiser le module VISITESMODULE (Planning, Historique, Modal STT)
    VISITESMODULE.init();
    
    console.log('✅ Module Visites initialisé');
}

function updateVisitesKPI() {
    const weekNum = APP.currentWeek.num;
    let totalRestantes = 0;
    
    if (weekNum <= 26) {
        // Période V1 - afficher V1 restantes
        totalRestantes = VISITES.ssi.v1Restantes.total + VISITES.dsf.restantes.total;
    } else {
        // Période V2 - afficher V2 restantes
        totalRestantes = VISITES.ssi.v2Restantes.total + VISITES.dsf.restantes.total;
    }
    
    const kpiEl = document.getElementById('kpiVisites');
    if (kpiEl) kpiEl.textContent = totalRestantes;
    
    console.log('📊 KPI Visites:', totalRestantes, 'restantes');
}

function getWeekDates(weekNum) {
    const year = new Date().getFullYear();
    const startOfYear = new Date(year, 0, 1);
    const startOfWeek = new Date(startOfYear);
    startOfWeek.setDate(startOfWeek.getDate() + (weekNum - 1) * 7 - startOfYear.getDay() + 1);
    const endOfWeek = new Date(startOfWeek);
    endOfWeek.setDate(endOfWeek.getDate() + 6);
    
    const options = { day: 'numeric', month: 'long', year: 'numeric' };
    return `${startOfWeek.toLocaleDateString('fr-FR', options)} - ${endOfWeek.toLocaleDateString('fr-FR', options)}`;
}

// ============================================
// MODULE VISITESMODULE - Planning, Historique, Modal STT
// ============================================
// MAIL_HISTORY_KEY défini dans config.js
// MAIL_HISTORY_PLANIFIER_KEY défini dans config.js
// MONTH_NAMES défini dans config.js

const VISITESMODULE = {
    currentSTT: null,
    sttOverdueData: {},
    mailHistory: {},
    mailHistoryPlanifier: {},

    init() {
        console.log('📅 Initialisation VISITESMODULE...');
        this.loadMailHistory();
        this.generateSTTSummary();
        this.generatePlanningTable();
        this.updateHistorique();
    },

    loadMailHistory() {
        try {
            const stored = localStorage.getItem(MAIL_HISTORY_KEY);
            if (stored) {
                this.mailHistory = JSON.parse(stored);
            }
            const storedPlanifier = localStorage.getItem(MAIL_HISTORY_PLANIFIER_KEY);
            if (storedPlanifier) {
                this.mailHistoryPlanifier = JSON.parse(storedPlanifier);
            }
        } catch (e) {
            console.warn('Erreur chargement historique mail:', e);
        }
    },

    saveMailHistory(type = 'retard') {
        try {
            if (type === 'retard') {
                localStorage.setItem(MAIL_HISTORY_KEY, JSON.stringify(this.mailHistory));
            } else {
                localStorage.setItem(MAIL_HISTORY_PLANIFIER_KEY, JSON.stringify(this.mailHistoryPlanifier));
            }
        } catch (e) {
            console.warn('Erreur sauvegarde historique mail:', e);
        }
    },

    generateSTTSummary() {
        const grid = document.getElementById('sttSummaryGrid');
        if (!grid) return;

        // Collecter les données par STT
        this.sttOverdueData = {};
        const currentMonth = new Date().getMonth() + 1;

        // DSF data
        APP.data.dsf.forEach(row => {
            const sttCode = row.sttCode || '';
            const sttName = row.sttConverted || sttCode || 'Inconnu';
            const sector = (row.secteur || 'AUTRES').toUpperCase();
            const sectorKey = ['S1', 'S2', 'S3'].includes(sector) ? sector.toLowerCase() : 'autres';
            const moisStr = row.mois || '';
            
            // Extraire le numéro de mois
            let moisNum = 0;
            const moisMatch = moisStr.match(/(\d+)/);
            if (moisMatch) {
                moisNum = parseInt(moisMatch[1]);
            } else {
                const moisIndex = MONTH_NAMES.findIndex(m => moisStr.toLowerCase().includes(m.toLowerCase()));
                if (moisIndex >= 0) moisNum = moisIndex + 1;
            }

            const key = `${sttName}#${sectorKey}`;
            if (!this.sttOverdueData[key]) {
                // Récupérer email STT depuis contacts.json (prioritaire) ou données Excel
                const sttContact = typeof getSttContact === 'function' ? getSttContact(sttCode) : null;
                const sttEmail = sttContact?.mail || row.sttEmail || '';
                
                this.sttOverdueData[key] = {
                    sttName,
                    sttCode,
                    sector: sectorKey,
                    email: sttEmail,
                    sites: [],
                    sitesAPlanifier: [],
                    totalSites: 0,
                    retardSites: 0,
                    planifierSites: 0
                };
            }

            this.sttOverdueData[key].totalSites++;

            // Site en retard si mois < mois actuel
            if (moisNum > 0 && moisNum < currentMonth) {
                this.sttOverdueData[key].retardSites++;
                this.sttOverdueData[key].sites.push({
                    numClient: row.numClient || '',
                    nomSite: row.nomSite || '',
                    ville: row.ville || '',
                    moisSTT: MONTH_NAMES[moisNum - 1] || moisStr
                });
            }
            // Site à planifier si mois >= mois actuel
            else if (moisNum >= currentMonth) {
                this.sttOverdueData[key].planifierSites++;
                this.sttOverdueData[key].sitesAPlanifier.push({
                    numClient: row.numClient || '',
                    nomSite: row.nomSite || '',
                    ville: row.ville || '',
                    moisSTT: MONTH_NAMES[moisNum - 1] || moisStr
                });
            }
        });

        // Générer les cartes
        let html = '';
        Object.entries(this.sttOverdueData).forEach(([key, data]) => {
            const hasRetard = data.retardSites > 0;
            html += `
                <div class="stt-card ${hasRetard ? 'has-retard' : ''}" data-sector="${data.sector.toUpperCase()}" data-stt="${data.sttName}" onclick="VISITESMODULE.openModalSTT('${key}')">
                    <div class="stt-card-header">
                        <span class="stt-card-name">${data.sttName}</span>
                        <span class="stt-card-sector ${data.sector}">${data.sector.toUpperCase()}</span>
                    </div>
                    <div class="stt-card-stats">
                        <div class="stt-card-stat">
                            <span>📊</span> ${data.totalSites} sites
                        </div>
                        ${hasRetard ? `
                            <div class="stt-card-stat retard">
                                <span>⚠️</span> ${data.retardSites} en retard
                            </div>
                        ` : ''}
                    </div>
                </div>
            `;
        });

        grid.innerHTML = html || '<div class="empty-state-mini"><p>Aucun STT trouvé</p></div>';
    },

    generatePlanningTable() {
        const tbody = document.getElementById('planningTableBody');
        const emptyEl = document.getElementById('planningEmpty');
        if (!tbody) return;

        const currentMonth = new Date().getMonth() + 1;
        const rows = [];

        APP.data.dsf.forEach(row => {
            const moisStr = row.mois || '';
            let moisNum = 0;
            const moisMatch = moisStr.match(/(\d+)/);
            if (moisMatch) {
                moisNum = parseInt(moisMatch[1]);
            } else {
                const moisIndex = MONTH_NAMES.findIndex(m => moisStr.toLowerCase().includes(m.toLowerCase()));
                if (moisIndex >= 0) moisNum = moisIndex + 1;
            }

            const isRetard = moisNum > 0 && moisNum < currentMonth;
            const sector = (row.secteur || 'AUTRES').toUpperCase();

            rows.push({
                sector,
                stt: row.sttConverted || row.sttCode || '',
                numClient: row.numClient || '',
                nomSite: row.nomSite || '',
                ville: row.ville || '',
                mois: MONTH_NAMES[moisNum - 1] || moisStr,
                moisNum,
                isRetard
            });
        });

        // Trier par mois puis secteur
        rows.sort((a, b) => a.moisNum - b.moisNum || a.sector.localeCompare(b.sector));

        let html = '';
        rows.forEach(r => {
            html += `
                <tr data-sector="${r.sector}" data-stt="${r.stt}" data-mois="${r.moisNum}" data-statut="${r.isRetard ? 'RETARD' : 'OK'}">
                    <td><span class="sector-badge ${r.sector.toLowerCase()}">${r.sector}</span></td>
                    <td>${r.stt}</td>
                    <td>${r.numClient}</td>
                    <td>${r.nomSite}</td>
                    <td>${r.ville}</td>
                    <td>${r.mois}</td>
                    <td><span class="status-badge ${r.isRetard ? 'retard' : 'ok'}">${r.isRetard ? '⚠️ Retard' : '✅ OK'}</span></td>
                </tr>
            `;
        });

        tbody.innerHTML = html;
        if (emptyEl) emptyEl.style.display = rows.length ? 'none' : 'block';
        
        // Remplir les filtres dynamiquement
        this.populatePlanningFilters(rows);
    },

    populatePlanningFilters(rows) {
        // Collecter les valeurs uniques
        const sectors = new Set();
        const stts = new Set();
        const moisSet = new Set();

        rows.forEach(r => {
            if (r.sector) sectors.add(r.sector);
            if (r.stt) stts.add(r.stt);
            if (r.moisNum > 0) moisSet.add(r.moisNum);
        });

        // Filtre Secteur
        const sectorSelect = document.getElementById('planningFilterSector');
        if (sectorSelect) {
            const currentVal = sectorSelect.value;
            sectorSelect.innerHTML = '<option value="TOUS">Tous les secteurs</option>';
            [...sectors].sort().forEach(s => {
                sectorSelect.innerHTML += `<option value="${s}">${s}</option>`;
            });
            sectorSelect.value = currentVal;
        }

        // Filtre STT (avec conversion - garde le nom converti)
        const sttSelect = document.getElementById('planningFilterSTT');
        if (sttSelect) {
            const currentVal = sttSelect.value;
            sttSelect.innerHTML = '<option value="TOUS">Tous les STT</option>';
            [...stts].sort().forEach(s => {
                sttSelect.innerHTML += `<option value="${s}">${s}</option>`;
            });
            sttSelect.value = currentVal;
        }

        // Filtre Mois
        const moisSelect = document.getElementById('planningFilterMois');
        if (moisSelect) {
            const currentVal = moisSelect.value;
            moisSelect.innerHTML = '<option value="TOUS">Tous les mois</option>';
            [...moisSet].sort((a, b) => a - b).forEach(m => {
                moisSelect.innerHTML += `<option value="${m}">${MONTH_NAMES[m - 1]}</option>`;
            });
            moisSelect.value = currentVal;
        }
    },

    filterPlanning() {
        const sectorFilter = document.getElementById('planningFilterSector')?.value || 'TOUS';
        const sttFilter = document.getElementById('planningFilterSTT')?.value || 'TOUS';
        const moisFilter = document.getElementById('planningFilterMois')?.value || 'TOUS';
        const statutFilter = document.getElementById('planningFilterStatut')?.value || 'TOUS';

        // 1. Filtrer les lignes du tableau Planning
        const rows = document.querySelectorAll('#planningTableBody tr');
        const visibleRows = [];
        
        rows.forEach(row => {
            const sector = row.dataset.sector || '';
            const stt = row.dataset.stt || '';
            const moisNum = row.dataset.mois || '';
            const statut = row.dataset.statut || '';

            let show = true;
            if (sectorFilter !== 'TOUS' && sector !== sectorFilter) show = false;
            if (sttFilter !== 'TOUS' && stt !== sttFilter) show = false;
            if (moisFilter !== 'TOUS' && moisNum !== moisFilter) show = false;
            if (statutFilter !== 'TOUS' && statut !== statutFilter) show = false;

            row.style.display = show ? '' : 'none';
            if (show) visibleRows.push({ sector, stt, moisNum, statut });
        });

        // 2. Filtrer les cartes STT du récapitulatif
        const sttCards = document.querySelectorAll('#sttSummaryGrid .stt-card');
        sttCards.forEach(card => {
            const cardSector = card.dataset.sector || '';
            const cardStt = card.dataset.stt || '';

            let show = true;
            if (sectorFilter !== 'TOUS' && cardSector !== sectorFilter) show = false;
            if (sttFilter !== 'TOUS' && cardStt !== sttFilter) show = false;

            card.style.display = show ? '' : 'none';
        });

        // 3. Mettre à jour les filtres dynamiquement (cascade)
        this.updateFiltersOptions(sectorFilter, sttFilter, moisFilter, statutFilter, visibleRows);
    },

    updateFiltersOptions(currentSector, currentStt, currentMois, currentStatut, visibleRows) {
        // Collecter les valeurs disponibles selon les filtres actuels
        const allRows = document.querySelectorAll('#planningTableBody tr');
        
        // Pour chaque filtre, déterminer les options valides
        const sectorsAvailable = new Set();
        const sttsAvailable = new Set();
        const moisAvailable = new Set();
        const statutsAvailable = new Set();

        allRows.forEach(row => {
            const sector = row.dataset.sector || '';
            const stt = row.dataset.stt || '';
            const moisNum = row.dataset.mois || '';
            const statut = row.dataset.statut || '';

            // Secteurs disponibles (sans filtre secteur)
            let matchOthers = true;
            if (currentStt !== 'TOUS' && stt !== currentStt) matchOthers = false;
            if (currentMois !== 'TOUS' && moisNum !== currentMois) matchOthers = false;
            if (currentStatut !== 'TOUS' && statut !== currentStatut) matchOthers = false;
            if (matchOthers && sector) sectorsAvailable.add(sector);

            // STT disponibles (sans filtre STT)
            matchOthers = true;
            if (currentSector !== 'TOUS' && sector !== currentSector) matchOthers = false;
            if (currentMois !== 'TOUS' && moisNum !== currentMois) matchOthers = false;
            if (currentStatut !== 'TOUS' && statut !== currentStatut) matchOthers = false;
            if (matchOthers && stt) sttsAvailable.add(stt);

            // Mois disponibles (sans filtre mois)
            matchOthers = true;
            if (currentSector !== 'TOUS' && sector !== currentSector) matchOthers = false;
            if (currentStt !== 'TOUS' && stt !== currentStt) matchOthers = false;
            if (currentStatut !== 'TOUS' && statut !== currentStatut) matchOthers = false;
            if (matchOthers && moisNum) moisAvailable.add(moisNum);

            // Statuts disponibles
            matchOthers = true;
            if (currentSector !== 'TOUS' && sector !== currentSector) matchOthers = false;
            if (currentStt !== 'TOUS' && stt !== currentStt) matchOthers = false;
            if (currentMois !== 'TOUS' && moisNum !== currentMois) matchOthers = false;
            if (matchOthers && statut) statutsAvailable.add(statut);
        });

        // Mettre à jour filtre Secteur
        const sectorSelect = document.getElementById('planningFilterSector');
        if (sectorSelect) {
            const options = sectorSelect.querySelectorAll('option');
            options.forEach(opt => {
                if (opt.value !== 'TOUS') {
                    opt.disabled = !sectorsAvailable.has(opt.value);
                    opt.style.color = opt.disabled ? '#ccc' : '';
                }
            });
        }

        // Mettre à jour filtre STT
        const sttSelect = document.getElementById('planningFilterSTT');
        if (sttSelect) {
            const options = sttSelect.querySelectorAll('option');
            options.forEach(opt => {
                if (opt.value !== 'TOUS') {
                    opt.disabled = !sttsAvailable.has(opt.value);
                    opt.style.color = opt.disabled ? '#ccc' : '';
                }
            });
        }

        // Mettre à jour filtre Mois
        const moisSelect = document.getElementById('planningFilterMois');
        if (moisSelect) {
            const options = moisSelect.querySelectorAll('option');
            options.forEach(opt => {
                if (opt.value !== 'TOUS') {
                    opt.disabled = !moisAvailable.has(opt.value);
                    opt.style.color = opt.disabled ? '#ccc' : '';
                }
            });
        }

        // Mettre à jour filtre Statut
        const statutSelect = document.getElementById('planningFilterStatut');
        if (statutSelect) {
            const options = statutSelect.querySelectorAll('option');
            options.forEach(opt => {
                if (opt.value !== 'TOUS') {
                    opt.disabled = !statutsAvailable.has(opt.value);
                    opt.style.color = opt.disabled ? '#ccc' : '';
                }
            });
        }
    },

    updateHistorique() {
        // Utilise l'historique SSI existant
        displaySSIHistory();
    },

    openModalSTT(key) {
        const data = this.sttOverdueData[key];
        if (!data) return;

        this.currentSTT = { key, ...data };

        document.getElementById('modalSTTTitle').textContent = `📋 Fiche STT - ${data.sttName}`;
        document.getElementById('modalSTTName').textContent = data.sttName;
        document.getElementById('modalSTTSector').textContent = data.sector.toUpperCase();
        document.getElementById('modalSTTEmail').textContent = data.email || 'Email non trouvé';
        document.getElementById('modalSTTRetardCount').textContent = data.retardSites || 0;
        document.getElementById('modalSTTPlanifierCount').textContent = data.planifierSites || 0;

        // Historique envois RETARD
        const mailDatesRetard = this.getMailDates(key, 'retard');
        document.getElementById('modalSTTLastSentRetard').textContent = mailDatesRetard.last;
        document.getElementById('modalSTTSecondLastSentRetard').textContent = mailDatesRetard.secondLast;

        // Historique envois PLANIFIER
        const mailDatesPlanifier = this.getMailDates(key, 'planifier');
        document.getElementById('modalSTTLastSentPlanifier').textContent = mailDatesPlanifier.last;
        document.getElementById('modalSTTSecondLastSentPlanifier').textContent = mailDatesPlanifier.secondLast;

        // Tableau sites en retard
        const tbodyRetard = document.getElementById('modalSTTSitesRetardBody');
        let htmlRetard = '';
        if (data.sites && data.sites.length > 0) {
            data.sites.forEach(site => {
                htmlRetard += `
                    <tr>
                        <td>${site.numClient}</td>
                        <td>${site.nomSite}</td>
                        <td>${site.ville}</td>
                        <td>${site.moisSTT}</td>
                    </tr>
                `;
            });
        } else {
            htmlRetard = '<tr><td colspan="4" style="text-align:center; color: var(--success);">✅ Aucun site en retard</td></tr>';
        }
        tbodyRetard.innerHTML = htmlRetard;

        // Tableau sites à planifier
        const tbodyPlanifier = document.getElementById('modalSTTSitesPlanifierBody');
        let htmlPlanifier = '';
        if (data.sitesAPlanifier && data.sitesAPlanifier.length > 0) {
            data.sitesAPlanifier.forEach(site => {
                htmlPlanifier += `
                    <tr>
                        <td>${site.numClient}</td>
                        <td>${site.nomSite}</td>
                        <td>${site.ville}</td>
                        <td>${site.moisSTT}</td>
                    </tr>
                `;
            });
        } else {
            htmlPlanifier = '<tr><td colspan="4" style="text-align:center; color: var(--success);">✅ Aucun site à planifier</td></tr>';
        }
        tbodyPlanifier.innerHTML = htmlPlanifier;

        // Reset onglet actif
        this.switchModalTab('retard');

        document.getElementById('modalSTTStatus').textContent = '';
        document.getElementById('modalSTT').style.display = 'flex';
    },

    switchModalTab(tab) {
        // Onglets
        document.querySelectorAll('.modal-stt-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.modal-stt-tab.${tab}`).classList.add('active');
        
        // Contenus
        document.querySelectorAll('.modal-stt-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`modalSTTContent${tab === 'retard' ? 'Retard' : 'Planifier'}`).classList.add('active');
    },

    closeModalSTT() {
        document.getElementById('modalSTT').style.display = 'none';
        this.currentSTT = null;
    },

    getMailDates(key, type = 'retard') {
        const history = type === 'retard' ? this.mailHistory : this.mailHistoryPlanifier;
        const dates = history[key] || [];
        return {
            last: dates[0] ? new Date(dates[0]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Non enregistré',
            secondLast: dates[1] ? new Date(dates[1]).toLocaleDateString('fr-FR', { day: 'numeric', month: 'long', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Non enregistré'
        };
    },

    generateMailSTT(type = 'retard') {
        if (!this.currentSTT) return;

        const { sttName, sector, email, sites, sitesAPlanifier } = this.currentSTT;
        const statusEl = document.getElementById('modalSTTStatus');
        
        // Choisir les sites selon le type
        const sitesToSend = type === 'retard' ? sites : sitesAPlanifier;

        if (!sitesToSend || sitesToSend.length === 0) {
            statusEl.textContent = type === 'retard' 
                ? '❌ Aucun site en retard à envoyer.' 
                : '❌ Aucun site à planifier à envoyer.';
            statusEl.className = 'mail-status error';
            return;
        }

        // Sujet différent selon le type
        const sectorName = sector.toUpperCase();
        let subject, bodyIntro;
        
        if (type === 'retard') {
            subject = `⚠️ ALERTE : ${sitesToSend.length} Visite(s) DSF en RETARD pour ${sttName} (${sectorName})`;
            bodyIntro = `La liste des ${sitesToSend.length} sites DSF pour le STT ${sttName} (${sectorName}) en retard de planification :`;
        } else {
            subject = `📅 RAPPEL : ${sitesToSend.length} Visite(s) DSF À PLANIFIER pour ${sttName} (${sectorName})`;
            bodyIntro = `La liste des ${sitesToSend.length} sites DSF pour le STT ${sttName} (${sectorName}) à planifier prochainement :`;
        }

        // Corps du mail - Format identique à TABLEAU_V2.html
        let body = `Bonjour,\n\n`;
        body += bodyIntro + `\n\n`;

        // Largeurs colonnes
        const colWidths = { numClient: 15, nomSite: 50, ville: 20, moisSTT: 15 };
        const headerWidths = {
            numClient: Math.max('NUM. CLIENT'.length, colWidths.numClient),
            nomSite: Math.max('NOM DU SITE'.length, colWidths.nomSite),
            ville: Math.max('VILLE'.length, colWidths.ville),
            moisSTT: Math.max('MOIS STT'.length, colWidths.moisSTT)
        };

        const sep = '    ';

        // En-tête
        const header = 
            'NUM. CLIENT'.padEnd(headerWidths.numClient) + sep +
            'NOM DU SITE'.padEnd(headerWidths.nomSite) + sep +
            'VILLE'.padEnd(headerWidths.ville) + sep +
            'MOIS STT'.padEnd(headerWidths.moisSTT);

        const separatorLine = '═'.repeat(header.length);

        body += header + '\n';
        body += separatorLine + '\n';

        // Lignes de données
        sitesToSend.forEach(site => {
            body += 
                String(site.numClient).padEnd(headerWidths.numClient) + sep +
                String(site.nomSite).padEnd(headerWidths.nomSite) + sep +
                String(site.ville).padEnd(headerWidths.ville) + sep +
                String(site.moisSTT).padEnd(headerWidths.moisSTT) + '\n';
        });

        // Conclusion différente selon le type
        if (type === 'retard') {
            body += `\nMerci de planifier ces visites en priorité et de nous remonter les informations.\n\nCordialement,\nVotre Tableau de Bord de Suivi`;
        } else {
            body += `\nMerci de nous confirmer les dates de planification prévues pour ces visites.\n\nCordialement,\nVotre Tableau de Bord de Suivi`;
        }

        // Lien mailto
        const mailtoLink = `mailto:${email || ''}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;

        window.open(mailtoLink, '_self');

        statusEl.innerHTML = '✉️ Le client de messagerie a été ouvert avec le mail pré-rempli.';
        statusEl.className = 'mail-status success';
    },

    archiveMailDate(type = 'retard') {
        if (!this.currentSTT) return;

        const key = this.currentSTT.key;
        const now = new Date().toISOString();
        
        // Choisir le bon historique selon le type
        const history = type === 'retard' ? this.mailHistory : this.mailHistoryPlanifier;

        if (!history[key]) {
            history[key] = [];
        }

        // Ajouter au début et garder max 2
        history[key].unshift(now);
        if (history[key].length > 2) {
            history[key] = history[key].slice(0, 2);
        }

        this.saveMailHistory(type);

        // Mettre à jour l'affichage selon le type
        const mailDates = this.getMailDates(key, type);
        if (type === 'retard') {
            document.getElementById('modalSTTLastSentRetard').textContent = mailDates.last;
            document.getElementById('modalSTTSecondLastSentRetard').textContent = mailDates.secondLast;
        } else {
            document.getElementById('modalSTTLastSentPlanifier').textContent = mailDates.last;
            document.getElementById('modalSTTSecondLastSentPlanifier').textContent = mailDates.secondLast;
        }

        const statusEl = document.getElementById('modalSTTStatus');
        const typeLabel = type === 'retard' ? 'RETARD' : 'RAPPEL';
        statusEl.innerHTML = `💾 Date d'envoi ${typeLabel} archivée avec succès !`;
        statusEl.className = 'mail-status success';
    },

    // Données historique chargées
    historiqueData: [],

    chargerHistorique(event) {
        const file = event.target.files[0];
        if (!file) return;
        
        const reader = new FileReader();
        reader.onload = (e) => {
            try {
                const data = new Uint8Array(e.target.result);
                const workbook = XLSX.read(data, {type: 'array'});
                
                // Chercher la feuille HISTORIQUE
                const sheetName = workbook.SheetNames.find(n => n.toUpperCase().includes('HISTORIQUE')) || workbook.SheetNames[0];
                const sheet = workbook.Sheets[sheetName];
                const jsonData = XLSX.utils.sheet_to_json(sheet);
                
                this.historiqueData = jsonData;
                alert('✅ Historique chargé : ' + jsonData.length + ' lignes');
                console.log('📂 Historique chargé:', jsonData);
            } catch (err) {
                console.error('❌ Erreur chargement historique:', err);
                alert('❌ Erreur : ' + err.message);
            }
        };
        reader.readAsArrayBuffer(file);
        event.target.value = '';
    },

    ajouterSemaineHistorique() {
        // Calculer semaine courante
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        const semaine = Math.ceil(diff / oneWeek);
        const annee = now.getFullYear();
        
        // Calculer les stats SSI par secteur
        const ssiStats = { S1: {v1: 0, v2: 0}, S2: {v1: 0, v2: 0}, S3: {v1: 0, v2: 0}, AUTRES: {v1: 0, v2: 0} };
        if (APP.data.ssi) {
            APP.data.ssi.forEach(r => {
                const key = ['S1','S2','S3'].includes(r.secteur) ? r.secteur : 'AUTRES';
                if (r.v1Restante) ssiStats[key].v1++;
                if (r.v2Restante) ssiStats[key].v2++;
            });
        }
        
        // Calculer les stats DSF par secteur
        const dsfStats = { S1: 0, S2: 0, S3: 0, AUTRES: 0 };
        if (APP.data.dsf) {
            APP.data.dsf.forEach(r => {
                const key = ['S1','S2','S3'].includes(r.secteur) ? r.secteur : 'AUTRES';
                dsfStats[key] += r.visitesRestantes || 0;
            });
        }
        
        // Vérifier si cette semaine existe déjà
        const existe = this.historiqueData.find(h => h.Semaine === semaine && h.Annee === annee);
        if (existe) {
            if (!confirm('⚠️ Semaine ' + semaine + '/' + annee + ' existe déjà. Remplacer ?')) {
                return;
            }
            // Supprimer les anciennes entrées
            this.historiqueData = this.historiqueData.filter(h => !(h.Semaine === semaine && h.Annee === annee));
        }
        
        // Ajouter les nouvelles lignes
        ['S1', 'S2', 'S3', 'AUTRES'].forEach(secteur => {
            this.historiqueData.push({
                Semaine: semaine,
                Annee: annee,
                Secteur: secteur,
                SSI_V1_Restantes: ssiStats[secteur].v1,
                SSI_V2_Restantes: ssiStats[secteur].v2,
                DSF_Restantes: dsfStats[secteur]
            });
        });
        
        // Trier par année puis semaine
        this.historiqueData.sort((a, b) => {
            if (a.Annee !== b.Annee) return a.Annee - b.Annee;
            if (a.Semaine !== b.Semaine) return a.Semaine - b.Semaine;
            return a.Secteur.localeCompare(b.Secteur);
        });
        
        alert('✅ Semaine ' + semaine + '/' + annee + ' ajoutée à l\'historique (' + this.historiqueData.length + ' lignes)');
    },

    exportHistorique() {
        if (this.historiqueData.length === 0) {
            alert('⚠️ Aucune donnée dans l\'historique.\n\nUtilisez "Charger historique" pour charger un fichier existant\nou "Ajouter semaine" pour ajouter la semaine courante.');
            return;
        }
        
        try {
            const wb = XLSX.utils.book_new();
            const ws = XLSX.utils.json_to_sheet(this.historiqueData);
            XLSX.utils.book_append_sheet(wb, ws, 'HISTORIQUE');
            
            const dateExport = new Date().toLocaleDateString('fr-FR').replace(/\//g, '-');
            const fileName = 'GESTION_PRO_Historique_' + dateExport + '.xlsx';
            XLSX.writeFile(wb, fileName);
            alert('✅ Export réussi : ' + fileName + '\n\n' + this.historiqueData.length + ' lignes exportées');
        } catch (err) {
            console.error('❌ Erreur export:', err);
            alert('❌ Erreur : ' + err.message);
        }
    }
};

// Traitement données SSI (utilise les données pré-traitées)
function processSSIData() {
    const counts = { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 };
    const v1Restantes = { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 };
    const v2Restantes = { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 };
    
    APP.data.ssi.forEach(row => {
        const sectorKey = row.secteur ? row.secteur.toLowerCase() : 'autres';
        const key = sectorKey === 's1' || sectorKey === 's2' || sectorKey === 's3' ? sectorKey : 'autres';
        
        counts[key]++;
        if (row.v1Restante) v1Restantes[key]++;
        if (row.v2Restante) v2Restantes[key]++;
    });
    
    counts.total = counts.s1 + counts.s2 + counts.s3 + counts.autres;
    v1Restantes.total = v1Restantes.s1 + v1Restantes.s2 + v1Restantes.s3 + v1Restantes.autres;
    v2Restantes.total = v2Restantes.s1 + v2Restantes.s2 + v2Restantes.s3 + v2Restantes.autres;
    
    VISITES.ssi.counts = counts;
    VISITES.ssi.v1Restantes = v1Restantes;
    VISITES.ssi.v2Restantes = v2Restantes;
    
    console.log('📊 SSI traité:', counts.total, 'sites, V1 restantes:', v1Restantes.total, ', V2 restantes:', v2Restantes.total);
    
    // Archiver la semaine courante
    archiveSSICurrentWeek();
}

function displaySSIStats() {
    const counts = VISITES.ssi.counts;
    const v1 = VISITES.ssi.v1Restantes;
    const v2 = VISITES.ssi.v2Restantes;
    
    console.log('🎨 displaySSIStats - Données:', { counts, v1, v2 });
    
    ['s1', 's2', 's3', 'autres'].forEach(sector => {
        // Construire l'ID correctement
        let idSuffix;
        if (sector === 's1') idSuffix = 'S1';
        else if (sector === 's2') idSuffix = 'S2';
        else if (sector === 's3') idSuffix = 'S3';
        else idSuffix = 'Autres';
        
        // Sites
        const sitesId = `ssiStat${idSuffix}Sites`;
        const sitesEl = document.getElementById(sitesId);
        console.log(`   ${sitesId}: element=${sitesEl ? 'TROUVÉ' : 'NULL'}, value=${counts[sector]}`);
        if (sitesEl) sitesEl.textContent = counts[sector];
        
        // V1
        const v1Done = counts[sector] - v1[sector];
        const v1Pct = counts[sector] > 0 ? Math.round((v1Done / counts[sector]) * 100) : 0;
        
        const v1Id = `ssiStat${idSuffix}V1`;
        const v1El = document.getElementById(v1Id);
        if (v1El) v1El.textContent = v1[sector];
        
        const v1PctId = `ssiStat${idSuffix}V1Pct`;
        const v1PctEl = document.getElementById(v1PctId);
        if (v1PctEl) {
            v1PctEl.textContent = v1Pct + '%';
            v1PctEl.className = 'visit-percent ' + getPercentClass(v1Pct);
        }
        
        const v1BarId = `ssiStat${idSuffix}V1Bar`;
        const v1BarEl = document.getElementById(v1BarId);
        if (v1BarEl) v1BarEl.style.width = v1Pct + '%';
        
        // V2
        const v2Done = counts[sector] - v2[sector];
        const v2Pct = counts[sector] > 0 ? Math.round((v2Done / counts[sector]) * 100) : 0;
        
        const v2Id = `ssiStat${idSuffix}V2`;
        const v2El = document.getElementById(v2Id);
        if (v2El) v2El.textContent = v2[sector];
        
        const v2PctId = `ssiStat${idSuffix}V2Pct`;
        const v2PctEl = document.getElementById(v2PctId);
        if (v2PctEl) {
            v2PctEl.textContent = v2Pct + '%';
            v2PctEl.className = 'visit-percent ' + getPercentClass(v2Pct);
        }
        
        const v2BarId = `ssiStat${idSuffix}V2Bar`;
        const v2BarEl = document.getElementById(v2BarId);
        if (v2BarEl) v2BarEl.style.width = v2Pct + '%';
        
        // Objectif par secteur dans l'onglet Visites SSI
        const weekNum = APP.currentWeek?.num || 1;
        const isV1 = weekNum <= 26;
        const weeksRemaining = isV1 ? Math.max(1, 26 - weekNum + 1) : Math.max(1, 52 - weekNum + 1);
        const restantes = isV1 ? v1[sector] : v2[sector];
        const objectif = Math.ceil(restantes / weeksRemaining);
        const visitType = isV1 ? 'V1' : 'V2';
        
        const objectifId = `ssiStat${idSuffix}Objectif`;
        const objectifEl = document.getElementById(objectifId);
        if (objectifEl) {
            objectifEl.innerHTML = `<strong>Obj ${visitType}: ~${objectif}/sem</strong> (${restantes} rest. / ${weeksRemaining} sem)`;
        }
    });
    
    // Mettre à jour le dashboard aussi
    updateDashboardSSI();
}

function updateDashboardSSI() {
    const counts = VISITES.ssi.counts;
    const v1 = VISITES.ssi.v1Restantes;
    const v2 = VISITES.ssi.v2Restantes;
    
    console.log('🎨 updateDashboardSSI - Données:', { counts, v1, v2 });
    
    // Calculer semaines restantes
    const weekNum = APP.currentWeek.num;
    const isV1 = weekNum <= 26;
    const weeksRemaining = isV1 ? Math.max(1, 26 - weekNum + 1) : Math.max(1, 52 - weekNum + 1);
    
    ['s1', 's2', 's3', 'autres'].forEach(sector => {
        // Construire l'ID correctement : ssiS1Sites, ssiS2Sites, ssiS3Sites, ssiAutresSites
        let idSuffix;
        if (sector === 's1') idSuffix = 'S1';
        else if (sector === 's2') idSuffix = 'S2';
        else if (sector === 's3') idSuffix = 'S3';
        else idSuffix = 'Autres';
        
        // Dashboard - Sites (IDs: ssiS1Sites, ssiS2Sites, ssiS3Sites, ssiAutresSites)
        const sitesId = `ssi${idSuffix}Sites`;
        const sitesEl = document.getElementById(sitesId);
        console.log(`   Dashboard ${sitesId}: element=${sitesEl ? 'TROUVÉ' : 'NULL'}, value=${counts[sector]}`);
        if (sitesEl) sitesEl.textContent = counts[sector];
        
        // Dashboard - V1
        const v1Done = counts[sector] - v1[sector];
        const v1Pct = counts[sector] > 0 ? Math.round((v1Done / counts[sector]) * 100) : 0;
        
        const v1El = document.getElementById(`ssi${idSuffix}V1`);
        if (v1El) v1El.textContent = v1[sector];
        
        const v1PctEl = document.getElementById(`ssi${idSuffix}V1Pct`);
        if (v1PctEl) {
            v1PctEl.textContent = v1Pct + '%';
            v1PctEl.className = 'stat-percent ' + getPercentClass(v1Pct);
        }
        
        // Dashboard - V2
        const v2Done = counts[sector] - v2[sector];
        const v2Pct = counts[sector] > 0 ? Math.round((v2Done / counts[sector]) * 100) : 0;
        
        const v2El = document.getElementById(`ssi${idSuffix}V2`);
        if (v2El) v2El.textContent = v2[sector];
        
        const v2PctEl = document.getElementById(`ssi${idSuffix}V2Pct`);
        if (v2PctEl) {
            v2PctEl.textContent = v2Pct + '%';
            v2PctEl.className = 'stat-percent ' + getPercentClass(v2Pct);
        }
        
        // Dashboard - Progress
        const progressEl = document.getElementById(`ssi${idSuffix}Progress`);
        if (progressEl) {
            const avgPct = Math.round((v1Pct + v2Pct) / 2);
            progressEl.style.width = avgPct + '%';
        }
        
        // Dashboard - Objectif par secteur
        const restantes = isV1 ? v1[sector] : v2[sector];
        const objectif = Math.ceil(restantes / weeksRemaining);
        const visitType = isV1 ? 'V1' : 'V2';
        const objectifEl = document.getElementById(`ssi${idSuffix}Objectif`);
        if (objectifEl) {
            objectifEl.innerHTML = `<strong>${visitType}: ~${objectif}/sem</strong><br><small>${restantes} rest. / ${weeksRemaining} sem</small>`;
        }
    });
    
    // KPI Visites - inclure aussi DSF
    let totalRestantes;
    if (weekNum <= 26) {
        totalRestantes = v1.total + (VISITES.dsf.restantes?.total || 0);
    } else {
        totalRestantes = v2.total + (VISITES.dsf.restantes?.total || 0);
    }
    const kpiEl = document.getElementById('kpiVisites');
    if (kpiEl) kpiEl.textContent = totalRestantes;
}

// Historique SSI
function loadSSIHistory() {
    try {
        const stored = localStorage.getItem(SSI_HISTORY_KEY);
        if (stored) {
            VISITES.ssi.history = JSON.parse(stored);
        }
    } catch (e) {
        console.warn('Erreur chargement historique SSI:', e);
    }
}

function saveSSIHistory() {
    try {
        localStorage.setItem(SSI_HISTORY_KEY, JSON.stringify(VISITES.ssi.history));
    } catch (e) {
        console.warn('Erreur sauvegarde historique SSI:', e);
    }
}

function archiveSSICurrentWeek() {
    const weekNum = APP.currentWeek.num;
    const v1 = VISITES.ssi.v1Restantes;
    const v2 = VISITES.ssi.v2Restantes;
    const counts = VISITES.ssi.counts;
    
    ['s1', 's2', 's3', 'autres'].forEach(sector => {
        if (!VISITES.ssi.history[sector]) {
            VISITES.ssi.history[sector] = [];
        }
        
        const existingIndex = VISITES.ssi.history[sector].findIndex(e => e.week === weekNum);
        
        let entry;
        if (weekNum <= 26) {
            const prevEntry = VISITES.ssi.history[sector].filter(e => e.type === 'V1' && e.week < weekNum).pop();
            const prevRestantes = prevEntry ? prevEntry.restantes : v1[sector];
            const realisees = prevRestantes - v1[sector];
            const weeksLeft = Math.max(1, 26 - weekNum + 1);
            const objectif = Math.ceil(v1[sector] / weeksLeft);
            
            entry = {
                week: weekNum,
                type: 'V1',
                restantes: v1[sector],
                realisees: realisees,
                objectif: objectif
            };
        } else {
            const prevEntry = VISITES.ssi.history[sector].filter(e => e.type === 'V2' && e.week < weekNum).pop();
            const prevRestantes = prevEntry ? prevEntry.restantes : v2[sector];
            const realisees = prevRestantes - v2[sector];
            const weeksLeft = Math.max(1, 52 - weekNum + 1);
            const objectif = Math.ceil(v2[sector] / weeksLeft);
            
            entry = {
                week: weekNum,
                type: 'V2',
                restantes: v2[sector],
                realisees: realisees,
                objectif: objectif
            };
        }
        
        if (existingIndex !== -1) {
            VISITES.ssi.history[sector][existingIndex] = entry;
        } else {
            VISITES.ssi.history[sector].push(entry);
        }
        
        VISITES.ssi.history[sector].sort((a, b) => a.week - b.week);
    });
    
    saveSSIHistory();
}

function archiveSSIWeek() {
    archiveSSICurrentWeek();
    displaySSIHistory();
    alert('✅ Semaine ' + APP.currentWeek.num + ' archivée avec succès !');
}

function displaySSIHistory() {
    const weekNum = APP.currentWeek.num;
    
    ['s1', 's2', 's3', 'autres'].forEach(sector => {
        // Construire l'ID correctement : ssiHistoryS1, ssiHistoryS2, ssiHistoryS3, ssiHistoryAutres
        let idSuffix;
        if (sector === 's1') idSuffix = 'S1';
        else if (sector === 's2') idSuffix = 'S2';
        else if (sector === 's3') idSuffix = 'S3';
        else idSuffix = 'Autres';
        
        const tbody = document.getElementById(`ssiHistory${idSuffix}`);
        if (!tbody) return;
        
        tbody.innerHTML = '';
        
        const history = VISITES.ssi.history[sector] || [];
        
        if (history.length === 0) {
            tbody.innerHTML = '<tr><td colspan="5" style="text-align: center; color: var(--text-muted); padding: 30px;">Aucune donnée archivée</td></tr>';
            return;
        }
        
        history.forEach(entry => {
            const row = document.createElement('tr');
            const isCurrentWeek = entry.week === weekNum;
            if (isCurrentWeek) row.className = 'current-week';
            
            const realiseClass = entry.realisees > 0 ? 'cell-realise positive' : 'cell-realise negative';
            const realiseText = entry.realisees >= 0 ? `+${entry.realisees}` : entry.realisees;
            
            row.innerHTML = `
                <td>${isCurrentWeek ? '➤ ' : ''}Semaine ${entry.week}</td>
                <td><span class="cell-type ${entry.type.toLowerCase()}">${entry.type}</span></td>
                <td style="font-weight: 700; font-family: 'JetBrains Mono', monospace;">${entry.restantes}</td>
                <td><span class="${realiseClass}">${realiseText}</span></td>
                <td class="cell-objectif">${entry.objectif}/sem</td>
            `;
            
            tbody.appendChild(row);
        });
    });
}

// Traitement données DSF (utilise les données pré-traitées)
function processDSFData() {
    const counts = { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 };
    const restantes = { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 };
    const totales = { s1: 0, s2: 0, s3: 0, autres: 0, total: 0 };
    
    VISITES.dsf.rawData = [];
    
    APP.data.dsf.forEach(row => {
        const sectorKey = row.secteur ? row.secteur.toLowerCase() : 'autres';
        const key = sectorKey === 's1' || sectorKey === 's2' || sectorKey === 's3' ? sectorKey : 'autres';
        
        counts[key]++;
        restantes[key] += row.visitesRestantes || 0;
        totales[key] += row.visitesTotales || 0;
        
        VISITES.dsf.rawData.push({
            sector: key,
            stt: row.sttConverted || '',
            sttCode: row.sttCode || '',
            sttEmail: row.sttEmail || '',
            mois: row.mois || '',
            restantes: row.visitesRestantes || 0,
            totales: row.visitesTotales || 0,
            numClient: row.numClient || '',
            nomSite: row.nomSite || '',
            ville: row.ville || ''
        });
    });
    
    counts.total = counts.s1 + counts.s2 + counts.s3 + counts.autres;
    restantes.total = restantes.s1 + restantes.s2 + restantes.s3 + restantes.autres;
    totales.total = totales.s1 + totales.s2 + totales.s3 + totales.autres;
    
    VISITES.dsf.counts = counts;
    VISITES.dsf.restantes = restantes;
    VISITES.dsf.totales = totales;
    
    console.log('🔥 DSF traité:', counts.total, 'sites, Restantes:', restantes.total);
}

function displayDSFStats() {
    const counts = VISITES.dsf.counts;
    const restantes = VISITES.dsf.restantes;
    const totales = VISITES.dsf.totales;
    
    console.log('🎨 displayDSFStats - Données:', { counts, restantes, totales });
    
    ['s1', 's2', 's3', 'autres'].forEach(sector => {
        // Construire l'ID correctement : dsfStatS1Sites, dsfStatS2Sites, etc.
        let idSuffix;
        if (sector === 's1') idSuffix = 'S1';
        else if (sector === 's2') idSuffix = 'S2';
        else if (sector === 's3') idSuffix = 'S3';
        else idSuffix = 'Autres';
        
        // Sites
        const sitesId = `dsfStat${idSuffix}Sites`;
        const sitesEl = document.getElementById(sitesId);
        console.log(`   DSF ${sitesId}: element=${sitesEl ? 'TROUVÉ' : 'NULL'}, value=${counts[sector]}`);
        if (sitesEl) sitesEl.textContent = counts[sector];
        
        // Restantes
        const restEl = document.getElementById(`dsfStat${idSuffix}Rest`);
        if (restEl) restEl.textContent = restantes[sector];
        
        // Pourcentage
        const done = totales[sector] - restantes[sector];
        const pct = totales[sector] > 0 ? Math.round((done / totales[sector]) * 100) : 0;
        
        const pctEl = document.getElementById(`dsfStat${idSuffix}Pct`);
        if (pctEl) pctEl.textContent = pct + '%';
        
        const barEl = document.getElementById(`dsfStat${idSuffix}Bar`);
        if (barEl) barEl.style.width = pct + '%';
        
        // Cercle de progression
        const circumference = 100.53;
        const offset = circumference - (pct / 100) * circumference;
        const circle = document.getElementById(`dsfCircle${idSuffix}`);
        if (circle) circle.style.strokeDashoffset = offset;
    });
    
    // Mettre à jour le dashboard
    updateDashboardDSF();
}

function updateDashboardDSF() {
    const counts = VISITES.dsf.counts;
    const restantes = VISITES.dsf.restantes;
    const totales = VISITES.dsf.totales;
    
    console.log('🎨 updateDashboardDSF - Données:', { counts, restantes, totales });
    
    ['s1', 's2', 's3', 'autres'].forEach(sector => {
        // Construire l'ID correctement : dsfS1Sites, dsfS2Sites, etc.
        let idSuffix;
        if (sector === 's1') idSuffix = 'S1';
        else if (sector === 's2') idSuffix = 'S2';
        else if (sector === 's3') idSuffix = 'S3';
        else idSuffix = 'Autres';
        
        const sitesId = `dsf${idSuffix}Sites`;
        const sitesEl = document.getElementById(sitesId);
        console.log(`   Dashboard ${sitesId}: element=${sitesEl ? 'TROUVÉ' : 'NULL'}, value=${counts[sector]}`);
        if (sitesEl) sitesEl.textContent = counts[sector];
        
        const restEl = document.getElementById(`dsf${idSuffix}Rest`);
        if (restEl) restEl.textContent = restantes[sector];
        
        const done = totales[sector] - restantes[sector];
        const pct = totales[sector] > 0 ? Math.round((done / totales[sector]) * 100) : 0;
        
        const pctEl = document.getElementById(`dsf${idSuffix}Pct`);
        if (pctEl) {
            pctEl.textContent = pct + '%';
            pctEl.className = 'stat-percent ' + getPercentClass(pct);
        }
        
        const progressEl = document.getElementById(`dsf${idSuffix}Progress`);
        if (progressEl) progressEl.style.width = pct + '%';
    });
}

function generateDSFPlanning() {
    const container = document.getElementById('dsfPlanningContainer');
    const emptyState = document.getElementById('dsfPlanningEmpty');
    
    if (VISITES.dsf.rawData.length === 0) {
        emptyState.style.display = 'block';
        return;
    }
    
    emptyState.style.display = 'none';
    
    // Grouper par secteur et STT
    const dataBySection = { s1: {}, s2: {}, s3: {}, autres: {} };
    const currentMonth = new Date().getMonth() + 1;
    
    // Calculer semaine courante pour logique de retard
    const now = new Date();
    const startYear = new Date(now.getFullYear(), 0, 1);
    const currentWeek = Math.ceil((now - startYear) / (7 * 24 * 60 * 60 * 1000));
    
    // Fonction pour obtenir la dernière semaine d'un mois
    const getLastWeekOfMonth = (mois) => {
        // Approximation : mois 1 = semaines 1-4, mois 2 = semaines 5-9, etc.
        const lastDay = new Date(now.getFullYear(), mois, 0); // Dernier jour du mois
        const startOfYear = new Date(now.getFullYear(), 0, 1);
        return Math.ceil((lastDay - startOfYear) / (7 * 24 * 60 * 60 * 1000));
    };
    
    // Stocker les données pour la modal STT (global)
    window.DSF_STT_DATA = { s1: {}, s2: {}, s3: {}, autres: {} };
    
    VISITES.dsf.rawData.forEach(row => {
        const sttKey = row.stt || 'Sans nom';
        
        if (!dataBySection[row.sector][sttKey]) {
            dataBySection[row.sector][sttKey] = {
                nbVisitesTotales: 0,
                mois: Array(12).fill(0),
                visitesRestantes: 0,
                visitesEnRetard: 0
            };
            // Stocker pour relance
            window.DSF_STT_DATA[row.sector][sttKey] = {
                email: row.sttEmail || '',
                sitesEnRetard: [],
                sitesAPlanifier: []
            };
        }
        
        dataBySection[row.sector][sttKey].nbVisitesTotales += row.totales;
        dataBySection[row.sector][sttKey].visitesRestantes += row.restantes;
        
        if (row.mois && row.restantes > 0) {
            const moisNum = parseInt(String(row.mois).trim());
            if (moisNum >= 1 && moisNum <= 12) {
                dataBySection[row.sector][sttKey].mois[moisNum - 1] += row.restantes;
                const MOIS_NOMS = ['Janvier', 'Février', 'Mars', 'Avril', 'Mai', 'Juin', 'Juillet', 'Août', 'Septembre', 'Octobre', 'Novembre', 'Décembre'];
                
                // Retard basé sur la semaine : si la dernière semaine du mois prévu < semaine courante
                const lastWeekOfMois = getLastWeekOfMonth(moisNum);
                const isRetard = currentWeek > lastWeekOfMois;
                
                if (isRetard) {
                    // Site en retard (semaine courante > dernière semaine du mois prévu)
                    dataBySection[row.sector][sttKey].visitesEnRetard += row.restantes;
                    window.DSF_STT_DATA[row.sector][sttKey].sitesEnRetard.push({
                        numClient: row.numClient || '',
                        nomSite: row.nomSite || '',
                        ville: row.ville || '',
                        moisSTT: MOIS_NOMS[moisNum - 1],
                        contact: row.contact || '',
                        heureDSF: row.heureDSF || ''
                    });
                } else {
                    // Site à planifier (mois courant ou futur)
                    window.DSF_STT_DATA[row.sector][sttKey].sitesAPlanifier.push({
                        numClient: row.numClient || '',
                        nomSite: row.nomSite || '',
                        ville: row.ville || '',
                        moisSTT: MOIS_NOMS[moisNum - 1],
                        contact: row.contact || '',
                        heureDSF: row.heureDSF || ''
                    });
                }
            }
        }
    });
    
    // Générer les tableaux
    const moisNoms = ['Jan', 'Fév', 'Mar', 'Avr', 'Mai', 'Juin', 'Juil', 'Août', 'Sep', 'Oct', 'Nov', 'Déc'];
    const sectorColors = {
        s1: { name: '🔵 SECTEUR S1', class: 's1' },
        s2: { name: '🟢 SECTEUR S2', class: 's2' },
        s3: { name: '🔴 SECTEUR S3', class: 's3' },
        autres: { name: '⚪ AUTRES SECTEURS', class: 'autres' }
    };
    
    let html = '';
    
    Object.entries(dataBySection).forEach(([sector, data]) => {
        // Trier les STT par nombre de retards (décroissant)
        const sttList = Object.keys(data).sort((a, b) => {
            return (data[b].visitesEnRetard || 0) - (data[a].visitesEnRetard || 0);
        });
        if (sttList.length === 0) return;
        
        let totalRestant = 0;
        
        html += `
            <div class="dsf-planning-section" data-sector="${sector}">
                <div class="dsf-planning-header history-table-header ${sectorColors[sector].class}">
                    <span class="icon-animated">${sectorColors[sector].name.split(' ')[0]}</span> ${sectorColors[sector].name.substring(2)} - PLANNING MENSUEL
                </div>
                <div class="dsf-planning-table-wrapper">
                    <table class="dsf-planning-table">
                        <thead>
                            <tr>
                                <th>STT</th>
                                <th>Total</th>
                                ${moisNoms.map((m, i) => `<th class="month-cell${i + 1 === currentMonth ? ' current' : ''}">${m}</th>`).join('')}
                                <th>Retard</th>
                                <th>Restant</th>
                                <th>% Fait</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        sttList.forEach(stt => {
            const d = data[stt];
            const done = d.nbVisitesTotales - d.visitesRestantes;
            const pct = d.nbVisitesTotales > 0 ? Math.round((done / d.nbVisitesTotales) * 100) : 0;
            const pctClass = pct >= 75 ? 'good' : pct >= 50 ? 'warning' : 'danger';
            const hasRetard = d.visitesEnRetard > 0;
            
            totalRestant += d.visitesRestantes;
            
            // TOUS les STT sont cliquables - ouvre la modal
            const sttClass = hasRetard ? 'stt-clickable has-retard' : 'stt-clickable';
            const sttTitle = hasRetard ? 'Cliquez pour relancer (sites en retard)' : 'Cliquez pour voir les sites';
            const sttDisplay = `<span class="${sttClass}" onclick="openDSFRelanceModal('${stt.replace(/'/g, "\\'")}', '${sector}')" title="${sttTitle}">${stt}</span>`;
            
            html += `
                <tr${hasRetard ? ' style="background: rgba(239, 68, 68, 0.05);"' : ''}>
                    <td class="stt-name">${sttDisplay}</td>
                    <td>${d.nbVisitesTotales}</td>
                    ${d.mois.map((v, i) => {
                        // Retard basé sur la semaine
                        const lastWeekOfMois = getLastWeekOfMonth(i + 1);
                        const isOverdue = v > 0 && currentWeek > lastWeekOfMois;
                        const isCurrent = i + 1 === currentMonth;
                        return `<td class="month-cell${isCurrent ? ' current' : ''}${isOverdue ? ' overdue' : ''}">${v || '-'}</td>`;
                    }).join('')}
                    <td class="retard-cell">${d.visitesEnRetard || '-'}</td>
                    <td class="restant-cell">${d.visitesRestantes}</td>
                    <td class="percent-cell ${pctClass}">${pct}%</td>
                </tr>
            `;
        });
        
        html += `
                        </tbody>
                        <tfoot>
                            <tr>
                                <td colspan="14" style="text-align: right;">TOTAL RESTANTES:</td>
                                <td class="restant-cell">${totalRestant}</td>
                                <td></td>
                            </tr>
                        </tfoot>
                    </table>
                </div>
            </div>
        `;
    });
    
    container.innerHTML = html;
}

function filterDSFPlanning(sector) {
    const sections = document.querySelectorAll('.dsf-planning-section');
    sections.forEach(section => {
        if (sector === 'all' || section.dataset.sector === sector) {
            section.style.display = 'block';
        } else {
            section.style.display = 'none';
        }
    });
}

// Fonction pour ouvrir la modal de relance STT depuis les tableaux DSF
function openDSFRelanceModal(sttName, sector) {
    if (!window.DSF_STT_DATA || !window.DSF_STT_DATA[sector] || !window.DSF_STT_DATA[sector][sttName]) {
        alert('Données non disponibles pour ce STT');
        return;
    }

    const data = window.DSF_STT_DATA[sector][sttName];
    const sectorNames = { s1: 'S1', s2: 'S2', s3: 'S3', autres: 'AUTRES' };
    
    // Créer une clé compatible avec VISITESMODULE
    const key = `${sttName}#${sector}`;
    
    // Injecter les données dans VISITESMODULE.sttOverdueData
    if (typeof VISITESMODULE !== 'undefined') {
        VISITESMODULE.sttOverdueData[key] = {
            sttName: sttName,
            sector: sector,
            email: data.email,
            retardSites: data.sitesEnRetard.length,
            planifierSites: (data.sitesAPlanifier || []).length,
            totalSites: data.sitesEnRetard.length + (data.sitesAPlanifier || []).length,
            sites: data.sitesEnRetard,
            sitesAPlanifier: data.sitesAPlanifier || []
        };
        
        // Ouvrir la modal
        VISITESMODULE.openModalSTT(key);
    } else {
        alert('Module Visites non initialisé');
    }
}


console.log('✅ visites.js chargé');
