# 📐 ARCHITECTURE GESTION-PRO

## Plan de découpage de app_v56.html (11856 lignes)

---

## 🗂️ Structure des fichiers

```
📁 gestion-pro/
│
├── 📄 index.html              ← HTML uniquement (sidebar + pages)
│
├── 📁 css/
│   └── 📄 styles.css          ← Tous les styles CSS
│
├── 📁 js/
│   │
│   │  ══════ CORE (charger en premier) ══════
│   ├── 📄 config.js           ← Variables globales (APP, YEAR_COLS)
│   ├── 📄 utils.js            ← Fonctions utilitaires
│   ├── 📄 parser.js           ← parseWorkbook + chargement données
│   │
│   │  ══════ MODULES (charger ensuite) ══════
│   ├── 📄 dashboard.js        ← Module dashboard
│   ├── 📄 visites.js          ← Modules VISITES + VISITESMODULE
│   ├── 📄 travaux.js          ← Module TRAVAUX
│   ├── 📄 devis.js            ← Module DEVIS
│   ├── 📄 dsf.js              ← Modules DSF + DSFMODAL
│   ├── 📄 searchssi.js        ← Module SEARCHSSI
│   ├── 📄 produits.js         ← Module PRODUITS
│   ├── 📄 relances.js         ← Module RELANCES
│   │
│   │  ══════ INIT (charger en dernier) ══════
│   └── 📄 app.js              ← initApp, navigation, events
│
└── 📁 bridge/
    ├── 📄 bridge.js
    ├── 📄 bridge.css
    └── 📄 bridge_server.py
```

---

## 📊 Dépendances entre modules

```
                    ┌─────────────┐
                    │  config.js  │  ← YEAR_COLS, APP (données centrales)
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  utils.js   │  ← formatDate, formatCurrency
                    └──────┬──────┘
                           │
                    ┌──────▼──────┐
                    │  parser.js  │  ← parseWorkbook (remplit APP.data)
                    └──────┬──────┘
                           │
        ┌──────────────────┼──────────────────┐
        │                  │                  │
        ▼                  ▼                  ▼
┌─────────────┐    ┌─────────────┐    ┌─────────────┐
│ dashboard.js│    │ visites.js  │    │ travaux.js  │
└─────────────┘    └─────────────┘    └─────────────┘
        │                  │                  │
        │           ┌──────┴──────┐           │
        │           ▼             ▼           │
        │    ┌──────────┐  ┌──────────┐       │
        │    │  dsf.js  │  │ devis.js │       │
        │    └──────────┘  └──────────┘       │
        │                                     │
        └──────────────────┬──────────────────┘
                           │
                    ┌──────▼──────┐
                    │   app.js    │  ← initApp, navigateTo
                    └─────────────┘
```

---

## 📋 Contenu de chaque fichier

### 1. config.js (~80 lignes)
```javascript
// Variables globales partagées par tous les modules
const YEAR_COLS = getYearColumns();
const APP = { data: {...}, tables: {...}, loaded: false };
const MONTH_NAMES = [...];
const SSI_HISTORY_KEY = '...';
const MAIL_HISTORY_KEY = '...';
```

### 2. utils.js (~100 lignes)
```javascript
// Fonctions utilitaires
function findColumnByHeader(headers, searchText) {...}
function getYearColumns() {...}
function formatDateDDMMYYYY(val) {...}
function formatCurrency(amount) {...}
function formatNumber(num) {...}
function getPercentClass(percent) {...}
```

### 3. parser.js (~600 lignes)
```javascript
// Chargement et parsing des données
function parseWorkbook(workbook) {...}
function buildTechTable(data) {...}
function buildSttTable(data) {...}
function displayLoadedSheets(sheets) {...}
```

### 4. dashboard.js (~400 lignes)
```javascript
// Module Dashboard
const DASHBOARD = {...};
function showDashboard() {...}
function updateDashboardStats() {...}
function updateKPIs() {...}
function initEvolutionChart() {...}
```

### 5. visites.js (~1200 lignes)
```javascript
// Modules Visites
const VISITES = {...};
const VISITESMODULE = {...};
function switchVisitesTab(tab) {...}
function initVisitesModule() {...}
function processSSIData() {...}
function displaySSIStats() {...}
function processDSFData() {...}
function displayDSFStats() {...}
function generateDSFPlanning() {...}
// + toutes les fonctions SSI/DSF liées aux visites
```

### 6. travaux.js (~700 lignes)
```javascript
// Module Travaux
const TRAVAUX = {...};
function processTravauxData() {...}
function displayTravauxTable() {...}
function filterTravauxBy...() {...}
// + toutes les fonctions travaux
```

### 7. devis.js (~700 lignes)
```javascript
// Module Devis
let devisData = [];
let devisColumnHeaders = [];
// ... autres variables devis
const DEVIS = {...};
function initDevisFromAppData() {...}
function devisPerformSearch() {...}
function devisDisplayResults() {...}
// + toutes les fonctions devis
```

### 8. dsf.js (~350 lignes)
```javascript
// Module DSF
const DSFMODAL = {...};
const DSF = {...};
function openDSFModal() {...}
function closeDSFModal() {...}
// + fonctions DSF tracker
```

### 9. searchssi.js (~600 lignes)
```javascript
// Module Recherche SSI
let ssiAllData = [];
let ssiFilteredData = [];
// ... autres variables ssi
const SEARCHSSI = {...};
function ssiInitFromAppData() {...}
function ssiFilterData() {...}
function ssiDisplayData() {...}
// + toutes les fonctions recherche SSI
```

### 10. produits.js (~200 lignes)
```javascript
// Module Produits
let produitData = [];
let produitAvailableYears = [];
const PRODUITS = {...};
function handleProduitFile(file) {...}
function processProduitData(data) {...}
function performProduitSearch() {...}
```

### 11. relances.js (~100 lignes)
```javascript
// Module Relances
const RELANCES = {...};
```

### 12. app.js (~200 lignes)
```javascript
// Point d'entrée - CHARGER EN DERNIER
document.addEventListener('DOMContentLoaded', initApp);
function initApp() {...}
function setupEventListeners() {...}
function navigateTo(page) {...}
function handleFileUpload(e) {...}
function processFile(file) {...}
function handleGlobalSearch(e) {...}
function saveData() {...}
function loadSavedData() {...}
```

---

## 🔗 Ordre de chargement dans index.html

```html
<head>
    <!-- Styles -->
    <link rel="stylesheet" href="css/styles.css">
    <link rel="stylesheet" href="bridge/bridge.css">
</head>
<body>
    <!-- HTML content -->
    
    <!-- Libraries externes -->
    <script src="https://cdnjs.cloudflare.com/ajax/libs/xlsx/0.18.5/xlsx.full.min.js"></script>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    
    <!-- CORE - Ordre important ! -->
    <script src="js/config.js"></script>
    <script src="js/utils.js"></script>
    <script src="js/parser.js"></script>
    
    <!-- MODULES - Ordre flexible -->
    <script src="js/dashboard.js"></script>
    <script src="js/visites.js"></script>
    <script src="js/travaux.js"></script>
    <script src="js/devis.js"></script>
    <script src="js/dsf.js"></script>
    <script src="js/searchssi.js"></script>
    <script src="js/produits.js"></script>
    <script src="js/relances.js"></script>
    
    <!-- INIT - Toujours en dernier -->
    <script src="js/app.js"></script>
    
    <!-- Bridge (optionnel) -->
    <script src="bridge/bridge.js"></script>
</body>
```

---

## ✅ Avantages de cette architecture

| Aspect | Avant | Après |
|--------|-------|-------|
| Taille fichier | 11856 lignes | Max 700 lignes/fichier |
| Debugging | Chercher dans 12000 lignes | Fichier ciblé |
| Modification | Risque de tout casser | Module isolé |
| Git | 1 gros diff | Petits diffs clairs |
| Collaboration | Conflits fréquents | Travail parallèle |
| Tests | Impossible | Module par module |

---

## 🚀 Pour ajouter le module SAV

Simplement créer `js/sav.js` et l'ajouter dans index.html :
```html
<script src="js/sav.js"></script>
```

Sans toucher aux autres fichiers !
