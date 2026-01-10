// ============================================
// SAV.JS - Module Service Après-Vente
// GESTION PRO - EasyLog Pro
// ============================================
//
// SPECS EXACTES :
//
// PARTIE 1 - SAV EN COURS (du jour même)
// - Filtre : Date d'enregistrement (col 3, index 2) = AUJOURD'HUI
// - Groupé par secteur
// - Colonnes : N°, Urgence, Site, Ville, Dept, Motif expert, Tech attitré, Planifié, Délai
//
// PARTIE 2 - KPIs SEMAINE EN COURS
// - Filtre : Date planifiée (col 23, index 22) dans semaine en cours
// - SAV par jour par secteur
// - Techniciens par jour (trigrammes) + nb interventions
// - Réglés téléphone par jour par secteur
//
// INDEX Inter techniques 2009 :
// 0  = N° INTERVENTION
// 1  = Annulation
// 2  = Date d'enregistrement
// 4  = Index client
// 11 = 48H
// 12 = Intervention astreinte?
// 18 = Motif expert
// 19 = réglé par téléphone
// 21 = Prénom tech (code)
// 22 = Intervention planifiée
// 25 = Intervention terminée le
//
// INDEX Liste des contrats en cours :
// 0  = Num (clé jointure)
// 7  = technicien 2008 (pour secteur)
// 9  = Nom du site
// 11 = Ville
// 13 = Dept
// 43 = Astreinte 2H
// 44 = Astreinte 4H
// ============================================

const SAV = {
    data: [],
    contrats: new Map(),
    currentWeek: null,
    
    stats: {
        total: 0,
        urgents: 0,
        moyens: 0,
        rdv: 0,
        nonPlanifies: 0
    },

    /**
     * Initialisation
     */
    async init() {
        console.log('🔧 Initialisation module SAV...');
        
        this.currentWeek = this.getWeekDates();
        this.loadContrats();
        this.initKeyboardEvents();
        this.render();
        
        console.log('✅ Module SAV initialisé');
    },

    /**
     * Semaine en cours (lundi → dimanche)
     */
    getWeekDates() {
        const today = new Date();
        const day = today.getDay();
        const mondayOffset = day === 0 ? -6 : 1 - day;
        
        const monday = new Date(today);
        monday.setDate(today.getDate() + mondayOffset);
        monday.setHours(0, 0, 0, 0);
        
        const sunday = new Date(monday);
        sunday.setDate(monday.getDate() + 6);
        sunday.setHours(23, 59, 59, 999);
        
        const days = [];
        for (let i = 0; i < 7; i++) {
            const d = new Date(monday);
            d.setDate(monday.getDate() + i);
            days.push(d);
        }
        
        return {
            start: monday,
            end: sunday,
            days: days,
            dayNames: ['Lundi', 'Mardi', 'Mercredi', 'Jeudi', 'Vendredi', 'Samedi', 'Dimanche']
        };
    },

    /**
     * Charge les contrats dans une Map
     */
    loadContrats() {
        this.contrats.clear();
        
        if (!APP.data.contrats || APP.data.contrats.length === 0) {
            console.warn('⚠️ Aucune donnée CONTRATS');
            return;
        }
        
        APP.data.contrats.forEach(row => {
            if (!row || !row._raw) return;
            const raw = row._raw;
            
            const num = String(raw[0] || '').trim();
            if (!num) return;
            
            this.contrats.set(num, {
                num: num,
                techCode: raw[7] || '',      // technicien 2008
                nomSite: raw[9] || '',       // Nom du site
                ville: raw[11] || '',        // Ville
                dept: raw[13] || '',         // Dept
                astreinte2H: !!raw[43],      // Astreinte 2H
                astreinte4H: !!raw[44]       // Astreinte 4H
            });
        });
        
        console.log('📋 Contrats chargés:', this.contrats.size);
    },

    /**
     * Convertit code tech → trigramme
     */
    getTechTrigramme(code) {
        if (!code) return '-';
        
        // Utiliser la fonction globale getTechCode
        if (typeof getTechCode === 'function') {
            const trigramme = getTechCode(code);
            if (trigramme && trigramme !== code) return trigramme;
        }
        
        // Fallback : fonction globale convertTech
        if (typeof convertTech === 'function') {
            return convertTech(code) || code;
        }
        
        return code;
    },

    /**
     * Récupère le nom complet du tech
     */
    getTechNomComplet(code) {
        if (!code) return '-';
        
        // Utiliser la fonction globale getTechNom
        if (typeof getTechNom === 'function') {
            const nom = getTechNom(code);
            if (nom) return nom;
        }
        
        return '-';
    },

    /**
     * Récupère le secteur depuis le contrat ou le code tech
     */
    getSecteur(contrat) {
        if (!contrat) return 'AUTRES';
        
        // 1. Essayer via le techCode du contrat
        if (contrat.techCode) {
            const trigramme = this.getTechTrigramme(contrat.techCode);
            
            // Extraire le secteur du trigramme (ex: LTN-S2 → S2)
            const match = String(trigramme).match(/S([123])$/i);
            if (match) {
                return 'S' + match[1];
            }
            
            // Fallback : fonction globale getSector
            if (typeof getSector === 'function') {
                return getSector(trigramme);
            }
            
            // Fallback : derniers 2 caractères
            const lastTwo = String(trigramme).slice(-2).toUpperCase();
            if (lastTwo === 'S1') return 'S1';
            if (lastTwo === 'S2') return 'S2';
            if (lastTwo === 'S3') return 'S3';
        }
        
        return 'AUTRES';
    },

    /**
     * Parse une date (Excel ou string)
     */
    parseDate(val) {
        if (!val) return null;
        const num = parseFloat(val);
        if (!isNaN(num) && num > 25569 && num < 60000) {
            return new Date((num - 25569) * 86400 * 1000);
        }
        const d = new Date(val);
        return isNaN(d.getTime()) ? null : d;
    },

    /**
     * Formate date en DD/MM/YYYY
     */
    formatDate(val) {
        const d = this.parseDate(val);
        if (!d) return '-';
        return d.toLocaleDateString('fr-FR');
    },

    /**
     * Formate date en clé YYYY-MM-DD
     */
    formatDateKey(date) {
        return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}-${String(date.getDate()).padStart(2, '0')}`;
    },

    /**
     * Vérifie si une date est aujourd'hui
     */
    isToday(val) {
        const d = this.parseDate(val);
        if (!d) return false;
        const today = new Date();
        return d.getFullYear() === today.getFullYear() &&
               d.getMonth() === today.getMonth() &&
               d.getDate() === today.getDate();
    },

    /**
     * Vérifie si une date est dans la semaine en cours
     */
    isInCurrentWeek(val) {
        const d = this.parseDate(val);
        if (!d) return false;
        return d >= this.currentWeek.start && d <= this.currentWeek.end;
    },

    /**
     * Calcule l'urgence
     */
    getUrgence(isAstreinte, is48H, isPlanifie, contrat) {
        if (isAstreinte && (contrat.astreinte2H || contrat.astreinte4H)) {
            if (contrat.astreinte2H) {
                return { level: 'haute', label: '🔴 2H', class: 'urgence-2h' };
            }
            return { level: 'haute', label: '🔴 4H', class: 'urgence-4h' };
        }
        if (is48H) {
            return { level: 'moyenne', label: '🟠 48H', class: 'urgence-48h' };
        }
        if (isPlanifie) {
            return { level: 'normale', label: '🟢 RDV', class: 'urgence-rdv' };
        }
        return { level: 'normale', label: '⚪ À planifier', class: 'urgence-none' };
    },

    /**
     * Calcule délai d'attente
     */
    getDelai(dateEnreg) {
        const d = this.parseDate(dateEnreg);
        if (!d) return { jours: 0, label: '-', class: '' };
        
        const now = new Date();
        const jours = Math.floor((now - d) / (1000 * 60 * 60 * 24));
        
        let classe = '';
        if (jours > 7) classe = 'delai-critique';
        else if (jours > 3) classe = 'delai-warning';
        
        return {
            jours,
            label: jours === 0 ? "Aujourd'hui" : jours === 1 ? '1 jour' : `${jours} jours`,
            class: classe
        };
    },

    /**
     * Change d'onglet
     */
    switchTab(tab) {
        document.querySelectorAll('.sav-tab').forEach(t => t.classList.remove('active'));
        document.querySelector(`.sav-tab[data-tab="${tab}"]`)?.classList.add('active');
        
        document.querySelectorAll('.sav-content').forEach(c => c.classList.remove('active'));
        document.getElementById(`sav-${tab}`)?.classList.add('active');
        
        if (tab === 'encours') {
            this.renderSAVEnCours();
        } else if (tab === 'kpis') {
            this.renderKPIs();
        }
    },

    /**
     * Rendu principal
     */
    render() {
        this.renderStats();
        this.switchTab('encours');
    },

    /**
     * Stats rapides + KPIs détaillés par secteur (cliquables)
     */
    renderStats() {
        const savDuJour = this.getSAVDuJour();
        this.savDuJourCache = savDuJour; // Cache pour les modals
        
        let urgents = 0, moyens = 0, rdv = 0, nonPlanifies = 0;
        
        // Structure détaillée par secteur
        const parSecteur = {
            S1: { urgents: 0, moyens: 0, rdv: 0, nonPlanifies: 0, total: 0 },
            S2: { urgents: 0, moyens: 0, rdv: 0, nonPlanifies: 0, total: 0 },
            S3: { urgents: 0, moyens: 0, rdv: 0, nonPlanifies: 0, total: 0 },
            AUTRES: { urgents: 0, moyens: 0, rdv: 0, nonPlanifies: 0, total: 0 }
        };
        
        savDuJour.forEach(sav => {
            const s = parSecteur[sav.secteur] || parSecteur.AUTRES;
            s.total++;
            
            if (sav.urgence.level === 'haute') {
                urgents++;
                s.urgents++;
            } else if (sav.urgence.level === 'moyenne') {
                moyens++;
                s.moyens++;
            } else if (sav.isPlanifie) {
                rdv++;
                s.rdv++;
            } else {
                nonPlanifies++;
                s.nonPlanifies++;
            }
        });
        
        const el = (id, val) => {
            const e = document.getElementById(id);
            if (e) e.textContent = val;
        };
        
        el('savStatTotal', savDuJour.length);
        el('savStatUrgents', urgents);
        el('savStatMoyens', moyens);
        el('savStatRdv', rdv);
        el('savStatNonPlanifies', nonPlanifies);
        
        // Mise à jour des stats SAV par secteur dans le dashboard
        ['S1', 'S2', 'S3', 'Autres'].forEach(secteur => {
            const key = secteur.toUpperCase();
            const s = parSecteur[key] || parSecteur.AUTRES;
            const suffix = secteur === 'Autres' ? 'Autres' : secteur;
            el(`sav${suffix}Urgent`, s.urgents);
            el(`sav${suffix}H48`, s.moyens);
            el(`sav${suffix}Rdv`, s.rdv);
            el(`sav${suffix}NonPlan`, s.nonPlanifies);
            el(`sav${suffix}Total`, s.total);
        });
        
        // Remplir le tableau détaillé par secteur (cliquable)
        const container = document.getElementById('savKpiSecteursDetail');
        if (container) {
            let html = `
                <table class="kpi-secteur-table">
                    <thead>
                        <tr>
                            <th>Secteur</th>
                            <th>🔴 Urgents</th>
                            <th>🟠 48H</th>
                            <th>🟢 RDV</th>
                            <th>⚪ Non planifiés</th>
                            <th>Total</th>
                        </tr>
                    </thead>
                    <tbody>
            `;
            
            ['S1', 'S2', 'S3', 'AUTRES'].forEach(secteur => {
                const s = parSecteur[secteur];
                html += `
                    <tr class="secteur-row ${secteur.toLowerCase()}">
                        <td><span class="sector-badge ${secteur.toLowerCase()}">${secteur}</span></td>
                        <td class="${s.urgents > 0 ? 'val-urgent clickable' : ''}" onclick="${s.urgents > 0 ? `SAV.openModal('urgents', '${secteur}')` : ''}">${s.urgents}</td>
                        <td class="${s.moyens > 0 ? 'val-48h clickable' : ''}" onclick="${s.moyens > 0 ? `SAV.openModal('moyens', '${secteur}')` : ''}">${s.moyens}</td>
                        <td class="${s.rdv > 0 ? 'val-rdv clickable' : ''}" onclick="${s.rdv > 0 ? `SAV.openModal('rdv', '${secteur}')` : ''}">${s.rdv}</td>
                        <td class="${s.nonPlanifies > 0 ? 'val-np clickable' : ''}" onclick="${s.nonPlanifies > 0 ? `SAV.openModal('nonPlanifies', '${secteur}')` : ''}">${s.nonPlanifies}</td>
                        <td class="val-total clickable" onclick="SAV.openModal('total', '${secteur}')">${s.total}</td>
                    </tr>
                `;
            });
            
            // Ligne total (cliquable)
            html += `
                <tr class="total-row">
                    <td><strong>TOTAL</strong></td>
                    <td class="val-urgent clickable" onclick="SAV.openModal('urgents', 'TOUS')"><strong>${urgents}</strong></td>
                    <td class="val-48h clickable" onclick="SAV.openModal('moyens', 'TOUS')"><strong>${moyens}</strong></td>
                    <td class="val-rdv clickable" onclick="SAV.openModal('rdv', 'TOUS')"><strong>${rdv}</strong></td>
                    <td class="val-np clickable" onclick="SAV.openModal('nonPlanifies', 'TOUS')"><strong>${nonPlanifies}</strong></td>
                    <td class="val-total clickable" onclick="SAV.openModal('total', 'TOUS')"><strong>${savDuJour.length}</strong></td>
                </tr>
            `;
            
            html += '</tbody></table>';
            container.innerHTML = html;
        }
        
        // Badge nav
        const badge = document.getElementById('badge-sav');
        if (badge) {
            badge.textContent = urgents + moyens;
            badge.style.display = (urgents + moyens) > 0 ? '' : 'none';
        }
    },

    /**
     * Ouvre le modal avec la liste filtrée
     */
    openModal(type, secteur) {
        const modal = document.getElementById('savModal');
        if (!modal) {
            this.createModal();
        }
        
        this.currentModalType = type;
        this.currentModalSecteur = secteur;
        this.renderModal(type, secteur);
        
        document.getElementById('savModal').classList.add('active');
        document.body.style.overflow = 'hidden';
    },

    /**
     * Ferme le modal
     */
    closeModal() {
        const modal = document.getElementById('savModal');
        if (modal) {
            modal.classList.remove('active');
            document.body.style.overflow = '';
        }
    },

    /**
     * Initialise les événements clavier
     */
    initKeyboardEvents() {
        document.addEventListener('keydown', (e) => {
            if (e.key === 'Escape') {
                this.closeModal();
            }
        });
    },

    /**
     * Crée le modal HTML
     */
    createModal() {
        const modalHtml = `
            <div id="savModal" class="sav-modal">
                <div class="sav-modal-overlay" onclick="SAV.closeModal()"></div>
                <div class="sav-modal-content">
                    <div class="sav-modal-header">
                        <h3 id="savModalTitle">Liste des SAV</h3>
                        <button class="sav-modal-close" onclick="SAV.closeModal()">✕</button>
                    </div>
                    <div class="sav-modal-filters">
                        <label>Filtrer par secteur :</label>
                        <select id="savModalSectorFilter" onchange="SAV.filterModal()">
                            <option value="TOUS">Tous les secteurs</option>
                            <option value="S1">S1</option>
                            <option value="S2">S2</option>
                            <option value="S3">S3</option>
                            <option value="AUTRES">Autres</option>
                        </select>
                        <span id="savModalCount" class="modal-count"></span>
                    </div>
                    <div class="sav-modal-body" id="savModalBody">
                    </div>
                </div>
            </div>
        `;
        document.body.insertAdjacentHTML('beforeend', modalHtml);
    },

    /**
     * Filtre le modal quand on change le secteur
     */
    filterModal() {
        const secteur = document.getElementById('savModalSectorFilter').value;
        this.currentModalSecteur = secteur;
        this.renderModal(this.currentModalType, secteur);
    },

    /**
     * Rendu du contenu du modal
     */
    renderModal(type, secteur) {
        const titleMap = {
            'urgents': '🔴 SAV Urgents (2H/4H)',
            'moyens': '🟠 SAV 48H',
            'rdv': '🟢 SAV avec RDV',
            'nonPlanifies': '⚪ SAV Non planifiés',
            'total': '📋 Tous les SAV du jour'
        };
        
        document.getElementById('savModalTitle').textContent = titleMap[type] || 'Liste des SAV';
        document.getElementById('savModalSectorFilter').value = secteur;
        
        // Filtrer les SAV
        let filtered = this.savDuJourCache || [];
        
        // Filtre par type
        if (type === 'urgents') {
            filtered = filtered.filter(s => s.urgence.level === 'haute');
        } else if (type === 'moyens') {
            filtered = filtered.filter(s => s.urgence.level === 'moyenne');
        } else if (type === 'rdv') {
            filtered = filtered.filter(s => s.urgence.level === 'normale' && s.isPlanifie);
        } else if (type === 'nonPlanifies') {
            filtered = filtered.filter(s => s.urgence.level === 'normale' && !s.isPlanifie);
        }
        
        // Filtre par secteur
        if (secteur && secteur !== 'TOUS') {
            filtered = filtered.filter(s => s.secteur === secteur);
        }
        
        document.getElementById('savModalCount').textContent = `${filtered.length} résultat${filtered.length > 1 ? 's' : ''}`;
        
        if (filtered.length === 0) {
            document.getElementById('savModalBody').innerHTML = `
                <div class="sav-modal-empty">Aucun SAV correspondant</div>
            `;
            return;
        }
        
        let html = `
            <table class="sav-modal-table">
                <thead>
                    <tr>
                        <th>N°</th>
                        <th>Urgence</th>
                        <th>Secteur</th>
                        <th>Site</th>
                        <th>Ville</th>
                        <th>Dept</th>
                        <th>Motif expert</th>
                        <th>Tech</th>
                        <th>Planifié</th>
                    </tr>
                </thead>
                <tbody>
        `;
        
        filtered.forEach(sav => {
            const planifCell = sav.isPlanifie 
                ? `<span class="planif-ok">✅ ${this.formatDate(sav.datePlanifiee)}</span>`
                : `<span class="planif-non">⏳ Non</span>`;
            
            html += `
                <tr class="${sav.urgence.level === 'haute' ? 'row-urgente' : ''}">
                    <td>${sav.numIntervention}</td>
                    <td><span class="urgence-badge ${sav.urgence.class}">${sav.urgence.label}</span></td>
                    <td><span class="sector-badge ${sav.secteur.toLowerCase()}">${sav.secteur}</span></td>
                    <td>${sav.nomSite || sav.indexClient}</td>
                    <td>${sav.ville}</td>
                    <td>${sav.dept}</td>
                    <td class="col-motif" title="${sav.motifExpert}">${sav.motifExpert || '-'}</td>
                    <td><strong>${sav.techTrigramme}</strong></td>
                    <td>${planifCell}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table>';
        document.getElementById('savModalBody').innerHTML = html;
    },

    /**
     * Récupère les SAV du jour (date enregistrement = aujourd'hui)
     */
    getSAVDuJour() {
        if (!APP.data.sav || APP.data.sav.length === 0) return [];
        
        const result = [];
        
        APP.data.sav.forEach((row, idx) => {
            if (!row || !row._raw) return;
            const raw = row._raw;
            
            // Date enregistrement (index 2) = AUJOURD'HUI
            const dateEnreg = raw[2];
            if (!this.isToday(dateEnreg)) return;
            
            // Ignorer si annulé
            if (raw[1]) return;
            
            const indexClient = String(raw[4] || '').trim();
            const contrat = this.contrats.get(indexClient) || {};
            
            const is48H = !!raw[11];
            const isAstreinte = !!raw[12];
            const motifExpert = String(raw[18] || '').trim();
            const regleTelephone = !!raw[19];
            const techCode = raw[21];
            const datePlanifiee = raw[22];
            const isPlanifie = !!datePlanifiee;
            
            const techTrigramme = this.getTechTrigramme(techCode);
            const secteur = this.getSecteur(contrat);
            const urgence = this.getUrgence(isAstreinte, is48H, isPlanifie, contrat);
            const delai = this.getDelai(dateEnreg);
            
            result.push({
                _index: idx,
                numIntervention: raw[0] || '',
                dateEnreg,
                indexClient,
                is48H,
                isAstreinte,
                motifExpert,
                regleTelephone,
                techCode,
                techTrigramme,
                datePlanifiee,
                isPlanifie,
                nomSite: contrat.nomSite || '',
                ville: contrat.ville || '',
                dept: contrat.dept || '',
                secteur,
                urgence,
                delai
            });
        });
        
        // Tri par urgence puis délai
        result.sort((a, b) => {
            const order = { haute: 0, moyenne: 1, normale: 2 };
            const diff = order[a.urgence.level] - order[b.urgence.level];
            if (diff !== 0) return diff;
            return b.delai.jours - a.delai.jours;
        });
        
        return result;
    },

    /**
     * PARTIE 1 : SAV EN COURS (du jour) groupés par secteur
     */
    renderSAVEnCours() {
        const container = document.getElementById('sav-encours');
        if (!container) return;
        
        const savDuJour = this.getSAVDuJour();
        
        if (savDuJour.length === 0) {
            container.innerHTML = `
                <div class="sav-empty">
                    <p>✅ Aucune intervention SAV enregistrée aujourd'hui</p>
                </div>
            `;
            return;
        }
        
        // Grouper par secteur
        const parSecteur = {};
        savDuJour.forEach(sav => {
            const s = sav.secteur;
            if (!parSecteur[s]) parSecteur[s] = [];
            parSecteur[s].push(sav);
        });
        
        let html = `
            <div class="sav-count">
                📋 ${savDuJour.length} intervention${savDuJour.length > 1 ? 's' : ''} aujourd'hui
            </div>
        `;
        
        // Ordre des secteurs
        const secteurOrder = ['S1', 'S2', 'S3', 'AUTRES'];
        
        secteurOrder.forEach(secteur => {
            const savs = parSecteur[secteur];
            if (!savs || savs.length === 0) return;
            
            html += `
                <div class="sav-secteur-group">
                    <div class="secteur-header">
                        <span class="sector-badge ${secteur.toLowerCase()}">${secteur}</span>
                        <span class="secteur-count">${savs.length} SAV</span>
                    </div>
                    <table class="sav-table">
                        <thead>
                            <tr>
                                <th>N°</th>
                                <th>Urgence</th>
                                <th>Site</th>
                                <th>Ville</th>
                                <th>Dept</th>
                                <th>Motif expert</th>
                                <th>Tech attitré</th>
                                <th>Planifié</th>
                                <th>Délai</th>
                            </tr>
                        </thead>
                        <tbody>
            `;
            
            savs.forEach(sav => {
                const rowClass = sav.urgence.level === 'haute' ? ' class="row-urgente"' : '';
                const planifCell = sav.isPlanifie 
                    ? `<span class="planif-ok">✅ ${this.formatDate(sav.datePlanifiee)}</span>`
                    : `<span class="planif-non">⏳ Non</span>`;
                const delaiCell = sav.isPlanifie ? '-' : sav.delai.label;
                const delaiClass = sav.delai.class ? ` class="${sav.delai.class}"` : '';
                
                html += `
                    <tr${rowClass}>
                        <td>${sav.numIntervention}</td>
                        <td><span class="urgence-badge ${sav.urgence.class}">${sav.urgence.label}</span></td>
                        <td>${sav.nomSite || sav.indexClient}</td>
                        <td>${sav.ville}</td>
                        <td>${sav.dept}</td>
                        <td class="col-motif" title="${sav.motifExpert}">${sav.motifExpert || '-'}</td>
                        <td><strong>${sav.techTrigramme}</strong></td>
                        <td>${planifCell}</td>
                        <td${delaiClass}>${delaiCell}</td>
                    </tr>
                `;
            });
            
            html += `
                        </tbody>
                    </table>
                </div>
            `;
        });
        
        container.innerHTML = html;
    },

    /**
     * PARTIE 2 : KPIs SEMAINE EN COURS
     * Filtre sur date planifiée (col 23, index 22)
     */
    renderKPIs() {
        const container = document.getElementById('sav-kpis');
        if (!container) return;
        
        if (!APP.data.sav || APP.data.sav.length === 0) {
            container.innerHTML = '<p class="sav-empty">Aucune donnée SAV</p>';
            return;
        }
        
        // Préparer structure par jour
        const kpiParJour = {};
        this.currentWeek.days.forEach((day, i) => {
            const key = this.formatDateKey(day);
            kpiParJour[key] = {
                label: this.currentWeek.dayNames[i].substring(0, 3),
                fullLabel: this.currentWeek.dayNames[i],
                date: this.formatDate(day),
                parSecteur: {},
                parTech: {},
                telephoneParSecteur: {},
                total: 0,
                telephone: 0
            };
        });
        
        const allSecteurs = new Set();
        const allTechs = new Set();
        
        // Parcourir tous les SAV
        APP.data.sav.forEach(row => {
            if (!row || !row._raw) return;
            const raw = row._raw;
            
            // Filtre : date planifiée (index 22) dans la semaine
            const datePlanifiee = raw[22];
            if (!this.isInCurrentWeek(datePlanifiee)) return;
            
            const dateParsed = this.parseDate(datePlanifiee);
            if (!dateParsed) return;
            
            const dayKey = this.formatDateKey(dateParsed);
            if (!kpiParJour[dayKey]) return;
            
            // Secteur via contrat
            const indexClient = String(raw[4] || '').trim();
            const contrat = this.contrats.get(indexClient) || {};
            const secteur = this.getSecteur(contrat);
            allSecteurs.add(secteur);
            
            // Tech (index 21) → trigramme
            const techCode = raw[21];
            const techTrigramme = this.getTechTrigramme(techCode);
            if (techTrigramme && techTrigramme !== '-') {
                allTechs.add(techTrigramme);
            }
            
            // Compteurs
            kpiParJour[dayKey].parSecteur[secteur] = (kpiParJour[dayKey].parSecteur[secteur] || 0) + 1;
            
            if (techTrigramme && techTrigramme !== '-') {
                kpiParJour[dayKey].parTech[techTrigramme] = (kpiParJour[dayKey].parTech[techTrigramme] || 0) + 1;
            }
            
            // Réglé téléphone (index 19)
            if (raw[19]) {
                kpiParJour[dayKey].telephone++;
                kpiParJour[dayKey].telephoneParSecteur[secteur] = (kpiParJour[dayKey].telephoneParSecteur[secteur] || 0) + 1;
            }
            
            kpiParJour[dayKey].total++;
        });
        
        // Générer HTML
        const weekStart = this.formatDate(this.currentWeek.start);
        const weekEnd = this.formatDate(this.currentWeek.end);
        
        let html = `
            <div class="kpi-header">
                <h2>📊 KPIs Semaine du ${weekStart} au ${weekEnd}</h2>
            </div>
        `;
        
        // === KPI 1 : SAV par jour par secteur ===
        html += `
            <div class="kpi-section">
                <h3>📈 SAV planifiés par jour / secteur</h3>
                <div class="table-responsive">
                    <table class="kpi-table">
                        <thead>
                            <tr>
                                <th>Secteur</th>
                                ${Object.values(kpiParJour).map(d => `<th>${d.label}<br><small>${d.date}</small></th>`).join('')}
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        const secteurOrder = ['S1', 'S2', 'S3', 'AUTRES'];
        secteurOrder.forEach(secteur => {
            let total = 0;
            html += `<tr><td><span class="sector-badge ${secteur.toLowerCase()}">${secteur}</span></td>`;
            Object.values(kpiParJour).forEach(day => {
                const count = day.parSecteur[secteur] || 0;
                total += count;
                html += `<td class="${count > 0 ? 'has-value' : ''}">${count || '-'}</td>`;
            });
            html += `<td class="total-cell">${total}</td></tr>`;
        });
        
        // Ligne total
        html += `<tr class="total-row"><td><strong>TOTAL</strong></td>`;
        let grandTotal = 0;
        Object.values(kpiParJour).forEach(day => {
            html += `<td>${day.total || '-'}</td>`;
            grandTotal += day.total;
        });
        html += `<td class="total-cell">${grandTotal}</td></tr>`;
        html += `</tbody></table></div></div>`;
        
        // === KPI 2 : Techniciens par jour ===
        html += `
            <div class="kpi-section">
                <h3>👷 Interventions par technicien / jour</h3>
                <div class="table-responsive">
                    <table class="kpi-table">
                        <thead>
                            <tr>
                                <th>Technicien</th>
                                ${Object.values(kpiParJour).map(d => `<th>${d.label}<br><small>${d.date}</small></th>`).join('')}
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        if (allTechs.size === 0) {
            html += `<tr><td colspan="9" style="text-align:center;color:#6b7280;">Aucune intervention planifiée cette semaine</td></tr>`;
        } else {
            Array.from(allTechs).sort().forEach(tech => {
                let total = 0;
                html += `<tr><td><strong>${tech}</strong></td>`;
                Object.values(kpiParJour).forEach(day => {
                    const count = day.parTech[tech] || 0;
                    total += count;
                    html += `<td class="${count > 0 ? 'has-value' : ''}">${count || '-'}</td>`;
                });
                html += `<td class="total-cell">${total}</td></tr>`;
            });
        }
        
        html += `</tbody></table></div></div>`;
        
        // === KPI 3 : Réglés téléphone par jour par secteur ===
        html += `
            <div class="kpi-section">
                <h3>📞 Réglés par téléphone / jour / secteur</h3>
                <div class="table-responsive">
                    <table class="kpi-table">
                        <thead>
                            <tr>
                                <th>Secteur</th>
                                ${Object.values(kpiParJour).map(d => `<th>${d.label}<br><small>${d.date}</small></th>`).join('')}
                                <th>Total</th>
                            </tr>
                        </thead>
                        <tbody>
        `;
        
        secteurOrder.forEach(secteur => {
            let total = 0;
            html += `<tr><td><span class="sector-badge ${secteur.toLowerCase()}">${secteur}</span></td>`;
            Object.values(kpiParJour).forEach(day => {
                const count = day.telephoneParSecteur[secteur] || 0;
                total += count;
                html += `<td class="${count > 0 ? 'has-value telephone' : ''}">${count || '-'}</td>`;
            });
            html += `<td class="total-cell">${total}</td></tr>`;
        });
        
        // Ligne total téléphone
        html += `<tr class="total-row"><td><strong>TOTAL</strong></td>`;
        let grandTotalTel = 0;
        Object.values(kpiParJour).forEach(day => {
            html += `<td>${day.telephone || '-'}</td>`;
            grandTotalTel += day.telephone;
        });
        html += `<td class="total-cell">${grandTotalTel}</td></tr>`;
        html += `</tbody></table></div></div>`;
        
        container.innerHTML = html;
    }
};

console.log('✅ sav.js chargé');
