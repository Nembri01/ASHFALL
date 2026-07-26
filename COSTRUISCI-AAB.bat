@echo off
setlocal EnableExtensions
title ASHFALL - build Android (AAB firmato)
cd /d "%~dp0"

rem JDK e SDK portabili installati in C:\Progetti\AndroidTools (niente Android Studio richiesto).
set "JAVA_HOME=C:\Progetti\AndroidTools\jdk17"
rem TEMP corta: i pipe NIO di Java usano socket unix-domain col limite di 108 caratteri sul percorso.
set "TMP=C:\Progetti\AndroidTools\tmp"
set "TEMP=C:\Progetti\AndroidTools\tmp"
set "_JAVA_OPTIONS=-Djava.io.tmpdir=C:\Progetti\AndroidTools\tmp"
if not exist "%TMP%" mkdir "%TMP%"

echo ============================================
echo  1/3  Aggiorno www/ e sincronizzo Capacitor
echo ============================================
call npm run cap:sync
if errorlevel 1 goto :err

echo ============================================
echo  2/3  Compilo il bundle firmato (release)
echo ============================================
cd android
call gradlew.bat bundleRelease --no-daemon
if errorlevel 1 goto :err
cd ..

echo ============================================
echo  3/3  FATTO!
echo ============================================
echo  Il file da caricare sul Play Console e':
echo  %~dp0android\app\build\outputs\bundle\release\app-release.aab
echo.
echo  RICORDA: per ogni aggiornamento aumenta versionCode in
echo  android\app\build.gradle prima di compilare.
echo.
pause
exit /b 0

:err
echo.
echo  [ERRORE] Build fallita: leggi i messaggi qui sopra.
echo  Log completo: android\build_log.txt (se generato)
pause
exit /b 1
