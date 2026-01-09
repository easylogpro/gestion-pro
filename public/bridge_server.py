# -*- coding: utf-8 -*-
"""
BRIDGE ACCESS - Serveur Python
Retourne des TABLEAUX (pas des objets) pour préserver l'ordre des colonnes
"""

import os
import json
import pyodbc
from flask import Flask, jsonify
from flask_cors import CORS

app = Flask(__name__)
CORS(app)

# ============================================================
# CONFIGURATION
# ============================================================
DATABASE_PATH = r"C:\Users\Administrateur\Desktop\CONTRAT 2022.accdb"
SCRIPT_DIR = os.path.dirname(os.path.abspath(__file__))
CONTACTS_PATH = os.path.join(SCRIPT_DIR, "contacts.json")

# MAPPING : Feuille Excel → Requête Access
SOURCES = {
    'SSI': 'Liste des contrats en cours 2008',
    'DSF': 'Liste en cours DSF 2008',
    'DSF_CLOTURE': 'Liste en cours DSF 2008 a cloturer',
    'DSF_PLANIF': 'Liste en cours DSF 2008 a planifier',
    'DSF_RESP': 'Liste en cours DSF 2008 a voir RESP',
    'DEVIS': 'Liste generale travaux',
    'TRAVAUX': 'Liste travaux en cours',
    'RECO': 'Reconditionnement 2008',
    'TECH': 'Technicien',
    'STT': 'Sous traitants'
}

# Cache
CACHE = {
    'contacts': None
}

# ============================================================
# CONNEXION BASE ACCESS
# ============================================================
def get_connection():
    conn_str = (
        r"DRIVER={Microsoft Access Driver (*.mdb, *.accdb)};"
        f"DBQ={DATABASE_PATH};"
    )
    return pyodbc.connect(conn_str)

def get_data_as_array(source_key):
    """
    Récupère les données en format TABLEAU (headers + rows)
    Retourne: { "headers": [...], "rows": [[...], [...], ...] }
    """
    source_name = SOURCES.get(source_key)
    if not source_name:
        print(f"❌ Source inconnue: {source_key}")
        return {"headers": [], "rows": []}
    
    try:
        conn = get_connection()
        cursor = conn.cursor()
        
        cursor.execute(f"SELECT * FROM [{source_name}]")
        
        # Headers = noms des colonnes dans l'ordre
        headers = [desc[0] for desc in cursor.description]
        
        # Rows = données en tableau
        rows = []
        for row in cursor.fetchall():
            row_array = []
            for val in row:
                if val is None:
                    row_array.append('')
                elif isinstance(val, (bytes, bytearray)):
                    row_array.append('')
                else:
                    row_array.append(val)
            rows.append(row_array)
        
        cursor.close()
        conn.close()
        
        print(f"✅ {source_key}: {len(rows)} lignes, {len(headers)} colonnes")
        return {"headers": headers, "rows": rows}
        
    except Exception as e:
        print(f"❌ Erreur {source_key}: {e}")
        return {"headers": [], "rows": []}

# ============================================================
# CHARGEMENT CONTACTS.JSON
# ============================================================
def load_contacts():
    if CACHE['contacts'] is not None:
        return CACHE['contacts']
    
    try:
        if os.path.exists(CONTACTS_PATH):
            with open(CONTACTS_PATH, 'r', encoding='utf-8') as f:
                CACHE['contacts'] = json.load(f)
                print(f"✅ Contacts chargés: {len(CACHE['contacts'].get('techniciens', {}))} tech, {len(CACHE['contacts'].get('soustraitants', {}))} stt")
                return CACHE['contacts']
        
        print(f"⚠️ Fichier contacts.json non trouvé")
        return {"techniciens": {}, "soustraitants": {}}
    except Exception as e:
        print(f"❌ Erreur contacts: {e}")
        return {"techniciens": {}, "soustraitants": {}}

# ============================================================
# ENDPOINTS API
# ============================================================

@app.route('/')
def home():
    return '''
    <h1>🌉 Bridge Access</h1>
    <p>Serveur connecté - Format TABLEAU</p>
    <h3>Endpoints :</h3>
    <ul>
        <li><a href="/api/test">/api/test</a></li>
        <li><a href="/api/ssi">/api/ssi</a></li>
        <li><a href="/api/dsf">/api/dsf</a></li>
        <li><a href="/api/dsf/cloture">/api/dsf/cloture</a></li>
        <li><a href="/api/dsf/planif">/api/dsf/planif</a></li>
        <li><a href="/api/dsf/resp">/api/dsf/resp</a></li>
        <li><a href="/api/devis">/api/devis</a></li>
        <li><a href="/api/travaux">/api/travaux</a></li>
        <li><a href="/api/reco">/api/reco</a></li>
        <li><a href="/api/tech">/api/tech</a></li>
        <li><a href="/api/stt">/api/stt</a></li>
    </ul>
    '''

@app.route('/api/test')
def test():
    try:
        conn = get_connection()
        conn.close()
        return jsonify({"status": "ok", "message": "Connexion Access OK"})
    except Exception as e:
        return jsonify({"status": "error", "message": str(e)}), 500

@app.route('/api/ssi')
def api_ssi():
    result = get_data_as_array('SSI')
    return jsonify({"status": "ok", "count": len(result["rows"]), "headers": result["headers"], "rows": result["rows"]})

@app.route('/api/dsf')
def api_dsf():
    result = get_data_as_array('DSF')
    return jsonify({"status": "ok", "count": len(result["rows"]), "headers": result["headers"], "rows": result["rows"]})

@app.route('/api/dsf/cloture')
def api_dsf_cloture():
    result = get_data_as_array('DSF_CLOTURE')
    return jsonify({"status": "ok", "count": len(result["rows"]), "headers": result["headers"], "rows": result["rows"]})

@app.route('/api/dsf/planif')
def api_dsf_planif():
    result = get_data_as_array('DSF_PLANIF')
    return jsonify({"status": "ok", "count": len(result["rows"]), "headers": result["headers"], "rows": result["rows"]})

@app.route('/api/dsf/resp')
def api_dsf_resp():
    result = get_data_as_array('DSF_RESP')
    return jsonify({"status": "ok", "count": len(result["rows"]), "headers": result["headers"], "rows": result["rows"]})

@app.route('/api/devis')
def api_devis():
    result = get_data_as_array('DEVIS')
    return jsonify({"status": "ok", "count": len(result["rows"]), "headers": result["headers"], "rows": result["rows"]})

@app.route('/api/travaux')
def api_travaux():
    result = get_data_as_array('TRAVAUX')
    return jsonify({"status": "ok", "count": len(result["rows"]), "headers": result["headers"], "rows": result["rows"]})

@app.route('/api/reco')
def api_reco():
    result = get_data_as_array('RECO')
    return jsonify({"status": "ok", "count": len(result["rows"]), "headers": result["headers"], "rows": result["rows"]})

@app.route('/api/tech')
def api_tech():
    """
    TECH enrichi avec contacts.json
    Format: headers + rows avec [numero, code, nom, mail, tel]
    """
    result = get_data_as_array('TECH')
    contacts = load_contacts()
    tech_contacts = contacts.get('techniciens', {})
    
    # Headers attendus par parseWorkbook
    headers = ['Numéro', 'Technicien', 'Nom complet', 'MAIL', 'TEL']
    
    # Trouver les indices des colonnes Access
    access_headers = result["headers"]
    idx_num = next((i for i, h in enumerate(access_headers) if 'Numéro' in str(h)), 0)
    idx_code = next((i for i, h in enumerate(access_headers) if 'Technicien' in str(h) and 'SAV' not in str(h)), 1)
    idx_nom = next((i for i, h in enumerate(access_headers) if 'Nom complet' in str(h)), 2)
    
    rows = []
    for row in result["rows"]:
        num = str(row[idx_num] if idx_num < len(row) else '').strip()
        code = str(row[idx_code] if idx_code < len(row) else '').strip()
        nom = str(row[idx_nom] if idx_nom < len(row) else '').strip()
        
        # Enrichir avec contacts.json
        contact_info = tech_contacts.get(num, {})
        mail = contact_info.get('mail', '')
        tel = contact_info.get('tel', '')
        
        rows.append([num, code, nom, mail, tel])
    
    return jsonify({"status": "ok", "count": len(rows), "headers": headers, "rows": rows})

@app.route('/api/stt')
def api_stt():
    """
    STT enrichi avec contacts.json
    Format: headers + rows avec [numero, nom, mail, colonne1]
    """
    result = get_data_as_array('STT')
    contacts = load_contacts()
    stt_contacts = contacts.get('soustraitants', {})
    
    # Headers attendus par parseWorkbook
    headers = ['N°', 'sous traitant', 'mail', 'Colonne1']
    
    # Trouver les indices des colonnes Access
    access_headers = result["headers"]
    idx_num = next((i for i, h in enumerate(access_headers) if 'N°' in str(h) or 'Num' in str(h)), 0)
    idx_nom = next((i for i, h in enumerate(access_headers) if 'sous traitant' in str(h).lower()), 1)
    
    rows = []
    for row in result["rows"]:
        num = str(row[idx_num] if idx_num < len(row) else '').strip()
        nom = str(row[idx_nom] if idx_nom < len(row) else '').strip()
        
        # Enrichir avec contacts.json
        contact_info = stt_contacts.get(num, {})
        mail = contact_info.get('mail', '')
        
        rows.append([num, nom, mail, ''])
    
    return jsonify({"status": "ok", "count": len(rows), "headers": headers, "rows": rows})

# ============================================================
# LANCEMENT
# ============================================================
if __name__ == '__main__':
    print("=" * 60)
    print("🌉 BRIDGE ACCESS - Format TABLEAU")
    print("=" * 60)
    print(f"📁 Base: {DATABASE_PATH}")
    print(f"📁 Contacts: {CONTACTS_PATH}")
    
    try:
        conn = get_connection()
        conn.close()
        print("✅ Connexion Access OK")
    except Exception as e:
        print(f"❌ Erreur: {e}")
    
    load_contacts()
    
    print("=" * 60)
    print("🚀 http://localhost:5000")
    print("=" * 60)
    
    app.run(host='0.0.0.0', port=5000, debug=True)
