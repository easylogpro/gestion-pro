// ============================================
// BRIDGE ACCESS - Module JavaScript
// Format TABLEAU : headers + rows
// ============================================

const BRIDGE = {
    baseUrl: 'http://localhost:5000',
    connected: false,
    lastSync: null,
    autoRefreshInterval: null,
    
    async init() {
        console.log('🌉 Initialisation Bridge Access...');
        try {
            const response = await fetch(`${this.baseUrl}/api/test`, {
                method: 'GET',
                signal: AbortSignal.timeout(3000)
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.status === 'ok') {
                    console.log('✅ Bridge connecté !');
                    this.connected = true;
                    this.updateStatus('connected');
                    return true;
                }
            }
        } catch (error) {
            console.log('🔗 Bridge non disponible:', error.message);
        }
        
        this.connected = false;
        this.updateStatus('disconnected');
        return false;
    },
    
    updateStatus(status) {
        const container = document.getElementById('bridgeStatusContainer');
        const indicator = document.getElementById('bridgeStatus');
        const text = document.getElementById('bridgeStatusText');
        
        if (container) container.style.display = 'flex';
        if (indicator) indicator.className = 'bridge-status ' + status;
        if (text) {
            text.textContent = status === 'connected' ? 'Access connecté' : 
                               status === 'loading' ? 'Chargement...' : 'Access déconnecté';
        }
    },
    
    async fetchData(endpoint) {
        try {
            const response = await fetch(`${this.baseUrl}${endpoint}`);
            if (!response.ok) throw new Error(`HTTP ${response.status}`);
            return await response.json();
        } catch (error) {
            console.error(`❌ Erreur fetch ${endpoint}:`, error);
            return null;
        }
    },
    
    // Convertit {headers, rows} en tableau format Excel [headers, ...rows]
    toSheetArray(apiResult) {
        if (!apiResult || !apiResult.headers || !apiResult.rows) {
            return [];
        }
        return [apiResult.headers, ...apiResult.rows];
    },
    
    async loadAllData() {
        if (!this.connected) {
            console.warn('⚠️ Bridge non connecté');
            return false;
        }
        
        console.log('📥 Chargement des données depuis Access...');
        this.updateStatus('loading');
        
        const startTime = Date.now();
        
        try {
            // Charger toutes les données en parallèle (+ SAV + CONTRATS + CONTACTS)
            const [ssi, dsf, dsfCloture, dsfPlanif, dsfResp, devis, travaux, reco, tech, stt, sav, contrats, contacts] = await Promise.all([
                this.fetchData('/api/ssi'),
                this.fetchData('/api/dsf'),
                this.fetchData('/api/dsf/cloture'),
                this.fetchData('/api/dsf/planif'),
                this.fetchData('/api/dsf/resp'),
                this.fetchData('/api/devis'),
                this.fetchData('/api/travaux'),
                this.fetchData('/api/reco'),
                this.fetchData('/api/tech'),
                this.fetchData('/api/stt'),
                this.fetchData('/api/sav'),
                this.fetchData('/api/contrats'),
                this.fetchData('/api/contacts')
            ]);
            
            console.log('📊 Données reçues:', {
                ssi: ssi?.count || 0,
                dsf: dsf?.count || 0,
                dsfCloture: dsfCloture?.count || 0,
                dsfPlanif: dsfPlanif?.count || 0,
                dsfResp: dsfResp?.count || 0,
                devis: devis?.count || 0,
                travaux: travaux?.count || 0,
                reco: reco?.count || 0,
                tech: tech?.count || 0,
                stt: stt?.count || 0,
                sav: sav?.count || 0,
                contrats: contrats?.count || 0,
                contacts: contacts?.status === 'ok' ? 'OK' : 'FAIL'
            });
            
            // Charger les contacts dans APP.contacts
            if (contacts && contacts.status === 'ok') {
                APP.contacts = {
                    techniciens: contacts.techniciens || {},
                    sousTraitants: contacts.sousTraitants || {}
                };
                console.log('👷 Contacts chargés via Bridge - Tech:', Object.keys(APP.contacts.techniciens).length, '| STT:', Object.keys(APP.contacts.sousTraitants).length);
            }
            
            // Convertir en format tableau [headers, ...rows]
            const sheetData = {
                'TECH': this.toSheetArray(tech),
                'STT': this.toSheetArray(stt),
                'SSI': this.toSheetArray(ssi),
                'DSF': this.toSheetArray(dsf),
                'DSF CLOTURE': this.toSheetArray(dsfCloture),
                'DSF PLANIF': this.toSheetArray(dsfPlanif),
                'DSF RESP': this.toSheetArray(dsfResp),
                'TRAVAUX': this.toSheetArray(travaux),
                'DEVIS': this.toSheetArray(devis),
                'RECO': this.toSheetArray(reco),
                // Nouvelles feuilles SAV
                'Inter techniques 2009': this.toSheetArray(sav),
                'Liste des contrats en cours': this.toSheetArray(contrats)
            };
            
            // Debug: afficher les headers
            console.log('📋 Headers SSI:', sheetData['SSI'][0]?.slice(0, 10));
            console.log('📋 Headers TRAVAUX:', sheetData['TRAVAUX'][0]?.slice(0, 10));
            console.log('📋 Headers TECH:', sheetData['TECH'][0]);
            console.log('📋 Headers SAV:', sheetData['Inter techniques 2009'][0]?.slice(0, 10));
            console.log('📋 Headers CONTRATS:', sheetData['Liste des contrats en cours'][0]?.slice(0, 10));
            
            // Créer un faux workbook
            const fakeWorkbook = {
                SheetNames: Object.keys(sheetData).filter(k => sheetData[k].length > 0),
                Sheets: {}
            };
            
            // Créer les faux sheets
            fakeWorkbook.SheetNames.forEach(name => {
                fakeWorkbook.Sheets[name] = { _bridgeData: sheetData[name] };
            });
            
            console.log('📦 Faux workbook:', fakeWorkbook.SheetNames);
            
            // Patcher XLSX.utils.sheet_to_json
            const originalSheetToJson = XLSX.utils.sheet_to_json;
            
            XLSX.utils.sheet_to_json = function(sheet, options) {
                if (sheet && sheet._bridgeData) {
                    console.log('🌉 Bridge: données directes');
                    return sheet._bridgeData;
                }
                return originalSheetToJson.call(XLSX.utils, sheet, options);
            };
            
            try {
                console.log('🔄 Appel parseWorkbook...');
                parseWorkbook(fakeWorkbook);
                
                const importZone = document.getElementById('importZone');
                if (importZone) importZone.classList.add('hidden');
                
                if (typeof showDashboard === 'function') {
                    console.log('🎨 Appel showDashboard...');
                    showDashboard();
                }
                
            } finally {
                XLSX.utils.sheet_to_json = originalSheetToJson;
            }
            
            const duration = Date.now() - startTime;
            console.log(`✅ Données chargées en ${duration}ms`);
            
            this.lastSync = new Date();
            this.updateStatus('connected');
            this.updateLastSyncUI();
            
            return true;
            
        } catch (error) {
            console.error('❌ Erreur chargement:', error);
            this.updateStatus('disconnected');
            return false;
        }
    },
    
    startAutoRefresh(intervalMs = 120000) {
        if (this.autoRefreshInterval) clearInterval(this.autoRefreshInterval);
        
        this.autoRefreshInterval = setInterval(async () => {
            console.log('🔄 Auto-refresh...');
            await this.loadAllData();
        }, intervalMs);
        
        console.log(`⏰ Auto-refresh: ${intervalMs/1000}s`);
    },
    
    stopAutoRefresh() {
        if (this.autoRefreshInterval) {
            clearInterval(this.autoRefreshInterval);
            this.autoRefreshInterval = null;
        }
    },
    
    updateLastSyncUI() {
        const el = document.getElementById('lastSyncTime');
        if (el && this.lastSync) {
            el.textContent = this.lastSync.toLocaleTimeString('fr-FR');
        }
    }
};

// ============================================
// FONCTION DE CONNEXION
// ============================================
async function connectBridge() {
    const option = document.getElementById('bridgeConnectOption');
    if (option) {
        option.innerHTML = '<span>⏳</span><span>Connexion...</span>';
        option.style.pointerEvents = 'none';
    }
    
    try {
        const connected = await BRIDGE.init();
        
        if (connected) {
            const dataLoaded = await BRIDGE.loadAllData();
            
            if (dataLoaded) {
                BRIDGE.startAutoRefresh(600000); // 10 minutes
                showRefreshButton();
                console.log('🎉 Bridge Access opérationnel !');
            } else {
                throw new Error('Impossible de charger les données');
            }
        } else {
            throw new Error('Bridge non disponible');
        }
    } catch (error) {
        console.error('Erreur Bridge:', error);
        alert('❌ Connexion Bridge impossible.\n\nVérifiez que le serveur est lancé.\n\n' + error.message);
        
        if (option) {
            option.innerHTML = '<span>🔗</span><span>Connexion Access (Bridge)</span>';
            option.style.pointerEvents = 'auto';
        }
    }
}

async function refreshBridgeData() {
    if (!BRIDGE.connected) return;
    
    const btn = document.getElementById('bridgeRefreshBtn');
    if (btn) {
        btn.disabled = true;
        btn.innerHTML = '⏳ Actualisation...';
    }
    
    await BRIDGE.loadAllData();
    
    if (btn) {
        btn.disabled = false;
        btn.innerHTML = '🔄 Actualiser';
    }
}

// Ajouter le bouton après connexion
function showRefreshButton() {
    // Chercher où mettre le bouton (à côté du titre ou dans le header)
    const header = document.querySelector('.main-header') || document.querySelector('.header-title');
    if (header && !document.getElementById('bridgeRefreshBtn')) {
        const btn = document.createElement('button');
        btn.id = 'bridgeRefreshBtn';
        btn.innerHTML = '🔄 Actualiser';
        btn.style.cssText = 'margin-left:15px;padding:8px 16px;background:linear-gradient(135deg,#10b981,#059669);color:white;border:none;border-radius:8px;cursor:pointer;font-weight:600;font-size:14px;transition:all 0.2s;';
        btn.onmouseover = () => btn.style.transform = 'scale(1.05)';
        btn.onmouseout = () => btn.style.transform = 'scale(1)';
        btn.onclick = refreshBridgeData;
        header.appendChild(btn);
    }
}

console.log('🌉 Bridge.js chargé (format TABLEAU)');
