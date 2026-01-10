// ============================================
// DSF.JS - Module DSF Tracker (Cloture/Planif/Resp)
// GESTION PRO - EasyLog Pro
// ============================================
// Dépend de: config.js (APP, MONTH_NAMES)
//            utils.js (formatDateDDMMYYYY)
// ============================================

const DSFMODAL = { 
    type:'cloture', 
    sector:'S1', 
    stt:'ALL', 
    mois:'ALL', 
    data:[], 
    filtered:[], 
    original: [], // Pour garder l'ordre initial
    sortCol: null, // Colonne actuellement triée
    sortDir: null, // 'asc', 'desc', ou null
    history:JSON.parse(localStorage.getItem('dsf_mail_history')||'{}') 
};

// Fonction de tri du tableau DSF
function sortDSFTable(col) {
    // Reset toutes les icônes
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.textContent = '⇅';
        icon.classList.remove('asc', 'desc');
    });
    
    const iconEl = document.getElementById('sort-' + col);
    
    // Déterminer la nouvelle direction
    if (DSFMODAL.sortCol !== col) {
        // Nouvelle colonne : tri croissant
        DSFMODAL.sortCol = col;
        DSFMODAL.sortDir = 'asc';
    } else if (DSFMODAL.sortDir === 'asc') {
        // Même colonne, était croissant : tri décroissant
        DSFMODAL.sortDir = 'desc';
    } else if (DSFMODAL.sortDir === 'desc') {
        // Même colonne, était décroissant : retour à l'état initial
        DSFMODAL.sortCol = null;
        DSFMODAL.sortDir = null;
    }
    
    // Appliquer le tri
    if (DSFMODAL.sortDir === null) {
        // Retour à l'ordre original (après filtres)
        DSFMODAL.filtered = [...DSFMODAL.original];
        if (iconEl) iconEl.textContent = '⇅';
    } else {
        // Trier
        DSFMODAL.filtered.sort((a, b) => {
            let valA = a[col] || '';
            let valB = b[col] || '';
            
            // Traitement spécial pour moisSTT (numérique)
            if (col === 'moisSTT') {
                valA = parseInt(valA) || 99;
                valB = parseInt(valB) || 99;
            } else {
                valA = String(valA).toLowerCase();
                valB = String(valB).toLowerCase();
            }
            
            if (valA < valB) return DSFMODAL.sortDir === 'asc' ? -1 : 1;
            if (valA > valB) return DSFMODAL.sortDir === 'asc' ? 1 : -1;
            return 0;
        });
        
        // Mettre à jour l'icône
        if (iconEl) {
            iconEl.textContent = DSFMODAL.sortDir === 'asc' ? '↑' : '↓';
            iconEl.classList.add(DSFMODAL.sortDir);
        }
    }
    
    // Re-rendre le tableau
    renderDSFTable();
    
    console.log(`🔄 Tri: ${col} ${DSFMODAL.sortDir || 'initial'}`);
}

function openDSFModal(type, sector) {
    DSFMODAL.type = type; DSFMODAL.sector = sector; DSFMODAL.stt = 'ALL'; DSFMODAL.mois = 'ALL';
    DSFMODAL.sortCol = null; DSFMODAL.sortDir = null; // Reset tri
    
    // Utiliser APP.data directement
    let src = [];
    if (type === 'cloture' && APP.data.dsfCloture) src = APP.data.dsfCloture;
    else if (type === 'planif' && APP.data.dsfPlanif) src = APP.data.dsfPlanif;
    else if (type === 'resp' && APP.data.dsfResp) src = APP.data.dsfResp;
    
    console.log(`📋 openDSFModal: type=${type}, sector=${sector}, src.length=${src.length}`);
    
    // Filtrer par secteur (AUTRES = tous ceux qui ne sont pas S1/S2/S3)
    if (sector === 'AUTRES') {
        DSFMODAL.data = src.filter(r => !['S1', 'S2', 'S3'].includes(r.secteur || ''));
    } else {
        DSFMODAL.data = src.filter(r => (r.secteur || '') === sector);
    }
    
    console.log(`📋 Après filtre secteur: ${DSFMODAL.data.length} lignes`);
    
    DSFMODAL.filtered = [...DSFMODAL.data];
    DSFMODAL.original = [...DSFMODAL.data]; // Sauvegarder l'ordre original
    
    const labels = { cloture:'📋 DSF Non Clôturés', planif:'📅 DSF Non Planifiés', resp:'⚠️ DSF Sans Responsable' };
    
    // Afficher le modal d'abord
    document.getElementById('dsfModal').style.display = 'flex';
    
    // Reset icônes de tri
    document.querySelectorAll('.sort-icon').forEach(icon => {
        icon.textContent = '⇅';
        icon.classList.remove('asc', 'desc');
    });
    
    // Puis mettre à jour le contenu (après que le DOM soit visible)
    setTimeout(() => {
        document.getElementById('dsfModalTitle').textContent = `${labels[type]} - ${sector}`;
        document.getElementById('dsfMailStatus').textContent = '';
        renderDSFMoisFilters();
        renderDSFSttFilters();
        renderDSFTable();
    }, 10);
}

function closeDSFModal() { document.getElementById('dsfModal').style.display = 'none'; }

// ============================================
// MODALE TRAVAUX RESTANTS (PL TECH vide) + RELANCES
// ============================================
const TRAVAUX_RESTANTS = {
    sector: null,
    allData: [],
    filtered: [],
    emailHistory: JSON.parse(localStorage.getItem('travaux_email_history') || '{}'),
    commandeHistory: JSON.parse(localStorage.getItem('travaux_commande_history') || '{}')
};

function openTravauxRestantsModal(sector) {
    TRAVAUX_RESTANTS.sector = sector;
    TRAVAUX_RESTANTS.allData = DASHBOARD.travauxRestants ? DASHBOARD.travauxRestants[sector] || [] : [];
    TRAVAUX_RESTANTS.filtered = [...TRAVAUX_RESTANTS.allData];
    
    document.getElementById('travauxRestantsTitle').textContent = `🔧 Travaux Restants - ${sector}`;
    
    // Reset des filtres
    document.getElementById('travauxRestantsRedacteurFilter').value = 'TOUS';
    document.getElementById('travauxRestantsTechFilter').value = 'TOUS';
    document.getElementById('travauxRestantsSttFilter').value = 'TOUS';
    
    // Remplir les filtres dynamiques
    updateTravauxRestantsFilters();
    
    // Afficher le tableau
    renderTravauxRestantsTable();
    
    document.getElementById('travauxRestantsModal').style.display = 'flex';
}

function updateTravauxRestantsFilters() {
    const redacteurVal = document.getElementById('travauxRestantsRedacteurFilter').value;
    const techVal = document.getElementById('travauxRestantsTechFilter').value;
    const sttVal = document.getElementById('travauxRestantsSttFilter').value;
    
    // Filtrer les données pour chaque dropdown (en tenant compte des autres filtres)
    const getFilteredForDropdown = (excludeFilter) => {
        return TRAVAUX_RESTANTS.allData.filter(row => {
            if (excludeFilter !== 'redacteur' && redacteurVal !== 'TOUS') {
                if ((row.redacteur_converted || 'Sans Rédacteur') !== redacteurVal) return false;
            }
            if (excludeFilter !== 'tech' && techVal !== 'TOUS') {
                if ((row.tech_converted || 'Sans Tech') !== techVal) return false;
            }
            if (excludeFilter !== 'stt') {
                if (sttVal === 'AVEC' && !row.stt_converted) return false;
                if (sttVal === 'SANS' && row.stt_converted) return false;
                if (sttVal.startsWith('STT_') && row.stt_converted !== sttVal.substring(4)) return false;
            }
            return true;
        });
    };
    
    // Rédacteur filter
    const redacteurData = getFilteredForDropdown('redacteur');
    const redacteurCounts = {};
    redacteurData.forEach(row => {
        const red = row.redacteur_converted || 'Sans Rédacteur';
        redacteurCounts[red] = (redacteurCounts[red] || 0) + 1;
    });
    const redacteurFilter = document.getElementById('travauxRestantsRedacteurFilter');
    const currentRedacteur = redacteurFilter.value;
    redacteurFilter.innerHTML = `<option value="TOUS">Tous Rédacteurs (${redacteurData.length})</option>`;
    Object.entries(redacteurCounts).sort((a,b) => b[1] - a[1]).forEach(([r, c]) => {
        redacteurFilter.innerHTML += `<option value="${r}">${r} (${c})</option>`;
    });
    if ([...redacteurFilter.options].some(o => o.value === currentRedacteur)) {
        redacteurFilter.value = currentRedacteur;
    }
    
    // Tech filter
    const techData = getFilteredForDropdown('tech');
    const techCounts = {};
    techData.forEach(row => {
        const tech = row.tech_converted || 'Sans Tech';
        techCounts[tech] = (techCounts[tech] || 0) + 1;
    });
    const techFilter = document.getElementById('travauxRestantsTechFilter');
    const currentTech = techFilter.value;
    techFilter.innerHTML = `<option value="TOUS">Tous Tech (${techData.length})</option>`;
    Object.entries(techCounts).sort((a,b) => b[1] - a[1]).forEach(([t, c]) => {
        techFilter.innerHTML += `<option value="${t}">${t} (${c})</option>`;
    });
    if ([...techFilter.options].some(o => o.value === currentTech)) {
        techFilter.value = currentTech;
    }
    
    // STT filter
    const sttData = getFilteredForDropdown('stt');
    const sttCounts = {};
    let withSttCount = 0, withoutSttCount = 0;
    sttData.forEach(row => {
        if (row.stt_converted) {
            withSttCount++;
            sttCounts[row.stt_converted] = (sttCounts[row.stt_converted] || 0) + 1;
        } else {
            withoutSttCount++;
        }
    });
    const sttFilter = document.getElementById('travauxRestantsSttFilter');
    const currentStt = sttFilter.value;
    sttFilter.innerHTML = `<option value="TOUS">Tous STT (${sttData.length})</option>`;
    sttFilter.innerHTML += `<option value="AVEC">Avec STT (${withSttCount})</option>`;
    sttFilter.innerHTML += `<option value="SANS">Sans STT (${withoutSttCount})</option>`;
    Object.entries(sttCounts).sort((a,b) => b[1] - a[1]).forEach(([s, c]) => {
        sttFilter.innerHTML += `<option value="STT_${s}">${s} (${c})</option>`;
    });
    if ([...sttFilter.options].some(o => o.value === currentStt)) {
        sttFilter.value = currentStt;
    }
}

function filterTravauxRestants() {
    const redacteurVal = document.getElementById('travauxRestantsRedacteurFilter').value;
    const techVal = document.getElementById('travauxRestantsTechFilter').value;
    const sttVal = document.getElementById('travauxRestantsSttFilter').value;
    
    TRAVAUX_RESTANTS.filtered = TRAVAUX_RESTANTS.allData.filter(row => {
        // Filtre rédacteur
        if (redacteurVal !== 'TOUS' && (row.redacteur_converted || 'Sans Rédacteur') !== redacteurVal) return false;
        
        // Filtre technicien
        if (techVal !== 'TOUS' && (row.tech_converted || 'Sans Tech') !== techVal) return false;
        
        // Filtre STT
        if (sttVal === 'AVEC' && !row.stt_converted) return false;
        if (sttVal === 'SANS' && row.stt_converted) return false;
        if (sttVal.startsWith('STT_') && row.stt_converted !== sttVal.substring(4)) return false;
        
        return true;
    });
    
    // Mettre à jour les autres filtres dynamiquement
    updateTravauxRestantsFilters();
    
    renderTravauxRestantsTable();
}

function renderTravauxRestantsTable() {
    const data = TRAVAUX_RESTANTS.filtered;
    
    document.getElementById('travauxRestantsCount').textContent = data.length;
    
    const tbody = document.getElementById('travauxRestantsTableBody');
    if (data.length === 0) {
        tbody.innerHTML = '<tr><td colspan="9" style="text-align:center;padding:30px;color:var(--text-muted);">Aucun travail trouvé</td></tr>';
        updateTravauxRestantsSelection();
        return;
    }
    
    let html = '';
    data.forEach((row, idx) => {
        const numClient = row._raw ? row._raw[0] || '-' : '-';
        const numDevis = row._raw ? row._raw[2] || '-' : '-';
        // JOINTURE : Nom du site depuis "Liste des contrats en cours"
        const nomSite = row.nom_site || (row._raw ? row._raw[5] || '-' : '-');
        const detailSite = row._raw ? row._raw[8] || '' : '';
        const redacteur = row.redacteur_converted || '-';
        const tech = row.tech_converted || '-';
        const stt = row.stt_converted || '-';
        const secteur = row.secteur || '-';
        
        // Combiner nom site et détail site
        let siteDisplay = nomSite;
        if (detailSite && detailSite !== nomSite) {
            siteDisplay = `${nomSite} <small style="color:var(--text-muted);">- ${detailSite}</small>`;
        }
        
        // Historique des relances
        const uniqueKey = `${numClient}_${numDevis}`;
        const history = TRAVAUX_RESTANTS.emailHistory[uniqueKey] || [];
        const commandeHist = TRAVAUX_RESTANTS.commandeHistory[uniqueKey] || [];
        
        let historyHtml = '';
        if (history.length > 0) {
            historyHtml += history.slice(0, 2).map(d => {
                const date = new Date(d);
                return `<span>📧 ${date.toLocaleDateString('fr-FR')}</span>`;
            }).join('');
        }
        if (commandeHist.length > 0) {
            historyHtml += commandeHist.slice(0, 2).map(d => {
                const date = new Date(d);
                return `<span>📦 ${date.toLocaleDateString('fr-FR')}</span>`;
            }).join('');
        }
        if (!historyHtml) historyHtml = '<span style="color:#94a3b8;">Aucune</span>';
        
        const hasRelance = (history.length > 0 || commandeHist.length > 0) ? 'has-relance' : '';
        
        html += `<tr class="${hasRelance}">
            <td style="text-align:center;"><input type="checkbox" class="travaux-cb" data-idx="${idx}" checked onchange="updateTravauxRestantsSelection()"></td>
            <td><strong>${numClient}</strong></td>
            <td>${numDevis}</td>
            <td style="max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;" title="${nomSite} ${detailSite}">${siteDisplay}</td>
            <td>${redacteur}</td>
            <td>${tech}</td>
            <td>${stt}</td>
            <td><span class="sector-badge ${secteur.toLowerCase()}">${secteur}</span></td>
            <td class="relance-history">${historyHtml}</td>
        </tr>`;
    });
    tbody.innerHTML = html;
    
    updateTravauxRestantsSelection();
}

function toggleAllTravauxRestants(checked) {
    document.querySelectorAll('.travaux-cb').forEach(cb => cb.checked = checked);
    updateTravauxRestantsSelection();
}

function updateTravauxRestantsSelection() {
    const checked = document.querySelectorAll('.travaux-cb:checked');
    const selected = [...checked].map(cb => TRAVAUX_RESTANTS.filtered[parseInt(cb.dataset.idx)]);
    
    // Compter par Tech et STT
    const withStt = selected.filter(r => r && r.stt_converted).length;
    const total = selected.length;
    
    document.getElementById('travauxRestantsSelected').textContent = `${total} sélectionnés`;
    document.getElementById('relanceTechCount').textContent = total;
    document.getElementById('relanceSttCount').textContent = withStt;
    document.getElementById('lancementCommandeCount').textContent = total;
    
    // Activer/désactiver boutons
    document.getElementById('btnRelanceTechDashboard').disabled = total === 0;
    document.getElementById('btnRelanceSttDashboard').disabled = withStt === 0;
    document.getElementById('btnLancementCommande').disabled = total === 0;
    document.getElementById('btnRelanceTechDashboard').style.opacity = total === 0 ? '0.5' : '1';
    document.getElementById('btnRelanceSttDashboard').style.opacity = withStt === 0 ? '0.5' : '1';
    document.getElementById('btnLancementCommande').style.opacity = total === 0 ? '0.5' : '1';
}

function sendRelanceTravauxTech() {
    const checked = document.querySelectorAll('.travaux-cb:checked');
    const selected = [...checked].map(cb => TRAVAUX_RESTANTS.filtered[parseInt(cb.dataset.idx)]).filter(r => r);
    
    if (selected.length === 0) return;
    
    // Grouper par technicien
    const grouped = {};
    selected.forEach(row => {
        const tech = row.tech_converted || 'Sans Tech';
        if (!grouped[tech]) grouped[tech] = [];
        grouped[tech].push(row);
    });
    
    // Envoyer un email par technicien
    Object.entries(grouped).forEach(([tech, rows]) => {
        sendRelanceEmailTech(tech, rows);
    });
    
    // Rafraîchir le tableau
    setTimeout(() => renderTravauxRestantsTable(), 500);
}

function sendRelanceEmailTech(techName, rows) {
    // Récupérer email du technicien depuis contacts.json
    let email = '';
    const techCode = rows[0]?.tech_code || '';
    if (techCode && typeof getTechContact === 'function') {
        const techContact = getTechContact(techCode);
        if (techContact && techContact.mail) {
            email = techContact.mail;
        }
    }
    
    // Collecter tous les N° travaux pour l'objet
    const numTravauxList = rows.map(row => {
        const numClient = row._raw ? row._raw[0] || '' : '';
        const numDevis = row._raw ? row._raw[2] || '' : '';
        return numClient + 'TX' + numDevis;
    });
    
    let body = `Bonjour ${techName},\n\n`;
    body += `Merci de te planifier pour les travaux suivants :\n\n`;
    
    rows.forEach(row => {
        const numClient = row._raw ? row._raw[0] || '-' : '-';
        const numDevis = row._raw ? row._raw[2] || '-' : '-';
        const numTravaux = numClient + 'TX' + numDevis;
        // JOINTURE : Nom du site depuis CONTRATS
        const nomSite = row.nom_site || (row._raw ? row._raw[5] || '-' : '-');
        const objet = row._raw ? row._raw[6] || '-' : '-';
        const adresse = row._raw ? row._raw[7] || '-' : '-';
        const adresse2 = row._raw ? row._raw[33] || '' : '';
        const ville = row._raw ? row._raw[34] || '' : '';
        const contact = row._raw ? row._raw[36] || '-' : '-';
        const emailClient = row._raw ? row._raw[39] || '-' : '-';
        const telClient = row._raw ? row._raw[42] || '-' : '-';
        
        // Pièces (nature des travaux)
        const piece1 = row._raw ? row._raw[12] || '' : '';
        const piece2 = row._raw ? row._raw[14] || '' : '';
        const piece3 = row._raw ? row._raw[16] || '' : '';
        const piece4 = row._raw ? row._raw[18] || '' : '';
        const piece5 = row._raw ? row._raw[20] || '' : '';
        
        body += `════════════════════════════════════════\n`;
        body += `       N° TRAVAUX : ${numTravaux}\n`;
        body += `════════════════════════════════════════\n\n`;
        
        body += `--- INFORMATIONS CLIENT ---\n`;
        body += `Nom du site : ${nomSite}\n`;
        body += `Adresse : ${adresse}\n`;
        if (adresse2) body += `Adresse 2 : ${adresse2}\n`;
        if (ville) body += `Ville : ${ville}\n`;
        body += `Contact : ${contact}\n`;
        body += `Email : ${emailClient}\n`;
        body += `Tél : ${telClient}\n\n`;
        
        body += `--- NATURE DES TRAVAUX ---\n`;
        if (piece1) body += `• ${piece1}\n`;
        if (piece2) body += `• ${piece2}\n`;
        if (piece3) body += `• ${piece3}\n`;
        if (piece4) body += `• ${piece4}\n`;
        if (piece5) body += `• ${piece5}\n`;
        if (!piece1 && !piece2 && !piece3 && !piece4 && !piece5) body += `${objet}\n`;
        body += `\n`;
        
        // Enregistrer historique
        const uniqueKey = `${numClient}_${numDevis}`;
        if (!TRAVAUX_RESTANTS.emailHistory[uniqueKey]) TRAVAUX_RESTANTS.emailHistory[uniqueKey] = [];
        TRAVAUX_RESTANTS.emailHistory[uniqueKey].unshift(new Date().toISOString());
        if (TRAVAUX_RESTANTS.emailHistory[uniqueKey].length > 2) TRAVAUX_RESTANTS.emailHistory[uniqueKey].pop();
    });
    
    // Sauvegarder historique (même clé que module Travaux)
    localStorage.setItem('travaux_email_history', JSON.stringify(TRAVAUX_RESTANTS.emailHistory));
    
    body += `════════════════════════════════════════\n\n`;
    body += `Merci de te planifier rapidement.\n\nCordialement`;
    
    // Objet avec tous les N° travaux séparés par /
    const subject = `Travaux ${numTravauxList.join(' / ')}`;
    
    console.log('📧 Email Tech:', email, '| Tech:', techName);
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function sendRelanceTravauxStt() {
    const checked = document.querySelectorAll('.travaux-cb:checked');
    const selected = [...checked].map(cb => TRAVAUX_RESTANTS.filtered[parseInt(cb.dataset.idx)]).filter(r => r && r.stt_converted);
    
    if (selected.length === 0) return;
    
    // Grouper par STT
    const grouped = {};
    selected.forEach(row => {
        const stt = row.stt_converted;
        if (!grouped[stt]) grouped[stt] = [];
        grouped[stt].push(row);
    });
    
    // Envoyer un email par STT
    Object.entries(grouped).forEach(([stt, rows]) => {
        sendRelanceEmailStt(stt, rows);
    });
    
    // Rafraîchir le tableau
    setTimeout(() => renderTravauxRestantsTable(), 500);
}

function sendRelanceEmailStt(sttName, rows) {
    // Récupérer email du STT depuis contacts.json
    let email = '';
    const sttCode = rows[0]?.stt_code || '';
    if (sttCode && typeof getSttContact === 'function') {
        const sttContact = getSttContact(sttCode);
        if (sttContact && sttContact.mail) {
            email = sttContact.mail;
        }
    }
    
    // Collecter tous les N° travaux pour l'objet
    const numTravauxList = rows.map(row => {
        const numClient = row._raw ? row._raw[0] || '' : '';
        const numDevis = row._raw ? row._raw[2] || '' : '';
        return numClient + 'TX' + numDevis;
    });
    
    let body = `Bonjour ${sttName},\n\n`;
    body += `Merci de nous communiquer une date d'intervention pour les travaux suivants :\n\n`;
    
    rows.forEach(row => {
        const numClient = row._raw ? row._raw[0] || '-' : '-';
        const numDevis = row._raw ? row._raw[2] || '-' : '-';
        const numTravaux = numClient + 'TX' + numDevis;
        // JOINTURE : Nom du site depuis CONTRATS
        const nomSite = row.nom_site || (row._raw ? row._raw[5] || '-' : '-');
        const objet = row._raw ? row._raw[6] || '-' : '-';
        const adresse = row._raw ? row._raw[7] || '-' : '-';
        const adresse2 = row._raw ? row._raw[33] || '' : '';
        const ville = row._raw ? row._raw[34] || '' : '';
        const contact = row._raw ? row._raw[36] || '-' : '-';
        const emailClient = row._raw ? row._raw[39] || '-' : '-';
        const telClient = row._raw ? row._raw[42] || '-' : '-';
        
        // Pièces (nature des travaux)
        const piece1 = row._raw ? row._raw[12] || '' : '';
        const piece2 = row._raw ? row._raw[14] || '' : '';
        const piece3 = row._raw ? row._raw[16] || '' : '';
        const piece4 = row._raw ? row._raw[18] || '' : '';
        const piece5 = row._raw ? row._raw[20] || '' : '';
        
        // Budget STT
        const budgetStt = row.budget_stt || 0;
        
        // Technicien du site
        const techCode = row.tech_code || '';
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
        
        body += `════════════════════════════════════════\n`;
        body += `       N° TRAVAUX : ${numTravaux}\n`;
        body += `════════════════════════════════════════\n\n`;
        
        body += `--- INFORMATIONS CLIENT ---\n`;
        body += `Nom du site : ${nomSite}\n`;
        body += `Adresse : ${adresse}\n`;
        if (adresse2) body += `Adresse 2 : ${adresse2}\n`;
        if (ville) body += `Ville : ${ville}\n`;
        body += `Contact : ${contact}\n`;
        body += `Email : ${emailClient}\n`;
        body += `Tél : ${telClient}\n\n`;
        
        body += `Technicien du site : ${techInfo}\n\n`;
        
        body += `--- NATURE DES TRAVAUX ---\n`;
        if (piece1) body += `• ${piece1}\n`;
        if (piece2) body += `• ${piece2}\n`;
        if (piece3) body += `• ${piece3}\n`;
        if (piece4) body += `• ${piece4}\n`;
        if (piece5) body += `• ${piece5}\n`;
        if (!piece1 && !piece2 && !piece3 && !piece4 && !piece5) body += `${objet}\n`;
        body += `\n`;
        
        body += `💰 Budget STT : ${budgetStt.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR'})}\n\n`;
        
        // Enregistrer historique
        const uniqueKey = `${numClient}_${numDevis}`;
        if (!TRAVAUX_RESTANTS.emailHistory[uniqueKey]) TRAVAUX_RESTANTS.emailHistory[uniqueKey] = [];
        TRAVAUX_RESTANTS.emailHistory[uniqueKey].unshift(new Date().toISOString());
        if (TRAVAUX_RESTANTS.emailHistory[uniqueKey].length > 2) TRAVAUX_RESTANTS.emailHistory[uniqueKey].pop();
    });
    
    // Sauvegarder historique (même clé que module Travaux)
    localStorage.setItem('travaux_email_history', JSON.stringify(TRAVAUX_RESTANTS.emailHistory));
    
    body += `════════════════════════════════════════\n\n`;
    body += `Merci de nous communiquer une date d'intervention.\n\nCordialement`;
    
    // Objet avec tous les N° travaux séparés par /
    const subject = `Travaux ${numTravauxList.join(' / ')}`;
    
    console.log('📧 Email STT:', email, '| STT:', sttName);
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
}

function sendLancementCommande() {
    const checked = document.querySelectorAll('.travaux-cb:checked');
    const selected = [...checked].map(cb => TRAVAUX_RESTANTS.filtered[parseInt(cb.dataset.idx)]).filter(r => r);
    
    if (selected.length === 0) return;
    
    // Collecter tous les N° travaux pour l'objet
    const numTravauxList = selected.map(row => {
        const numClient = row._raw ? row._raw[0] || '' : '';
        const numDevis = row._raw ? row._raw[2] || '' : '';
        return numClient + 'TX' + numDevis;
    });
    
    // Destinataires fixes
    const email = 'anne-marie@aviss-securite.fr;adv2@aviss-securite.fr';
    
    let body = `Salut Anne Marie,\n\n`;
    
    selected.forEach(row => {
        const numClient = row._raw ? row._raw[0] || '-' : '-';
        const numDevis = row._raw ? row._raw[2] || '-' : '-';
        const numTravaux = numClient + 'TX' + numDevis;
        
        // Pièces (nature des travaux)
        const piece1 = row._raw ? row._raw[12] || '' : '';
        const piece2 = row._raw ? row._raw[14] || '' : '';
        const piece3 = row._raw ? row._raw[16] || '' : '';
        const piece4 = row._raw ? row._raw[18] || '' : '';
        const piece5 = row._raw ? row._raw[20] || '' : '';
        
        // Budget STT
        const budgetStt = row.budget_stt || 0;
        const hasStt = row.stt_converted ? true : false;
        const prestation = hasStt ? row.stt_converted : 'AVISS';
        
        body += `════════════════════════════════════════\n`;
        body += `       N° TRAVAUX : ${numTravaux}\n`;
        body += `════════════════════════════════════════\n\n`;
        
        body += `Numéro de devis : ${numDevis}\n\n`;
        
        body += `Prestation : ${prestation}\n\n`;
        
        if (hasStt && budgetStt > 0) {
            body += `Budget STT : ${budgetStt.toLocaleString('fr-FR', {style: 'currency', currency: 'EUR'})}\n\n`;
        }
        
        body += `Matériel à envoyer sur site ou à dispo magasin\n\n`;
        
        body += `--- NATURE DES TRAVAUX ---\n`;
        if (piece1) body += `• ${piece1}\n`;
        if (piece2) body += `• ${piece2}\n`;
        if (piece3) body += `• ${piece3}\n`;
        if (piece4) body += `• ${piece4}\n`;
        if (piece5) body += `• ${piece5}\n`;
        body += `\n`;
        
        // Enregistrer historique commande
        const uniqueKey = `${numClient}_${numDevis}`;
        if (!TRAVAUX_RESTANTS.commandeHistory[uniqueKey]) TRAVAUX_RESTANTS.commandeHistory[uniqueKey] = [];
        TRAVAUX_RESTANTS.commandeHistory[uniqueKey].unshift(new Date().toISOString());
        if (TRAVAUX_RESTANTS.commandeHistory[uniqueKey].length > 2) TRAVAUX_RESTANTS.commandeHistory[uniqueKey].pop();
    });
    
    // Sauvegarder historique commande
    localStorage.setItem('travaux_commande_history', JSON.stringify(TRAVAUX_RESTANTS.commandeHistory));
    
    body += `════════════════════════════════════════\n\n`;
    body += `Merci`;
    
    // Objet avec tous les N° travaux séparés par /
    const subject = `Travaux ${numTravauxList.join(' / ')}`;
    
    console.log('📦 Email Commande:', email);
    window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    
    // Rafraîchir le tableau
    setTimeout(() => renderTravauxRestantsTable(), 500);
}

function closeTravauxRestantsModal() {
    document.getElementById('travauxRestantsModal').style.display = 'none';
}

function renderDSFMoisFilters() {
    const counts = {}; DSFMODAL.data.forEach(r => { const m = r.moisSTT || 'Sans mois'; counts[m] = (counts[m]||0)+1; });
    document.getElementById('dsfMoisAll').textContent = DSFMODAL.data.length;
    let html = '';
    Object.entries(counts).sort((a,b) => (parseInt(a[0])||99)-(parseInt(b[0])||99)).forEach(([m,c]) => {
        const active = DSFMODAL.mois===m ? 'active' : '';
        const label = m==='Sans mois' ? m : `M${m}`;
        html += `<button class="dsf-flt-btn ${active}" data-mois="${m}" onclick="filterDSFMois('${m}')">${label} <span class="dsf-flt-cnt">${c}</span></button>`;
    });
    document.getElementById('dsfMoisContainer').innerHTML = html;
    document.querySelector('.dsf-flt-btn[data-mois="ALL"]')?.classList.toggle('active', DSFMODAL.mois==='ALL');
}

function renderDSFSttFilters() {
    const base = DSFMODAL.mois==='ALL' ? DSFMODAL.data : DSFMODAL.data.filter(r => (r.moisSTT||'Sans mois')===DSFMODAL.mois);
    const counts = {}; base.forEach(r => { const s = r.stt || 'Sans STT'; counts[s] = (counts[s]||0)+1; });
    document.getElementById('dsfSttAll').textContent = base.length;
    let html = '';
    Object.entries(counts).sort((a,b) => b[1]-a[1]).forEach(([s,c]) => {
        const active = DSFMODAL.stt===s ? 'active' : '';
        html += `<button class="dsf-flt-btn ${active}" data-stt="${s}" onclick="filterDSFStt('${s.replace(/'/g,"\\'")}')">${s} <span class="dsf-flt-cnt">${c}</span></button>`;
    });
    document.getElementById('dsfSttContainer').innerHTML = html;
    document.querySelector('.dsf-flt-btn[data-stt="ALL"]')?.classList.toggle('active', DSFMODAL.stt==='ALL');
}

function filterDSFMois(m) {
    DSFMODAL.mois = m; DSFMODAL.stt = 'ALL'; 
    DSFMODAL.sortCol = null; DSFMODAL.sortDir = null; // Reset tri
    applyDSFFilters();
    document.querySelectorAll('.dsf-flt-btn[data-mois]').forEach(b => b.classList.toggle('active', b.dataset.mois===m));
    document.querySelectorAll('.sort-icon').forEach(icon => { icon.textContent = '⇅'; icon.classList.remove('asc', 'desc'); });
    renderDSFSttFilters(); renderDSFTable();
}

function filterDSFStt(s) {
    DSFMODAL.stt = s; 
    DSFMODAL.sortCol = null; DSFMODAL.sortDir = null; // Reset tri
    applyDSFFilters();
    document.querySelectorAll('.dsf-flt-btn[data-stt]').forEach(b => b.classList.toggle('active', b.dataset.stt===s));
    document.querySelectorAll('.sort-icon').forEach(icon => { icon.textContent = '⇅'; icon.classList.remove('asc', 'desc'); });
    renderDSFTable();
}

function applyDSFFilters() {
    let f = [...DSFMODAL.data];
    if (DSFMODAL.mois!=='ALL') f = f.filter(r => (r.moisSTT||'Sans mois')===DSFMODAL.mois);
    if (DSFMODAL.stt!=='ALL') f = f.filter(r => (r.stt||'Sans STT')===DSFMODAL.stt);
    DSFMODAL.filtered = f;
    DSFMODAL.original = [...f]; // Sauvegarder l'ordre après filtrage
}

function renderDSFTable() {
    const tbody = document.getElementById('dsfTableBody');
    const countEl = document.getElementById('dsfModalCount');
    
    console.log('🔄 renderDSFTable - filtered:', DSFMODAL.filtered.length, 'tbody:', tbody ? 'OK' : 'MISSING');
    
    // Mettre à jour le compteur
    if (countEl) countEl.textContent = `${DSFMODAL.filtered.length} site${DSFMODAL.filtered.length > 1 ? 's' : ''}`;
    
    if (!tbody) {
        console.error('❌ dsfTableBody non trouvé!');
        return;
    }
    
    if (DSFMODAL.filtered.length === 0) { 
        tbody.innerHTML = '<tr><td colspan="6" style="text-align:center;padding:40px;color:var(--text-muted);font-size:1.1em;">📭 Aucun site trouvé</td></tr>'; 
        return; 
    }
    
    let html = '';
    DSFMODAL.filtered.forEach((r, i) => {
        const mois = r.moisSTT ? `M${r.moisSTT}` : '-';
        const secteurClass = (r.secteur || 'autres').toLowerCase();
        html += `<tr>
            <td style="padding:12px;font-weight:700;color:#667eea;">${r.numClient || '-'}</td>
            <td style="padding:12px;">${r.nomSite || '-'}</td>
            <td style="padding:12px;">${r.ville || '-'}</td>
            <td style="padding:12px;text-align:center;"><span style="background:linear-gradient(135deg,#667eea,#764ba2);color:white;padding:4px 12px;border-radius:15px;font-weight:600;font-size:0.85em;">${mois}</span></td>
            <td style="padding:12px;">${r.stt || '-'}</td>
            <td style="padding:12px;"><span class="sector-badge ${secteurClass}">${r.secteur || '-'}</span></td>
        </tr>`;
    });
    
    tbody.innerHTML = html;
    console.log('✅ Tableau rendu avec', DSFMODAL.filtered.length, 'lignes');
}

function sendDSFRelance() {
    const data = DSFMODAL.filtered;
    const statusEl = document.getElementById('dsfMailStatus');
    if (data.length===0) { statusEl.textContent = '❌ Aucun site à relancer'; return; }
    if (DSFMODAL.stt==='ALL') { statusEl.textContent = '⚠️ Sélectionnez un STT'; return; }
    
    const sttCode = data[0]?.sttCode || '';
    const sttName = DSFMODAL.stt;
    
    // Récupérer email STT depuis contacts.json (prioritaire) ou table Excel
    const sttContact = typeof getSttContact === 'function' ? getSttContact(sttCode) : null;
    const sttEmail = sttContact?.mail || APP.tables.stt.get(sttCode)?.email || '';
    
    const typeLabels = { cloture:'CLÔTURE', planif:'PLANIFICATION', resp:'RESPONSABLE' };
    const typeLabel = typeLabels[DSFMODAL.type];
    
    const subject = `⚠️ RAPPEL ${typeLabel} DSF : ${data.length} site(s) en attente pour ${sttName} (${DSFMODAL.sector})`;
    let body = `Bonjour ${sttName},\n\nVous avez des visites DSF en attente de ${typeLabel.toLowerCase()}.\n\n`;
    
    data.forEach(r => {
        // Récupérer infos tech depuis contacts.json
        const techCode = r.techCode || '';
        const techTrigramme = typeof getTechCode === 'function' ? getTechCode(techCode) : (r.techConverted || techCode);
        const techNom = typeof getTechNom === 'function' ? getTechNom(techCode) : '';
        const techTel = typeof getTechTel === 'function' ? getTechTel(techCode) : '';
        
        body += `════════════════════════════════════════\n       SITE N° : ${r.numClient||'-'}\n════════════════════════════════════════\n\n`;
        body += `Nom du Site : ${r.nomSite||'-'}\n`;
        body += `Ville : ${r.ville||'-'}\n`;
        body += `Mois STT : ${r.moisSTT||'-'}\n`;
        body += `Technicien : ${techTrigramme}${techNom ? ' - ' + techNom : ''}\n`;
        if (techTel) body += `Tél Tech : ${techTel}\n`;
        body += `\n`;
    });
    
    body += `════════════════════════════════════════\n\nMerci de nous renvoyer le rapport ou de nous indiquer la date de replanification.\n\nCordialement,\nVotre Tableau de Bord de Suivi`;
    
    const histKey = `${DSFMODAL.type}_${DSFMODAL.sector}_${sttCode}`;
    if (!DSFMODAL.history[histKey]) DSFMODAL.history[histKey] = [];
    DSFMODAL.history[histKey].unshift(new Date().toISOString());
    if (DSFMODAL.history[histKey].length > 2) DSFMODAL.history[histKey].pop();
    localStorage.setItem('dsf_mail_history', JSON.stringify(DSFMODAL.history));
    
    if (!sttEmail) {
        statusEl.textContent = '⚠️ Email STT non trouvé';
        // Ouvrir quand même le mail sans destinataire
    }
    
    window.location.href = `mailto:${sttEmail}?subject=${encodeURIComponent(subject)}&body=${encodeURIComponent(body)}`;
    statusEl.textContent = '✅ Client mail ouvert';
}

// ============================================
// MODULE DSF TRACKER - LOGIQUE
// ============================================
const DSF = {
    cloture: [],
    planif: [],
    resp: [],
    currentTab: 'cloture',
    filtered: [],
    history: {},

    init() {
        this.loadHistory();
        this.processData();
        this.updateStats();
        this.renderTable();
        this.updateDashboard();
    },

    loadHistory() {
        try {
            this.history = JSON.parse(localStorage.getItem('dsf_history') || '{}');
        } catch (e) {
            this.history = {};
        }
    },

    saveHistory() {
        localStorage.setItem('dsf_history', JSON.stringify(this.history));
    },

    processData() {
        // DSF CLOTURE - données déjà converties lors du chargement
        this.cloture = APP.data.dsfCloture.map((row, idx) => ({
            _raw: row._raw, _index: idx, _type: 'cloture',
            secteur: row.secteur || 'AUTRES', stt: row.stt || '', sttCode: row.sttCode || '',
            moisSTT: row.moisSTT || '', numClient: row.numClient || '', nomSite: row.nomSite || '', ville: row.ville || ''
        }));
        
        // DSF PLANIF
        this.planif = APP.data.dsfPlanif.map((row, idx) => ({
            _raw: row._raw, _index: idx, _type: 'planif',
            secteur: row.secteur || 'AUTRES', stt: row.stt || '', sttCode: row.sttCode || '',
            moisSTT: row.moisSTT || '', numClient: row.numClient || '', nomSite: row.nomSite || '', ville: row.ville || ''
        }));
        
        // DSF RESP
        this.resp = APP.data.dsfResp.map((row, idx) => ({
            _raw: row._raw, _index: idx, _type: 'resp',
            secteur: row.secteur || 'AUTRES', stt: row.stt || '', sttCode: row.sttCode || '',
            moisSTT: row.moisSTT || '', numClient: row.numClient || '', nomSite: row.nomSite || '', ville: row.ville || ''
        }));
    },

    processRow(values, idx, type) {
        const processed = { _raw: values, _index: idx, _type: type };
        
        values.forEach((val, i) => { processed[i] = val || ''; });
        
        // Secteur
        const secteurCode = String(values[35] || '').trim();
        const secteurInfo = APP.tables.tech.get(secteurCode);
        const secteurName = secteurInfo ? secteurInfo.value || secteurInfo.nom : secteurCode;
        
        let secteur = 'AUTRES';
        if (secteurName) {
            const lastTwo = String(secteurName).slice(-2).toUpperCase();
            if (lastTwo === 'S1') secteur = 'S1';
            else if (lastTwo === 'S2') secteur = 'S2';
            else if (lastTwo === 'S3') secteur = 'S3';
        }
        processed.secteur = secteur;
        
        // STT
        const sttCode = String(values[33] || '').trim();
        const sttInfo = APP.tables.stt.get(sttCode);
        processed.stt = sttInfo ? sttInfo.value : sttCode;
        
        // Infos site
        processed.numClient = values[0] || '';
        processed.nomSite = values[4] || '';
        processed.ville = values[6] || '';
        
        return processed;
    },

    updateStats() {
        const weekNum = APP.currentWeek.num;
        const weekEl = document.getElementById('dsfCurrentWeek');
        if (weekEl) weekEl.textContent = `S${weekNum}`;
        
        // Badges
        const badgeCloture = document.getElementById('dsfBadgeCloture');
        if (badgeCloture) badgeCloture.textContent = this.cloture.length;
        
        const badgePlanif = document.getElementById('dsfBadgePlanif');
        if (badgePlanif) badgePlanif.textContent = this.planif.length;
        
        const badgeResp = document.getElementById('dsfBadgeResp');
        if (badgeResp) badgeResp.textContent = this.resp.length;
        
        // Total
        const total = this.cloture.length + this.planif.length + this.resp.length;
        
        // Par secteur (basé sur l'onglet actuel)
        const data = this.getCurrentData();
        const s1 = data.filter(r => r.secteur === 'S1').length;
        const s2 = data.filter(r => r.secteur === 'S2').length;
        const s3 = data.filter(r => r.secteur === 'S3').length;
        
        // KPI Dashboard
        const kpiEl = document.getElementById('kpiDsf');
        if (kpiEl) kpiEl.textContent = total;
        
        const badgeEl = document.getElementById('badge-dsf');
        if (badgeEl) badgeEl.textContent = total;
        
        const alertEl = document.getElementById('alertDsfResp');
        if (alertEl) alertEl.textContent = this.resp.length;
    },

    getCurrentData() {
        if (this.currentTab === 'cloture') return this.cloture;
        if (this.currentTab === 'planif') return this.planif;
        return this.resp;
    },

    switchTab(tab) {
        this.currentTab = tab;
        document.querySelectorAll('.dsf-tab-btn').forEach(b => {
            b.classList.toggle('active', b.dataset.tab === tab);
        });
        this.applyFilter();
    },

    applyFilter() {
        const secteur = document.getElementById('dsfSectorFilterTable').value;
        let data = this.getCurrentData();
        
        if (secteur !== 'TOUS') {
            data = data.filter(r => r.secteur === secteur);
        }
        
        this.filtered = data;
        this.renderTable();
    },

    renderTable() {
        const thead = document.getElementById('dsfTableHead');
        const tbody = document.getElementById('dsfTrackerTableBody');
        
        if (!thead || !tbody) return;
        
        const countEl = document.getElementById('dsfResultCount');
        if (countEl) countEl.textContent = `${this.filtered.length} éléments`;
        
        if (this.filtered.length === 0) {
            const emptyEl = document.getElementById('dsfEmptyState');
            if (emptyEl) emptyEl.style.display = 'block';
            thead.innerHTML = '';
            tbody.innerHTML = '';
            return;
        }
        
        const emptyEl = document.getElementById('dsfEmptyState');
        if (emptyEl) emptyEl.style.display = 'none';
        
        thead.innerHTML = `<tr>
            <th>N° Client</th>
            <th>Nom Site</th>
            <th>Ville</th>
            <th>Secteur</th>
            <th>STT</th>
        </tr>`;
        
        tbody.innerHTML = this.filtered.map((row, idx) => `
            <tr onclick="DSF.showDetail(${idx})">
                <td>${row.numClient}</td>
                <td>${row.nomSite}</td>
                <td>${row.ville}</td>
                <td><span class="sector-badge ${row.secteur.toLowerCase()}">${row.secteur}</span></td>
                <td>${row.stt || '-'}</td>
            </tr>
        `).join('');
    },

    showDetail(idx) {
        const row = this.filtered[idx];
        const modal = document.getElementById('dsfDetailModal');
        if (!modal) return;
        
        const titleEl = document.getElementById('dsfModalTitle');
        if (titleEl) titleEl.textContent = `📈 DSF ${this.currentTab.toUpperCase()} - ${row.nomSite}`;
        
        let html = `<div class="detail-section">
            <div class="detail-section-content">
                <div class="detail-item"><div class="item-label">N° Client</div><div class="item-value">${row.numClient}</div></div>
                <div class="detail-item"><div class="item-label">Nom Site</div><div class="item-value">${row.nomSite}</div></div>
                <div class="detail-item"><div class="item-label">Ville</div><div class="item-value">${row.ville}</div></div>
                <div class="detail-item"><div class="item-label">Secteur</div><div class="item-value">${row.secteur}</div></div>
                <div class="detail-item"><div class="item-label">STT</div><div class="item-value">${row.stt || '-'}</div></div>
            </div>
        </div>`;
        
        const contentEl = document.getElementById('dsfDetailContent');
        if (contentEl) contentEl.innerHTML = html;
        modal.classList.add('active');
    },

    closeDetail() {
        const modal = document.getElementById('dsfDetailModal');
        if (modal) modal.classList.remove('active');
    },

    archiveWeek() {
        const weekKey = APP.currentWeek.label;
        
        this.history[weekKey] = {
            cloture: this.cloture.length,
            planif: this.planif.length,
            resp: this.resp.length,
            date: new Date().toISOString()
        };
        
        this.saveHistory();
        alert(`✅ Semaine ${APP.currentWeek.num} archivée !`);
    },

    updateDashboard() {
        // Mise à jour des alertes DSF sur le dashboard principal
    }
};

console.log('✅ dsf.js chargé');
