@echo off
setlocal EnableExtensions
title ASHFALL - server locale (non chiudere questa finestra)
cd /d "%~dp0"

rem -- Trova un Python DAVVERO funzionante.
rem    NB: su Windows l'alias del Microsoft Store risponde a "python" stampando
rem    "Python was not found" ma ESCE CON CODICE 0 -> un test con && lo rileverebbe
rem    per errore. Per questo verifichiamo che stampi davvero un valore sentinella.
set "PY="
call :probe "py -3"
if not defined PY call :probe "py"
if not defined PY call :probe "python"
if not defined PY call :probe "python3"

if not defined PY goto :nopython

echo ============================================
echo   ASHFALL e' in esecuzione!   [%PY%]
echo   Apri nel browser:  http://localhost:8123
echo   (lascia aperta questa finestra mentre giochi)
echo ============================================
echo.
start "" "http://localhost:8123"
%PY% -m http.server 8123
pause
exit /b 0

:probe
set "_C=%~1"
for /f "delims=" %%v in ('%_C% -c "print(42)" 2^>nul') do if "%%v"=="42" set "PY=%_C%"
exit /b 0

:nopython
echo.
echo  ============================================
echo   [ERRORE] Python non trovato.
echo  ============================================
echo   ASHFALL usa Python solo per avviare un mini
echo   server locale (il gioco e' HTML/JS puro).
echo.
echo   Come risolvere, scegli UNA delle due:
echo.
echo    1^) Installa Python:  https://www.python.org/downloads/
echo       (durante l'installazione spunta "Add Python to PATH")
echo.
echo    2^) Se Python e' gia' installato ma Windows apre il Microsoft Store:
echo       Impostazioni ^> App ^> Impostazioni app avanzate
echo       ^> Alias di esecuzione app ^> DISATTIVA "python.exe" e "python3.exe"
echo.
pause
exit /b 1
