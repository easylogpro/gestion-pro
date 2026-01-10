// ============================================
// DASHBOARD.JS - Module Dashboard principal
// GESTION PRO - EasyLog Pro
// ============================================

/**
 * Module DASHBOARD - Gestion du tableau de bord principal
 * Filtre par secteur et affiche les stats dynamiques
 */
const DASHBOARD = {
    currentSector: 'TOUS',
    weekNum: 1,
    visitType: 'V1',
    chart: null,
    
    // Stats calculées UNIQUEMENT pour DSF Non clôturés, Travaux, CA, Devis
    stats: {
        dsfNonCloture: { S1: { cloture: 0, planif: 0, resp: 0 }, S2: { cloture: 0, planif: 0, resp: 0 }, S3: { cloture: 0, planif: 0, resp: 0 }, AUTRES: { cloture: 0, planif: 0, resp: 0 }, TOUS: { cloture: 0, planif: 0, resp: 0 } },
        travaux: { S1: 0, S2: 0, S3: 0, AUTRES: 0, TOUS: 0 },
        ca: { S1: 0, S2: 0, S3: 0, AUTRES: 0, TOUS: 0 },
        devis: { S1: 0, S2: 0, S3: 0, AUTRES: 0, TOUS: 0 }
    },

    init() {
        console.log('📊 Initialisation DASHBOARD (sans toucher SSI/DSF)...');
        
        // Calculer semaine et type de visite
        const now = new Date();
        const start = new Date(now.getFullYear(), 0, 1);
        const diff = now - start;
        const oneWeek = 1000 * 60 * 60 * 24 * 7;
        this.weekNum = Math.ceil(diff / oneWeek);
        
        // S1-26 = V1, S27-52 = V2
        this.visitType = this.weekNum <= 26 ? 'V1' : 'V2';
        
        // Mettre à jour l'affichage semaine
        const weekEl = document.getElementById('dashboardWeekNum');
        if (weekEl) weekEl.textContent = 'S' + this.weekNum;
        
        const typeEl = document.getElementById('dashboardVisitType');
        if (typeEl) {
            typeEl.textContent = this.visitType;
            typeEl.style.background = this.visitType === 'V1' ? 'var(--info)' : 'var(--warning)';
        }
        
        // Calculer SEULEMENT DSF Non clôturés, Travaux, CA, Devis par secteur
        this.calculateStats();
        
        // Afficher
        this.currentSector = 'TOUS';
        this.updateDisplay();
        
        console.log('✅ DASHBOARD initialisé', this.stats);
    },

    calculateStats() {
        // Reset stats
        ['S1', 'S2', 'S3', 'AUTRES', 'TOUS'].forEach(s => {
            this.stats.dsfNonCloture[s] = { cloture: 0, planif: 0, resp: 0 };
            this.stats.travaux[s] = 0;
            this.stats.ca[s] = 0;
            this.stats.devis[s] = 0;
        });
        
        // Stockage travaux restants (PL TECH vide)
        this.travauxRestants = { S1: [], S2: [], S3: [], AUTRES: [], TOUS: [] };
        
        // DSF Non clôturés par secteur
        ['dsfCloture', 'dsfPlanif', 'dsfResp'].forEach(type => {
            if (APP.data[type]) {
                APP.data[type].forEach(row => {
                    const secteur = row.secteur || 'AUTRES';
                    const s = ['S1', 'S2', 'S3'].includes(secteur) ? secteur : 'AUTRES';
                    
                    if (type === 'dsfCloture') {
                        this.stats.dsfNonCloture[s].cloture++;
                        this.stats.dsfNonCloture.TOUS.cloture++;
                    } else if (type === 'dsfPlanif') {
                        this.stats.dsfNonCloture[s].planif++;
                        this.stats.dsfNonCloture.TOUS.planif++;
                    } else {
                        this.stats.dsfNonCloture[s].resp++;
                        this.stats.dsfNonCloture.TOUS.resp++;
                    }
                });
            }
        });
        
        // Travaux: compter seulement PL TECH vide, CA = tous
        if (APP.data.travaux) {
            APP.data.travaux.forEach(row => {
                const secteur = row.secteur || 'AUTRES';
                const s = ['S1', 'S2', 'S3'].includes(secteur) ? secteur : 'AUTRES';
                
                // Compter seulement si PL TECH vide
                if (row.pl_tech_vide) {
                    this.stats.travaux[s]++;
                    this.stats.travaux.TOUS++;
                    this.travauxRestants[s].push(row);
                    this.travauxRestants.TOUS.push(row);
                }
                
                // CA = tous travaux
                this.stats.ca[s] += row.ca || 0;
                this.stats.ca.TOUS += row.ca || 0;
            });
        }
        
        // Devis en attente par secteur
        if (APP.data.devis) {
            APP.data.devis.forEach(row => {
                if (!row.bcOk) {
                    const secteur = row.secteur || 'AUTRES';
                    const s = ['S1', 'S2', 'S3'].includes(secteur) ? secteur : 'AUTRES';
                    this.stats.devis[s]++;
                    this.stats.devis.TOUS++;
                }
            });
        }
    },

    filterBySector() {
        const select = document.getElementById('dashboardSectorFilter');
        this.currentSector = select ? select.value : 'TOUS';
        
        console.log('🎯 Filtrage Dashboard par secteur:', this.currentSector);
        
        // Mettre à jour l'affichage (SANS toucher aux sections SSI/DSF visites)
        this.updateDisplay();
        
        // Mettre à jour le graphique
        this.updateChart();
    },

    updateDisplay() {
        // Mettre à jour objectif SSI
        this.updateObjectifInfo();
        
        // Masquer/afficher les cartes secteur SSI et DSF visites
        this.updateSectorCardsVisibility();
        
        // DSF Non clôturés par secteur (nouvelle section)
        this.updateDsfNonClotureDisplay();
        
        // Travaux par secteur
        this.updateTravauxDisplay();
        
        // KPIs filtrés (CA, Travaux, Devis, DSF)
        this.updateKPIsDisplay();
    },

    updateObjectifInfo() {
        const objectifEl = document.getElementById('ssiObjectifInfo');
        if (!objectifEl) return;
        
        // Utiliser VISITES existant pour les données SSI
        let restantes = 0;
        const sector = this.currentSector;
        
        if (typeof VISITES !== 'undefined' && VISITES.ssi) {
            const sectorKey = sector === 'TOUS' ? 'total' : sector.toLowerCase();
            if (this.visitType === 'V1' && VISITES.ssi.v1Restantes) {
                restantes = VISITES.ssi.v1Restantes[sectorKey] || VISITES.ssi.v1Restantes.total || 0;
            } else if (VISITES.ssi.v2Restantes) {
                restantes = VISITES.ssi.v2Restantes[sectorKey] || VISITES.ssi.v2Restantes.total || 0;
            }
        }
        
        const weeksRemaining = this.visitType === 'V1' ? Math.max(1, 26 - this.weekNum + 1) : Math.max(1, 52 - this.weekNum + 1);
        const objectif = Math.ceil(restantes / weeksRemaining);
        
        // Format complet avec toutes les infos
        objectifEl.innerHTML = `Obj ${this.visitType}: <strong>~${objectif}/sem</strong> (${restantes} rest. / ${weeksRemaining} sem)`;
    },

    updateSectorCardsVisibility() {
        const ssiCards = document.querySelectorAll('#sectorsSSI .sector-card');
        const dsfCards = document.querySelectorAll('#sectorsDSF .sector-card');
        
        const showAll = this.currentSector === 'TOUS';
        
        [ssiCards, dsfCards].forEach(cards => {
            cards.forEach(card => {
                if (showAll) {
                    card.style.display = '';
                } else {
                    const isMatch = 
                        (card.classList.contains('s1') && this.currentSector === 'S1') ||
                        (card.classList.contains('s2') && this.currentSector === 'S2') ||
                        (card.classList.contains('s3') && this.currentSector === 'S3') ||
                        (card.classList.contains('autres') && this.currentSector === 'AUTRES');
                    card.style.display = isMatch ? '' : 'none';
                }
            });
        });
    },

    updateDsfNonClotureDisplay() {
        // Afficher par secteur (les 4 cartes)
        ['S1', 'S2', 'S3', 'AUTRES'].forEach(s => {
            const prefix = 'dsf' + (s === 'AUTRES' ? 'Autres' : s);
            const stats = this.stats.dsfNonCloture[s];
            
            const clotureEl = document.getElementById(prefix + 'Cloture');
            const planifEl = document.getElementById(prefix + 'Planif');
            const respEl = document.getElementById(prefix + 'Resp');
            const totalEl = document.getElementById(prefix + 'Total');
            
            if (clotureEl) clotureEl.textContent = stats.cloture;
            if (planifEl) planifEl.textContent = stats.planif;
            if (respEl) respEl.textContent = stats.resp;
            
            const total = stats.cloture + stats.planif + stats.resp;
            if (totalEl) totalEl.textContent = total;
        });
        
        // Totaux en bas (filtrés par secteur sélectionné)
        const sector = this.currentSector;
        const stats = this.stats.dsfNonCloture[sector];
        
        const clotureEl = document.getElementById('dsfClotureCount');
        const planifEl = document.getElementById('dsfPlanifCount');
        const respEl = document.getElementById('dsfRespCount');
        
        if (clotureEl) clotureEl.textContent = stats.cloture;
        if (planifEl) planifEl.textContent = stats.planif;
        if (respEl) respEl.textContent = stats.resp;
    },

    updateTravauxDisplay() {
        ['S1', 'S2', 'S3', 'AUTRES'].forEach(s => {
            const el = document.getElementById('travaux' + (s === 'AUTRES' ? 'Autres' : s) + 'Count');
            if (el) el.textContent = this.stats.travaux[s];
        });
    },

    updateKPIsDisplay() {
        const sector = this.currentSector;
        
        // CA (filtré par secteur)
        const caEl = document.getElementById('kpiCa');
        if (caEl) caEl.textContent = formatCurrency(this.stats.ca[sector]);
        
        // Travaux (filtré par secteur)
        const travauxEl = document.getElementById('kpiTravaux');
        if (travauxEl) travauxEl.textContent = this.stats.travaux[sector];
        
        // Devis en attente (filtré par secteur)
        const devisEl = document.getElementById('kpiDevis');
        if (devisEl) devisEl.textContent = this.stats.devis[sector];
        
        // Visites restantes - utiliser VISITES existant
        if (typeof VISITES !== 'undefined' && VISITES.ssi) {
            const sectorKey = sector === 'TOUS' ? 'total' : sector.toLowerCase();
            let visitesRestantes = 0;
            
            if (this.visitType === 'V1' && VISITES.ssi.v1Restantes) {
                visitesRestantes = VISITES.ssi.v1Restantes[sectorKey] || 0;
            } else if (VISITES.ssi.v2Restantes) {
                visitesRestantes = VISITES.ssi.v2Restantes[sectorKey] || 0;
            }
            
            // Ajouter DSF restantes si dispo
            if (VISITES.dsf && VISITES.dsf.restantes) {
                visitesRestantes += VISITES.dsf.restantes[sectorKey] || 0;
            }
            
            const visitesEl = document.getElementById('kpiVisites');
            if (visitesEl) visitesEl.textContent = visitesRestantes;
        }
        
        // DSF non clôturés (filtré par secteur)
        const dsfStats = this.stats.dsfNonCloture[sector];
        const dsfTotal = dsfStats.cloture + dsfStats.planif + dsfStats.resp;
        const dsfEl = document.getElementById('kpiDsf');
        if (dsfEl) dsfEl.textContent = dsfTotal;
    },

    updateChart() {
        if (!this.chart) return;
        
        const sector = document.getElementById('chartSectorFilter')?.value || this.currentSector;
        const data = this.getChartData(sector);
        
        this.chart.data.labels = data.weeks;
        this.chart.data.datasets[0].data = data.ssiRestantes;
        this.chart.data.datasets[1].data = data.dsfRestantes;
        this.chart.update();
    },

    getChartData(sector) {
        // Générer les 6 dernières semaines
        const weeks = [];
        for (let i = 5; i >= 0; i--) {
            weeks.push('S' + Math.max(1, this.weekNum - i));
        }
        
        // Utiliser VISITES existant pour SSI
        let currentSSI = 0;
        if (typeof VISITES !== 'undefined' && VISITES.ssi) {
            const sectorKey = sector === 'TOUS' ? 'total' : sector.toLowerCase();
            if (this.visitType === 'V1' && VISITES.ssi.v1Restantes) {
                currentSSI = VISITES.ssi.v1Restantes[sectorKey] || 0;
            } else if (VISITES.ssi.v2Restantes) {
                currentSSI = VISITES.ssi.v2Restantes[sectorKey] || 0;
            }
        }
        
        const dsfStats = this.stats.dsfNonCloture[sector];
        const currentDSF = dsfStats.cloture + dsfStats.planif + dsfStats.resp;
        
        // Simuler une progression décroissante
        const ssiRestantes = [];
        const dsfRestantes = [];
        
        for (let i = 0; i < 6; i++) {
            const factor = 1 + (5 - i) * 0.12;
            ssiRestantes.push(Math.round(currentSSI * factor));
            dsfRestantes.push(Math.round(currentDSF * factor));
        }
        
        return { weeks, ssiRestantes, dsfRestantes };
    }
};

// ============================================
// FONCTIONS DASHBOARD
// ============================================

/**
 * Affiche le dashboard après chargement des données
 */
function showDashboard() {
    console.log('🚀 Affichage Dashboard...');
    
    // Masquer zone import
    const importZone = document.getElementById('importZone');
    if (importZone) importZone.classList.add('hidden');
    
    // Afficher dashboard
    const dashboard = document.getElementById('dashboardContent');
    if (dashboard) dashboard.classList.remove('hidden');
    
    // Initialiser le module DASHBOARD
    DASHBOARD.init();
    
    // Initialiser les modules avec les données pré-traitées
    if (typeof initVisitesModule === 'function') {
        initVisitesModule();
    }
    
    // Initialiser TRAVAUX
    if (APP.data.travaux.length > 0 && typeof TRAVAUX !== 'undefined') {
        TRAVAUX.init();
    }
    
    // Initialiser DEVIS
    if (APP.data.devis.length > 0 && typeof DEVIS !== 'undefined') {
        DEVIS.init();
    }
    
    // Initialiser DSF Tracker
    if ((APP.data.dsfCloture.length > 0 || APP.data.dsfPlanif.length > 0 || APP.data.dsfResp.length > 0) && typeof DSF !== 'undefined') {
        DSF.init();
    }
    
    // Initialiser PRODUITS
    if (APP.data.produits && APP.data.produits.length > 0 && typeof PRODUITS !== 'undefined') {
        PRODUITS.init();
    }
    
    // Initialiser SEARCH SSI
    if (APP.data.ssi && APP.data.ssi.length > 0 && typeof SEARCHSSI !== 'undefined') {
        SEARCHSSI.init();
    }
    
    // Initialiser SAV
    if (APP.data.sav && APP.data.sav.length > 0 && typeof SAV !== 'undefined') {
        SAV.init();
    }
    
    // Calculer et afficher les stats du dashboard
    updateDashboardStats();
    
    // Initialiser le graphique
    initEvolutionChart();
    
    console.log('✅ Dashboard affiché');
}

/**
 * Met à jour toutes les stats du dashboard
 */
function updateDashboardStats() {
    updateKPIs();
    updateAlerts();
    updateNavBadges();
}

/**
 * Met à jour les KPIs principaux
 */
function updateKPIs() {
    // CA (depuis travaux pré-traités)
    let totalCA = 0;
    APP.data.travaux.forEach(row => {
        totalCA += row.ca || 0;
    });
    const caEl = document.getElementById('kpiCa');
    if (caEl) caEl.textContent = formatCurrency(totalCA);
    
    // Travaux en cours
    const travauxEl = document.getElementById('kpiTravaux');
    if (travauxEl) travauxEl.textContent = APP.data.travaux.length;
    
    const badgeTravaux = document.getElementById('badge-travaux');
    if (badgeTravaux) badgeTravaux.textContent = APP.data.travaux.length;
    
    // Devis en attente
    const devisEnAttente = APP.data.devis.filter(d => !d.bcOk).length;
    const devisEl = document.getElementById('kpiDevis');
    if (devisEl) devisEl.textContent = devisEnAttente;
    
    // DSF non clôturés
    const dsfNonClotures = (APP.data.dsfCloture?.length || 0) + 
                           (APP.data.dsfPlanif?.length || 0) + 
                           (APP.data.dsfResp?.length || 0);
    const dsfEl = document.getElementById('kpiDsf');
    if (dsfEl) dsfEl.textContent = dsfNonClotures;
    
    const badgeDsf = document.getElementById('badge-dsf');
    if (badgeDsf) badgeDsf.textContent = dsfNonClotures;
}

/**
 * Met à jour les alertes
 */
function updateAlerts() {
    const alertEl = document.getElementById('alertDsfResp');
    if (alertEl) alertEl.textContent = APP.data.dsfResp?.length || 0;
}

/**
 * Met à jour les badges de navigation
 */
function updateNavBadges() {
    const badgeTravaux = document.getElementById('badge-travaux');
    if (badgeTravaux && APP.data.travaux.length === 0) {
        badgeTravaux.style.display = 'none';
    }
    
    const badgeDsf = document.getElementById('badge-dsf');
    const totalDsf = (APP.data.dsfCloture?.length || 0) + 
                    (APP.data.dsfPlanif?.length || 0) + 
                    (APP.data.dsfResp?.length || 0);
    if (badgeDsf && totalDsf === 0) {
        badgeDsf.style.display = 'none';
    }
}

/**
 * Initialise le graphique d'évolution
 */
function initEvolutionChart() {
    const ctx = document.getElementById('evolutionChart');
    if (!ctx) return;
    
    // Détruire le chart existant s'il existe
    if (DASHBOARD.chart) {
        DASHBOARD.chart.destroy();
        DASHBOARD.chart = null;
    }
    
    // Récupérer les données initiales depuis DASHBOARD
    const chartData = DASHBOARD.getChartData('TOUS');
    
    DASHBOARD.chart = new Chart(ctx.getContext('2d'), {
        type: 'line',
        data: {
            labels: chartData.weeks,
            datasets: [
                {
                    label: 'SSI Restantes',
                    data: chartData.ssiRestantes,
                    borderColor: '#3b82f6',
                    backgroundColor: 'rgba(59, 130, 246, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#3b82f6'
                },
                {
                    label: 'DSF Restantes',
                    data: chartData.dsfRestantes,
                    borderColor: '#ef4444',
                    backgroundColor: 'rgba(239, 68, 68, 0.1)',
                    fill: true,
                    tension: 0.4,
                    borderWidth: 3,
                    pointRadius: 5,
                    pointBackgroundColor: '#ef4444'
                }
            ]
        },
        options: {
            responsive: true,
            maintainAspectRatio: false,
            plugins: {
                legend: {
                    position: 'bottom',
                    labels: {
                        color: '#475569',
                        font: { family: 'Plus Jakarta Sans', weight: '600' },
                        usePointStyle: true,
                        pointStyle: 'circle',
                        padding: 20
                    }
                },
                title: {
                    display: true,
                    text: 'Visites restantes par semaine',
                    color: '#1e293b',
                    font: { size: 14, weight: '600' },
                    padding: { bottom: 10 }
                }
            },
            scales: {
                x: {
                    grid: { color: 'rgba(148, 163, 184, 0.15)' },
                    ticks: { color: '#64748b', font: { weight: '500' } }
                },
                y: {
                    grid: { color: 'rgba(148, 163, 184, 0.15)' },
                    ticks: { color: '#64748b', font: { weight: '500' } },
                    beginAtZero: true,
                    title: {
                        display: true,
                        text: 'Visites restantes',
                        color: '#64748b'
                    }
                }
            },
            interaction: {
                intersect: false,
                mode: 'index'
            }
        }
    });
}

/**
 * Gestion de la recherche globale
 */
function handleGlobalSearch(e) {
    const query = e.target.value.toLowerCase().trim();
    if (query.length < 2) return;
    
    // TODO: Implémenter recherche cross-modules
    console.log('🔍 Recherche:', query);
}

/**
 * Affiche la configuration Bridge Access
 */
function showAccessConfig() {
    alert('🔗 Connexion Access Bridge\n\nCette fonctionnalité sera disponible quand le serveur sera lancé sur votre PC.\n\nVoir le dossier "bridge" pour l\'installation.');
}

console.log('✅ dashboard.js chargé');
