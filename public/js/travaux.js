// ============================================
// TRAVAUX.JS - Module Gestion des Travaux
// GESTION PRO - EasyLog Pro
// ============================================
// Dépend de: config.js (APP)
//            utils.js (formatDateDDMMYYYY, formatCurrency)
// ============================================

const TRAVAUX = {
    data: [],
    filtered: [],
    allHeaders: [],
    sortState: {},
    currentDetailIndex: -1,
    currentSttTab: 'aPlanifier',
    emailHistory: JSON.parse(localStorage.getItem('travaux_email_history') || '{}'),

    displayColumns: [4, 13, 70, 2, 11, 9, 35, 36, 38, 41, 14, 15, 16, 17, 18, 19, 20, 21, 22, 23, 24, 25, 44, 45, 46, 49, 88, 89, 33, 28, 29, 52, 54, 76, 81, 83],

    // Colonnes contenant des dates (index Excel 1-based) - TOUTES les colonnes dates
    dateColumns: [4, 5, 6, 11, 26, 27, 33, 50, 51, 52, 53, 54, 55, 57, 58, 59, 60, 88, 89, 90],

    // Fonction pour formater une valeur si c'est une date
    formatIfDate(val, colIdx) {
        // Si colonne connue comme date, formater
        if (this.dateColumns.includes(colIdx)) {
            return formatDateDDMMYYYY(val) || val;
        }
        // Sinon, détecter si ça ressemble à une date
        const str = String(val || '').trim();
        // Détecte les formats: "Thu, 26 Oct 2023", "2023-10-26", dates ISO, etc.
        if (str && (str.match(/^\w{3},?\s+\d{1,2}\s+\w{3}\s+\d{4}/) || 
                    str.match(/^\d{4}-\d{2}-\d{2}/) ||
                    str.match(/GMT$/))) {
            return formatDateDDMMYYYY(val) || val;
        }
        return val;
    },

    // Configuration fiche détaillée - IDENTIQUE au fichier référence (colonnes 1-based Excel)
    // 'NOM_SITE_JOINT' = colonne spéciale pour jointure CONTRATS
    ficheConfig: {
        'NUM CLIENT/DEVIS/TECH/REDACTEUR': {
            icon: '👤',
            col1: [59, 1, 3],
            col2: [12, 69],
            grid: '2col'
        },
        'CLIENT': {
            icon: '👤',
            col1: ['NOM_SITE_JOINT', 10, 8, 34, 35, 37, 40],
            col2: [43, 44, 45, 48],
            grid: '2col'
        },
        'PLANNING': {
            icon: '📅',
            col1: [87, 88, 32],
            col2: [],
            grid: '3col'
        },
        'COUT': {
            icon: '💰',
            col1: [13, 15, 17, 19, 21],
            col2: [14, 16, 18, 20, 22, 23, 24],
            grid: '2col'
        },
        'SOUS TRAITANT': {
            icon: '🏢',
            col1: [28, 51, 53],
            col2: [],
            grid: '3col'
        },
        'CLIENT HCE': {
            icon: '🏠',
            col1: [75, 80, 82],
            col2: [],
            grid: '3col'
        },
        'INFO DEVIS': {
            icon: '📄',
            col1: [63, 7, 25],
            col2: [26, 50, 11, 56, 57, 58],
            grid: '2col'
        }
    },

    init() {
        if (APP.data.travaux.length === 0) {
            document.getElementById('travauxEmptyState').style.display = 'block';
            return;
        }
        document.getElementById('travauxEmptyState').style.display = 'none';
        
        // Les données sont déjà pré-traitées par processTravauxRow
        this.data = APP.data.travaux;
        this.allHeaders = APP.data.travauxHeaders || [];
        
        console.log('📋 TRAVAUX init:', this.data.length, 'lignes');
        
        this.populateFilters();
        this.applyFilters();
        this.setupEventListeners();
    },

    // Suppression de processData() car les données sont déjà traitées

    populateFilters() {
        const techSet = new Set();
        const anneeSet = new Set();
        
        this.data.forEach(row => {
            if (row.tech_converted) techSet.add(row.tech_converted);
            if (row.annee) anneeSet.add(row.annee);
        });
        
        // Tech filter
        const techFilter = document.getElementById('travauxTechFilter');
        techFilter.innerHTML = '<option value="TOUS">Tous les techniciens</option>';
        [...techSet].sort().forEach(t => {
            techFilter.innerHTML += `<option value="${t}">${t}</option>`;
        });
        
        // Année filter
        const anneeFilter = document.getElementById('travauxAnneeFilter');
        anneeFilter.innerHTML = '<option value="TOUS">Toutes</option>';
        [...anneeSet].sort().reverse().forEach(a => {
            anneeFilter.innerHTML += `<option value="${a}">${a}</option>`;
        });
    },

    setupEventListeners() {
        ['travauxTechFilter', 'travauxRedacteurFilter', 'travauxSecteurFilter', 'travauxSttFilter', 'travauxAnneeFilter'].forEach(id => {
            document.getElementById(id).addEventListener('change', () => this.applyFilters());
        });
    },

    applyFilters() {
        const tech = document.getElementById('travauxTechFilter').value;
        const redacteur = document.getElementById('travauxRedacteurFilter').value;
        const secteur = document.getElementById('travauxSecteurFilter').value;
        const stt = document.getElementById('travauxSttFilter').value;
        const annee = document.getElementById('travauxAnneeFilter').value;
        
        this.filtered = this.data.filter(row => {
            if (tech !== 'TOUS' && row.tech_converted !== tech) return false;
            if (redacteur !== 'TOUS' && row.redacteur_converted !== redacteur) return false;
            if (secteur !== 'TOUS' && row.secteur !== secteur) return false;
            if (stt === 'AVEC' && !row.has_stt) return false;
            if (stt === 'SANS' && row.has_stt) return false;
            if (stt.startsWith('STT_') && row.stt_converted !== stt.substring(4)) return false;
            if (annee !== 'TOUS' && row.annee !== annee) return false;
            return true;
        });
        
        this.updateDynamicFilters();
        this.updateStats();
        this.renderTable();
        this.updateButtons();
    },

    updateDynamicFilters() {
        // Rédacteur dynamique
        const redacteurCounts = {};
        const sttCounts = {};
        
        this.filtered.forEach(row => {
            if (row.redacteur_converted) {
                redacteurCounts[row.redacteur_converted] = (redacteurCounts[row.redacteur_converted] || 0) + 1;
            }
            if (row.has_stt && row.stt_converted) {
                sttCounts[row.stt_converted] = (sttCounts[row.stt_converted] || 0) + 1;
            }
        });
        
        const currentRedacteur = document.getElementById('travauxRedacteurFilter').value;
        const redacteurFilter = document.getElementById('travauxRedacteurFilter');
        redacteurFilter.innerHTML = '<option value="TOUS">Tous les rédacteurs</option>';
        Object.entries(redacteurCounts).sort((a, b) => b[1] - a[1]).forEach(([r, c]) => {
            redacteurFilter.innerHTML += `<option value="${r}">${r} (${c})</option>`;
        });
        if ([...redacteurFilter.options].some(o => o.value === currentRedacteur)) {
            redacteurFilter.value = currentRedacteur;
        }
        
        const currentStt = document.getElementById('travauxSttFilter').value;
        const sttFilter = document.getElementById('travauxSttFilter');
        sttFilter.innerHTML = '<option value="TOUS">Tous</option><option value="AVEC">Avec STT</option><option value="SANS">Sans STT</option>';
        Object.entries(sttCounts).sort((a, b) => b[1] - a[1]).forEach(([s, c]) => {
            sttFilter.innerHTML += `<option value="STT_${s}">${s} (${c})</option>`;
        });
        if ([...sttFilter.options].some(o => o.value === currentStt)) {
            sttFilter.value = currentStt;
        }
    },

    updateStats() {
        const totalCA = this.filtered.reduce((sum, r) => sum + (r.ca || 0), 0);
        const el1 = document.getElementById('travauxCA');
        if (el1) el1.textContent = formatCurrency(totalCA);
        
        const el2 = document.getElementById('travauxNbSecteur');
        if (el2) el2.textContent = this.filtered.length;
        
        const el3 = document.getElementById('travauxNbTech');
        if (el3) el3.textContent = this.filtered.length;
        
        const nbStt = this.filtered.filter(r => r.has_stt).length;
        const el4 = document.getElementById('travauxNbStt');
        if (el4) el4.textContent = nbStt;
        
        const budgetStt = this.filtered.filter(r => r.has_stt).reduce((sum, r) => sum + (r.budget_stt || 0), 0);
        const el5 = document.getElementById('travauxBudgetStt');
        if (el5) el5.textContent = formatCurrency(budgetStt);
        
        // Update dashboard
        const el6 = document.getElementById('kpiTravaux');
        if (el6) el6.textContent = this.data.length;
        
        const el7 = document.getElementById('badge-travaux');
        if (el7) el7.textContent = this.data.length;
        
        const dashCA = this.data.reduce((sum, r) => sum + (r.ca || 0), 0);
        const el8 = document.getElementById('kpiCa');
        if (el8) el8.textContent = formatCurrency(dashCA);
    },

    updateButtons() {
        const redacteurFilter = document.getElementById('travauxRedacteurFilter');
        const redacteur = redacteurFilter ? redacteurFilter.value : 'TOUS';
        const btnRedacteur = document.getElementById('btnEmailRedacteur');
        if (btnRedacteur) btnRedacteur.style.display = redacteur !== 'TOUS' ? 'flex' : 'none';
        
        const nbStt = this.filtered.filter(r => r.has_stt).length;
        const btnStt = document.getElementById('btnEmailSttList');
        if (btnStt) btnStt.style.display = nbStt > 0 ? 'flex' : 'none';
    },

    renderTable() {
        const thead = document.getElementById('travauxTableHead');
        const tbody = document.getElementById('travauxTableBody');
        
        if (!thead || !tbody) return;
        
        // Colonnes affichées (simplifiées)
        const cols = [
            { idx: 0, label: 'N° Client' },
            { idx: 2, label: 'N° Devis' },
            { idx: 'tech', label: 'Technicien' },
            { idx: 'redacteur', label: 'Rédacteur' },
            { idx: 'nom_site', label: 'Nom Site' },
            { idx: 34, label: 'Ville' },
            { idx: 'secteur', label: 'Secteur' },
            { idx: 'stt', label: 'STT' },
            { idx: 'ca', label: 'Montant HT' }
        ];
        
        // Header
        thead.innerHTML = `<tr>${cols.map(c => 
            `<th onclick="TRAVAUX.sortBy('${c.idx}')">${c.label} <span class="sort-icon">⬍</span></th>`
        ).join('')}</tr>`;
        
        // Body
        tbody.innerHTML = '';
        const countEl = document.getElementById('travauxCount');
        if (countEl) countEl.textContent = `${this.filtered.length} travaux`;
        
        this.filtered.forEach((row, idx) => {
            const tr = document.createElement('tr');
            if (row.has_stt) tr.classList.add('has-stt');
            tr.onclick = () => this.showDetail(idx);
            
            cols.forEach(c => {
                const td = document.createElement('td');
                let val = '';
                if (c.idx === 'tech') val = row.tech_converted;
                else if (c.idx === 'redacteur') val = row.redacteur_converted;
                else if (c.idx === 'secteur') val = row.secteur;
                else if (c.idx === 'stt') val = row.stt_converted;
                else if (c.idx === 'ca') val = formatCurrency(row.ca);
                else if (c.idx === 'nom_site') val = row.nom_site || '';
                else {
                    val = row[c.idx] || '';
                    // Formater les dates automatiquement
                    if (typeof c.idx === 'number') {
                        val = this.formatIfDate(val, c.idx + 1);
                    }
                }
                td.textContent = val;
                tr.appendChild(td);
            });
            
            tbody.appendChild(tr);
        });
    },

    sortBy(key) {
        const dir = this.sortState[key] === 'asc' ? 'desc' : 'asc';
        this.sortState = { [key]: dir };
        
        this.filtered.sort((a, b) => {
            let va, vb;
            if (key === 'tech') { va = a.tech_converted; vb = b.tech_converted; }
            else if (key === 'redacteur') { va = a.redacteur_converted; vb = b.redacteur_converted; }
            else if (key === 'secteur') { va = a.secteur; vb = b.secteur; }
            else if (key === 'stt') { va = a.stt_converted; vb = b.stt_converted; }
            else if (key === 'ca') { va = a.ca; vb = b.ca; }
            else if (key === 'nom_site') { va = a.nom_site; vb = b.nom_site; }
            else { va = a[key]; vb = b[key]; }
            
            if (typeof va === 'number') {
                return dir === 'asc' ? va - vb : vb - va;
            }
            return dir === 'asc' ? String(va).localeCompare(String(vb)) : String(vb).localeCompare(String(va));
        });
        
        this.renderTable();
    },

    showDetail(idx) {
        this.currentDetailIndex = idx;
        const row = this.filtered[idx];
        const modal = document.getElementById('travauxDetailModal');
        const content = document.getElementById('travauxDetailContent');
        
        if (!modal || !content) return;
        
        // Nav
        const navCounter = document.getElementById('travauxNavCounter');
        if (navCounter) navCounter.textContent = `${idx + 1} / ${this.filtered.length}`;
        
        const prevBtn = document.getElementById('travauxPrevBtn');
        if (prevBtn) prevBtn.disabled = idx === 0;
        
        const nextBtn = document.getElementById('travauxNextBtn');
        if (nextBtn) nextBtn.disabled = idx === this.filtered.length - 1;
        
        // Email STT button
        const emailBtn = document.getElementById('travauxEmailSttBtn');
        if (emailBtn) emailBtn.style.display = row.has_stt ? 'flex' : 'none';
        
        // Helper pour obtenir label et valeur (colIdx = 1-based Excel, arrayIdx = colIdx - 1)
        // Gère aussi les colonnes spéciales comme 'NOM_SITE_JOINT'
        const getField = (colIdx) => {
            // Colonne spéciale : Nom du site depuis jointure CONTRATS
            if (colIdx === 'NOM_SITE_JOINT') {
                return { 
                    label: 'NOM DU SITE', 
                    value: row.nom_site || '-' 
                };
            }
            
            const arrayIdx = colIdx - 1;
            const label = this.allHeaders[arrayIdx] || `Col ${colIdx}`;
            let value = row[arrayIdx] !== undefined ? row[arrayIdx] : '';
            
            // Conversions spéciales (IDENTIQUE au fichier référence)
            if (colIdx === 69) value = row.tech_converted || value;
            else if (colIdx === 12) value = row.redacteur_converted || value;
            else if (colIdx === 28) value = row.stt_converted || value;
            else if (colIdx === 24) value = row.ca ? row.ca.toFixed(2) + ' €' : value;
            // Formater les dates
            else {
                value = this.formatIfDate(value, colIdx);
            }
            
            return { label, value: value || '-' };
        };
        
        // Content
        let html = '';
        Object.entries(this.ficheConfig).forEach(([section, config]) => {
            html += `<div class="detail-section">
                <div class="detail-section-title">${config.icon} ${section}</div>`;
            
            if (config.grid === '2col' && config.col2 && config.col2.length > 0) {
                // Vraie disposition 2 colonnes
                html += `<div class="detail-section-content two-columns">
                    <div class="detail-column">`;
                
                config.col1.forEach(colIdx => {
                    const field = getField(colIdx);
                    html += `<div class="detail-item">
                        <div class="item-label">${field.label}</div>
                        <div class="item-value">${field.value}</div>
                    </div>`;
                });
                
                html += `</div><div class="detail-column">`;
                
                config.col2.forEach(colIdx => {
                    const field = getField(colIdx);
                    html += `<div class="detail-item">
                        <div class="item-label">${field.label}</div>
                        <div class="item-value">${field.value}</div>
                    </div>`;
                });
                
                html += `</div></div>`;
            } else {
                // Disposition 3 colonnes
                const gridClass = config.grid === '3col' ? 'three-columns' : '';
                html += `<div class="detail-section-content ${gridClass}">`;
                
                config.col1.forEach(colIdx => {
                    const field = getField(colIdx);
                    html += `<div class="detail-item">
                        <div class="item-label">${field.label}</div>
                        <div class="item-value">${field.value}</div>
                    </div>`;
                });
                
                html += `</div>`;
            }
            
            html += `</div>`;
        });
        
        content.innerHTML = html;
        modal.classList.add('active');
    },

    closeDetail() {
        const modal = document.getElementById('travauxDetailModal');
        if (modal) modal.classList.remove('active');
    },

    navigate(dir) {
        const newIdx = this.currentDetailIndex + dir;
        if (newIdx >= 0 && newIdx < this.filtered.length) {
            this.showDetail(newIdx);
        }
    },

    sendEmailSttSingle() {
        if (this.currentDetailIndex < 0) return;
        const row = this.filtered[this.currentDetailIndex];
        this.sendSttEmail([row]);
    },

    openSttModal() {
        const modal = document.getElementById('travauxSttModal');
        if (modal) modal.classList.add('active');
        this.currentSttTab = 'aPlanifier';
        this.renderSttTab();
    },

    closeSttModal() {
        const modal = document.getElementById('travauxSttModal');
        if (modal) modal.classList.remove('active');
    },

    switchSttTab(tab) {
        this.currentSttTab = tab;
        document.querySelectorAll('.stt-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        this.renderSttTab();
    },

    renderSttTab() {
        const container = document.getElementById('travauxSttContent');
        if (!container) return;
        
        const sttRows = this.filtered.filter(r => r.has_stt);
        const rows = this.currentSttTab === 'aPlanifier' 
            ? sttRows.filter(r => !r.is_planified)
            : sttRows.filter(r => r.is_planified);
        
        if (rows.length === 0) {
            container.innerHTML = '<p style="text-align: center; padding: 60px; color: var(--text-muted);">Aucun travail dans cette catégorie</p>';
            return;
        }
        
        let html = `
            <div class="select-all-row">
                <input type="checkbox" id="selectAllStt" checked onchange="TRAVAUX.toggleAllCheckboxes()">
                <label for="selectAllStt">Tout sélectionner</label>
                <span>(${rows.length} travaux)</span>
            </div>
            <div style="overflow-x: auto;">
                <table class="stt-list-table">
                    <thead>
                        <tr>
                            <th class="checkbox-cell">✓</th>
                            <th>Historique</th>
                            <th>N° Travaux</th>
                            <th>Nom Site</th>
                            <th>Ville</th>
                            <th>Dept</th>
                            <th>STT</th>
                            <th>PL STT</th>
                            <th>Budget</th>
                            <th>Technicien</th>
                        </tr>
                    </thead>
                    <tbody>
        `;
        
        rows.forEach((row, i) => {
            const history = this.emailHistory[row.uniqueKey] || [];
            const historyStr = history.slice(-2).map(d => new Date(d).toLocaleDateString('fr-FR')).join('<br>') || '-';
            const numTravaux = `${row[0] || ''}TX${row[2] || ''}`;
            const plStt = formatDateDDMMYYYY(row.pl_stt) || row.pl_stt || '-';
            // Département = col 36 (index 35) ou extraire des 2 premiers chiffres du CP
            const dept = String(row[35] || '').trim().substring(0, 2);
            
            html += `
                <tr>
                    <td class="checkbox-cell"><input type="checkbox" class="stt-cb" data-idx="${this.filtered.indexOf(row)}" checked></td>
                    <td class="history-cell">${historyStr}</td>
                    <td><strong>${numTravaux}</strong></td>
                    <td>${row[9] || ''}</td>
                    <td>${row[34] || ''}</td>
                    <td>${dept}</td>
                    <td>${row.stt_converted}</td>
                    <td>${plStt}</td>
                    <td>${formatCurrency(row.budget_stt)}</td>
                    <td>${row.tech_converted || ''}</td>
                </tr>
            `;
        });
        
        html += '</tbody></table></div>';
        container.innerHTML = html;
    },

    toggleAllCheckboxes() {
        const checked = document.getElementById('selectAllStt').checked;
        document.querySelectorAll('.stt-cb').forEach(cb => cb.checked = checked);
    },

    sendSelectedSttEmails() {
        const selected = [...document.querySelectorAll('.stt-cb:checked')];
        if (selected.length === 0) {
            alert('Veuillez sélectionner au moins un travail.');
            return;
        }
        
        const rows = selected.map(cb => this.filtered[parseInt(cb.dataset.idx)]);
        
        // Grouper par STT
        const grouped = {};
        rows.forEach(r => {
            if (!grouped[r.stt_converted]) grouped[r.stt_converted] = [];
            grouped[r.stt_converted].push(r);
        });
        
        Object.values(grouped).forEach(sttRows => {
            this.sendSttEmail(sttRows);
        });
    },

    sendSttEmail(rows) {
        if (rows.length === 0) return;
        
        const firstRow = rows[0];
        const nomSTT = firstRow.stt_converted || 'Sous-traitant';
        const type = this.currentSttTab;
        
        // Récupérer email STT depuis contacts.json (prioritaire) ou données Excel
        const sttCode = String(firstRow.stt_code || '').trim();
        let email = '';
        if (sttCode && typeof getSttContact === 'function') {
            const sttContact = getSttContact(sttCode);
            if (sttContact && sttContact.mail) {
                email = sttContact.mail;
            }
        }
        if (!email) {
            email = firstRow.stt_email || '';
        }
        
        // Helper pour obtenir valeur formatée (idx est 0-based)
        const getVal = (row, idx) => {
            const val = row[idx] || '';
            return this.formatIfDate(val, idx + 1);
        };
        
        let body = `Bonjour ${nomSTT},\n\n`;
        
        if (type === 'aPlanifier') {
            body += `Merci de nous communiquer vos dates de disponibilité pour les travaux suivants :\n\n`;
        } else {
            body += `Rappel concernant les travaux planifiés suivants :\n\n`;
        }

        rows.forEach((row, idx) => {
            const numClient = String(row[0] || '').trim();
            const numDevis = String(row[2] || '').trim();
            const numTravaux = numClient + 'TX' + numDevis;
            
            body += `════════════════════════════════════════\n`;
            body += `       N° TRAVAUX : ${numTravaux}\n`;
            body += `════════════════════════════════════════\n\n`;
            
            body += `${this.allHeaders[57] || 'Commande'} : ${getVal(row, 57)}\n`;
            body += `Rédacteur Devis : ${row.redacteur_converted || ''}\n`;
            
            // Technicien : Trigramme + Nom complet + Téléphone (depuis contacts.json)
            const techCode = String(row.tech_code || '').trim();
            let techInfo = row.tech_converted || '';
            if (techCode && typeof getTechContact === 'function') {
                const techContact = getTechContact(techCode);
                if (techContact) {
                    if (techContact.nom) techInfo += ' - ' + techContact.nom;
                    if (techContact.tel) {
                        let tel = String(techContact.tel);
                        if (tel.length === 9) tel = '0' + tel;
                        techInfo += ' - Tél: ' + tel;
                    }
                }
            }
            body += `Technicien du site : ${techInfo}\n\n`;
            
            body += `--- INFORMATIONS CLIENT ---\n`;
            body += `${this.allHeaders[9] || 'Nom Client'} : ${getVal(row, 9)}\n`;
            body += `${this.allHeaders[7] || 'Adresse'} : ${getVal(row, 7)}\n`;
            body += `${this.allHeaders[33] || 'Adresse 2'} : ${getVal(row, 33)}\n`;
            body += `${this.allHeaders[34] || 'Ville'} : ${getVal(row, 34)}\n`;
            body += `${this.allHeaders[36] || 'Contact'} : ${getVal(row, 36)}\n`;
            body += `${this.allHeaders[39] || 'Email'} : ${getVal(row, 39)}\n`;
            body += `${this.allHeaders[42] || 'Tél'} : ${getVal(row, 42)}\n\n`;
            
            body += `--- DÉTAIL DES TRAVAUX ---\n`;
            body += `${this.allHeaders[12] || 'Pièce 1'} : ${getVal(row, 12)}\n`;
            body += `${this.allHeaders[14] || 'Pièce 2'} : ${getVal(row, 14)}\n`;
            body += `${this.allHeaders[16] || 'Pièce 3'} : ${getVal(row, 16)}\n`;
            body += `${this.allHeaders[18] || 'Pièce 4'} : ${getVal(row, 18)}\n`;
            body += `${this.allHeaders[20] || 'Pièce 5'} : ${getVal(row, 20)}\n\n`;
            
            if (type === 'planifies' && row.pl_stt) {
                body += `📅 Date prévue : ${this.formatIfDate(row.pl_stt, 51)}\n\n`;
            }

            // Enregistrer l'historique
            if (!this.emailHistory[row.uniqueKey]) this.emailHistory[row.uniqueKey] = [];
            this.emailHistory[row.uniqueKey].unshift(new Date().toISOString());
            if (this.emailHistory[row.uniqueKey].length > 2) this.emailHistory[row.uniqueKey].pop();
        });

        // Sauvegarder l'historique
        localStorage.setItem('travaux_email_history', JSON.stringify(this.emailHistory));

        body += `════════════════════════════════════════\n\n`;
        
        if (type === 'aPlanifier') {
            body += `Merci de nous confirmer vos disponibilités.\n\nCordialement`;
        } else {
            body += `Merci de nous confirmer la bonne réalisation des travaux.\n\nCordialement`;
        }
        
        const subject = type === 'aPlanifier' 
            ? `Demande de disponibilité - ${rows.length} travaux - ${nomSTT}`
            : `Rappel travaux planifiés - ${rows.length} travaux - ${nomSTT}`;
        
        console.log('📧 Email STT:', email, '| Code:', sttCode);
        window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    },

    sendEmailRedacteur() {
        const redacteurName = document.getElementById('travauxRedacteurFilter').value;
        if (redacteurName === 'TOUS' || this.filtered.length === 0) return;
        
        const email = this.filtered[0].redacteur_email || '';
        if (!email) { alert('Email non trouvé.'); return; }
        
        let body = `Salut ${redacteurName},\n\nDevis et travaux maintenance à te planifier\n\n`;
        body += 'Nom du client/ N° devis /Nom du client/ Détail site/ Adresse/ Ville/ Contact site/ email contact/ Pieces 1/ Pieces 2/ Pieces 3/ Pieces 4/ Pieces 5\n\n';
        
        this.filtered.forEach((row, i) => {
            let nomClient = String(row[0] || '').trim();
            let devis = String(row[2] || '').replace(/[\r\n]+/g, " ").trim();
            body += nomClient + ' TX ' + devis;
            body += ' ---- ---- ---- ';
            let detailSite = String(row[9] || '').replace(/[\r\n]+/g, " ").trim();
            body += nomClient + ' ---- ';
            let adresse = String(row[7] || '').replace(/[\r\n]+/g, " ").trim();
            body += detailSite + ' ---- ';
            body += adresse + ' ---- ';
            let ville = String(row[34] || '').replace(/[\r\n]+/g, " ").trim();
            body += ville + ' ---- ';
            let contact = String(row[36] || '').replace(/[\r\n]+/g, " ").trim();
            body += contact + ' ---- ';
            let emailContact = String(row[39] || '').replace(/[\r\n]+/g, " ").trim();
            body += emailContact + ' ---- ';
            [12, 14, 16, 18, 20].forEach((colIdx, idx) => {
                let piece = String(row[colIdx] || '').replace(/[\r\n]+/g, " ").trim();
                body += piece;
                if (idx < 4) body += ' ---- ';
            });
            body += '\n\n';
        });
        
        window.location.href = `mailto:${email}?subject=Suivi Travaux ${redacteurName}&body=${encodeURIComponent(body)}`;
    },

    // Modals Stats
    openModalCA() {
        const byTech = {};
        this.filtered.forEach(r => {
            const t = r.tech_converted || 'Non défini';
            if (!byTech[t]) byTech[t] = { count: 0, ca: 0 };
            byTech[t].count++;
            byTech[t].ca += r.ca;
        });
        
        this.showStatsModal('💰 Détail Chiffre d\'Affaires', byTech, 'ca');
    },

    openModalSecteur() {
        const bySecteur = {};
        this.filtered.forEach(r => {
            const s = r.secteur;
            if (!bySecteur[s]) bySecteur[s] = { count: 0, ca: 0 };
            bySecteur[s].count++;
            bySecteur[s].ca += r.ca;
        });
        
        this.showStatsModal('📊 Détail par Secteur', bySecteur, 'count');
    },

    openModalTechnicien() {
        const byTech = {};
        this.filtered.forEach(r => {
            const t = r.tech_converted || 'Non défini';
            if (!byTech[t]) byTech[t] = { count: 0, ca: 0 };
            byTech[t].count++;
            byTech[t].ca += r.ca;
        });
        
        this.showStatsModal('👷 Détail par Technicien', byTech, 'count');
    },

    openModalStatsStt() {
        const byStt = {};
        this.filtered.filter(r => r.has_stt).forEach(r => {
            const s = r.stt_converted || 'Non défini';
            if (!byStt[s]) byStt[s] = { count: 0, ca: 0, budget: 0 };
            byStt[s].count++;
            byStt[s].ca += r.ca;
            byStt[s].budget += r.budget_stt;
        });
        
        this.showStatsModal('🏢 Statistiques Sous-traitants', byStt, 'count');
    },

    openModalBudgetStt() {
        const byStt = {};
        this.filtered.filter(r => r.has_stt).forEach(r => {
            const s = r.stt_converted || 'Non défini';
            if (!byStt[s]) byStt[s] = { count: 0, budget: 0 };
            byStt[s].count++;
            byStt[s].budget += r.budget_stt || 0;
        });
        
        let html = '<div class="stats-grid-modal">';
        let totalBudget = 0;
        
        Object.entries(byStt).sort((a, b) => b[1].budget - a[1].budget).forEach(([name, data]) => {
            totalBudget += data.budget;
            html += `<div class="stats-row">
                <span class="stats-name">${name}</span>
                <span class="stats-count">${data.count} travaux</span>
                <span class="stats-value">${formatCurrency(data.budget)}</span>
            </div>`;
        });
        
        html += '</div>';
        
        const titleEl = document.getElementById('travauxStatsModalTitle');
        if (titleEl) titleEl.textContent = '💰 Détail Budget Sous-traitants';
        
        const contentEl = document.getElementById('travauxStatsContent');
        if (contentEl) contentEl.innerHTML = html;
        
        const totalEl = document.getElementById('travauxStatsTotal');
        if (totalEl) {
            totalEl.innerHTML = `
                <div class="total-label">💰 Total Budget STT</div>
                <div class="total-value">${formatCurrency(totalBudget)}</div>
            `;
            totalEl.style.background = 'linear-gradient(135deg, #f97316 0%, #ea580c 100%)';
        }
        
        const modal = document.getElementById('travauxStatsModal');
        if (modal) modal.classList.add('active');
    },

    showStatsModal(title, data, mainField) {
        let html = '<div class="stats-grid-modal">';
        let total = 0;
        let totalCA = 0;
        
        Object.entries(data).sort((a, b) => b[1][mainField] - a[1][mainField]).forEach(([name, d]) => {
            total += d.count;
            totalCA += d.ca || 0;
            html += `<div class="stats-row">
                <span class="stats-name">${name}</span>
                <span class="stats-count">${d.count} travaux</span>
                <span class="stats-value">${formatCurrency(d.ca || 0)}</span>
            </div>`;
        });
        
        html += '</div>';
        
        const titleEl = document.getElementById('travauxStatsModalTitle');
        if (titleEl) titleEl.textContent = title;
        
        const contentEl = document.getElementById('travauxStatsContent');
        if (contentEl) contentEl.innerHTML = html;
        
        const totalEl = document.getElementById('travauxStatsTotal');
        if (totalEl) {
            totalEl.innerHTML = `
                <div class="total-label">${mainField === 'ca' ? '💰 Total CA' : '📊 Total'}</div>
                <div class="total-value">${mainField === 'ca' ? formatCurrency(totalCA) : total + ' travaux'}</div>
            `;
            totalEl.style.background = '';
        }
        
        const modal = document.getElementById('travauxStatsModal');
        if (modal) modal.classList.add('active');
    },

    closeStatsModal() {
        const modal = document.getElementById('travauxStatsModal');
        if (modal) modal.classList.remove('active');
    }
};


// ============================================
// MODULE DEVIS - CODE EXACT DU FICHIER ORIGINAL
// ============================================

// Variables globales IDENTIQUES au fichier DEVIS.html

console.log('✅ travaux.js chargé');
