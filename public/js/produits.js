// ============================================
// PRODUITS.JS - Module Catalogue Produits
// GESTION PRO - EasyLog Pro
// ============================================
// Dépend de: config.js (APP)
// ============================================

const PRODUITS = {
    data: [],
    filtered: [],
    years: [],
    categories: [],

    init() {
        if (APP.data.produits.length === 0) {
            const emptyEl = document.getElementById('produitsEmptyState');
            if (emptyEl) emptyEl.style.display = 'block';
            return;
        }
        const emptyEl = document.getElementById('produitsEmptyState');
        if (emptyEl) emptyEl.style.display = 'none';
        
        this.processData();
        this.populateFilters();
        this.search();
    },

    processData() {
        this.data = [];
        this.years = [];
        this.categories = new Set();
        
        APP.data.produits.forEach((row, idx) => {
            // Les données sont déjà pré-traitées par parseWorkbook
            const processed = { 
                _raw: row._raw || row, 
                _index: idx,
                code: row.code || '',
                designation: row.designation || '',
                description: row.description || '',
                marque: row.marque || '',
                categorie: row.categorie || '',
                tarifs: row.tarifs || {}
            };
            
            if (processed.categorie) this.categories.add(processed.categorie);
            
            // Collecter les années des tarifs
            Object.keys(processed.tarifs).forEach(year => {
                if (!this.years.includes(year)) this.years.push(year);
            });
            
            this.data.push(processed);
        });
        
        this.years.sort().reverse();
    },

    populateFilters() {
        // Catégories
        const catSelect = document.getElementById('produitsCategorieFilter');
        if (catSelect) {
            catSelect.innerHTML = '<option value="">Toutes les catégories</option>';
            [...this.categories].sort().forEach(cat => {
                catSelect.innerHTML += `<option value="${cat}">${cat}</option>`;
            });
        }
        
        // Marques
        const marqueSelect = document.getElementById('produitsMarqueFilter');
        if (marqueSelect) {
            const marques = new Set();
            this.data.forEach(p => { if (p.marque) marques.add(p.marque); });
            marqueSelect.innerHTML = '<option value="">Toutes les marques</option>';
            [...marques].sort().forEach(m => {
                marqueSelect.innerHTML += `<option value="${m}">${m}</option>`;
            });
        }
    },

    search() {
        const searchInput = document.getElementById('produitsSearchInput');
        const query = (searchInput?.value || '').toLowerCase();
        
        const catFilter = document.getElementById('produitsCategorieFilter');
        const categorie = catFilter?.value || '';
        
        const marqueFilter = document.getElementById('produitsMarqueFilter');
        const marque = marqueFilter?.value || '';
        
        this.filtered = this.data.filter(p => {
            if (query) {
                const searchStr = `${p.code} ${p.designation} ${p.description} ${p.marque}`.toLowerCase();
                if (!searchStr.includes(query)) return false;
            }
            if (categorie && p.categorie !== categorie) return false;
            if (marque && p.marque !== marque) return false;
            return true;
        });
        
        this.render();
    },

    render() {
        const container = document.getElementById('produitsGrid');
        const countEl = document.getElementById('produitsSearchCount');
        
        if (countEl) countEl.textContent = `${this.filtered.length} produits`;
        
        if (!container) return;
        
        if (this.filtered.length === 0) {
            container.innerHTML = '<p class="empty-text">Aucun produit trouvé</p>';
            return;
        }
        
        container.innerHTML = this.filtered.slice(0, 100).map((p, idx) => `
            <div class="produit-card" onclick="PRODUITS.showDetail(${idx})">
                <div class="produit-code">${p.code}</div>
                <div class="produit-designation">${p.designation}</div>
                <div class="produit-description">${p.description || '-'}</div>
                <div class="produit-tarifs">
                    ${this.years.slice(0, 2).map(y => `
                        <span class="tarif-badge">${y}: ${p.tarifs[y] ? formatCurrency(p.tarifs[y]) : '-'}</span>
                    `).join('')}
                </div>
                <button class="btn-copy" onclick="event.stopPropagation(); PRODUITS.copy(${idx})">📋 Copier</button>
            </div>
        `).join('');
    },

    showDetail(idx) {
        const p = this.filtered[idx];
        const modal = document.getElementById('produitDetailModal');
        
        let html = `<div class="detail-section">
            <div class="detail-section-content">
                <div class="detail-item"><div class="item-label">Code</div><div class="item-value">${p.code}</div></div>
                <div class="detail-item"><div class="item-label">Désignation</div><div class="item-value">${p.designation}</div></div>
                <div class="detail-item"><div class="item-label">Description</div><div class="item-value">${p.description || '-'}</div></div>
                <div class="detail-item"><div class="item-label">Marque</div><div class="item-value">${p.marque || '-'}</div></div>
                <div class="detail-item"><div class="item-label">Catégorie</div><div class="item-value">${p.categorie || '-'}</div></div>
            </div>
        </div>
        <div class="detail-section">
            <div class="detail-section-title">💰 Tarifs par année</div>
            <div class="detail-section-content">
                ${this.years.map(y => `
                    <div class="detail-item"><div class="item-label">${y}</div><div class="item-value">${p.tarifs[y] ? formatCurrency(p.tarifs[y]) : '-'}</div></div>
                `).join('')}
            </div>
        </div>`;
        
        document.getElementById('produitDetailContent').innerHTML = html;
        modal.classList.add('active');
    },

    closeDetail() {
        document.getElementById('produitDetailModal').classList.remove('active');
    },

    copy(idx) {
        const p = this.filtered[idx];
        const text = `${p.code}\t${p.designation}\t${p.tarifs[this.years[0]] || ''}`;
        navigator.clipboard.writeText(text).then(() => {
            alert('✅ Copié dans le presse-papier !');
        });
    }
};

// ============================================
// MODULE RELANCES - LOGIQUE
// ============================================

// ============================================
// FONCTIONS PRODUITS - Import séparé
// ============================================
let produitData = [];
let produitAvailableYears = [];
let produitCurrentYear = 2024;
let produitSelectedCategory = '';

function handleProduitFile(file) {
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (e) => {
        try {
            const data = new Uint8Array(e.target.result);
            const workbook = XLSX.read(data, { type: 'array', cellDates: true });
            const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
            const jsonData = XLSX.utils.sheet_to_json(firstSheet, { raw: false, defval: '' });
            processProduitData(jsonData);
            document.getElementById('produitUploadZone').style.display = 'none';
            document.getElementById('produitSearchContainer').style.display = 'block';
        } catch (error) {
            console.error('Erreur:', error);
            alert('Erreur lors de la lecture du fichier');
        }
    };
    reader.readAsArrayBuffer(file);
}

function processProduitData(data) {
    const headers = Object.keys(data[0] || {});
    produitAvailableYears = [];
    headers.forEach(header => {
        const yearMatch = header.match(/202\d|203\d/);
        if (yearMatch && header.includes('INSTAL')) {
            const year = parseInt(yearMatch[0]);
            if (!produitAvailableYears.includes(year)) produitAvailableYears.push(year);
        }
    });
    produitAvailableYears.sort((a, b) => b - a);
    if (produitAvailableYears.length > 0) produitCurrentYear = produitAvailableYears[0];
    
    produitData = data.map((row, idx) => ({
        code: row['Code'] || '',
        nom: row['Nom'] || '',
        description: row['Description'] || '',
        categorie: row['Catégorie'] || row['Categorie'] || '',
        prices: produitAvailableYears.reduce((acc, year) => {
            acc[year] = {
                instal: row[`TARIF INSTAL ${year}`] || row[`TARIF INSTAL${year}`] || 0,
                util: row[`TARIF UTIL ${year}`] || row[`TARIF UTIL${year}`] || 0,
                public: row[`TARIF PUBLIC ${year}`] || row[`TARIF PUBLIC${year}`] || 0
            };
            return acc;
        }, {})
    }));

    createProduitYearButtons();
    populateProduitCategoryFilter();
    displayProduitResults(produitData);
}

function createProduitYearButtons() {
    const container = document.getElementById('produitYearButtons');
    if (!container) return;
    container.innerHTML = '';
    produitAvailableYears.forEach(year => {
        const btn = document.createElement('button');
        btn.className = 'produit-year-btn' + (year === produitCurrentYear ? ' active' : '');
        btn.textContent = year;
        btn.onclick = () => {
            produitCurrentYear = year;
            document.querySelectorAll('.produit-year-btn').forEach(b => b.classList.remove('active'));
            btn.classList.add('active');
            performProduitSearch();
        };
        container.appendChild(btn);
    });
}

function populateProduitCategoryFilter() {
    const categories = [...new Set(produitData.map(p => p.categorie).filter(c => c))].sort();
    const select = document.getElementById('produitCategoryFilter');
    if (!select) return;
    select.innerHTML = '<option value="">Toutes</option>';
    categories.forEach(cat => {
        const opt = document.createElement('option');
        opt.value = cat;
        opt.textContent = cat;
        select.appendChild(opt);
    });
}

function performProduitSearch() {
    const query = (document.getElementById('produitSearchInput')?.value || '').toLowerCase().trim();
    let filtered = produitData;
    if (produitSelectedCategory) filtered = filtered.filter(p => p.categorie === produitSelectedCategory);
    if (query) filtered = filtered.filter(p => p.nom.toLowerCase().includes(query) || p.description.toLowerCase().includes(query) || p.code.toLowerCase().includes(query));
    displayProduitResults(filtered);
}

function displayProduitResults(products) {
    const body = document.getElementById('produitResultsBody');
    const info = document.getElementById('produitResultsInfo');
    const count = document.getElementById('produitResultsCount');
    if (!body) return;
    
    if (products.length === 0) {
        if (info) info.style.display = 'none';
        body.innerHTML = '<tr><td colspan="7" style="text-align:center;padding:40px;color:#999;"><div style="font-size:3em;margin-bottom:10px;">🔍</div>Aucun produit trouvé</td></tr>';
        return;
    }
    if (info) info.style.display = 'flex';
    if (count) count.textContent = products.length + ' produit' + (products.length > 1 ? 's' : '');
    
    body.innerHTML = products.map(p => {
        const prices = p.prices[produitCurrentYear] || { instal: 0, util: 0, public: 0 };
        return '<tr>' +
            '<td><button class="produit-copy-btn" onclick="copyProduitInfo(\'' + p.code.replace(/'/g,"\\'") + '\',\'' + p.nom.replace(/'/g,"\\'") + '\',this)">📋</button></td>' +
            '<td style="font-weight:700;color:#667eea;font-family:monospace;">' + p.code + '</td>' +
            '<td style="font-weight:500;">' + p.nom + '</td>' +
            '<td style="color:#666;font-size:0.9em;">' + p.description + '</td>' +
            '<td style="text-align:right;font-weight:600;">' + formatProduitPrice(prices.public) + ' €</td>' +
            '<td style="text-align:right;font-weight:600;">' + formatProduitPrice(prices.util) + ' €</td>' +
            '<td style="text-align:right;font-weight:600;">' + formatProduitPrice(prices.instal) + ' €</td>' +
        '</tr>';
    }).join('');
}

function copyProduitInfo(code, nom, btn) {
    navigator.clipboard.writeText(code + ' ' + nom).then(() => {
        btn.classList.add('copied');
        btn.innerHTML = '✓';
        setTimeout(() => { btn.classList.remove('copied'); btn.innerHTML = '📋'; }, 2000);
    });
}

function formatProduitPrice(price) {
    if (!price || price === 0) return '0.00';
    return parseFloat(price).toLocaleString('fr-FR', { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

console.log('✅ produits.js chargé');
