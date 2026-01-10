// ============================================
// DEVIS.JS - Module Gestion des Devis
// GESTION PRO - EasyLog Pro
// ============================================
// Dépend de: config.js (APP)
//            utils.js (formatDateDDMMYYYY, formatCurrency)
// ============================================

let devisData = [];
let devisColumnHeaders = [];
let devisSsiData = [];
let devisTechData = [];
let devisSttData = [];
let devisContratsData = []; // CONTRATS pour jointure Nom du site
let devisCurrentResults = [];
let devisSearchTimeout;
let devisCurrentIndex = 0;

// Fonction pour initialiser depuis APP.data (remplace handleFile)
// CODE IDENTIQUE à handleFile - juste source différente
function initDevisFromAppData() {
    if (!APP.data.devis || APP.data.devis.length === 0) {
        console.log('⚠️ Pas de données DEVIS');
        return;
    }

    // EXACTEMENT comme handleFile ligne 295:
    // columnHeaders = jsonData[0];
    devisColumnHeaders = APP.data.devisHeaders || [];

    // EXACTEMENT comme handleFile lignes 296-306:
    // devisData = jsonData.slice(1).map(row => {
    //     let obj = {};
    //     columnHeaders.forEach((header, index) => {
    //         let value = row[index];
    //         if (header && (header.toLowerCase().includes('date') || header === 'Date')) {
    //             value = excelDateToJSDate(value);
    //         }
    //         obj[header] = value !== undefined && value !== null && value !== '' ? value : null;
    //     });
    //     return obj;
    // }).filter(row => Object.values(row).some(val => val !== null && val !== ''));
    
    devisData = APP.data.devis.map(row => {
        const rawRow = row._raw || [];
        let obj = {};
        devisColumnHeaders.forEach((header, index) => {
            let value = rawRow[index];
            if (header && (header.toLowerCase().includes('date') || header === 'Date')) {
                value = devisExcelDateToJSDate(value);
            }
            obj[header] = value !== undefined && value !== null && value !== '' ? value : null;
        });
        return obj;
    }).filter(row => Object.values(row).some(val => val !== null && val !== ''));

    // EXACTEMENT comme handleFile lignes 309-316:
    // ssiData = ssiJsonData.slice(1).filter(...)
    devisSsiData = (APP.data.ssi || []).map(row => row._raw || []);
    
    // CONTRATS pour jointure Nom du site (col 10 = index 9)
    devisContratsData = (APP.data.contrats || []).map(row => row._raw || []);

    // EXACTEMENT comme handleFile lignes 319-326:
    // techData = techJsonData.slice(1).filter(...)
    devisTechData = APP.data.techRaw || [];
    // Fallback sur APP.tables.tech si APP.data.techRaw n'existe pas
    if (devisTechData.length === 0 && APP.tables && APP.tables.tech) {
        devisTechData = [];
        APP.tables.tech.forEach((info, code) => {
            devisTechData.push([code, info.value || '']);
        });
    }

    // EXACTEMENT comme handleFile lignes 329-336:
    // sttData = sttJsonData.slice(1).filter(...)
    devisSttData = APP.data.sttRaw || [];
    // Fallback sur APP.tables.stt si APP.data.sttRaw n'existe pas
    if (devisSttData.length === 0 && APP.tables && APP.tables.stt) {
        devisSttData = [];
        APP.tables.stt.forEach((info, code) => {
            devisSttData.push([code, info.value || '']);
        });
    }

    // EXACTEMENT comme handleFile lignes 340-342:
    // updateSttDropdown();
    // updateSynthese();
    // performSearch();
    devisCurrentResults = devisData;
    devisUpdateSttDropdown();
    devisUpdateSynthese();
    devisPerformSearch();

    console.log('📄 DEVIS initialisé:', devisData.length, 'devis');
}

// FONCTIONS EXACTES DU FICHIER DEVIS.html (avec préfixe devis pour éviter conflits)

function devisExcelDateToJSDate(excelDate) {
    if (!excelDate) return '';
    if (typeof excelDate === 'string') return excelDate;
    if (typeof excelDate === 'number') {
        const date = new Date((excelDate - 25569) * 86400 * 1000);
        return `${String(date.getDate()).padStart(2, '0')}/${String(date.getMonth() + 1).padStart(2, '0')}/${date.getFullYear()}`;
    }
    return excelDate;
}

function devisDebounceSearch() {
    clearTimeout(devisSearchTimeout);
    devisSearchTimeout = setTimeout(devisPerformSearch, 300);
}

function devisGetTechnicienName(codeKey) {
    if (!codeKey || !devisTechData || devisTechData.length === 0) return '';
    const codeStr = String(codeKey).trim().toUpperCase();
    for (let i = 0; i < devisTechData.length; i++) {
        const techCode = String(devisTechData[i][0] || '').trim().toUpperCase();
        if (techCode === codeStr) {
            return devisTechData[i][1] || '';
        }
    }
    return '';
}

function devisGetSiteNameFromSSI(clientNumber) {
    if (!clientNumber) return '';
    const clientStr = String(clientNumber).trim();
    
    // JOINTURE : Chercher d'abord dans CONTRATS col 10 (index 9)
    if (devisContratsData && devisContratsData.length > 0) {
        for (let i = 0; i < devisContratsData.length; i++) {
            const contratsClientNumber = String(devisContratsData[i][0] || '').trim();
            if (contratsClientNumber === clientStr) {
                const nomSite = devisContratsData[i][9] || ''; // Col 10 = index 9
                if (nomSite) return nomSite;
            }
        }
    }
    
    // Fallback sur SSI si pas trouvé dans CONTRATS
    if (devisSsiData && devisSsiData.length > 0) {
        for (let i = 0; i < devisSsiData.length; i++) {
            const ssiClientNumber = String(devisSsiData[i][0] || '').trim();
            if (ssiClientNumber === clientStr) {
                return devisSsiData[i][5] || '';
            }
        }
    }
    return '';
}

function devisGetSttNameFromCode(sttCode) {
    if (!sttCode || !devisSttData || devisSttData.length === 0) return '';
    const codeStr = String(sttCode).trim().toUpperCase();
    for (let i = 0; i < devisSttData.length; i++) {
        const dataCode = String(devisSttData[i][0] || '').trim().toUpperCase();
        if (dataCode === codeStr) {
            return devisSttData[i][1] || '';
        }
    }
    return '';
}

function devisUpdateSttDropdown() {
    const select = document.getElementById('devisSttSelect');
    if (!select) return;
    select.innerHTML = '<option value="">Sélectionnez un STT...</option>';
    
    // Compter les interventions par Nom STT converti (colonne AB = index 27)
    const sttCounts = {};
    devisCurrentResults.forEach(devis => {
        const sttCode = String(devis[devisColumnHeaders[27]] || '').trim();
        if (sttCode) {
            const nomStt = devisGetSttNameFromCode(sttCode) || sttCode;
            sttCounts[nomStt] = (sttCounts[nomStt] || 0) + 1;
        }
    });

    // Trier par nombre décroissant
    const sortedSttNames = Object.keys(sttCounts).sort((a, b) => sttCounts[b] - sttCounts[a]);
    sortedSttNames.forEach(nomStt => {
        const count = sttCounts[nomStt];
        const option = document.createElement('option');
        option.value = nomStt;
        option.textContent = `${nomStt} (${count})`;
        select.appendChild(option);
    });

    devisUpdateSttSummary();
}

function devisUpdateSttSummary() {
    let totalBudget = 0;
    const uniqueStt = new Set();
    const budgetByYear = {};

    devisCurrentResults.forEach(devis => {
        const sttCode = String(devis[devisColumnHeaders[27]] || '').trim();
        if (sttCode) {
            const nomStt = devisGetSttNameFromCode(sttCode) || sttCode;
            uniqueStt.add(nomStt);
            const budgetBA = parseFloat(devis[devisColumnHeaders[52]]) || 0;
            totalBudget += budgetBA;

            const dateStr = devis['Date'];
            let year = 'N/A';
            if (dateStr) {
                const dateMatch = String(dateStr).match(/(\d{4})/);
                if (dateMatch) year = dateMatch[1];
            }

            if (!budgetByYear[year]) {
                budgetByYear[year] = 0;
            }
            budgetByYear[year] += budgetBA;
        }
    });

    const totalEl = document.getElementById('devisTotalBudgetSTT');
    if (totalEl) totalEl.textContent = totalBudget.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
    
    const countEl = document.getElementById('devisCountSTT');
    if (countEl) countEl.textContent = uniqueStt.size;

    const budgetParAnneeDiv = document.getElementById('devisBudgetParAnneeSTT');
    const sortedYears = Object.keys(budgetByYear).sort((a, b) => b.localeCompare(a));

    if (budgetParAnneeDiv) {
        if (sortedYears.length === 0) {
            budgetParAnneeDiv.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.7); font-size: 12px;">Aucune donnée</div>';
        } else {
            budgetParAnneeDiv.innerHTML = sortedYears.map(year => {
                const budget = budgetByYear[year];
                return `<div style="display: flex; justify-content: space-between; align-items: center; background: rgba(255, 255, 255, 0.1); padding: 6px 10px; border-radius: 4px;">
                    <span style="font-weight: 700; font-size: 14px;">${year}</span>
                    <span style="font-weight: 600; font-size: 14px;">${budget.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</span>
                </div>`;
            }).join('');
        }
    }
}

function devisUpdateSttBudget() {
    const select = document.getElementById('devisSttSelect');
    const sttContent = document.getElementById('devisSttContent');
    if (!select || !sttContent) return;
    
    const selectedName = select.value;

    if (!selectedName) {
        sttContent.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.7); padding: 20px; font-size: 14px;">Sélectionnez un STT</div>';
        return;
    }

    const sttBudgetByYear = {};

    devisCurrentResults.forEach(devis => {
        const sttCode = String(devis[devisColumnHeaders[27]] || '').trim();
        const nomStt = devisGetSttNameFromCode(sttCode) || sttCode;
        if (nomStt === selectedName) {
            const dateStr = devis['Date'];
            let year = 'N/A';
            if (dateStr) {
                const dateMatch = String(dateStr).match(/(\d{4})/);
                if (dateMatch) year = dateMatch[1];
            }

            if (!sttBudgetByYear[year]) {
                sttBudgetByYear[year] = 0;
            }

            const budgetBA = parseFloat(devis[devisColumnHeaders[52]]) || 0;
            sttBudgetByYear[year] += budgetBA;
        }
    });

    const sortedYears = Object.keys(sttBudgetByYear).sort((a, b) => b.localeCompare(a));

    if (sortedYears.length === 0) {
        sttContent.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.7); padding: 20px; font-size: 14px;">Aucune donnée pour ce STT</div>';
        return;
    }

    sttContent.innerHTML = sortedYears.map(year => {
        const budget = sttBudgetByYear[year];
        return `<div class="stt-item" style="background: rgba(255, 255, 255, 0.2); padding: 15px; border-radius: 6px; margin-bottom: 10px;">
            <div class="stt-label" style="font-size: 12px; font-weight: 600; margin-bottom: 8px; opacity: 0.9;">Année ${year}</div>
            <div class="stt-value" style="font-size: 24px; font-weight: 700;">${budget.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €</div>
        </div>`;
    }).join('');
}

function devisUpdateSynthese(dataToAnalyze) {
    dataToAnalyze = dataToAnalyze || devisData;
    const syntheseContent = document.getElementById('devisSyntheseContent');
    if (!syntheseContent) return;
    
    const syntheseByYear = {};

    dataToAnalyze.forEach(devis => {
        const dateStr = devis['Date'];
        let year = 'N/A';
        if (dateStr) {
            const dateMatch = String(dateStr).match(/(\d{4})/);
            if (dateMatch) year = dateMatch[1];
        }

        if (!syntheseByYear[year]) {
            syntheseByYear[year] = { countBcOk: 0, countNonSigne: 0, totalBcOk: 0, totalNonSigne: 0 };
        }

        const hasBonCommande = devis['Bon de commande'] && String(devis['Bon de commande']).trim() !== '';
        const expr1 = parseFloat(devis['Expr1']) || 0;

        if (hasBonCommande) {
            syntheseByYear[year].countBcOk++;
            syntheseByYear[year].totalBcOk += expr1;
        } else {
            syntheseByYear[year].countNonSigne++;
            syntheseByYear[year].totalNonSigne += expr1;
        }
    });

    const sortedYears = Object.keys(syntheseByYear).sort((a, b) => b.localeCompare(a));

    if (sortedYears.length === 0) {
        syntheseContent.innerHTML = '<div style="text-align: center; color: rgba(255,255,255,0.7); padding: 20px;">Aucun devis trouvé</div>';
        return;
    }

    syntheseContent.innerHTML = sortedYears.map(year => {
        const data = syntheseByYear[year];
        return `<div class="synthese-item" style="background: rgba(255, 255, 255, 0.2); padding: 12px; border-radius: 6px; display: flex; justify-content: space-between; align-items: center; margin-bottom: 10px;">
            <div class="synthese-year" style="font-weight: 700; font-size: 20px;">${year}</div>
            <div class="synthese-details" style="text-align: right; font-size: 14px;">
                <div class="synthese-bc-ok" style="color: #000000; font-weight: 700; font-size: 14px; margin-bottom: 3px;">BC OK: ${data.countBcOk} (${data.totalBcOk.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €)</div>
                <div class="synthese-non-signe" style="color: #ffffff; font-weight: 700; font-size: 14px;">Non sig.: ${data.countNonSigne} (${data.totalNonSigne.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2})} €)</div>
            </div>
        </div>`;
    }).join('');
}

function devisResetContratInfo() {
    const valeurEl = document.getElementById('devisValeurContrat');
    const tauxEl = document.getElementById('devisTauxHoraire');
    const pctEl = document.getElementById('devisPourcentageTaux');
    if (valeurEl) valeurEl.textContent = '-- €';
    if (tauxEl) tauxEl.textContent = '-- €';
    if (pctEl) pctEl.textContent = '--% du contrat';
}

function devisUpdateContratInfo(filteredDevis) {
    filteredDevis = filteredDevis || [];
    if (filteredDevis.length === 0 || devisSsiData.length === 0) {
        devisResetContratInfo();
        return;
    }

    const clientNumbers = filteredDevis.map(devis => String(devis[devisColumnHeaders[0]] || '').trim()).filter(Boolean);
    if (clientNumbers.length === 0) {
        devisResetContratInfo();
        return;
    }

    let ssiRow = null;
    for (let i = 0; i < devisSsiData.length; i++) {
        if (clientNumbers.includes(String(devisSsiData[i][0] || '').trim())) {
            ssiRow = devisSsiData[i];
            break;
        }
    }

    if (!ssiRow) {
        devisResetContratInfo();
        return;
    }

    function colToIndex(col) {
        let index = 0;
        for (let i = 0; i < col.length; i++) {
            index = index * 26 + (col.charCodeAt(i) - 'A'.charCodeAt(0) + 1);
        }
        return index - 1;
    }

    const valeurContrat = parseFloat(ssiRow[colToIndex('DL')]) || 0;
    const valeurBH = parseFloat(ssiRow[colToIndex('BH')]) || 0;
    let valeurS = parseFloat(ssiRow[colToIndex('S')]) || 0;
    if (valeurS === 2) valeurS = 1.5;
    const valeurBI = parseFloat(ssiRow[colToIndex('BI')]) || 1;

    let tauxHoraire = 0;
    if (valeurBH !== 0 && valeurS !== 0 && valeurBI !== 0) {
        tauxHoraire = (valeurContrat / (valeurBH * valeurS)) / valeurBI;
    }

    let pourcentage = 0;
    if (valeurContrat !== 0) {
        pourcentage = (tauxHoraire / valeurContrat) * 100;
    }

    const valeurEl = document.getElementById('devisValeurContrat');
    const tauxEl = document.getElementById('devisTauxHoraire');
    const pctEl = document.getElementById('devisPourcentageTaux');
    
    if (valeurEl) valeurEl.textContent = valeurContrat.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
    if (tauxEl) tauxEl.textContent = tauxHoraire.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €';
    if (pctEl) pctEl.textContent = pourcentage.toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + '% du contrat';
}

function devisPerformSearch() {
    const searchClient = (document.getElementById('devisSearchClient')?.value || '').toLowerCase().trim();
    const searchDevis = (document.getElementById('devisSearchDevis')?.value || '').toLowerCase().trim();
    const searchRedacteur = (document.getElementById('devisSearchRedacteur')?.value || '').toLowerCase().trim();

    if (!searchClient && !searchDevis && !searchRedacteur) {
        const resultsSection = document.getElementById('devisResultsSection');
        if (resultsSection) resultsSection.style.display = 'none';
        devisUpdateSynthese(devisData);
        devisCurrentResults = devisData;
        devisUpdateSttDropdown();
        devisResetContratInfo();
        return;
    }

    let results = devisData.filter(devis => {
        const clientMatch = searchClient ? String(devis[devisColumnHeaders[0]] || '').toLowerCase().includes(searchClient) : true;
        const devisMatch = searchDevis ? String(devis['N° devis'] || '').toLowerCase().includes(searchDevis) : true;
        
        let redacteurMatch = true;
        if (searchRedacteur) {
            const redacteurName = devisGetTechnicienName(devis[devisColumnHeaders[11]]);
            redacteurMatch = redacteurName.toLowerCase().includes(searchRedacteur);
        }

        return clientMatch && devisMatch && redacteurMatch;
    });

    devisCurrentResults = results;
    devisUpdateSynthese(results);
    devisUpdateContratInfo(results);
    devisUpdateSttDropdown();
    devisDisplayResults(results);
}

function devisDisplayResults(results) {
    const resultsSection = document.getElementById('devisResultsSection');
    const devisList = document.getElementById('devisDevisList');
    const resultsCount = document.getElementById('devisResultsCount');

    if (!resultsSection || !devisList) return;

    resultsSection.style.display = 'block';
    if (resultsCount) resultsCount.textContent = `${results.length} devis trouvé${results.length > 1 ? 's' : ''}`;

    if (results.length === 0) {
        devisList.innerHTML = '<div class="no-results" style="text-align: center; padding: 40px; color: #999; font-size: 18px;">Aucun devis trouvé</div>';
        return;
    }

    const limitedResults = results.slice(0, 100);
    if (results.length > 100 && resultsCount) {
        resultsCount.textContent = `${results.length} devis trouvés (affichage des 100 premiers)`;
    }

    devisList.innerHTML = limitedResults.map((devis, index) => {
        const hasCommande = devis['Bon de commande'] && String(devis['Bon de commande']).trim() !== '';
        
        const redacteurCode = devis[devisColumnHeaders[11]];
        const redacteurName = devisGetTechnicienName(redacteurCode);
        
        const clientNumber = devis[devisColumnHeaders[0]];
        const nomSite = devisGetSiteNameFromSSI(clientNumber);
        
        const siteTechnicienCode = devisColumnHeaders[68] ? devis[devisColumnHeaders[68]] : null;
        const siteTechnicienName = devisGetTechnicienName(siteTechnicienCode);
        
        // Nom STT = conversion du code (colonne AB index 27) via feuille STT
        const nomStt = devisGetSttNameFromCode(devis[devisColumnHeaders[27]]);

        return `<div class="devis-card${hasCommande ? ' has-commande' : ''}" onclick="devisShowDetails(${index})" style="background: ${hasCommande ? '#fffde7' : '#f8f9ff'}; border: 2px solid ${hasCommande ? '#ffd54f' : '#e0e7ff'}; border-radius: 10px; padding: 15px; cursor: pointer; transition: all 0.3s;">
            <div class="devis-card-header" style="display: flex; justify-content: space-between; align-items: center; margin-bottom: 12px;">
                <div class="devis-number" style="font-size: 20px; font-weight: 700; color: #667eea;">Devis #${devis['N° devis'] || ''}</div>
                <div class="devis-date" style="color: #666; font-size: 16px; font-weight: 600;">${formatDateDDMMYYYY(devis['Date'])}</div>
            </div>
            <div class="devis-info" style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 10px;">
                <div class="info-item" style="font-size: 15px;"><span class="info-label" style="font-weight: 600; color: #555;">N° Client:</span><span class="info-value" style="color: #333; margin-left: 5px;">${devis[devisColumnHeaders[0]] || ''}</span></div>
                <div class="info-item" style="font-size: 15px;"><span class="info-label" style="font-weight: 600; color: #555;">Nom Client:</span><span class="info-value" style="color: #333; margin-left: 5px;">${devis['Nom du client'] || ''}</span></div>
                <div class="info-item" style="font-size: 15px;"><span class="info-label" style="font-weight: 600; color: #555;">Rédacteur:</span><span class="info-value" style="color: #333; margin-left: 5px;">${redacteurName || 'N/A'}</span></div>
                <div class="info-item" style="font-size: 15px;"><span class="info-label" style="font-weight: 600; color: #555;">Nom du Site:</span><span class="info-value" style="color: #333; margin-left: 5px;">${nomSite || 'N/A'}</span></div>
                <div class="info-item" style="font-size: 15px;"><span class="info-label" style="font-weight: 600; color: #555;">Site Technicien:</span><span class="info-value" style="color: #333; margin-left: 5px;">${siteTechnicienName || 'N/A'}</span></div>
                <div class="info-item" style="font-size: 15px;"><span class="info-label" style="font-weight: 600; color: #555;">STT:</span><span class="info-value" style="color: #333; margin-left: 5px;">${nomStt || 'N/A'}</span></div>
                <div class="info-item" style="font-size: 15px;"><span class="info-label" style="font-weight: 600; color: #555;">Objet:</span><span class="info-value" style="color: #333; margin-left: 5px;">${devis['Objet du devis'] || ''}</span></div>
                <div class="info-item" style="font-size: 15px;"><span class="info-label" style="font-weight: 600; color: #555;">Ville:</span><span class="info-value" style="color: #333; margin-left: 5px;">${devis['Ville'] || ''}</span></div>
                <div class="info-item" style="font-size: 15px;"><span class="info-label" style="font-weight: 600; color: #555;">Prix (Expr1):</span><span class="info-value" style="color: #333; margin-left: 5px;">${devis['Expr1'] ? parseFloat(devis['Expr1']).toLocaleString('fr-FR', {minimumFractionDigits: 2, maximumFractionDigits: 2}) + ' €' : ''}</span></div>
            </div>
        </div>`;
    }).join('');
}

function devisShowDetails(index) {
    devisCurrentIndex = index;
    devisUpdateModal();
}

function devisNavigate(direction) {
    devisCurrentIndex += direction;
    if (devisCurrentIndex < 0) devisCurrentIndex = 0;
    if (devisCurrentIndex >= devisCurrentResults.length) devisCurrentIndex = devisCurrentResults.length - 1;
    devisUpdateModal();
}

function devisUpdateModal() {
    const devis = devisCurrentResults[devisCurrentIndex];
    const modal = document.getElementById('devisDetailModal');
    if (!modal || !devis) return;
    
    const redacteurCode = devis[devisColumnHeaders[11]];
    const redacteurName = devisGetTechnicienName(redacteurCode);
    
    const clientNumber = devis[devisColumnHeaders[0]];
    const nomSite = devisGetSiteNameFromSSI(clientNumber);
    
    const siteTechnicienCode = devisColumnHeaders[68] ? devis[devisColumnHeaders[68]] : null;
    const siteTechnicienName = devisGetTechnicienName(siteTechnicienCode);
    
    // Nom STT = conversion du code (colonne AB index 27) via feuille STT
    const nomStt = devisGetSttNameFromCode(devis[devisColumnHeaders[27]]);
    const budgetSTT = devis[devisColumnHeaders[52]] || '';

    document.getElementById('devisModalTitle').textContent = `Devis #${devis['N° devis'] || ''}`;
    document.getElementById('devisNavInfo').textContent = `${devisCurrentIndex + 1}/${devisCurrentResults.length}`;
    document.getElementById('devisPrevBtn').disabled = devisCurrentIndex === 0;
    document.getElementById('devisNextBtn').disabled = devisCurrentIndex === devisCurrentResults.length - 1;

    document.getElementById('devisModalBody').innerHTML = `
        <div class="detail-section" style="margin-bottom: 30px;">
            <div class="section-title" style="font-size: 18px; font-weight: 700; color: #667eea; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0;">Informations Générales du Devis</div>
            <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Date</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${formatDateDDMMYYYY(devis['Date'])}</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">N° devis</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['N° devis'] || ''}</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Objet du devis</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Objet du devis'] || ''}</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Nom du client</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Nom du client'] || ''}</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Ville</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Ville'] || ''}</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Rédacteur</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${redacteurName || 'N/A'} (Code: ${redacteurCode || 'N/A'})</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Nom du Site</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${nomSite || 'N/A'}</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Site Technicien</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${siteTechnicienName || 'N/A'} (Code: ${siteTechnicienCode || 'N/A'})</div>
                </div>
            </div>
        </div>
        <div class="detail-section" style="margin-bottom: 30px;">
            <div class="section-title" style="font-size: 18px; font-weight: 700; color: #667eea; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0;">Suivi des Commandes</div>
            <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Date retour commande</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${formatDateDDMMYYYY(devis['Date retour commande'])}</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Bon de commande</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Bon de commande'] || ''}</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Rapport inter 1</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Rapport inter 1'] || ''}</div>
                </div>
            </div>
        </div>
        <div class="detail-section" style="margin-bottom: 30px;">
            <div class="section-title" style="font-size: 18px; font-weight: 700; color: #667eea; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0;">STT</div>
            <div class="detail-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px;">
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Nom STT</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${nomStt || 'N/A'}</div>
                </div>
                <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                    <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Budget STT</div>
                    <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${budgetSTT}</div>
                </div>
            </div>
        </div>
        <div class="detail-section" style="margin-bottom: 30px;">
            <div class="section-title" style="font-size: 18px; font-weight: 700; color: #667eea; margin-bottom: 15px; padding-bottom: 10px; border-bottom: 2px solid #f0f0f0;">Pièces et Prix</div>
            <div class="pieces-prix-grid" style="display: grid; grid-template-columns: 1fr 1fr; gap: 20px; margin-bottom: 20px;">
                <div class="pieces-column" style="display: flex; flex-direction: column; gap: 15px;">
                    <div class="column-header" style="font-size: 16px; font-weight: 700; color: #667eea; padding-bottom: 10px; border-bottom: 2px solid #e0e7ff; margin-bottom: 5px;">PIÈCES</div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Pieces 1</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Pieces 1'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Pieces 2</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Pieces 2'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Pieces 3</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Pieces 3'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Pieces 4</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Pieces 4'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Pieces 5</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Pieces 5'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Forfait M/O</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Forfait M/O'] || ''}</div>
                    </div>
                </div>
                <div class="prix-column" style="display: flex; flex-direction: column; gap: 15px;">
                    <div class="column-header" style="font-size: 16px; font-weight: 700; color: #667eea; padding-bottom: 10px; border-bottom: 2px solid #e0e7ff; margin-bottom: 5px;">PRIX HT</div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Prix ht 1</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Prix ht 1'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Prix ht 2</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Prix ht 2'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Prix ht 3</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Prix ht 3'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Prix ht 4</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Prix ht 4'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Prix ht 5</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Prix ht 5'] || ''}</div>
                    </div>
                    <div class="detail-item" style="background: #f8f9ff; padding: 15px; border-radius: 8px; border-left: 4px solid #667eea;">
                        <div class="detail-label" style="font-size: 12px; text-transform: uppercase; color: #888; font-weight: 600; margin-bottom: 5px;">Expr1 (Total)</div>
                        <div class="detail-value" style="font-size: 17px; color: #333; font-weight: 500;">${devis['Expr1'] || ''}</div>
                    </div>
                </div>
            </div>
        </div>
    `;

    modal.classList.add('active');
}

function devisCloseModal() {
    const modal = document.getElementById('devisDetailModal');
    if (modal) modal.classList.remove('active');
}

// Objet DEVIS pour l'encapsulation (interface avec le reste de l'app)
const DEVIS = {
    init() {
        // Ajouter les listeners
        document.getElementById('devisSearchClient')?.addEventListener('input', devisDebounceSearch);
        document.getElementById('devisSearchDevis')?.addEventListener('input', devisDebounceSearch);
        document.getElementById('devisSearchRedacteur')?.addEventListener('input', devisDebounceSearch);
        document.getElementById('devisSttSelect')?.addEventListener('change', devisUpdateSttBudget);
        
        // Initialiser depuis APP.data
        initDevisFromAppData();
    },
    navigate(dir) { devisNavigate(dir); },
    closeDetail() { devisCloseModal(); }
};


// ============================================
// MODAL DSF CLOTURE/PLANIF/RESP + RELANCE MAIL
// ============================================

console.log('✅ devis.js chargé');
