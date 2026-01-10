# Script d'analyse de base Access
# Version 2 - Encodage corrigé

import pyodbc
import sys

# Forcer l'encodage UTF-8
sys.stdout.reconfigure(encoding='utf-8')

# MODIFIER CE CHEMIN avec le chemin de votre base Access
DATABASE_PATH = r"C:\Users\Administrateur\Desktop\CONTRAT 2022.accdb"

print("=" * 60)
print("ANALYSE DE LA BASE ACCESS")
print("=" * 60)
print(f"\nChemin : {DATABASE_PATH}\n")

try:
    # Connexion à la base Access
    conn_str = f'DRIVER={{Microsoft Access Driver (*.mdb, *.accdb)}};DBQ={DATABASE_PATH};'
    conn = pyodbc.connect(conn_str)
    cursor = conn.cursor()
    
    # Récupérer la liste des tables
    tables = []
    for table in cursor.tables(tableType='TABLE'):
        tables.append(table.table_name)
    
    print(f"Nombre de tables trouvees : {len(tables)}\n")
    print("=" * 60)
    
    # Fichier de sortie
    with open(r"C:\Users\Administrateur\Desktop\structure_base.txt", "w", encoding="utf-8") as f:
        f.write("STRUCTURE DE LA BASE ACCESS\n")
        f.write("=" * 60 + "\n\n")
        
        # Pour chaque table, afficher les colonnes
        for table_name in sorted(tables):
            print(f"Table : {table_name}")
            f.write(f"\nTABLE : {table_name}\n")
            f.write("-" * 50 + "\n")
            
            # Récupérer les colonnes
            try:
                columns = cursor.columns(table=table_name)
                col_count = 0
                for col in columns:
                    col_count += 1
                    line = f"   {col_count:2}. {col.column_name} ({col.type_name})"
                    f.write(line + "\n")
                
                f.write(f"   -> {col_count} colonnes\n")
            except Exception as e:
                f.write(f"   Erreur: {e}\n")
    
    # Fermer la connexion
    cursor.close()
    conn.close()
    
    print("\n" + "=" * 60)
    print("ANALYSE TERMINEE")
    print("Fichier cree : C:\\Users\\Administrateur\\Desktop\\structure_base.txt")
    print("=" * 60)
    
except Exception as e:
    print(f"\nERREUR : {e}")
    print("\nVerifiez :")
    print("1. Le chemin de la base est correct")
    print("2. Microsoft Access ou Access Database Engine est installe")
    print("3. Vous avez les droits d'acces au fichier")
