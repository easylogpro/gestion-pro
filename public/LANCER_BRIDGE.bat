@echo off
echo ========================================
echo    BRIDGE ACCESS - Demarrage
echo ========================================
echo.

cd /d "%~dp0"

echo Verification Python...
python --version >nul 2>&1
if errorlevel 1 (
    echo ERREUR: Python n'est pas installe ou pas dans le PATH
    echo.
    echo Installez Python depuis: https://www.python.org/downloads/
    echo Cochez "Add Python to PATH" lors de l'installation
    pause
    exit /b 1
)

echo Installation des dependances...
pip install flask flask-cors pyodbc --quiet

echo.
echo Demarrage du serveur Bridge...
echo.
echo ========================================
echo   Serveur actif sur http://localhost:5000
echo   Appuyez sur Ctrl+C pour arreter
echo ========================================
echo.

python bridge_server.py

pause
